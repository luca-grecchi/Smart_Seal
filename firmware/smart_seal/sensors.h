#pragma once

#include <Wire.h>

#define LIS3DH_ADDR 0x19
#define LIS3DH_WHO_AM_I 0x0F
#define LIS3DH_WHO_AM_I_VALUE 0x33
#define LIS3DH_CTRL_REG1 0x20
#define LIS3DH_CTRL_REG4 0x23
#define LIS3DH_OUT_X_L 0x28

const int LIGHT_PIN = A3;
const int LIGHT_BASELINE_SAMPLES = 20;
const int LIGHT_OPEN_THRESHOLD = 120;

int lightBaseline = 0;
bool accelAvailable = false;
uint8_t accelAddress = 0;

void printI2CScan() {
  Serial.println("i2c scan start");
  bool foundAny = false;
  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    uint8_t error = Wire.endTransmission();
    if (error == 0) {
      foundAny = true;
      Serial.print("i2c device found at 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
    }
  }
  if (!foundAny) {
    Serial.println("i2c scan found no devices");
  }
  Serial.println("i2c scan end");
}

uint8_t readI2CRegister(uint8_t address, uint8_t reg) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) {
    return 0;
  }

  if (Wire.requestFrom(address, (uint8_t)1) != 1) {
    return 0;
  }

  return Wire.read();
}

bool writeI2CRegister(uint8_t address, uint8_t reg, uint8_t value) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  Wire.write(value);
  return Wire.endTransmission() == 0;
}

bool setupAccelerometer() {
  uint8_t whoAmI = readI2CRegister(LIS3DH_ADDR, LIS3DH_WHO_AM_I);
  Serial.print("lis3dh who_am_i=0x");
  if (whoAmI < 16) {
    Serial.print("0");
  }
  Serial.println(whoAmI, HEX);

  if (whoAmI != LIS3DH_WHO_AM_I_VALUE) {
    return false;
  }

  // 100 Hz, normal mode, all axes enabled.
  bool ctrl1Ok = writeI2CRegister(LIS3DH_ADDR, LIS3DH_CTRL_REG1, 0x57);
  // +/-2g, same mode as the standalone LIS3DH test sketch.
  bool ctrl4Ok = writeI2CRegister(LIS3DH_ADDR, LIS3DH_CTRL_REG4, 0x00);
  if (!ctrl1Ok || !ctrl4Ok) {
    return false;
  }

  accelAddress = LIS3DH_ADDR;
  return true;
}

struct SensorSnapshot {
  bool boxOpen;
  int light;
  float accelNorm;
  float accelX, accelY, accelZ;
};

void setupSensors() {
  long totalLight = 0;
  for (int i = 0; i < LIGHT_BASELINE_SAMPLES; i++) {
    totalLight += analogRead(LIGHT_PIN);
    delay(25);
  }
  lightBaseline = totalLight / LIGHT_BASELINE_SAMPLES;

  Wire.begin();
  printI2CScan();
  accelAvailable = setupAccelerometer();
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

uint8_t getAccelerometerAddress() {
  return accelAddress;
}

bool readAccelAxes(float& x, float& y, float& z) {
  if (!accelAvailable) {
    x = y = z = 0.0f;
    return false;
  }

  Wire.beginTransmission(LIS3DH_ADDR);
  Wire.write(LIS3DH_OUT_X_L | 0x80);
  if (Wire.endTransmission(false) != 0) {
    x = y = z = 0.0f;
    return false;
  }

  if (Wire.requestFrom(LIS3DH_ADDR, (uint8_t)6) != 6) {
    x = y = z = 0.0f;
    return false;
  }

  uint8_t xl = Wire.read();
  uint8_t xh = Wire.read();
  uint8_t yl = Wire.read();
  uint8_t yh = Wire.read();
  uint8_t zl = Wire.read();
  uint8_t zh = Wire.read();

  int16_t rawX = (int16_t)((xh << 8) | xl) >> 4;
  int16_t rawY = (int16_t)((yh << 8) | yl) >> 4;
  int16_t rawZ = (int16_t)((zh << 8) | zl) >> 4;

  x = rawX * 0.001f;
  y = rawY * 0.001f;
  z = rawZ * 0.001f;
  return true;
}

SensorSnapshot readSensors() {
  SensorSnapshot snapshot;
  snapshot.light = analogRead(LIGHT_PIN);
  snapshot.boxOpen = isBoxOpenFromLight(snapshot.light);
  readAccelAxes(snapshot.accelX, snapshot.accelY, snapshot.accelZ);
  snapshot.accelNorm = sqrt(snapshot.accelX * snapshot.accelX +
                            snapshot.accelY * snapshot.accelY +
                            snapshot.accelZ * snapshot.accelZ);
  return snapshot;
}
