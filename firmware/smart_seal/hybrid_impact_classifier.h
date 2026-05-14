#pragma once

#include <math.h>
#include "impact_classifier.h"

#define HC_WINDOW_SIZE      25
#define HC_BASELINE_SAMPLES 50

class HeuristicImpactClassifier {
public:
  float lightPeakThreshold = 0.35f;
  float lightJerkThreshold = 0.25f;
  float heavyPeakThreshold = 1.2f;
  float heavyJerkThreshold = 0.80f;
  int   cooldownSteps      = 5;

  float lastPeakDynamic = 0.0f;
  float lastPeakJerk    = 0.0f;

  bool update(float x, float y, float z, ImpactResult& result) {
    if (!isfinite(x) || !isfinite(y) || !isfinite(z)) {
      result = {IMPACT_NONE, 0.0f};
      return false;
    }

    ring_[head_] = {x, y, z};
    head_ = (head_ + 1) % HC_WINDOW_SIZE;
    if (count_ < HC_WINDOW_SIZE) count_++;

    float mag = sqrtf(x * x + y * y + z * z);
    if (!isfinite(mag)) {
      result = {IMPACT_NONE, 0.0f};
      return false;
    }

    if (baselineCount_ < HC_BASELINE_SAMPLES) {
      baselineSum_ += mag;
      baselineCount_++;
      if (baselineCount_ == HC_BASELINE_SAMPLES) {
        baselineMag_ = baselineSum_ / HC_BASELINE_SAMPLES;
        if (!isfinite(baselineMag_) || baselineMag_ <= 0.0f) {
          baselineMag_ = 1.0f;
        }
        Serial.print("[HEURISTIC] baseline=");
        Serial.println(baselineMag_);
      }
    }

    step_++;
    if (count_ < HC_WINDOW_SIZE || step_ < IC_STEP_SIZE) return false;
    step_ = 0;

    if (cooldownRemaining_ > 0) {
      cooldownRemaining_--;
      return false;
    }

    float peakDynamic = 0.0f, peakJerk = 0.0f;
    float sumMag = 0.0f, sumMagSq = 0.0f;
    int   aboveLightCount = 0, aboveHeavyCount = 0;
    float prevMag = -1.0f;

    for (int i = 0; i < HC_WINDOW_SIZE; i++) {
      int idx = (head_ + i) % HC_WINDOW_SIZE;
      const AccelSample& s = ring_[idx];
      float m = sqrtf(s.x * s.x + s.y * s.y + s.z * s.z);
      if (!isfinite(m)) continue;
      float dyn = fabsf(m - baselineMag_);
      if (dyn > peakDynamic) peakDynamic = dyn;
      if (prevMag >= 0.0f) {
        float j = fabsf(m - prevMag);
        if (j > peakJerk) peakJerk = j;
      }
      sumMag   += m;
      sumMagSq += m * m;
      if (dyn > lightPeakThreshold) aboveLightCount++;
      if (dyn > heavyPeakThreshold) aboveHeavyCount++;
      prevMag = m;
    }

    lastPeakDynamic = peakDynamic;
    lastPeakJerk    = peakJerk;
    if (!isfinite(lastPeakDynamic)) lastPeakDynamic = 0.0f;
    if (!isfinite(lastPeakJerk)) lastPeakJerk = 0.0f;

    float meanMag = sumMag / HC_WINDOW_SIZE;
    float varMag  = sumMagSq / HC_WINDOW_SIZE - meanMag * meanMag;
    (void)meanMag; (void)varMag; (void)aboveLightCount; (void)aboveHeavyCount;

    ImpactClass label = classify_(peakDynamic, peakJerk);
    result.label = label;
    if (label != IMPACT_NONE) {
      float thresh = (label == IMPACT_HEAVY) ? heavyPeakThreshold : lightPeakThreshold;
      result.confidence = peakDynamic / thresh;
      if (!isfinite(result.confidence)) result.confidence = 1.0f;
      if (result.confidence > 1.0f) result.confidence = 1.0f;
      cooldownRemaining_ = cooldownSteps;
    } else {
      result.confidence = 0.0f;
    }
    return true;
  }

  float getBaseline() const { return baselineMag_; }

private:
  AccelSample ring_[HC_WINDOW_SIZE];
  int   head_  = 0, count_ = 0, step_ = 0;
  float baselineMag_       = 1.0f;
  int   baselineCount_     = 0;
  float baselineSum_       = 0.0f;
  int   cooldownRemaining_ = 0;

  ImpactClass classify_(float peakDynamic, float peakJerk) {
    if (peakDynamic > heavyPeakThreshold && peakJerk > heavyJerkThreshold)
      return IMPACT_HEAVY;
    if (peakDynamic > lightPeakThreshold && peakJerk > lightJerkThreshold)
      return IMPACT_LIGHT;
    return IMPACT_NONE;
  }
};


class HybridImpactClassifier {
public:
  HeuristicImpactClassifier heuristic;
  ImpactClassifier          cnn;
  bool  cnnEnabled             = false;
  float cnnConfidenceThreshold = 0.65f;

  bool begin() {
    cnn.begin();
    Serial.print("[HYBRID] ready cnn=");
    Serial.println(cnnEnabled ? "enabled" : "disabled");
    return true;
  }

  bool update(float x, float y, float z, ImpactResult& result) {
    ImpactResult hResult;
    bool hFired = heuristic.update(x, y, z, hResult);

    ImpactResult cnnResult = {IMPACT_NONE, 0.0f};
    bool cnnFired = cnnEnabled && cnn.update(x, y, z, cnnResult);

    if (!hFired) return false;

    if (!cnnEnabled) {
      result = hResult;
      if (result.label != IMPACT_NONE) {
        Serial.print("[HYBRID] peakDynamic=");
        Serial.print(heuristic.lastPeakDynamic, 3);
        Serial.print(" peakJerk=");
        Serial.print(heuristic.lastPeakJerk, 3);
        Serial.print(" heuristic=");
        Serial.println(labelStr_(result.label));
      }
      return true;
    }

    // CNN-enabled fusion
    if (hResult.label == IMPACT_NONE) {
      result = hResult;
      return true;
    }

    ImpactClass finalLabel;
    float       finalConf;
    const char* src;

    if (hResult.label == IMPACT_HEAVY) {
      finalLabel = IMPACT_HEAVY;
      finalConf  = 0.95f;
      src        = "heuristic";
    } else {
      if (cnnFired && cnnResult.confidence >= cnnConfidenceThreshold) {
        finalLabel = cnnResult.label;
        finalConf  = cnnResult.confidence;
        src        = "cnn";
      } else {
        finalLabel = hResult.label;
        finalConf  = hResult.confidence;
        src        = "heuristic";
      }
    }

    result.label      = finalLabel;
    result.confidence = finalConf;

    Serial.print("[HYBRID] peakDynamic=");
    Serial.print(heuristic.lastPeakDynamic, 3);
    Serial.print(" peakJerk=");
    Serial.print(heuristic.lastPeakJerk, 3);
    Serial.print(" heuristic=");
    Serial.print(labelStr_(hResult.label));
    Serial.print(" cnn=");
    Serial.print(labelStr_(cnnFired ? cnnResult.label : IMPACT_NONE));
    Serial.print(" cnn_conf=");
    Serial.print(cnnFired ? cnnResult.confidence : 0.0f, 2);
    Serial.print(" final=");
    Serial.print(labelStr_(finalLabel));
    Serial.print(" src=");
    Serial.println(src);
    return true;
  }

private:
  static const char* labelStr_(ImpactClass label) {
    if (label == IMPACT_HEAVY) return "HEAVY";
    if (label == IMPACT_LIGHT) return "LIGHT";
    return "NONE";
  }
};
