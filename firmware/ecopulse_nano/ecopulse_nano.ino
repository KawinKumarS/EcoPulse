/*
  =============================================================================
  EcoPulse – Intelligent Energy Management for Sustainable Buildings
  Integrated Firmware for Arduino Nano (ATmega328P)
  =============================================================================
  Hardware Pinout (Matches Physical Build):
    - D0 / D1 : USB Serial Communication (9600 baud)
    - D2      : PIR Motion Sensor (PIR_PIN)
    - D5      : Zone 1 LED Control (LED1)
    - D6      : Zone 2 LED Control (LED2)

  Optional Expansion Sensors (Set ENABLE_EXTRA_SENSORS to 1 once wired):
    - D3      : DHT11 Temperature & Humidity Sensor
    - A0      : LDR Ambient Light Sensor
    - A1      : Solar Panel Voltage Divider
    - A2      : Rechargeable Battery Voltage Sensor

  Operation:
    - Autonomous Edge Mode (AUTO):
      PIR motion on D2 turns ON LED1 (D5) and LED2 (D6), keeping them active
      for OFF_DELAY (default 2000 ms) after last motion. Works even if USB is
      disconnected from the laptop.
    - Dashboard Manual Mode (MANUAL):
      Allows independent control of LED1, LED2, or Master Lights directly from
      the EcoPulse web dashboard.
  =============================================================================
*/

#define PIR_PIN 2
#define LED1    5
#define LED2    6

// Set to 1 only after physically wiring DHT11 (D3), LDR (A0), Solar (A1), Battery (A2)
#define ENABLE_EXTRA_SENSORS 0

#if ENABLE_EXTRA_SENSORS
  #define PIN_DHT     3
  #define PIN_LDR     A0
  #define PIN_SOLAR   A1
  #define PIN_BATTERY A2
  const float ADC_REF_VOLTAGE       = 5.0f;
  const float SOLAR_DIVIDER_RATIO   = 2.0f;
  const float BATTERY_DIVIDER_RATIO = 1.0f;
#endif

// --- Configurable Automation Settings ---
unsigned long offDelayMs = 2000; // Default 2 seconds (matches OFF_DELAY)

enum OperatingMode {
  MODE_AUTO,
  MODE_MANUAL
};

OperatingMode currentMode = MODE_AUTO;

// --- Runtime State ---
unsigned long lastMotionTime    = 0;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 1000; // 1 Hz heartbeat

bool motionDetected = false;
bool led1State      = false;
bool led2State      = false;
bool prevMotion     = false;
bool prevLed1       = false;
bool prevLed2       = false;

#if ENABLE_EXTRA_SENSORS
  int   ambientLight   = 0;
  float currentTemp    = 0.0f;
  float currentHum     = 0.0f;
  float solarVoltage   = 0.0f;
  float batteryVoltage = 0.0f;
#endif

// Non-blocking Serial input buffer
const uint8_t SERIAL_BUF_SIZE = 128;
char serialBuffer[SERIAL_BUF_SIZE];
uint8_t bufferIndex = 0;

// --- Helper: Apply LED Outputs ---
void applyOutputs() {
  digitalWrite(LED1, led1State ? HIGH : LOW);
  digitalWrite(LED2, led2State ? HIGH : LOW);
}

// --- Emit Structured JSON Telemetry ---
void sendTelemetry() {
  bool anyLight = (led1State || led2State);

  Serial.print(F("{\"type\":\"sensor\",\"occupancy\":"));
  Serial.print(motionDetected ? F("true") : F("false"));
  Serial.print(F(",\"led1\":"));
  Serial.print(led1State ? F("true") : F("false"));
  Serial.print(F(",\"led2\":"));
  Serial.print(led2State ? F("true") : F("false"));
  Serial.print(F(",\"light\":"));
  Serial.print(anyLight ? F("true") : F("false"));
  Serial.print(F(",\"fan\":false"));
  Serial.print(F(",\"mode\":\""));
  Serial.print(currentMode == MODE_AUTO ? F("AUTO") : F("MANUAL"));
  Serial.print(F("\",\"off_delay_ms\":"));
  Serial.print(offDelayMs);
  Serial.print(F(",\"hardware_profile\":\"pir_dual_led\""));

#if ENABLE_EXTRA_SENSORS
  Serial.print(F(",\"has_dht11\":true,\"has_ldr\":true,\"has_solar\":true,\"has_battery\":true"));
  Serial.print(F(",\"light_level\":"));
  Serial.print(ambientLight);
  Serial.print(F(",\"temperature\":"));
  Serial.print(currentTemp, 1);
  Serial.print(F(",\"humidity\":"));
  Serial.print(currentHum, 1);
  Serial.print(F(",\"solar_voltage\":"));
  Serial.print(solarVoltage, 2);
  Serial.print(F(",\"battery_voltage\":"));
  Serial.print(batteryVoltage, 2);
#else
  Serial.print(F(",\"has_dht11\":false,\"has_ldr\":false,\"has_solar\":false,\"has_battery\":false"));
#endif

  Serial.println(F("}"));
}

// --- Space-tolerant JSON Field Helpers ---
const char* findJsonValue(const char* json, const char* key) {
  const char* p = strstr(json, key);
  if (!p) return NULL;
  p += strlen(key);
  while (*p && (*p == '"' || *p == ' ' || *p == ':')) p++;
  return p;
}

bool jsonValueEquals(const char* json, const char* key, const char* expected) {
  const char* val = findJsonValue(json, key);
  if (!val) return false;
  if (*val == '"') val++;
  size_t len = strlen(expected);
  return (strncmp(val, expected, len) == 0 && (val[len] == '"' || val[len] == ',' || val[len] == '}'));
}

bool jsonGetBool(const char* json, const char* key, bool fallback) {
  const char* val = findJsonValue(json, key);
  if (!val) return fallback;
  if (strncmp(val, "true", 4) == 0 || *val == '1') return true;
  if (strncmp(val, "false", 5) == 0 || *val == '0') return false;
  return fallback;
}

// --- Process Incoming JSON Commands from EcoPulse Dashboard ---
void processIncomingCommand(const char* json) {
  if (jsonValueEquals(json, "\"type\"", "command")) {
    bool newState = jsonGetBool(json, "\"state\"", false);

    if (jsonValueEquals(json, "\"device\"", "led1")) {
      currentMode = MODE_MANUAL;
      led1State = newState;
      applyOutputs();
      Serial.print(F("{\"type\":\"ack\",\"device\":\"led1\",\"state\":"));
      Serial.print(led1State ? F("true") : F("false"));
      Serial.println(F(",\"mode\":\"MANUAL\",\"status\":\"success\"}"));
      sendTelemetry();
    }
    else if (jsonValueEquals(json, "\"device\"", "led2")) {
      currentMode = MODE_MANUAL;
      led2State = newState;
      applyOutputs();
      Serial.print(F("{\"type\":\"ack\",\"device\":\"led2\",\"state\":"));
      Serial.print(led2State ? F("true") : F("false"));
      Serial.println(F(",\"mode\":\"MANUAL\",\"status\":\"success\"}"));
      sendTelemetry();
    }
    else if (jsonValueEquals(json, "\"device\"", "light")) {
      currentMode = MODE_MANUAL;
      led1State = newState;
      led2State = newState;
      applyOutputs();
      Serial.print(F("{\"type\":\"ack\",\"device\":\"light\",\"state\":"));
      Serial.print(newState ? F("true") : F("false"));
      Serial.println(F(",\"mode\":\"MANUAL\",\"status\":\"success\"}"));
      sendTelemetry();
    }
  }
  else if (jsonValueEquals(json, "\"type\"", "mode")) {
    if (jsonValueEquals(json, "\"value\"", "MANUAL")) {
      currentMode = MODE_MANUAL;
      Serial.println(F("{\"type\":\"ack\",\"mode\":\"MANUAL\",\"status\":\"success\"}"));
      sendTelemetry();
    } else if (jsonValueEquals(json, "\"value\"", "AUTO")) {
      currentMode = MODE_AUTO;
      Serial.println(F("{\"type\":\"ack\",\"mode\":\"AUTO\",\"status\":\"success\"}"));
      sendTelemetry();
    }
  }
  else if (jsonValueEquals(json, "\"type\"", "config")) {
    const char* pTimeout = findJsonValue(json, "\"occ_timeout\"");
    if (pTimeout != NULL) {
      long seconds = atol(pTimeout);
      if (seconds >= 1 && seconds <= 300) {
        offDelayMs = (unsigned long)seconds * 1000UL;
      }
    }
    Serial.println(F("{\"type\":\"ack\",\"config\":\"updated\",\"status\":\"success\"}"));
    sendTelemetry();
  }
}

void checkSerialInput() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (bufferIndex > 0) {
        serialBuffer[bufferIndex] = '\0';
        processIncomingCommand(serialBuffer);
        bufferIndex = 0;
      }
    } else if (bufferIndex < (SERIAL_BUF_SIZE - 1)) {
      serialBuffer[bufferIndex++] = c;
    }
  }
}

void setup() {
  Serial.begin(9600);

  pinMode(PIR_PIN, INPUT);
  pinMode(LED1, OUTPUT);
  pinMode(LED2, OUTPUT);

  digitalWrite(LED1, LOW);
  digitalWrite(LED2, LOW);

  Serial.println("INTELLIGENT ENERGY MANAGEMENT SYSTEM");
  Serial.println("------------------------------------");
  Serial.println("System Ready");
  sendTelemetry();
}

void loop() {
  unsigned long now = millis();

  // 1. Listen for dashboard serial commands without blocking
  checkSerialInput();

  // 2. Read PIR motion sensor (D2)
  int motion = digitalRead(PIR_PIN);
  motionDetected = (motion == HIGH);

  if (motionDetected) {
    lastMotionTime = now;
  }

  // 3. Autonomous edge lighting control in AUTO mode
  if (currentMode == MODE_AUTO) {
    bool shouldBeOn = (lastMotionTime != 0 && (now - lastMotionTime < offDelayMs));
    led1State = shouldBeOn;
    led2State = shouldBeOn;
    applyOutputs();
  }

  // 4. Send immediate telemetry when motion or LED states change
  bool stateChanged = (motionDetected != prevMotion ||
                       led1State != prevLed1 ||
                       led2State != prevLed2);

  if (stateChanged) {
    prevMotion = motionDetected;
    prevLed1   = led1State;
    prevLed2   = led2State;

    if (led1State || led2State) {
      Serial.println("MOTION DETECTED - LIGHTS ON");
    } else {
      Serial.println("NO MOTION - LIGHTS OFF");
    }
    sendTelemetry();
    lastTelemetryTime = now;
  }
  else if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    // 5. Periodic 1 Hz heartbeat telemetry
    lastTelemetryTime = now;
    sendTelemetry();
  }
}
