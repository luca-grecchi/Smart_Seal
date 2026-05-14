#pragma once

#include <Wire.h>

#if __has_include(<LIS3DHTR.h>)
#include <LIS3DHTR.h>
#define SMART_SEAL_HAS_ACCEL_LIB 1
#else
#define SMART_SEAL_HAS_ACCEL_LIB 0
#endif

const int PRODUCT_PIN = 3;
const int LIGHT_PIN = A3;
const int LIGHT_BASELINE_SAMPLES = 20;
const int LIGHT_OPEN_THRESHOLD = 120;

int lightBaseline = 0;
bool accelAvailable = false;

#if SMART_SEAL_HAS_ACCEL_LIB
LIS3DHTR<TwoWire> accelerometer;
#endif

struct SensorSnapshot {
  bool boxOpen;
  bool productPresent;
  int light;
  float accelNorm;
};

void setupSensors() {
  pinMode(PRODUCT_PIN, INPUT_PULLUP);

  long totalLight = 0;
  for (int i = 0; i < LIGHT_BASELINE_SAMPLES; i++) {
    totalLight += analogRead(LIGHT_PIN);
    delay(25);
  }
  lightBaseline = totalLight / LIGHT_BASELINE_SAMPLES;

#if SMART_SEAL_HAS_ACCEL_LIB
  Wire.begin();
  accelerometer.begin(Wire, LIS3DHTR_ADDRESS_UPDATED);
  delay(100);
  if (accelerometer) {
    accelerometer.setOutputDataRate(LIS3DHTR_DATARATE_50HZ);
    accelAvailable = true;
  }
#endif
}

bool isBoxOpenFromLight(int lightValue) {
  return lightValue > lightBaseline + LIGHT_OPEN_THRESHOLD;
}

int getLightBaseline() {
  return lightBaseline;
}

bool isAccelerometerAvailable() {
  return accelAvailable;
}

float readAccelNorm() {
#if SMART_SEAL_HAS_ACCEL_LIB
  if (accelAvailable) {
    const float x = accelerometer.getAccelerationX();
    const float y = accelerometer.getAccelerationY();
    const float z = accelerometer.getAccelerationZ();
    return sqrt(x * x + y * y + z * z);
  }
#endif
  return 0.0;
}

SensorSnapshot readSensors() {
  SensorSnapshot snapshot;
  snapshot.light = analogRead(LIGHT_PIN);
  snapshot.boxOpen = isBoxOpenFromLight(snapshot.light);
  snapshot.productPresent = digitalRead(PRODUCT_PIN) == LOW;
  snapshot.accelNorm = readAccelNorm();
  return snapshot;
}
