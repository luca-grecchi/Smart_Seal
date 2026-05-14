#pragma once

#include <Wire.h>
#include <U8g2lib.h>

#include "impact_classifier.h"

#define OLED_WIDTH  128
#define OLED_HEIGHT  64
#define OLED_ADDR  0x3C

class OledDisplay {
public:
  bool begin() {
    Wire.begin();
    delay(100);
    display_.setI2CAddress(OLED_ADDR * 2);
    display_.begin();
    display_.clearBuffer();
    display_.setFont(u8g2_font_6x10_tf);
    display_.drawStr(0, 12, "SMART SEAL");
    display_.drawStr(0, 28, "OLED: 0x3C");
    display_.drawStr(0, 44, "BOOT OK");
    display_.sendBuffer();
    Serial.println("[OLED] ready");
    return true;
  }

  void showImpact(ImpactClass label, float confidence) {
    lastLabel_ = label;
    lastConfidence_ = confidence;
    render();
  }

  void showState(const char* stateName) {
    stateName_ = stateName;
    render();
  }

  void showSensorDebug(bool accelReady, uint8_t accelAddress, float x, float y, float z, float norm) {
    display_.clearBuffer();
    display_.setFont(u8g2_font_6x10_tf);

    display_.setCursor(0, 10);
    display_.print("SMART SEAL");

    display_.setCursor(0, 26);
    display_.print("Total: ");
    display_.print(norm, 2);
    display_.print(" g");

    display_.setCursor(0, 44);
    display_.print("X:");
    display_.print(x, 1);

    display_.setCursor(43, 44);
    display_.print("Y:");
    display_.print(y, 1);

    display_.setCursor(86, 44);
    display_.print("Z:");
    display_.print(z, 1);

    display_.sendBuffer();
  }

  void clear() {
    display_.clearBuffer();
    display_.sendBuffer();
  }

private:
  ImpactClass lastLabel_ = IMPACT_NONE;
  float lastConfidence_ = 0.0f;
  const char* stateName_ = "";

  U8G2_SSD1306_128X64_NONAME_F_HW_I2C display_ = U8G2_SSD1306_128X64_NONAME_F_HW_I2C(U8G2_R0, U8X8_PIN_NONE);

  void render() {
    display_.clearBuffer();
    display_.setFont(u8g2_font_6x10_tf);

    if (lastLabel_ == IMPACT_HEAVY) {
      display_.drawBox(0, 0, OLED_WIDTH, 34);
      display_.setDrawColor(0);
    } else {
      display_.setDrawColor(1);
    }

    display_.setCursor(4, 12);
    if (lastLabel_ == IMPACT_NONE) {
      display_.print("No Impact");
    } else if (lastLabel_ == IMPACT_LIGHT) {
      display_.print("Light Impact");
    } else {
      display_.print("HEAVY IMPACT");
    }

    display_.setCursor(4, 26);
    display_.print("conf: ");
    display_.print((int)(lastConfidence_ * 100));
    display_.print("%");

    display_.setDrawColor(1);
    display_.setCursor(4, 52);
    display_.print("[");
    display_.print(stateName_);
    display_.print("]");

    display_.sendBuffer();
  }
};
