"""
EcoPulse Hardware Simulator Engine
Simulates complete Arduino Nano sensor dynamics with realistic physical models:
  - Diurnal solar irradiance curve
  - Dynamic battery charge/discharge voltage based on net power flow
  - Room thermal inertia with ventilation cooling effect
  - Occupancy generation with realistic presence intervals
  - Ambient light including sunlight + indoor LED reflection
  - Full adherence to the Arduino Nano newline-delimited JSON protocol and command acks
"""
import time
import math
import random
from typing import Dict, Any, Optional

class ArduinoSimulator:
    def __init__(self):
        self.mode = "AUTO"
        self.light = False
        self.led1 = False
        self.led2 = False
        self.fan = False
        self.occupancy = False
        
        # Environmental and electrical states
        self.temperature = 26.5       # °C
        self.humidity = 52.0          # %
        self.solar_voltage = 5.8      # V
        self.battery_voltage = 3.92   # V (Li-ion ~75%)
        self.light_level = 350        # LDR raw ADC (0-1023)
        
        # Timing trackers
        self.last_motion_time = time.time()
        self.simulated_hour = 12.0    # 12:00 PM noon default
        self.weather = "sunny"        # "sunny", "cloudy", "overcast", "night"
        
        # Automation thresholds
        self.temp_threshold = 28.0
        self.temp_hysteresis = 1.0
        self.light_threshold = 400
        self.occ_timeout = 10.0       # seconds
        self.battery_cutoff = 3.35    # V

        # Scenario overrides
        self.forced_motion = False
        self.forced_motion_expiry = 0.0

    def set_mode(self, mode: str) -> dict:
        self.mode = "MANUAL" if mode.upper() == "MANUAL" else "AUTO"
        return {"type": "ack", "mode": self.mode, "status": "success"}

    def set_device(self, device: str, state: bool) -> dict:
        self.mode = "MANUAL"
        if device == "light":
            self.light = state
            self.led1 = state
            self.led2 = state
        elif device == "led1":
            self.led1 = state
            self.light = self.led1 or self.led2
        elif device == "led2":
            self.led2 = state
            self.light = self.led1 or self.led2
        elif device == "fan":
            self.fan = state
        return {"type": "ack", "device": device, "state": state, "mode": self.mode, "status": "success"}

    def trigger_motion(self, duration_sec: float = 15.0):
        self.forced_motion = True
        self.forced_motion_expiry = time.time() + duration_sec
        self.last_motion_time = time.time()

    def set_weather(self, weather: str):
        if weather in ["sunny", "cloudy", "overcast", "night"]:
            self.weather = weather

    def set_time_of_day(self, hour: float):
        self.simulated_hour = max(0.0, min(24.0, hour))

    def step(self, dt: float = 1.0) -> Dict[str, Any]:
        """
        Advances the simulated physics by dt seconds.
        """
        now = time.time()
        
        # Advance simulated hour slowly (1 real sec = 2 simulated minutes for dynamic preview, or follow real clock)
        self.simulated_hour = (self.simulated_hour + (dt / 30.0)) % 24.0
        
        # 1. Solar Irradiance Model
        # Sunlight curve: peaks at 13:00 (1:00 PM), zero before 06:00 and after 18:30
        if 6.0 <= self.simulated_hour <= 18.5 and self.weather != "night":
            solar_angle = math.sin((self.simulated_hour - 6.0) / 12.5 * math.pi)
            base_solar_v = 6.2 * solar_angle
            
            # Weather attenuations
            if self.weather == "sunny":
                weather_mult = 1.0 + random.uniform(-0.03, 0.03)
            elif self.weather == "cloudy":
                # Simulated passing clouds
                cloud_wave = 0.5 + 0.4 * math.sin(now * 0.2)
                weather_mult = cloud_wave + random.uniform(-0.05, 0.05)
            elif self.weather == "overcast":
                weather_mult = 0.25 + random.uniform(-0.02, 0.02)
            else:
                weather_mult = 0.0
                
            self.solar_voltage = max(0.0, min(6.8, base_solar_v * weather_mult))
            raw_ldr = int(750 * solar_angle * weather_mult)
        else:
            self.solar_voltage = max(0.0, random.uniform(0.05, 0.15))
            raw_ldr = 20 + int(random.uniform(0, 15))

        # Add indoor LED light contribution to LDR if light is on
        if self.light:
            raw_ldr += 180
        self.light_level = min(1023, max(0, raw_ldr))

        # 2. Occupancy Simulation
        if self.forced_motion:
            if now < self.forced_motion_expiry:
                self.occupancy = True
                self.last_motion_time = now
            else:
                self.forced_motion = False
                self.occupancy = False
        else:
            # Random natural walk-in every now and then
            if random.random() < 0.05:
                self.occupancy = True
                self.last_motion_time = now
            elif self.occupancy and (now - self.last_motion_time > 4.0):
                self.occupancy = False

        # 3. Automation Logic (matching Arduino Nano firmware exactly)
        if self.mode == "AUTO":
            # Low battery protection
            if self.battery_voltage < self.battery_cutoff:
                self.light = False
                self.led1 = False
                self.led2 = False
                self.fan = False
            else:
                # Occupancy + Daylight rule
                is_dark_enough = (self.light_level < self.light_threshold)
                is_occupied = self.occupancy or (now - self.last_motion_time < self.occ_timeout)
                self.light = bool(is_occupied and is_dark_enough)
                self.led1 = self.light
                self.led2 = self.light

                # Temperature ventilation rule (with hysteresis)
                if self.temperature >= self.temp_threshold:
                    self.fan = True
                elif self.temperature <= (self.temp_threshold - self.temp_hysteresis):
                    self.fan = False

        # 4. Temperature & Humidity Physics
        # Ambient temperature drifts towards outdoor equilibrium (~29°C midday, ~22°C night)
        ambient_target = 24.0 + 5.0 * math.sin((self.simulated_hour - 8.0) / 12.0 * math.pi)
        # Solar radiation adds thermal gain
        ambient_target += (self.solar_voltage / 6.0) * 2.5
        
        # DC ventilation fan creates active cooling airflow (-2.5°C reduction)
        if self.fan:
            ambient_target -= 2.8

        # Approach target with thermal inertia
        self.temperature += (ambient_target - self.temperature) * 0.04
        self.temperature += random.uniform(-0.04, 0.04)

        # Humidity anti-correlates slightly with temperature
        self.humidity = max(35.0, min(80.0, 70.0 - (self.temperature - 20.0) * 1.8 + random.uniform(-0.2, 0.2)))

        # 5. Battery State-of-Charge Dynamics
        # Load power: LED (~0.15W), Fan (~0.90W), Quiescent MCU (~0.12W)
        load_watts = 0.125 + (0.15 if self.light else 0.0) + (0.90 if self.fan else 0.0)
        # Solar generation watts (~0.16A max * V)
        solar_watts = (self.solar_voltage * 0.16 * (self.light_level / 850.0)) if self.solar_voltage > 1.0 else 0.0
        net_watts = solar_watts - load_watts

        # Voltage change: +0.0004V/sec during net charging, -0.0005V/sec during net discharging
        delta_v = (net_watts * 0.0003) * dt
        self.battery_voltage = max(3.25, min(4.20, self.battery_voltage + delta_v))

        # Format message matching Arduino Nano exactly
        return {
            "type": "sensor",
            "occupancy": self.occupancy,
            "light_level": self.light_level,
            "temperature": round(self.temperature, 1),
            "humidity": round(self.humidity, 1),
            "solar_voltage": round(self.solar_voltage, 2),
            "battery_voltage": round(self.battery_voltage, 2),
            "light": self.light,
            "led1": self.led1,
            "led2": self.led2,
            "fan": self.fan,
            "mode": self.mode,
            "has_dht11": True,
            "has_ldr": True,
            "has_solar": True,
            "has_battery": True,
            "hardware_profile": "simulator",
            "simulated_hour": round(self.simulated_hour, 1),
            "weather": self.weather
        }
