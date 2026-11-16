export type OperatingMode = 'AUTO' | 'MANUAL';
export type DeviceTarget = 'light' | 'led1' | 'led2' | 'fan';

export interface SensorReading {
  timestamp: number;
  occupancy: boolean;
  light_level: number;       // ADC counts 0-1023
  temperature: number;       // °C
  humidity: number;          // %
  solar_voltage: number;     // V (A1)
  battery_voltage: number;   // V (A2)
  light: boolean;            // Combined lighting state
  led1?: boolean;            // LED 1 state (Pin D5)
  led2?: boolean;            // LED 2 state (Pin D6)
  fan: boolean;              // Fan state (Pin D6 when fan wired)
  mode: OperatingMode;
  off_delay_ms?: number;
  hardware_profile?: string;

  // Sensor presence flags (for minimal PIR + Dual LED hardware builds)
  has_dht11?: boolean;
  has_ldr?: boolean;
  has_solar?: boolean;
  has_battery?: boolean;
  solar_source?: string;
  battery_source?: string;

  // Calculated and enriched values
  solar_power_w: number;
  load_power_w: number;
  net_power_w: number;
  estimated_battery_pct: number;
  is_simulated: boolean;
  is_connected?: boolean;
  port?: string | null;
  simulated_hour?: number;
  weather?: string;
}

export interface SerialLogEntry {
  timestamp: number;
  direction: 'RX' | 'TX' | 'SYS' | 'ERR';
  line: string;
}

export interface EnergySummary {
  total_solar_wh: number;
  total_load_wh: number;
  net_wh: number;
  solar_contribution_pct: number;
  co2_saved_grams: number;
  data_points: number;
}

export interface AlertItem {
  id: number;
  timestamp: number;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  acknowledged: boolean;
  resolved: boolean;
  resolved_at?: number | null;
}

export interface SerialPortInfo {
  port: string;
  description: string;
  hwid: string;
  is_likely_arduino: boolean;
}

export interface SystemStatus {
  is_connected: boolean;
  port: string | null;
  baud_rate: number;
  is_simulated: boolean;
  active_mode: OperatingMode;
  total_readings: number;
  uptime_seconds: number;
  last_seen: number | null;
  hardware_profile?: string;
}

export interface AutomationConfig {
  temp_threshold: number;     // °C
  light_threshold: number;    // ADC counts
  occupancy_timeout: number;  // seconds
  battery_cutoff: number;     // V
}

export interface CommandAck {
  type: 'ack';
  device?: DeviceTarget;
  state?: boolean;
  mode?: OperatingMode;
  status: 'success' | 'error';
  timestamp?: number;
}
