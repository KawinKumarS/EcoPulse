import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type {
  SensorReading,
  EnergySummary,
  AlertItem,
  SerialPortInfo,
  SystemStatus,
  AutomationConfig,
  CommandAck,
  OperatingMode,
  DeviceTarget,
  SerialLogEntry
} from '../types';

interface EcoPulseContextType {
  telemetry: SensorReading;
  history: SensorReading[];
  energySummary: EnergySummary;
  alerts: AlertItem[];
  ports: SerialPortInfo[];
  serialLogs: SerialLogEntry[];
  systemStatus: SystemStatus;
  config: AutomationConfig;
  lastAck: CommandAck | null;
  lastConnectError: string | null;
  wsConnected: boolean;
  tempUnit: 'C' | 'F';
  setTempUnit: (unit: 'C' | 'F') => void;

  // Actions
  sendCommand: (device: DeviceTarget, state: boolean) => Promise<void>;
  sendMode: (mode: OperatingMode) => Promise<void>;
  updateConfig: (cfg: Partial<AutomationConfig>) => Promise<void>;
  triggerScenario: (action: string, payload?: Record<string, any>) => Promise<void>;
  connectSerial: (port: string, baud: number) => Promise<boolean>;
  disconnectSerial: () => Promise<void>;
  fetchPorts: () => Promise<void>;
  acknowledgeAlert: (alertId: number) => Promise<void>;
}

const DEFAULT_CONFIG: AutomationConfig = {
  temp_threshold: 28.0,
  light_threshold: 400,
  occupancy_timeout: 2,
  battery_cutoff: 3.35,
};

const INITIAL_TELEMETRY: SensorReading = {
  timestamp: Date.now() / 1000,
  occupancy: false,
  light_level: 420,
  temperature: 26.5,
  humidity: 52.0,
  solar_voltage: 5.82,
  battery_voltage: 3.94,
  light: false,
  led1: false,
  led2: false,
  fan: false,
  mode: 'AUTO',
  has_dht11: true,
  has_ldr: true,
  has_solar: true,
  has_battery: true,
  hardware_profile: 'simulator',
  solar_power_w: 0.46,
  load_power_w: 0.125,
  net_power_w: 0.335,
  estimated_battery_pct: 78.0,
  is_simulated: true,
  is_connected: false,
  port: null,
  simulated_hour: 12.0,
  weather: 'sunny'
};

const INITIAL_ENERGY: EnergySummary = {
  total_solar_wh: 3.42,
  total_load_wh: 1.86,
  net_wh: 1.56,
  solar_contribution_pct: 84.5,
  co2_saved_grams: 2.80,
  data_points: 120
};

const EcoPulseContext = createContext<EcoPulseContextType | null>(null);

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

export const EcoPulseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [telemetry, setTelemetry] = useState<SensorReading>(INITIAL_TELEMETRY);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [energySummary, setEnergySummary] = useState<EnergySummary>(INITIAL_ENERGY);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [serialLogs, setSerialLogs] = useState<SerialLogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    is_connected: false,
    port: null,
    baud_rate: 9600,
    is_simulated: true,
    active_mode: 'AUTO',
    total_readings: 0,
    uptime_seconds: 0,
    last_seen: null
  });
  const [config, setConfig] = useState<AutomationConfig>(DEFAULT_CONFIG);
  const [lastAck, setLastAck] = useState<CommandAck | null>(null);
  const [lastConnectError, setLastConnectError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const fallbackHourRef = useRef<number>(12.0);

  // --- WebSocket Connection Manager ---
  useEffect(() => {
    let isUnmounted = false;

    function connectWs() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'telemetry') {
              const item = data.payload as SensorReading;
              setTelemetry(item);
              setHistory(prev => {
                const next = [...prev, item];
                return next.length > 60 ? next.slice(next.length - 60) : next;
              });
            } else if (data.type === 'init') {
              if (data.payload?.telemetry && Object.keys(data.payload.telemetry).length > 0) {
                setTelemetry(data.payload.telemetry);
              }
              if (data.payload?.config) {
                setConfig(data.payload.config);
              }
              if (data.payload?.status) {
                setSystemStatus(data.payload.status);
              }
              if (Array.isArray(data.payload?.serial_logs)) {
                setSerialLogs(data.payload.serial_logs);
              }
            } else if (data.type === 'serial_log') {
              const entry = data.payload as SerialLogEntry;
              setSerialLogs(prev => {
                const next = [...prev, entry];
                return next.length > 60 ? next.slice(next.length - 60) : next;
              });
            } else if (data.type === 'ack') {
              setLastAck({
                ...data.payload,
                timestamp: Date.now()
              });
            } else if (data.type === 'status') {
              setSystemStatus(prev => ({
                ...prev,
                is_connected: data.is_connected,
                is_simulated: data.is_simulated,
                port: data.port ?? prev.port
              }));
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setWsConnected(false);
          reconnectTimeoutRef.current = window.setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsConnected(false);
        reconnectTimeoutRef.current = window.setTimeout(connectWs, 3000);
      }
    }

    connectWs();

    return () => {
      isUnmounted = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // --- Client-side fallback ticker when WS is disconnected ---
  useEffect(() => {
    if (wsConnected) return;

    const interval = setInterval(() => {
      fallbackHourRef.current = (fallbackHourRef.current + 0.05) % 24;
      const hour = fallbackHourRef.current;
      const isDay = hour >= 6 && hour <= 18;
      const angle = isDay ? Math.sin(((hour - 6) / 12) * Math.PI) : 0;
      const solarV = isDay ? Math.max(0.1, 6.0 * angle + (Math.random() * 0.2 - 0.1)) : 0.05;
      const ldr = isDay ? Math.min(1023, Math.floor(750 * angle) + (telemetry.light ? 180 : 0)) : 25;
      const solarW = solarV > 1.0 ? Math.round(solarV * 0.16 * (ldr / 850) * 100) / 100 : 0.0;
      const loadW = 0.125 + (telemetry.led1 ? 0.15 : 0) + (telemetry.led2 ? 0.15 : 0) + (telemetry.fan ? 0.90 : 0);
      const netW = Math.round((solarW - loadW) * 1000) / 1000;

      setTelemetry(prev => {
        const updated: SensorReading = {
          ...prev,
          timestamp: Date.now() / 1000,
          solar_voltage: Math.round(solarV * 100) / 100,
          light_level: ldr,
          solar_power_w: solarW,
          load_power_w: loadW,
          net_power_w: netW,
          temperature: Math.round((prev.temperature + (Math.random() * 0.1 - 0.05)) * 10) / 10,
          is_simulated: true,
          simulated_hour: Math.round(hour * 10) / 10
        };

        setHistory(h => [...h.slice(-59), updated]);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [wsConnected, telemetry.light, telemetry.led1, telemetry.led2, telemetry.fan]);

  // Periodic polling for status, energy, alerts and available serial ports
  useEffect(() => {
    let isCancelled = false;

    async function pollRestData() {
      try {
        const [statusRes, energyRes, alertsRes] = await Promise.all([
          fetch(`${API_BASE}/api/status`).catch(() => null),
          fetch(`${API_BASE}/api/energy`).catch(() => null),
          fetch(`${API_BASE}/api/alerts`).catch(() => null),
        ]);

        if (isCancelled) return;

        if (statusRes?.ok) {
          const s = await statusRes.json();
          setSystemStatus(s);
        }
        if (energyRes?.ok) {
          const e = await energyRes.json();
          setEnergySummary(e);
        }
        if (alertsRes?.ok) {
          const a = await alertsRes.json();
          setAlerts(a);
        }
      } catch {
        // Fallback gracefully
      }
    }

    pollRestData();
    const interval = setInterval(pollRestData, 4000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  const fetchPorts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ports`);
      if (res.ok) {
        const p = await res.json();
        setPorts(p);
      }
    } catch {
      // Ignore if server is offline
    }
  };

  useEffect(() => {
    fetchPorts();
    fetch(`${API_BASE}/api/config`)
      .then(r => r.json())
      .then(cfg => setConfig(cfg))
      .catch(() => {});
  }, []);

  // --- Actions ---

  const sendCommand = async (device: DeviceTarget, state: boolean) => {
    setTelemetry(prev => {
      const next = { ...prev, mode: 'MANUAL' as OperatingMode };
      if (device === 'light') {
        next.light = state;
        next.led1 = state;
        next.led2 = state;
      } else if (device === 'led1') {
        next.led1 = state;
        next.light = state || Boolean(prev.led2);
      } else if (device === 'led2') {
        next.led2 = state;
        next.light = Boolean(prev.led1) || state;
      } else if (device === 'fan') {
        next.fan = state;
      }
      return next;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        device,
        state
      }));
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device, state })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ack) {
            setLastAck({ ...data.ack, timestamp: Date.now() });
          }
        }
      } catch {
        // Handled optimistically
      }
    }
  };

  const sendMode = async (mode: OperatingMode) => {
    setTelemetry(prev => ({ ...prev, mode }));
    setSystemStatus(prev => ({ ...prev, active_mode: mode }));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mode',
        value: mode
      }));
    } else {
      try {
        await fetch(`${API_BASE}/api/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: mode })
        });
      } catch {
        // Ignored
      }
    }
  };

  const updateConfig = async (newCfg: Partial<AutomationConfig>) => {
    setConfig(prev => ({ ...prev, ...newCfg }));
    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch {
      // Fallback in-memory
    }
  };

  const triggerScenario = async (action: string, payload: Record<string, any> = {}) => {
    if (action === 'motion') {
      setTelemetry(prev => ({ ...prev, occupancy: true }));
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'scenario',
        payload: { action, ...payload }
      }));
    } else {
      try {
        await fetch(`${API_BASE}/api/simulation/scenario`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...payload })
        });
      } catch {
        // In-memory fallback
      }
    }
  };

  const connectSerial = async (port: string, baud: number): Promise<boolean> => {
    setLastConnectError(null);
    try {
      const res = await fetch(`${API_BASE}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, baud_rate: baud })
      });
      if (res.ok) {
        setSystemStatus(prev => ({
          ...prev,
          is_connected: true,
          port,
          baud_rate: baud,
          is_simulated: false
        }));
        return true;
      }
      const errBody = await res.json().catch(() => null);
      setLastConnectError(errBody?.detail || `Could not open ${port}.`);
      return false;
    } catch {
      setLastConnectError('Backend service unreachable on http://localhost:8000.');
      return false;
    }
  };

  const disconnectSerial = async () => {
    try {
      await fetch(`${API_BASE}/api/disconnect`, { method: 'POST' });
      setSystemStatus(prev => ({
        ...prev,
        is_connected: false,
        port: null,
        is_simulated: true
      }));
    } catch {
      // Ignored
    }
  };

  const acknowledgeAlert = async (alertId: number) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/ack`, { method: 'POST' });
    } catch {
      // Handled
    }
  };

  return (
    <EcoPulseContext.Provider
      value={{
        telemetry,
        history,
        energySummary,
        alerts,
        ports,
        serialLogs,
        systemStatus,
        config,
        lastAck,
        lastConnectError,
        wsConnected,
        tempUnit,
        setTempUnit,
        sendCommand,
        sendMode,
        updateConfig,
        triggerScenario,
        connectSerial,
        disconnectSerial,
        fetchPorts,
        acknowledgeAlert
      }}
    >
      {children}
    </EcoPulseContext.Provider>
  );
};

export const useEcoPulse = () => {
  const context = useContext(EcoPulseContext);
  if (!context) {
    throw new Error('useEcoPulse must be used within an EcoPulseProvider');
  }
  return context;
};
