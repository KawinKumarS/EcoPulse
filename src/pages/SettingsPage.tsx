import React, { useState, useEffect } from 'react';
import {
  Radio,
  RefreshCw,
  AlertTriangle,
  Cpu,
  Power,
  Terminal
} from 'lucide-react';
import { useEcoPulse } from '../context/EcoPulseContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { formatTime } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const {
    ports,
    fetchPorts,
    serialLogs,
    systemStatus,
    lastConnectError,
    connectSerial,
    disconnectSerial
  } = useEcoPulse();

  const [selectedPort, setSelectedPort] = useState<string>('COM6');
  const [selectedBaud, setSelectedBaud] = useState<number>(9600);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Auto-select detected Arduino port (e.g. COM6 CH340) when port list updates
  useEffect(() => {
    if (systemStatus.port) {
      setSelectedPort(systemStatus.port);
      return;
    }
    if (ports.length > 0) {
      const arduinoPort = ports.find(p => p.is_likely_arduino) || ports[0];
      setSelectedPort(arduinoPort.port);
    }
  }, [ports, systemStatus.port]);

  const handleConnect = async () => {
    setConnecting(true);
    setLocalError(null);
    const ok = await connectSerial(selectedPort, selectedBaud);
    setConnecting(false);
    if (!ok) {
      setLocalError(
        `Failed to connect to ${selectedPort}. Close Arduino IDE Serial Monitor if it is currently open on ${selectedPort}.`
      );
    }
  };

  const handleDisconnect = async () => {
    setLocalError(null);
    await disconnectSerial();
  };

  const displayedError = localError || lastConnectError;

  return (
    <div className="space-y-6">
      {/* Hardware Serial Interface Manager */}
      <Card
        title="USB Serial Hardware Connection Manager"
        subtitle="Manage communication with physical Arduino Nano (ATmega328P / CH340)"
        icon={<Radio className="w-4 h-4 text-emerald-600" />}
        action={
          <button
            onClick={() => fetchPorts()}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scan Ports</span>
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* COM Port Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Serial COM Port:</label>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={systemStatus.is_connected}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-600 font-mono disabled:opacity-50 shadow-sm"
              >
                {ports.length > 0 ? (
                  ports.map((p) => (
                    <option key={p.port} value={p.port}>
                      {p.port} — {p.description} {p.is_likely_arduino ? '★ (Arduino)' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="COM6">COM6 (CH340 Default)</option>
                    <option value="COM3">COM3</option>
                    <option value="COM4">COM4</option>
                    <option value="COM5">COM5</option>
                    <option value="/dev/ttyUSB0">/dev/ttyUSB0 (Linux/Mac)</option>
                  </>
                )}
              </select>
            </div>

            {/* Baud Rate Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Baud Rate:</label>
              <select
                value={selectedBaud}
                onChange={(e) => setSelectedBaud(Number(e.target.value))}
                disabled={systemStatus.is_connected}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-600 font-mono disabled:opacity-50 shadow-sm"
              >
                <option value={9600}>9600 bps (Arduino Default)</option>
                <option value={19200}>19200 bps</option>
                <option value={57600}>57600 bps</option>
                <option value={115200}>115200 bps</option>
              </select>
            </div>

            {/* Connect / Disconnect Action */}
            <div className="space-y-1.5 flex flex-col justify-end">
              {systemStatus.is_connected ? (
                <button
                  onClick={handleDisconnect}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Power className="w-4 h-4" />
                  <span>Disconnect Hardware</span>
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Radio className="w-4 h-4" />
                  <span>{connecting ? 'Connecting...' : `Connect to ${selectedPort}`}</span>
                </button>
              )}
            </div>
          </div>

          {displayedError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{displayedError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Connection Status:</span>
              <Badge variant={systemStatus.is_connected ? 'green' : 'amber'}>
                {systemStatus.is_connected ? `Connected (${systemStatus.port})` : 'Offline (Simulator Mode Active)'}
              </Badge>
            </div>
            <div className="text-slate-500 font-mono font-medium">
              PySerial 3.5 • {ports.length} Port{ports.length === 1 ? '' : 's'} Detected
            </div>
          </div>
        </div>
      </Card>

      {/* Live Arduino Serial Monitor Console */}
      <Card
        title="Live Arduino Serial Console"
        subtitle="Real-time USB serial stream (supports both plain-text status lines and EcoPulse JSON)"
        icon={<Terminal className="w-4 h-4 text-slate-700" />}
      >
        <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs h-56 overflow-y-auto space-y-1.5 border border-slate-800">
          {serialLogs.length === 0 ? (
            <div className="text-slate-500 h-full flex items-center justify-center">
              Connect your Arduino Nano above to view live serial output...
            </div>
          ) : (
            serialLogs.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">{formatTime(entry.timestamp)}</span>
                <span
                  className={
                    entry.direction === 'TX'
                      ? 'text-amber-400 font-bold shrink-0'
                      : entry.direction === 'ERR'
                      ? 'text-rose-400 font-bold shrink-0'
                      : entry.direction === 'SYS'
                      ? 'text-sky-400 font-bold shrink-0'
                      : 'text-emerald-400 font-bold shrink-0'
                  }
                >
                  [{entry.direction}]
                </span>
                <span className="text-slate-200 break-all">{entry.line}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Arduino Nano Hardware Pinout Reference Guide */}
      <Card
        title="Hardware Architecture & Pin Configuration Guide"
        subtitle="Pinout matching your physical Arduino Nano build and optional sensor expansion"
        icon={<Cpu className="w-4 h-4 text-sky-600" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h5 className="font-bold text-slate-900 font-sans">Active Hardware Pins (Wired):</h5>
            <ul className="space-y-1.5 text-slate-700">
              <li><strong className="text-emerald-700 font-bold">D0 / D1:</strong> USB Hardware UART Serial (9600 baud)</li>
              <li><strong className="text-rose-700 font-bold">D2 (PIR_PIN):</strong> PIR Motion Sensor (Active High)</li>
              <li><strong className="text-amber-700 font-bold">D5 (LED1):</strong> Zone 1 LED Lighting Output</li>
              <li><strong className="text-amber-700 font-bold">D6 (LED2):</strong> Zone 2 LED Lighting Output</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h5 className="font-bold text-slate-900 font-sans">Optional Expansion Pins (Enable in Firmware):</h5>
            <ul className="space-y-1.5 text-slate-700">
              <li><strong className="text-sky-700 font-bold">D3:</strong> DHT11 Temperature &amp; Humidity Data Bus</li>
              <li><strong className="text-amber-700 font-bold">A0:</strong> LDR Ambient Light Voltage Divider (0-1023)</li>
              <li><strong className="text-amber-700 font-bold">A1:</strong> Solar Panel Voltage (2:1 Divider: 10k/10k)</li>
              <li><strong className="text-emerald-700 font-bold">A2:</strong> Rechargeable Battery Voltage (Direct/Divider)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
