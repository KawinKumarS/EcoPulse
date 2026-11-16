"""
EcoPulse – FastAPI Backend Service
Provides:
  - USB Serial communications with Arduino Nano
  - Real-time WebSockets for React dashboard
  - Embedded SQLite time-series storage & CSV reporting
  - Seamless fall-back to physics simulator when disconnected
"""
import asyncio
import io
import csv
import math
import random
import time
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .models import (
    SensorReading,
    DeviceCommand,
    ModeCommand,
    ConfigUpdate,
    SerialConnectRequest,
    SystemStatus
)
from .config import (
    DEFAULT_BAUD_RATE,
    DEFAULT_TEMP_THRESHOLD,
    DEFAULT_LIGHT_THRESHOLD,
    DEFAULT_OCC_TIMEOUT,
    DEFAULT_BATTERY_CUTOFF
)
from .database import (
    init_db,
    insert_reading,
    insert_event,
    insert_alert,
    acknowledge_alert,
    resolve_alert,
    get_alerts,
    get_readings,
    get_total_readings_count,
    get_energy_summary,
    get_energy_buckets,
    set_config,
    get_config
)
from .energy_calculator import enrich_sensor_telemetry
from .serial_manager import SerialManager
from .simulator import ArduinoSimulator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ecopulse.api")

app = FastAPI(title="EcoPulse Backend", version="1.0.0")

# Enable CORS for local Vite dev server (typically http://localhost:5173) and any local client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Application State ---
start_time = time.time()
active_websockets: List[WebSocket] = []
simulator = ArduinoSimulator()
use_simulator = True # Defaults to True until real hardware connects
latest_telemetry: Dict[str, Any] = {}
latest_ack: Optional[Dict[str, Any]] = None
virtual_battery_v: float = 3.92

def apply_virtual_solar_and_battery(raw: Dict[str, Any], advance_battery: bool = False) -> Dict[str, Any]:
    """
    When physical solar (A1) or battery (A2) sensors are not wired on the Nano,
    provides a varying dummy solar reading and models battery charge/discharge
    directly from the real physical LED1/LED2 states.
    """
    global virtual_battery_v
    msg = dict(raw)
    now = time.time()

    irradiance = (math.sin(now * 0.16) + 1.0) / 2.0  # Smooth 0.0 -> 1.0 cycle (~40s period)

    if not msg.get("has_solar", False) or msg.get("solar_source") == "dummy_varying":
        msg["has_solar"] = True
        msg["solar_source"] = "dummy_varying"
        msg["solar_voltage"] = round(max(1.2, 1.8 + 3.5 * irradiance + random.uniform(-0.08, 0.08)), 2)
        msg["solar_power_w"] = round(max(0.03, 0.05 + 0.21 * irradiance + random.uniform(-0.01, 0.01)), 3)

    if not msg.get("has_ldr", False) or msg.get("ldr_source") == "dummy_solar_linked":
        msg["has_ldr"] = True
        msg["ldr_source"] = "dummy_solar_linked"
        led1_on = bool(msg.get("led1", msg.get("light", False)))
        led2_on = bool(msg.get("led2", False))
        # High light level (550-920) when solar is charging; low (90-320) during remaining time
        base_ldr = int(100 + 780 * irradiance + random.randint(-15, 15))
        indoor_boost = (45 if led1_on else 0) + (45 if led2_on else 0)
        msg["light_level"] = max(0, min(1023, base_ldr + indoor_boost))

    if not msg.get("has_battery", False) or msg.get("battery_source") == "modeled_from_led_load":
        msg["has_battery"] = True
        msg["battery_source"] = "modeled_from_led_load"
        if advance_battery:
            led1_on = bool(msg.get("led1", msg.get("light", False)))
            led2_on = bool(msg.get("led2", False))
            load_w = 0.125 + (0.15 if led1_on else 0.0) + (0.15 if led2_on else 0.0)
            solar_w = float(msg.get("solar_power_w", 0.18))
            net_w = solar_w - load_w
            # Visible charge/discharge response driven by real LED state
            rate = 0.025 if net_w < 0 else 0.030
            virtual_battery_v = max(3.40, min(4.20, virtual_battery_v + net_w * rate))
        msg["battery_voltage"] = round(virtual_battery_v, 3)

    return msg

# Serial manager callbacks
def handle_hardware_telemetry(msg: Dict[str, Any]):
    global latest_telemetry
    prepared = apply_virtual_solar_and_battery(msg, advance_battery=False)
    enriched = enrich_sensor_telemetry(prepared, is_simulated=False)
    enriched["timestamp"] = time.time()
    enriched["is_connected"] = serial_mgr.is_connected
    enriched["port"] = serial_mgr.current_port
    latest_telemetry = enriched
    if main_event_loop:
        asyncio.run_coroutine_threadsafe(
            broadcast_json({"type": "telemetry", "payload": enriched}),
            main_event_loop
        )

def handle_hardware_ack(ack_msg: Dict[str, Any]):
    global latest_ack
    latest_ack = ack_msg
    insert_event("ack", "arduino_nano", ack_msg.get("device"), ack_msg.get("state"), f"Ack: {ack_msg}")
    if main_event_loop:
        asyncio.run_coroutine_threadsafe(broadcast_json({"type": "ack", "payload": ack_msg}), main_event_loop)

def handle_serial_disconnect():
    global use_simulator
    use_simulator = True
    logger.warning("Hardware disconnected. Switching to simulation mode.")
    insert_event("connection", "system", details="Arduino Nano USB disconnected")
    insert_alert("hardware_disconnect", "warning", "Arduino Nano USB connection lost. Fallback to simulator.")
    if main_event_loop:
        asyncio.run_coroutine_threadsafe(
            broadcast_json({"type": "status", "is_connected": False, "is_simulated": True}),
            main_event_loop
        )

def handle_serial_log(entry: Dict[str, Any]):
    if main_event_loop:
        asyncio.run_coroutine_threadsafe(
            broadcast_json({"type": "serial_log", "payload": entry}),
            main_event_loop
        )

serial_mgr = SerialManager(
    on_telemetry=handle_hardware_telemetry,
    on_ack=handle_hardware_ack,
    on_disconnect=handle_serial_disconnect,
    on_serial_log=handle_serial_log
)

# --- WebSocket Broadcast Helper ---
async def broadcast_json(data: Dict[str, Any]):
    disconnected = []
    for ws in active_websockets:
        try:
            await ws.send_json(data)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in active_websockets:
            active_websockets.remove(ws)

# --- Alert Evaluation Engine ---
def check_for_alerts(telemetry: Dict[str, Any]):
    has_battery = telemetry.get("has_battery", False)
    has_dht11 = telemetry.get("has_dht11", False)

    if has_battery:
        battery_v = telemetry.get("battery_voltage", 0.0)
        # 1. Low battery alert (< 3.45V warning, < 3.30V critical)
        if 0.5 < battery_v < 3.35:
            insert_alert("battery_critical", "critical", f"Critical battery voltage: {battery_v:.2f}V! Load shedding active.")
        elif 0.5 < battery_v < 3.50:
            insert_alert("battery_low", "warning", f"Battery voltage low ({battery_v:.2f}V). Solar recharging recommended.")
        else:
            resolve_alert("battery_critical")
            resolve_alert("battery_low")

    if has_dht11:
        temp = telemetry.get("temperature", 0.0)
        # 2. High temperature alert (> 32°C)
        if temp >= 32.0:
            insert_alert("temp_high", "warning", f"Room temperature excessive ({temp:.1f}°C). Cooling required.")
        elif temp <= 30.0:
            resolve_alert("temp_high")

# --- Background Telemetry & Broadcast Loop ---
main_event_loop: Optional[asyncio.AbstractEventLoop] = None

async def telemetry_loop():
    global latest_telemetry
    while True:
        try:
            if serial_mgr.is_connected and not use_simulator:
                # Using real Arduino Nano hardware telemetry (populated via callback)
                if not latest_telemetry:
                    await asyncio.sleep(0.5)
                    continue
                prepared = apply_virtual_solar_and_battery(dict(latest_telemetry), advance_battery=True)
                telemetry = enrich_sensor_telemetry(prepared, is_simulated=False)
                latest_telemetry = telemetry
            else:
                # Using realistic simulated physics engine
                sim_raw = simulator.step(dt=1.0)
                telemetry = enrich_sensor_telemetry(sim_raw, is_simulated=True)
                latest_telemetry = telemetry

            # Add timestamp
            telemetry["timestamp"] = time.time()
            telemetry["is_connected"] = serial_mgr.is_connected
            telemetry["port"] = serial_mgr.current_port

            # Check and raise alerts
            check_for_alerts(telemetry)

            # Record to SQLite database
            insert_reading(telemetry)

            # Broadcast to connected WebSockets
            await broadcast_json({
                "type": "telemetry",
                "payload": telemetry
            })

        except Exception as e:
            logger.error(f"Error in telemetry broadcast loop: {e}", exc_info=True)

        await asyncio.sleep(1.0)

@app.on_event("startup")
async def startup_event():
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()
    init_db()
    insert_event("system_boot", "server", details="EcoPulse backend initialized")
    asyncio.create_task(telemetry_loop())

@app.on_event("shutdown")
def shutdown_event():
    serial_mgr.disconnect()

# --- REST Endpoints ---

@app.get("/api/status")
def get_status():
    return {
        "is_connected": serial_mgr.is_connected,
        "port": serial_mgr.current_port,
        "baud_rate": serial_mgr.baud_rate,
        "is_simulated": use_simulator or not serial_mgr.is_connected,
        "active_mode": latest_telemetry.get("mode", "AUTO"),
        "total_readings": get_total_readings_count(),
        "uptime_seconds": round(time.time() - start_time, 1),
        "last_seen": serial_mgr.last_seen if serial_mgr.is_connected else None,
        "hardware_profile": latest_telemetry.get("hardware_profile", "simulator")
    }

@app.get("/api/ports")
def list_ports():
    return serial_mgr.list_ports()

@app.get("/api/serial/logs")
def get_serial_logs():
    return serial_mgr.get_logs()

@app.post("/api/connect")
async def connect_port(req: SerialConnectRequest):
    global use_simulator, latest_telemetry
    success = serial_mgr.connect(req.port, req.baud_rate)
    if success:
        use_simulator = False
        resolve_alert("hardware_disconnect")
        # Initialize hardware baseline immediately so even event-driven plain-text sketches stream right away
        baseline = apply_virtual_solar_and_battery({
            "type": "sensor",
            "occupancy": False,
            "led1": False,
            "led2": False,
            "light": False,
            "fan": False,
            "mode": "AUTO",
            "off_delay_ms": 2000,
            "hardware_profile": "pir_dual_led",
            "has_dht11": False,
            "has_ldr": False,
            "has_solar": False,
            "has_battery": False,
        }, advance_battery=False)
        latest_telemetry = enrich_sensor_telemetry(baseline, is_simulated=False)
        latest_telemetry["timestamp"] = time.time()
        latest_telemetry["is_connected"] = True
        latest_telemetry["port"] = req.port

        insert_event("connection", "user", details=f"Connected to {req.port} @ {req.baud_rate}")
        await broadcast_json({"type": "status", "is_connected": True, "is_simulated": False, "port": req.port})
        await broadcast_json({"type": "telemetry", "payload": latest_telemetry})
        return {"status": "connected", "port": req.port, "baud_rate": req.baud_rate}
    else:
        raise HTTPException(status_code=400, detail=f"Failed to connect to port {req.port}. Close Arduino Serial Monitor if it is open.")

@app.post("/api/disconnect")
async def disconnect_port():
    global use_simulator
    serial_mgr._disconnect_internal(notify=False)
    use_simulator = True
    insert_event("connection", "user", details="Disconnected from serial port")
    await broadcast_json({"type": "status", "is_connected": False, "is_simulated": True})
    return {"status": "disconnected", "fallback_to_simulation": True}

@app.post("/api/command")
def send_device_command(cmd: DeviceCommand):
    cmd_dict = {
        "type": "command",
        "device": cmd.device,
        "state": cmd.state
    }
    
    insert_event("command", "dashboard", device=cmd.device, state=cmd.state)
    
    if serial_mgr.is_connected and not use_simulator:
        sent = serial_mgr.send_command(cmd_dict)
        return {"dispatched": sent, "target": "arduino_nano", "device": cmd.device, "state": cmd.state}
    else:
        # Simulator executes and provides immediate ack
        ack = simulator.set_device(cmd.device, cmd.state)
        handle_hardware_ack(ack)
        return {"dispatched": True, "target": "simulator", "device": cmd.device, "state": cmd.state, "ack": ack}

@app.post("/api/mode")
def set_operating_mode(mode: ModeCommand):
    cmd_dict = {
        "type": "mode",
        "value": mode.value
    }
    
    insert_event("mode_change", "dashboard", details=f"Mode set to {mode.value}")
    
    if serial_mgr.is_connected and not use_simulator:
        sent = serial_mgr.send_command(cmd_dict)
        return {"dispatched": sent, "mode": mode.value, "target": "arduino_nano"}
    else:
        ack = simulator.set_mode(mode.value)
        handle_hardware_ack(ack)
        return {"dispatched": True, "mode": mode.value, "target": "simulator", "ack": ack}

@app.get("/api/readings")
def get_sensor_readings(
    start_ts: Optional[float] = Query(None),
    end_ts: Optional[float] = Query(None),
    limit: int = Query(200, le=2000),
    is_simulated: Optional[bool] = Query(None)
):
    return get_readings(start_ts=start_ts, end_ts=end_ts, limit=limit, is_simulated=is_simulated)

@app.get("/api/energy")
def get_energy(since_ts: Optional[float] = Query(None), is_simulated: Optional[bool] = Query(None)):
    sim_filter = is_simulated if is_simulated is not None else (use_simulator or not serial_mgr.is_connected)
    return get_energy_summary(since_ts=since_ts, is_simulated=sim_filter)

@app.get("/api/energy/buckets")
def get_energy_chart_buckets(
    timeframe: str = Query("hourly"),
    is_simulated: Optional[bool] = Query(None)
):
    sim_filter = is_simulated if is_simulated is not None else (use_simulator or not serial_mgr.is_connected)
    return get_energy_buckets(timeframe=timeframe, is_simulated=sim_filter)

@app.get("/api/alerts")
def list_alerts(limit: int = Query(50, le=200)):
    return get_alerts(limit=limit)

@app.post("/api/alerts/{alert_id}/ack")
def ack_alert(alert_id: int):
    acknowledge_alert(alert_id)
    return {"status": "acknowledged", "id": alert_id}

@app.get("/api/config")
def get_configuration():
    return {
        "temp_threshold": get_config("temp_threshold", DEFAULT_TEMP_THRESHOLD),
        "light_threshold": get_config("light_threshold", DEFAULT_LIGHT_THRESHOLD),
        "occupancy_timeout": get_config("occupancy_timeout", DEFAULT_OCC_TIMEOUT),
        "battery_cutoff": get_config("battery_cutoff", DEFAULT_BATTERY_CUTOFF)
    }

@app.post("/api/config")
def update_configuration(cfg: ConfigUpdate):
    if cfg.temp_threshold is not None:
        set_config("temp_threshold", cfg.temp_threshold)
        simulator.temp_threshold = cfg.temp_threshold
    if cfg.light_threshold is not None:
        set_config("light_threshold", cfg.light_threshold)
        simulator.light_threshold = cfg.light_threshold
    if cfg.occupancy_timeout is not None:
        set_config("occupancy_timeout", cfg.occupancy_timeout)
        simulator.occ_timeout = float(cfg.occupancy_timeout)
    if cfg.battery_cutoff is not None:
        set_config("battery_cutoff", cfg.battery_cutoff)
        simulator.battery_cutoff = cfg.battery_cutoff

    # If real hardware is connected, transmit config JSON
    if serial_mgr.is_connected:
        serial_mgr.send_command({
            "type": "config",
            "temp_thresh": cfg.temp_threshold,
            "light_thresh": cfg.light_threshold,
            "occ_timeout": cfg.occupancy_timeout
        })

    return {"status": "updated", "config": get_configuration()}

@app.post("/api/simulation/toggle")
def toggle_simulation(enable: Optional[bool] = None):
    global use_simulator
    if enable is not None:
        use_simulator = enable
    else:
        use_simulator = not use_simulator
    return {"is_simulated": use_simulator}

@app.post("/api/simulation/scenario")
def trigger_scenario(payload: Dict[str, Any]):
    action = payload.get("action")
    if action == "motion":
        simulator.trigger_motion(duration_sec=float(payload.get("duration", 15.0)))
    elif action == "weather":
        simulator.set_weather(payload.get("weather", "sunny"))
    elif action == "time_of_day":
        simulator.set_time_of_day(float(payload.get("hour", 12.0)))
    elif action == "heat_spike":
        simulator.temperature += 6.0
    elif action == "low_battery":
        simulator.battery_voltage = 3.32
    return {"status": "applied", "action": action}

@app.get("/api/export")
def export_csv_data(
    start_ts: Optional[float] = Query(None),
    end_ts: Optional[float] = Query(None),
    limit: int = Query(2000, le=10000)
):
    """
    Exports historical sensor readings as a clean CSV with
    explicit columns distinguishing Measured, Calculated, and Simulated values.
    """
    readings = get_readings(start_ts=start_ts, end_ts=end_ts, limit=limit)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # CSV Header
    writer.writerow([
        "Timestamp_ISO",
        "Timestamp_Unix",
        "Measured_Occupancy",
        "Measured_LightLevel_ADC",
        "Measured_Temperature_C",
        "Measured_Humidity_Pct",
        "Measured_SolarVoltage_V",
        "Measured_BatteryVoltage_V",
        "Calculated_SolarPower_W",
        "Calculated_LoadPower_W",
        "Calculated_NetPower_W",
        "Estimated_Battery_Pct",
        "Device_LightState",
        "Device_FanState",
        "System_Mode",
        "Data_Source"
    ])
    
    for r in readings:
        ts = r.get("timestamp", 0)
        dt_str = datetime.utcfromtimestamp(ts).isoformat() + "Z"
        writer.writerow([
            dt_str,
            ts,
            bool(r.get("occupancy")),
            r.get("light_level", 0),
            r.get("temperature", 0.0),
            r.get("humidity", 0.0),
            r.get("solar_voltage", 0.0),
            r.get("battery_voltage", 0.0),
            r.get("solar_power_w", 0.0),
            r.get("load_power_w", 0.0),
            r.get("net_power_w", 0.0),
            r.get("estimated_battery_pct", 0.0),
            "ON" if r.get("light_state") else "OFF",
            "ON" if r.get("fan_state") else "OFF",
            r.get("mode", "AUTO"),
            "SIMULATED" if r.get("is_simulated") else "MEASURED_ARDUINO"
        ])
        
    output.seek(0)
    filename = f"ecopulse_export_{int(time.time())}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- WebSocket Handler ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    
    # Send immediate state on connection
    try:
        await websocket.send_json({
            "type": "init",
            "payload": {
                "status": get_status(),
                "telemetry": latest_telemetry,
                "config": get_configuration(),
                "serial_logs": serial_mgr.get_logs()
            }
        })
        
        while True:
            # Handle incoming WebSocket commands from frontend
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "command":
                device = data.get("device")
                state = bool(data.get("state"))
                cmd = DeviceCommand(device=device, state=state)
                send_device_command(cmd)
            elif msg_type == "mode":
                mode_val = data.get("value", "AUTO")
                set_operating_mode(ModeCommand(value=mode_val))
            elif msg_type == "scenario":
                trigger_scenario(data.get("payload", {}))
                
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        if websocket in active_websockets:
            active_websockets.remove(websocket)
