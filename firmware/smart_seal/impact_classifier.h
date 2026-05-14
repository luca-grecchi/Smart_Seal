#pragma once

#if __has_include("impact_model_data.h")
#define SMART_SEAL_HAS_IMPACT_MODEL 1
#include "impact_model_data.h"
#else
#define SMART_SEAL_HAS_IMPACT_MODEL 0
#endif

#if SMART_SEAL_HAS_IMPACT_MODEL
#include <TensorFlowLite.h>
#include <tensorflow/lite/micro/micro_interpreter.h>
#include <tensorflow/lite/micro/micro_mutable_op_resolver.h>
#include <tensorflow/lite/micro/system_setup.h>
#include <tensorflow/lite/schema/schema_generated.h>
#endif

#define IC_WINDOW_SIZE   25
#define IC_STEP_SIZE      5
#define IC_NUM_CLASSES    3
#define IC_TENSOR_ARENA 16384

enum ImpactClass { IMPACT_NONE = 0, IMPACT_LIGHT = 1, IMPACT_HEAVY = 2 };

struct ImpactResult {
  ImpactClass label;
  float confidence;
};

struct AccelSample {
  float x, y, z;
};

class ImpactClassifier {
public:
  bool begin() {
#if SMART_SEAL_HAS_IMPACT_MODEL
    tflite::InitializeTarget();
    model_ = tflite::GetModel(g_impact_model_data);
    if (model_->version() != TFLITE_SCHEMA_VERSION) {
      Serial.println("[IMPACT] model schema mismatch");
      return false;
    }
    resolver_.AddConv2D();
    resolver_.AddFullyConnected();
    resolver_.AddSoftmax();
    resolver_.AddReshape();
    resolver_.AddMean();
    resolver_.AddDequantize();
    resolver_.AddQuantize();
    interpreter_ = new tflite::MicroInterpreter(
        model_, resolver_, tensor_arena_, IC_TENSOR_ARENA, nullptr);
    if (interpreter_->AllocateTensors() != kTfLiteOk) {
      Serial.println("[IMPACT] tensor alloc failed");
      return false;
    }
    Serial.println("[IMPACT] classifier ready");
    return true;
#else
    Serial.println("[IMPACT] no model (run train_impact_model.py first)");
    return false;
#endif
  }

  // Returns true every IC_STEP_SIZE calls once the ring buffer is full.
  bool update(float x, float y, float z, ImpactResult& result) {
    ring_[head_] = {x, y, z};
    head_ = (head_ + 1) % IC_WINDOW_SIZE;
    if (count_ < IC_WINDOW_SIZE) count_++;
    step_++;

    if (count_ < IC_WINDOW_SIZE || step_ < IC_STEP_SIZE) return false;
    step_ = 0;

#if SMART_SEAL_HAS_IMPACT_MODEL
    return runInference(result);
#else
    return false;
#endif
  }

private:
  AccelSample ring_[IC_WINDOW_SIZE];
  int head_  = 0;
  int count_ = 0;
  int step_  = 0;

#if SMART_SEAL_HAS_IMPACT_MODEL
  const tflite::Model*                  model_       = nullptr;
  tflite::MicroMutableOpResolver<7>     resolver_;
  tflite::MicroInterpreter*             interpreter_ = nullptr;
  uint8_t tensor_arena_[IC_TENSOR_ARENA];

  void normalize(float* dst) {
    for (int i = 0; i < IC_WINDOW_SIZE; i++) {
      int idx     = (head_ + i) % IC_WINDOW_SIZE;
      dst[i*3+0]  = (ring_[idx].x - AXIS_MEAN[0]) / AXIS_STD[0];
      dst[i*3+1]  = (ring_[idx].y - AXIS_MEAN[1]) / AXIS_STD[1];
      dst[i*3+2]  = (ring_[idx].z - AXIS_MEAN[2]) / AXIS_STD[2];
    }
  }

  bool runInference(ImpactResult& result) {
    TfLiteTensor* input = interpreter_->input(0);
    if (input->type == kTfLiteFloat32) {
      normalize(input->data.f);
    } else if (input->type == kTfLiteInt8) {
      float buf[IC_WINDOW_SIZE * 3];
      normalize(buf);
      const float   scale      = input->params.scale;
      const int32_t zero_point = input->params.zero_point;
      for (int i = 0; i < IC_WINDOW_SIZE * 3; i++) {
        int32_t q = (int32_t)(buf[i] / scale) + zero_point;
        if (q < -128) q = -128;
        if (q >  127) q =  127;
        input->data.int8[i] = (int8_t)q;
      }
    }

    if (interpreter_->Invoke() != kTfLiteOk) return false;

    TfLiteTensor* output = interpreter_->output(0);
    float scores[IC_NUM_CLASSES];
    for (int i = 0; i < IC_NUM_CLASSES; i++) {
      if (output->type == kTfLiteInt8) {
        scores[i] = (output->data.int8[i] - output->params.zero_point)
                    * output->params.scale;
      } else {
        scores[i] = output->data.f[i];
      }
    }

    int best = 0;
    for (int i = 1; i < IC_NUM_CLASSES; i++) {
      if (scores[i] > scores[best]) best = i;
    }
    result.label      = (ImpactClass)best;
    result.confidence = scores[best];
    return true;
  }
#endif
};
