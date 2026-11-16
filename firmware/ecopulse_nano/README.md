# EcoPulse Arduino Nano Hardware & Firmware Guide

## 1. Hardware Pin Assignment (Active Build)

| Component | Arduino Nano Pin | Type | Notes |
| :--- | :--- | :--- | :--- |
| **USB Serial** | `D0 (RX)` / `D1 (TX)` | UART | CH340 USB-Serial @ 9600 baud (e.g., `COM6`). |
| **PIR Motion Sensor** | `D2 (PIR_PIN)` | Digital Input | Out pin to D2. Powered from 5V. Triggers `LED1` and `LED2` for `OFF_DELAY` (2000 ms). |
| **Zone 1 LED (`LED1`)** | `D5` | Digital Output | Zone 1 room LED via current-limiting resistor (220Ω–330Ω) or transistor driver (~30mA @ 5V = 0.15W). |
| **Zone 2 LED (`LED2`)** | `D6` | Digital Output | Zone 2 room LED via current-limiting resistor (220Ω–330Ω) or transistor driver (~30mA @ 5V = 0.15W). |

### Optional Sensor Expansion
Set `#define ENABLE_EXTRA_SENSORS 1` in `ecopulse_nano.ino` once you wire these optional sensors:
- **D3**: DHT11 Temperature & Humidity (with 4.7kΩ pull-up resistor)
- **A0**: LDR Ambient Light Sensor (10kΩ divider)
- **A1**: Solar Voltage Divider (2:1 divider, 10kΩ / 10kΩ)
- **A2**: Battery Voltage Input

---

## 2. Backward Compatibility & Two-Way Control

- **Works Immediately:** The EcoPulse Python backend understands both your original plain-text serial messages (`"MOTION DETECTED - LIGHTS ON"`, `"NO MOTION - LIGHTS OFF"`, `"System Ready"`) and the integrated JSON telemetry.
- **Full Two-Way Control:** Flashing `firmware/ecopulse_nano/ecopulse_nano.ino` enables:
  - Live `AUTO` (PIR autonomous) / `MANUAL` (dashboard override) switching
  - Independent `LED1` (D5) & `LED2` (D6) switches from the dashboard
  - Live `OFF_DELAY` timeout tuning from the **Automation Rules** page
  - Command acknowledgements (`{"type":"ack",...}`)

---

## 3. Flashing the Firmware

1. Open **Arduino IDE** and open `firmware/ecopulse_nano/ecopulse_nano.ino`.
2. **Important:** Close the **Arduino Serial Monitor** if it is open (only one program can hold `COM6` at a time).
3. In **Tools**:
   - **Board:** Arduino Nano
   - **Processor:** ATmega328P *(or ATmega328P (Old Bootloader) for CH340 clones)*
   - **Port:** `COM6`
4. Click **Upload**.
5. In the EcoPulse web dashboard, go to **Hardware Settings**, verify `COM6` is selected, and click **Connect to COM6**.
