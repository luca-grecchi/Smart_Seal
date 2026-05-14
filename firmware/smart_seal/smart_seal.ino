#include "state_machine.h"
#include "sensors.h"
#include "network.h"
#include "secrets.h"

SealRuntime runtime;
SensorSnapshot previousSensors;

unsigned long lastPollAt = 0;
unsigned long lastLogAt = 0;

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

  if (runtime.sessionId == "" && !sensors.boxOpen && sensors.productPresent) {
    sealSession();
  }

  if (runtime.sessionId != "" && sensors.boxOpen && !previousSensors.boxOpen) {
    sendEvent("BOX_OPENED", sensors);
    runtime.state = OPENED_STATE;
  }

  if (runtime.sessionId != "" && !sensors.productPresent && !runtime.productRemovedLock) {
    runtime.productRemovedLock = true;
    sendEvent("PRODUCT_REMOVED", sensors);
    runtime.state = PRODUCT_REMOVED_STATE;
  }

  if (runtime.sessionId != "" && millis() - lastPollAt > 2000) {
    pollCommands();
    lastPollAt = millis();
  }

  if (millis() - lastLogAt > 1000) {
    Serial.print("state=");
    Serial.print(stateLabel(runtime.state));
    Serial.print(" session=");
    Serial.print(runtime.sessionId);
    Serial.print(" light=");
    Serial.print(sensors.light);
    Serial.print(" baseline=");
    Serial.print(getLightBaseline());
    Serial.print(" open=");
    Serial.print(sensors.boxOpen);
    Serial.print(" productPresent=");
    Serial.print(sensors.productPresent);
    Serial.print(" accelNorm=");
    Serial.print(sensors.accelNorm);
    Serial.print(" removedLock=");
    Serial.println(runtime.productRemovedLock);
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
    runtime.state = SEALED_STATE;
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
  if (response.indexOf("COURIER_DELIVERED") >= 0) {
    runtime.state = DELIVERED_STATE;
  }
  if (response.indexOf("CLIENT_AUTHENTICATED") >= 0) {
    runtime.state = DELIVERED_STATE;
  }
  if (response.indexOf("VERDICT_COMPUTED") >= 0) {
    runtime.state = VERDICT_STATE;
  }
}
