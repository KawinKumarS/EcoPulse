"""
EcoPulse Serial Connection Manager
Robust PySerial handler with:
  - Port scanning (detects Arduino Nano, CH340, FTDI)
  - Non-blocking reader thread with line buffering
  - Dual parser: supports structured EcoPulse JSON AND original plain-text Arduino output
  - Graceful USB disconnect & safe re-entrant locking
  - Command dispatch, acknowledgement tracking, and live raw serial log ring buffer
"""
import time
import json
import threading
import logging
from collections import deque
from typing import List, Dict, Any, Optional, Callable
import serial
import serial.tools.list_ports

logger = logging.getLogger("ecopulse.serial")

class SerialManager:
    def __init__(
        self,
        on_telemetry: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_ack: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_disconnect: Optional[Callable[[], None]] = None,
        on_serial_log: Optional[Callable[[Dict[str, Any]], None]] = None
    ):
        self.ser: Optional[serial.Serial] = None
        self.current_port: Optional[str] = None
        self.baud_rate: int = 9600
        self.is_connected: bool = False
        self.stop_requested = threading.Event()
        self.reader_thread: Optional[threading.Thread] = None
        # Re-entrant lock prevents deadlock when connect() calls disconnect()
        self.lock = threading.RLock()

        self.on_telemetry = on_telemetry
        self.on_ack = on_ack
        self.on_disconnect = on_disconnect
        self.on_serial_log = on_serial_log

        self.last_seen: float = 0.0
        self.serial_logs: deque = deque(maxlen=60)

        # Tracks current legacy plain-text state across state-change lines
        self._legacy_state: Dict[str, Any] = {
            "type": "sensor",
            "occupancy": False,
            "led1": False,
            "led2": False,
            "light": False,
            "fan": False,
            "mode": "AUTO",
            "off_delay_ms": 2000,
            "hardware_profile": "pir_dual_led_legacy",
            "has_dht11": False,
            "has_ldr": False,
            "has_solar": False,
            "has_battery": False,
        }

    def _record_log(self, direction: str, text: str):
        entry = {
            "timestamp": time.time(),
            "direction": direction,
            "line": text
        }
        self.serial_logs.append(entry)
        if self.on_serial_log:
            self.on_serial_log(entry)

    def get_logs(self) -> List[Dict[str, Any]]:
        return list(self.serial_logs)

    @staticmethod
    def list_ports() -> List[Dict[str, Any]]:
        """Scans and returns available serial ports with hardware descriptions."""
        ports = serial.tools.list_ports.comports()
        result = []
        for p in ports:
            result.append({
                "port": p.device,
                "description": p.description,
                "hwid": p.hwid,
                "is_likely_arduino": any(
                    sig in (p.description + p.hwid).lower()
                    for sig in ["arduino", "ch340", "ftdi", "usb serial", "usb-serial", "1a86:7523"]
                )
            })
        return result

    def connect(self, port: str, baud_rate: int = 9600) -> bool:
        with self.lock:
            if self.is_connected and self.current_port == port and self.baud_rate == baud_rate:
                return True

            self._disconnect_internal(notify=False)

            try:
                logger.info(f"Connecting to serial port {port} at {baud_rate} baud...")
                self.ser = serial.Serial(
                    port=port,
                    baudrate=baud_rate,
                    timeout=1.0,
                    write_timeout=1.0
                )
                self.current_port = port
                self.baud_rate = baud_rate
                self.is_connected = True
                self.last_seen = time.time()
                self.stop_requested.clear()

                # Reset legacy tracker to clean baseline upon connecting
                self._legacy_state["occupancy"] = False
                self._legacy_state["led1"] = False
                self._legacy_state["led2"] = False
                self._legacy_state["light"] = False

                self._record_log("SYS", f"Connected to {port} @ {baud_rate} baud")

                # Start background reader thread
                self.reader_thread = threading.Thread(target=self._read_loop, daemon=True)
                self.reader_thread.start()
                logger.info(f"Connected successfully to {port}")
                return True
            except Exception as e:
                logger.error(f"Failed to open serial port {port}: {e}")
                self._record_log("ERR", f"Failed to open {port}: {e}")
                self.ser = None
                self.is_connected = False
                self.current_port = None
                return False

    def _disconnect_internal(self, notify: bool = True):
        with self.lock:
            was_connected = self.is_connected
            self.stop_requested.set()
            if self.ser:
                try:
                    self.ser.close()
                except Exception as e:
                    logger.warning(f"Error while closing serial: {e}")
            self.ser = None
            self.is_connected = False
            self.current_port = None
            if was_connected:
                self._record_log("SYS", "Serial port closed")
            if notify and was_connected and self.on_disconnect:
                self.on_disconnect()

    def disconnect(self):
        self._disconnect_internal(notify=True)

    def send_command(self, cmd_dict: Dict[str, Any]) -> bool:
        """Sends a compact JSON command to the Arduino Nano over serial."""
        if not self.is_connected or not self.ser:
            return False
        try:
            line = json.dumps(cmd_dict, separators=(",", ":")) + "\n"
            with self.lock:
                if self.ser and self.ser.is_open:
                    self.ser.write(line.encode("utf-8"))
                    self.ser.flush()
                    self._record_log("TX", line.strip())
                    return True
        except Exception as e:
            logger.error(f"Error writing command to serial: {e}")
            self._handle_unexpected_disconnect()
        return False

    def _handle_plain_text_line(self, line: str):
        """
        Parses plain-text output from the original Arduino Nano sketch:
          - 'MOTION DETECTED - LIGHTS ON'
          - 'NO MOTION - LIGHTS OFF'
          - 'System Ready' / 'INTELLIGENT ENERGY MANAGEMENT SYSTEM'
        """
        upper = line.upper()
        updated = False

        if "MOTION DETECTED" in upper or "LIGHTS ON" in upper:
            self._legacy_state["occupancy"] = True
            self._legacy_state["led1"] = True
            self._legacy_state["led2"] = True
            self._legacy_state["light"] = True
            updated = True
        elif "NO MOTION" in upper or "LIGHTS OFF" in upper:
            self._legacy_state["occupancy"] = False
            self._legacy_state["led1"] = False
            self._legacy_state["led2"] = False
            self._legacy_state["light"] = False
            updated = True
        elif "SYSTEM READY" in upper or "INTELLIGENT ENERGY MANAGEMENT" in upper:
            updated = True

        if updated and self.on_telemetry:
            self.on_telemetry(dict(self._legacy_state))

    def _read_loop(self):
        """Continuous background reader with line framing, JSON parsing, and plain-text fallback."""
        while not self.stop_requested.is_set():
            try:
                if not self.ser or not self.ser.is_open:
                    break
                raw_bytes = self.ser.readline()
                if not raw_bytes:
                    continue

                line = raw_bytes.decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                self.last_seen = time.time()
                self._record_log("RX", line)

                # Attempt JSON parse first (for integrated EcoPulse firmware)
                if line.startswith("{"):
                    try:
                        msg = json.loads(line)
                        msg_type = msg.get("type")
                        if msg_type == "sensor":
                            if self.on_telemetry:
                                self.on_telemetry(msg)
                        elif msg_type == "ack":
                            logger.info(f"Received ACK from Arduino: {msg}")
                            if self.on_ack:
                                self.on_ack(msg)
                        elif msg_type == "system":
                            logger.info(f"Arduino system message: {msg}")
                        continue
                    except json.JSONDecodeError:
                        pass

                # Fallback: Parse plain-text serial output from original Nano sketch
                self._handle_plain_text_line(line)

            except serial.SerialException as se:
                if not self.stop_requested.is_set():
                    logger.warning(f"Serial exception encountered (USB unplugged?): {se}")
                    self._handle_unexpected_disconnect()
                break
            except Exception as ex:
                logger.error(f"Unexpected reader error: {ex}")
                time.sleep(0.1)

    def _handle_unexpected_disconnect(self):
        """Handles unexpected USB loss without crashing the application."""
        with self.lock:
            self.is_connected = False
            if self.ser:
                try:
                    self.ser.close()
                except Exception:
                    pass
                self.ser = None
            self.current_port = None
        self._record_log("ERR", "USB Serial connection lost")
        if self.on_disconnect:
            self.on_disconnect()
