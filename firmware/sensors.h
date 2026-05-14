#pragma once

const int BOX_OPEN_PIN = 2;
const int PRODUCT_PIN = 3;
const int LIGHT_PIN = A0;

struct SensorSnapshot {
  bool boxOpen;
  bool productPresent;
  int light;
  float accelNorm;
};

void setupSensors() {
  pinMode(BOX_OPEN_PIN, INPUT_PULLUP);
  pinMode(PRODUCT_PIN, INPUT_PULLUP);
}

SensorSnapshot readSensors() {
  SensorSnapshot snapshot;
  snapshot.boxOpen = digitalRead(BOX_OPEN_PIN) == LOW;
  snapshot.productPresent = digitalRead(PRODUCT_PIN) == LOW;
  snapshot.light = analogRead(LIGHT_PIN);
  snapshot.accelNorm = 0.0;
  return snapshot;
}

