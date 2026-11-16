"""
EcoPulse Energy Calculation Engine
Rigorously distinguishes between:
  - Measured values: Solar Voltage (A1), Battery Voltage (A2), LDR ADC (A0), PIR (D2), Temp (D3)
  - Calculated values: Load Power (from electrical circuit loads), Solar Power, Net Power Balance, Wh
  - Estimated values: Battery Percentage (derived via resting voltage curve)
"""
from .config import (
    LED_POWER_W,
    FAN_POWER_W,
    BASE_LOAD_POWER_W,
    BATTERY_CURVE
)

def calculate_load_power(light: bool, fan: bool, led1: bool = False, led2: bool = False, has_dual_leds: bool = False) -> float:
    """
    Computes real-time load power consumption in Watts based on active DC loads.
    Miniature Building Load Model:
      - Quiescent Nano MCU + Sensors: 0.125 W (~25 mA @ 5V)
      - Each LED channel (D5, D6): 0.15 W (~30 mA @ 5V)
      - DC Ventilation Fan (D6): 0.90 W (~180 mA @ 5V)
    """
    power = BASE_LOAD_POWER_W
    if has_dual_leds:
        if led1:
            power += LED_POWER_W
        if led2:
            power += LED_POWER_W
    else:
        if light:
            power += LED_POWER_W
    if fan:
        power += FAN_POWER_W
    return round(power, 3)

def estimate_solar_power(solar_voltage: float, light_level: int) -> float:
    """
    Computes solar generation power in Watts.
    Uses the measured solar voltage (A1) and ambient irradiance (A0 LDR).
    """
    if solar_voltage < 0.8:
        return 0.0

    irradiance_factor = min(1.0, max(0.0, light_level / 850.0)) if light_level > 0 else 0.75
    estimated_current_a = 0.16 * irradiance_factor * min(1.0, solar_voltage / 5.5)

    power = solar_voltage * estimated_current_a
    return round(power, 3)

def estimate_battery_percentage(battery_voltage: float) -> float:
    """
    Estimates battery state of charge (0 - 100%) from terminal voltage.
    Explicitly labelled as an estimate.
    """
    if battery_voltage <= 0.1:
        return 0.0
    if battery_voltage >= BATTERY_CURVE[0][0]:
        return 100.0
    if battery_voltage <= BATTERY_CURVE[-1][0]:
        return 0.0

    for i in range(len(BATTERY_CURVE) - 1):
        v_high, pct_high = BATTERY_CURVE[i]
        v_low, pct_low = BATTERY_CURVE[i + 1]
        if v_low <= battery_voltage <= v_high:
            fraction = (battery_voltage - v_low) / (v_high - v_low)
            est_pct = pct_low + fraction * (pct_high - pct_low)
            return round(est_pct, 1)

    return 50.0

def enrich_sensor_telemetry(raw: dict, is_simulated: bool = False) -> dict:
    """
    Takes raw sensor message from Arduino Nano (or simulator) and adds
    calculated power, battery estimate, and hardware profile metadata.
    Never invents sensor measurements when a sensor is not wired.
    """
    has_solar = bool(raw.get("has_solar", is_simulated or ("solar_voltage" in raw)))
    has_battery = bool(raw.get("has_battery", is_simulated or ("battery_voltage" in raw)))
    has_dht11 = bool(raw.get("has_dht11", is_simulated or ("temperature" in raw)))
    has_ldr = bool(raw.get("has_ldr", is_simulated or ("light_level" in raw)))

    solar_v = float(raw.get("solar_voltage", 0.0)) if has_solar else 0.0
    battery_v = float(raw.get("battery_voltage", 0.0)) if has_battery else 0.0
    light_lvl = int(raw.get("light_level", 0)) if has_ldr else 0
    temp_c = float(raw.get("temperature", 0.0)) if has_dht11 else 0.0
    hum_pct = float(raw.get("humidity", 0.0)) if has_dht11 else 0.0

    led1_state = bool(raw.get("led1", raw.get("light", False)))
    led2_state = bool(raw.get("led2", False))
    light_state = bool(raw.get("light", led1_state or led2_state))
    fan_state = bool(raw.get("fan", False))
    has_dual_leds = ("led1" in raw or "led2" in raw or raw.get("hardware_profile") in ("pir_dual_led", "pir_dual_led_legacy"))

    load_power = calculate_load_power(
        light=light_state,
        fan=fan_state,
        led1=led1_state,
        led2=led2_state,
        has_dual_leds=has_dual_leds
    )
    if "solar_power_w" in raw and raw.get("solar_source") == "dummy_varying":
        solar_power = round(float(raw["solar_power_w"]), 3)
    else:
        solar_power = estimate_solar_power(solar_v, light_lvl) if has_solar else 0.0
    net_power = round(solar_power - load_power, 3)
    battery_pct = estimate_battery_percentage(battery_v) if has_battery else 0.0

    enriched = dict(raw)
    enriched["occupancy"] = bool(raw.get("occupancy", False))
    enriched["led1"] = led1_state
    enriched["led2"] = led2_state
    enriched["light"] = light_state
    enriched["fan"] = fan_state
    enriched["mode"] = str(raw.get("mode", "AUTO"))
    enriched["solar_voltage"] = round(solar_v, 2)
    enriched["battery_voltage"] = round(battery_v, 2)
    enriched["light_level"] = light_lvl
    enriched["temperature"] = round(temp_c, 1)
    enriched["humidity"] = round(hum_pct, 1)
    enriched["has_solar"] = has_solar
    enriched["has_battery"] = has_battery
    enriched["has_dht11"] = has_dht11
    enriched["has_ldr"] = has_ldr
    enriched["hardware_profile"] = raw.get("hardware_profile", "simulator" if is_simulated else "pir_dual_led")
    enriched["solar_power_w"] = solar_power
    enriched["load_power_w"] = load_power
    enriched["net_power_w"] = net_power
    enriched["estimated_battery_pct"] = battery_pct
    enriched["is_simulated"] = is_simulated
    return enriched
