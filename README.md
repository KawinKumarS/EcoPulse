# EcoPulse – Intelligent Energy Management for Sustainable Buildings

**EcoPulse** is a commercial-grade, IoT-driven intelligent energy management system and digital twin designed for miniature sustainable buildings. It pairs an **Arduino Nano (ATmega328P)** edge microcontroller over USB Serial with a high-performance **Python FastAPI** backend (handling serial framing, SQLite time-series telemetry, and WebSockets) and a modern **React + Vite + TypeScript + Tailwind CSS** dashboard.

> **100% Offline & Local**: Operates completely without internet, cloud, or Firebase dependencies. If the laptop is disconnected or powered off, the Arduino Nano autonomously maintains edge lighting and ventilation controls.

---

## 1. System Architecture

```
┌────────────────────────────────┐
│   Miniature Building Model     │
│  - PIR Motion Sensor (D2)      │
│  - DHT11 Temp/Humidity (D3)    │
│  - Room LED Lighting (D5)      │
│  - DC Ventilation Fan (D6)     │
│  - LDR Light Sensor (A0)       │
│  - Solar Voltage Divider (A1)  │
│  - Battery Storage (A2)        │
└──────────────┬─────────────────┘
               │ Digital / Analog IO
┌──────────────▼─────────────────┐
│     Arduino Nano (ATmega328P)  │
│  - 1 Hz Telemetry Broadcast    │
│  - Autonomous Edge Rules       │
│  - Non-blocking millis() loop  │
└──────────────┬─────────────────┘
               │ USB Serial (9600 baud, Newline-delimited JSON)
┌──────────────▼─────────────────┐
│     Python FastAPI Backend     │
│  - PySerial connection owner   │
│  - Auto-reconnect & lock       │
│  - SQLite time-series logging  │
│  - Physics Demo Simulator      │
│  - Real-time WebSockets (/ws)  │
└──────────────┬─────────────────┘
               │ Bidirectional WebSocket & REST API
┌──────────────▼─────────────────┐
│     React + Vite Dashboard     │
│  - 2D Interactive Floor Plan   │
│  - Live Recharts Analytics     │
│  - Actuator Controls & Modes   │
│  - CSV Export & Reports        │
└────────────────────────────────┘
```

---

## 2. Hardware Wiring & Pin Assignments

| Component | Nano Pin | Type | Circuit Connection & Notes |
| :--- | :--- | :--- | :--- |
| **USB Serial** | `D0 (RX)` / `D1 (TX)` | UART | Dedicated to USB serial (CH340 / FT232). Default: 9600 baud. |
| **PIR Motion Sensor** | `D2` | Digital Input | Out pin to D2. Powered from 5V. High pulse on motion. |
| **DHT11 Sensor** | `D3` | Digital I/O | Data pin to D3 with 4.7kΩ pull-up resistor to 5V. |
| **Room LED Lighting** | `D5` | Digital Out (PWM)| Connected via 2N2222 NPN transistor with 1kΩ base resistor and 220Ω series LED resistor (~30mA @ 5V = 0.15W). |
| **DC Ventilation Fan** | `D6` | Digital Out (PWM)| Driven via N-channel logic MOSFET (e.g. IRLZ44N, 2N7000) with 10kΩ gate pull-down and 1N4007 flyback diode across motor terminals (~180mA @ 5V = 0.90W). |
| **LDR Light Sensor** | `A0` | Analog Input | Voltage divider: LDR connected to 5V, 10kΩ fixed resistor connected to GND. Measures ambient light (0-1023 counts). |
| **Solar Voltage Sensor**| `A1` | Analog Input | 2:1 resistive divider (10kΩ R1 from Solar(+), 10kΩ R2 to GND). Measures 0-10V on solar array. |
| **Battery Voltage Sensor**| `A2` | Analog Input | Measures terminal voltage of 3.7V rechargeable Li-ion battery (max 4.2V, cutoff 3.35V). |

---

## 3. Serial Communication Protocol

### A. Arduino Sensor Telemetry (Sent every ~1000ms):
```json
{"type":"sensor","occupancy":true,"light_level":320,"temperature":29.5,"solar_voltage":5.8,"battery_voltage":3.9,"light":true,"fan":false,"mode":"AUTO"}
```

### B. Host Dashboard Command:
```json
{"type":"command","device":"light","state":true}
{"type":"command","device":"fan","state":false}
```

### C. Operating Authority Mode Switch:
```json
{"type":"mode","value":"MANUAL"}
{"type":"mode","value":"AUTO"}
```

### D. Arduino Command Acknowledgement:
```json
{"type":"ack","device":"light","state":true,"status":"success"}
{"type":"ack","mode":"MANUAL","status":"success"}
```

---

## 4. Energy Calculations & Mathematical Model

### Power:
$$P = V \times I$$
- **Building Load Power**:
  - Quiescent Nano MCU + Sensors: $\approx 0.125\text{ W}$ (~25 mA @ 5V)
  - Room LED: $\approx 0.15\text{ W}$ (~30 mA @ 5V)
  - DC Fan: $\approx 0.90\text{ W}$ (~180 mA @ 5V)
  - Total Load: $P_{\text{load}} = 0.125 + (0.15 \times \text{LED}) + (0.90 \times \text{Fan})\text{ W}$
- **Solar Power Generation**:
  - Calculated from measured solar voltage ($V_{\text{solar}}$ on A1) and irradiance from LDR ($A0$), matched against the solar panel IV curve ($I_{\text{peak}} \approx 0.16\text{ A}$).
- **Net Power Balance**:
  - $P_{\text{net}} = P_{\text{solar}} - P_{\text{load}}$ (Positive = net charging; Negative = net discharging from battery).
- **Accumulated Energy (Wh)**:
  - Numerical trapezoidal integration: $E = \sum \frac{P_t + P_{t-1}}{2} \times \Delta t \div 3600$
- **Solar Contribution**:
  - $\text{Solar Contribution} = \min\left(100\%, \frac{\text{Solar Generation (Wh)}}{\text{Load Consumption (Wh)}} \times 100\%\right)$
- **Estimated Battery Percentage**:
  - Interpolated from open-circuit / resting Li-ion discharge profile (4.20V = 100%, 3.75V = 50%, 3.30V = 0%). Labelled as an estimate.

---

## 5. Quick Start (Windows 11)

### Prerequisites:
- **Python 3.12** (installed)
- **Node.js v20+** & **npm** (installed)
- **Arduino IDE** (for flashing firmware)

### 1-Click Launch:
Double-click `start_ecopulse.bat` in the project root. This starts:
1. **FastAPI Backend**: `http://localhost:8000` (API documentation at `http://localhost:8000/docs`)
2. **React Dashboard**: `http://localhost:5173`

---

## 6. Flashing Arduino Nano Firmware

1. Connect the Arduino Nano to your computer via USB.
2. Open `firmware/ecopulse_nano/ecopulse_nano.ino` in Arduino IDE.
3. Select **Tools > Board > Arduino Nano** and **Processor > ATmega328P** (or *ATmega328P (Old Bootloader)* for CH340 clones).
4. Select the COM port and click **Upload**.
5. In the EcoPulse Dashboard, navigate to **Hardware Settings**, select the detected COM port, and click **Connect**.

---

## 7. High-Fidelity Demo Simulation Mode

If an Arduino Nano is not connected, EcoPulse automatically activates the **Demo Simulator**:
- Generates realistic diurnal sunlight curves according to simulated time-of-day.
- Simulates room occupancy, solar heating, and active DC fan cooling dynamics.
- Supports 1-click test scenarios: **Trigger Motion**, **Inject Heat Spike**, and **Simulate Low Battery**.
- Clearly displays the **"DEMO SIMULATOR ACTIVE"** badge.
