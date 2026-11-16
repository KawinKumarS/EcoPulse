from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class SensorReading(BaseModel):
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    occupancy: bool
    light_level: int = 0
    temperature: float = 0.0
    humidity: Optional[float] = 0.0
    solar_voltage: float = 0.0
    battery_voltage: float = 0.0
    light: bool = False
    led1: bool = False
    led2: bool = False
    fan: bool = False
    mode: Literal["AUTO", "MANUAL"] = "AUTO"
    off_delay_ms: int = 2000
    hardware_profile: str = "full_solar_building"

    # Sensor presence flags (prevents false alerts or fake numbers when only PIR + LEDs are wired)
    has_dht11: bool = True
    has_ldr: bool = True
    has_solar: bool = True
    has_battery: bool = True

    # Calculated / enriched fields
    solar_power_w: float = 0.0
    load_power_w: float = 0.0
    net_power_w: float = 0.0
    estimated_battery_pct: float = 0.0
    is_simulated: bool = False

class DeviceCommand(BaseModel):
    device: Literal["light", "led1", "led2", "fan"]
    state: bool

class ModeCommand(BaseModel):
    value: Literal["AUTO", "MANUAL"]

class ConfigUpdate(BaseModel):
    temp_threshold: Optional[float] = None
    light_threshold: Optional[int] = None
    occupancy_timeout: Optional[int] = None
    battery_cutoff: Optional[float] = None

class SerialConnectRequest(BaseModel):
    port: str
    baud_rate: int = 9600

class AlertItem(BaseModel):
    id: Optional[int] = None
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    alert_type: str
    severity: Literal["critical", "warning", "info"]
    message: str
    acknowledged: bool = False
    resolved: bool = False

class SystemStatus(BaseModel):
    is_connected: bool
    port: Optional[str] = None
    baud_rate: int = 9600
    is_simulated: bool = True
    active_mode: str = "AUTO"
    total_readings: int = 0
    uptime_seconds: float = 0.0
    last_seen: Optional[float] = None
    hardware_profile: str = "simulator"
