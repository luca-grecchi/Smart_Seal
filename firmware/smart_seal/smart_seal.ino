#include "state_machine.h"
#include "sensors.h"
#include "network.h"
#include "secrets.h"

const float ACCEL_TRANSIT_THRESHOLD = 1.15f;

SealRuntime runtime;
SensorSnapshot previousSensors;

unsigned long lastPollAt = 0;
unsigned long lastLogAt  = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  setupSensors();
  connectWifi();

  previousSensors = readSensors();
  Serial.println("SMART SEAL v0.1");
  Serial.print("light baseline=");
  Serial.println(getLightBaseline());
  Serial.print("accelerometer=");
  Serial.println(isAccelerometerAvailable() ? "ready" : "unavailable");
}

void loop() {
  SensorSnapshot sensors = readSensors();

  // ── Seal: nessuna sessione + scatola chiusa + prodotto dentro ──
  if (runtime.sessionId == "" && !sensors.boxOpen && sensors.productPresent) {
    sealSession();
  }

  if (runtime.sessionId != "") {

    // ── Scatola appena aperta ──────────────────────────────────
    if (sensors.boxOpen && !previousSensors.boxOpen) {
      transitionTo(runtime, EVENT_BOX_OPENED);
      sendEvent("BOX_OPENED", sensors);
    }

    // ── Prodotto rimosso (logic lock) ──────────────────────────
    if (!sensors.productPresent && !runtime.productRemovedLock) {
      transitionTo(runtime, EVENT_PRODUCT_REMOVED);
      sendEvent("PRODUCT_REMOVED", sensors);
    }

    // ── Movimento rilevato (accelerometro) ────────────────────
    if (sensors.accelNorm > ACCEL_TRANSIT_THRESHOLD) {
      transitionTo(runtime, EVENT_MOVING);
    }

    // ── Poll comandi dal backend ogni 2 secondi ────────────────
    if (millis() - lastPollAt > 2000) {
      pollCommands();
      lastPollAt = millis();
    }
  }

  // ── Log periodico su Serial ────────────────────────────────
  if (millis() - lastLogAt > 1000) {
    Serial.print("state=");        Serial.print(stateLabel(runtime.state));
    Serial.print(" session=");     Serial.print(runtime.sessionId);
    Serial.print(" light=");       Serial.print(sensors.light);
    Serial.print(" baseline=");    Serial.print(getLightBaseline());
    Serial.print(" open=");        Serial.print(sensors.boxOpen);
    Serial.print(" product=");     Serial.print(sensors.productPresent);
    Serial.print(" accel=");       Serial.print(sensors.accelNorm);
    Serial.print(" removedLock="); Serial.println(runtime.productRemovedLock);
    lastLogAt = millis();
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
  } else {
    Serial.println("seal failed");
  }
}

void sendEvent(const String& eventName, SensorSnapshot sensors) {
  String body = "{";
  body += "\"session_id\":\"" + runtime.sessionId + "\",";
  body += "\"source\":\"arduino\",";
  body += "\"event\":\"" + eventName + "\",";
  body += "\"timestamp\":" + String(millis()) + ",";
  body += "\"sensor_data\":{";
  body += "\"light\":" + String(sensors.light) + ",";
  body += "\"accel_norm\":" + String(sensors.accelNorm) + ",";
  body += "\"product_present\":" + String(sensors.productPresent ? "true" : "false");
  body += "}}";

  String response = httpRequest("POST", "/api/event", body);
  Serial.print("event ");
  Serial.print(eventName);
  Serial.print(" response bytes=");
  Serial.println(response.length());
}

void pollCommands() {
  String response = httpRequest("GET", "/api/command/" + runtime.sessionId, "");
  if (response.indexOf("COURIER_DELIVERED") >= 0)    transitionTo(runtime, EVENT_COURIER_DELIVERED);
  if (response.indexOf("CLIENT_AUTHENTICATED") >= 0) transitionTo(runtime, EVENT_CLIENT_AUTH);
  if (response.indexOf("VERDICT_COMPUTED") >= 0)     transitionTo(runtime, EVENT_VERDICT);
}
