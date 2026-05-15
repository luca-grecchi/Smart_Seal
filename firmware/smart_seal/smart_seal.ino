// Uncomment to stream raw accelerometer CSV for training data collection.
// Flash with this enabled, capture via:
//   python3 -m serial.tools.miniterm --raw /dev/ttyACM0 115200 > raw.csv
// #define IMPACT_DATA_COLLECTION 1

#include "state_machine.h"
#include "sensors.h"
#include "network.h"
#include "secrets.h"
#include "oled_display.h"
#include "hybrid_impact_classifier.h"

const float ACCEL_TRANSIT_THRESHOLD = 1.15f;

SealRuntime runtime;
SensorSnapshot previousSensors;

unsigned long lastPollAt = 0;
unsigned long lastOledAt = 0;

OledDisplay             oled;
HybridImpactClassifier  impactClassifier;
ImpactClass      lastDisplayedLabel = IMPACT_NONE;

void sendEventOnce(const String& eventName, SensorSnapshot sensors, bool allowSessionRecovery);
void sendImpactEventOnce(const ImpactResult& impact, bool allowSessionRecovery);

void setup() {
  Serial.begin(115200);
  delay(1000);

#ifndef IMPACT_DATA_COLLECTION
  oled.begin();
#endif

  setupSensors();

#ifndef IMPACT_DATA_COLLECTION
  connectNetwork();
  impactClassifier.begin();
#endif

  previousSensors = readSensors();
  Serial.println("SMART SEAL v0.1");
  Serial.print("light baseline=");
  Serial.println(getLightBaseline());
  Serial.print("oled address=0x");
  Serial.println(OLED_ADDR, HEX);
  Serial.print("accelerometer=");
  Serial.println(isAccelerometerAvailable() ? "ready" : "unavailable");
  if (isAccelerometerAvailable()) {
    Serial.print("accelerometer address=0x");
    if (getAccelerometerAddress() < 16) {
      Serial.print("0");
    }
    Serial.println(getAccelerometerAddress(), HEX);
  }

#ifdef IMPACT_DATA_COLLECTION
  Serial.println("timestamp_ms,accel_x,accel_y,accel_z");
#else
  oled.showSensorDebug(
    isAccelerometerAvailable(),
    getAccelerometerAddress(),
    previousSensors.accelX,
    previousSensors.accelY,
    previousSensors.accelZ,
    previousSensors.accelNorm
  );
#endif
}

void loop() {
  SensorSnapshot sensors = readSensors();

#ifdef IMPACT_DATA_COLLECTION
  Serial.print(millis());
  Serial.print(",");
  Serial.print(sensors.accelX, 6);
  Serial.print(",");
  Serial.print(sensors.accelY, 6);
  Serial.print(",");
  Serial.println(sensors.accelZ, 6);
  delay(20);  // ~50 Hz
  return;
#endif

  if (millis() - lastOledAt > 3000) {
    oled.showSensorDebug(
      isAccelerometerAvailable(),
      getAccelerometerAddress(),
      sensors.accelX,
      sensors.accelY,
      sensors.accelZ,
      sensors.accelNorm
    );
    lastOledAt = millis();
  }

  // Impact classification runs every IC_STEP_SIZE * 50ms once the buffer is full.
  ImpactResult impactResult;
  if (impactClassifier.update(sensors.accelX, sensors.accelY, sensors.accelZ, impactResult)) {
    if (impactResult.label != lastDisplayedLabel) {
      lastDisplayedLabel = impactResult.label;
      oled.showImpact(impactResult.label, impactResult.confidence);
      oled.showState(stateLabel(runtime.state));
    }
    if (impactResult.label != IMPACT_NONE) {
      Serial.println("[IMPACT] detected, ensuring session");
      if (runtime.sessionId == "") {
        sealSession();
      }
      if (runtime.sessionId != "") {
        sendImpactEvent(impactResult);
      } else {
        Serial.println("[IMPACT] skipped, no session");
      }
    }
  }

  if (runtime.sessionId == "" && !sensors.boxOpen && previousSensors.boxOpen) {
    sealSession();
    oled.showState(stateLabel(runtime.state));
  }

  if (runtime.sessionId != "" && sensors.boxOpen && !previousSensors.boxOpen) {
    sendEvent("BOX_OPENED", sensors);
    runtime.state = OPENED_STATE;
    oled.showState(stateLabel(runtime.state));
  }

  if (runtime.sessionId != "" && !sensors.boxOpen && previousSensors.boxOpen) {
    sendEvent("IN_TRANSIT", sensors);
    transitionTo(runtime, EVENT_MOVING);
    oled.showState(stateLabel(runtime.state));
  }

  if (runtime.sessionId != "" && millis() - lastPollAt > 2000) {
    pollCommands();
    lastPollAt = millis();
  }

  previousSensors = sensors;
  delay(50);
}

void sealSession() {
  String body = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"timestamp\":" + String(millis()) + "}";
  String response = httpRequest("POST", "/api/seal", body);
  int keyIndex = response.indexOf("\"session_id\":\"");
  if (keyIndex >= 0) {
    int start = keyIndex + 14;
    int end = response.indexOf("\"", start);
    runtime.sessionId = response.substring(start, end);
    transitionTo(runtime, EVENT_SEALED);
    Serial.print("sealed session=");
    Serial.println(runtime.sessionId);

    int otpIdx = response.indexOf("\"courier_otp\":\"");
    if (otpIdx >= 0) {
      int os = otpIdx + 15;
      int oe = response.indexOf("\"", os);
      runtime.courierOtp = response.substring(os, oe);
      oled.showOtp(runtime.courierOtp);
      Serial.print("courier_otp=");
      Serial.println(runtime.courierOtp);
    }
  } else {
    Serial.println("seal failed");
  }
}

bool sessionNotFound(const String& response) {
  return response.indexOf("SESSION_NOT_FOUND") >= 0;
}

bool recoverMissingSession(const String& response) {
  if (!sessionNotFound(response)) {
    return false;
  }

  Serial.print("session stale=");
  Serial.println(runtime.sessionId);
  runtime.sessionId = "";
  sealSession();
  return runtime.sessionId != "";
}

void sendEvent(const String& eventName, SensorSnapshot sensors) {
  sendEventOnce(eventName, sensors, true);
}

void sendEventOnce(const String& eventName, SensorSnapshot sensors, bool allowSessionRecovery) {
  String body = "{";
  body += "\"session_id\":\"" + runtime.sessionId + "\",";
  body += "\"source\":\"arduino\",";
  body += "\"event\":\"" + eventName + "\",";
  body += "\"timestamp\":" + String(millis()) + ",";
  body += "\"sensor_data\":{";
  body += "\"light\":" + String(sensors.light) + ",";
  body += "\"accel_norm\":" + String(sensors.accelNorm);
  body += "}}";

  String response = httpRequest("POST", "/api/event", body);
  if (allowSessionRecovery && recoverMissingSession(response)) {
    sendEventOnce(eventName, sensors, false);
    return;
  }

  Serial.print("event ");
  Serial.print(eventName);
  Serial.print(" response bytes=");
  Serial.println(response.length());
}

void sendImpactEvent(const ImpactResult& impact) {
  sendImpactEventOnce(impact, true);
}

void sendImpactEventOnce(const ImpactResult& impact, bool allowSessionRecovery) {
  const char* severity = (impact.label == IMPACT_HEAVY) ? "heavy" : "light";
  float confidence = impact.confidence;
  if (!isfinite(confidence)) {
    confidence = 1.0f;
  }
  if (confidence < 0.0f) {
    confidence = 0.0f;
  }
  if (confidence > 1.0f) {
    confidence = 1.0f;
  }

  String body = "{";
  body += "\"session_id\":\"" + runtime.sessionId + "\",";
  body += "\"source\":\"arduino\",";
  body += "\"event\":\"IMPACT_DETECTED\",";
  body += "\"timestamp\":" + String(millis()) + ",";
  body += "\"severity\":\"" + String(severity) + "\",";
  body += "\"confidence\":" + String(confidence, 4);
  body += "}";

  String response = httpRequest("POST", "/api/event", body);
  if (allowSessionRecovery && recoverMissingSession(response)) {
    sendImpactEventOnce(impact, false);
    return;
  }

  Serial.print("[IMPACT] ");
  Serial.print(severity);
  Serial.print(" conf=");
  Serial.print(confidence, 2);
  Serial.print(" response bytes=");
  Serial.println(response.length());
}

void pollCommands() {
  String response = httpRequest("GET", "/api/command/" + runtime.sessionId, "");
  if (sessionNotFound(response)) {
    Serial.print("command poll stale session=");
    Serial.println(runtime.sessionId);
    runtime.sessionId = "";
    return;
  }

  if (response.indexOf("COURIER_DELIVERED") >= 0)    transitionTo(runtime, EVENT_COURIER_DELIVERED);
  if (response.indexOf("CLIENT_AUTHENTICATED") >= 0) transitionTo(runtime, EVENT_CLIENT_AUTH);
  if (response.indexOf("VERDICT_COMPUTED") >= 0)     transitionTo(runtime, EVENT_VERDICT);
}
