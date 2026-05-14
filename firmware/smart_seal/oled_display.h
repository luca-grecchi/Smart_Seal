#pragma once

#if __has_include(<Adafruit_SSD1306.h>)
#define SMART_SEAL_HAS_OLED 1
#include <Adafruit_SSD1306.h>
#else
#define SMART_SEAL_HAS_OLED 0
#endif

#include "impact_classifier.h"

#define OLED_WIDTH  128
#define OLED_HEIGHT  64
#define OLED_ADDR  0x3C
#define OLED_RESET    -1

class OledDisplay {
public:
  bool begin() {
#if SMART_SEAL_HAS_OLED
    if (!display_.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
      Serial.println("[OLED] init failed");
      return false;
    }
    display_.clearDisplay();
    display_.display();
    Serial.println("[OLED] ready");
    return true;
#else
    Serial.println("[OLED] library missing (install Adafruit SSD1306)");
    return false;
#endif
  }

  void showImpact(ImpactClass label, float confidence) {
    lastLabel_      = label;
    lastConfidence_ = confidence;
#if SMART_SEAL_HAS_OLED
    render();
#endif
  }

  void showState(const char* stateName) {
    stateName_ = stateName;
#if SMART_SEAL_HAS_OLED
    render();
#endif
  }

  void clear() {
#if SMART_SEAL_HAS_OLED
    display_.clearDisplay();
    display_.display();
#endif
  }

private:
  ImpactClass lastLabel_     = IMPACT_NONE;
  float       lastConfidence_ = 0.0f;
  const char* stateName_      = "";

#if SMART_SEAL_HAS_OLED
  Adafruit_SSD1306 display_ = Adafruit_SSD1306(OLED_WIDTH, OLED_HEIGHT, &Wire, OLED_RESET);

  void render() {
    display_.clearDisplay();

    // Top half: impact severity (inverted background for HEAVY)
    if (lastLabel_ == IMPACT_HEAVY) {
      display_.fillRect(0, 0, OLED_WIDTH, 36, SSD1306_WHITE);
      display_.setTextColor(SSD1306_BLACK);
    } else {
      display_.setTextColor(SSD1306_WHITE);
    }

    display_.setTextSize(1);
    display_.setCursor(4, 4);
    if (lastLabel_ == IMPACT_NONE)        display_.print("No Impact");
    else if (lastLabel_ == IMPACT_LIGHT)  display_.print("Light Impact");
    else                                  display_.print(">> HEAVY IMPACT <<");

    display_.setCursor(4, 18);
    display_.print("conf: ");
    display_.print((int)(lastConfidence_ * 100));
    display_.print("%");

    // Bottom half: current seal state
    display_.setTextColor(SSD1306_WHITE);
    display_.setCursor(4, 44);
    display_.print("[");
    display_.print(stateName_);
    display_.print("]");

    display_.display();
  }
#endif
};
