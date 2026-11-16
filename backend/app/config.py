import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "ecopulse.db"

# Serial default settings
DEFAULT_BAUD_RATE = 9600
SERIAL_TIMEOUT = 1.0

# Miniature Building Electrical Constants
# Load power consumption values for connected miniature devices:
# - Miniature Room LED: ~30mA @ 5V = 0.15W
# - Miniature DC Ventilation Fan: ~180mA @ 5V = 0.90W
# - Microcontroller & Sensors quiescent draw: ~25mA @ 5V = 0.125W
LED_POWER_W = 0.15
FAN_POWER_W = 0.90
BASE_LOAD_POWER_W = 0.125

# Single cell Li-ion voltage curve calibration points (Open-Circuit / Resting Approximation)
# 4.20V = 100%, 3.90V = 75%, 3.75V = 50%, 3.60V = 25%, 3.30V = 0%
BATTERY_CURVE = [
    (4.20, 100.0),
    (4.00, 85.0),
    (3.85, 70.0),
    (3.75, 50.0),
    (3.65, 30.0),
    (3.50, 15.0),
    (3.30, 0.0),
]

# Environmental & Automation Defaults
DEFAULT_TEMP_THRESHOLD = 28.0  # °C
DEFAULT_LIGHT_THRESHOLD = 400   # ADC counts (0-1023)
DEFAULT_OCC_TIMEOUT = 2        # seconds (matches Arduino OFF_DELAY = 2000ms)
DEFAULT_BATTERY_CUTOFF = 3.35  # V
