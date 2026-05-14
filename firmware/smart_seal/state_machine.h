#pragma once

enum SealState {
  WAITING_SEAL,
  SEALED_STATE,
  IN_TRANSIT_STATE,
  DELIVERED_STATE,
  OPENED_STATE,
  PRODUCT_REMOVED_STATE,
  VERDICT_STATE
};

struct SealRuntime {
  SealState state = WAITING_SEAL;
  bool productRemovedLock = false;
  String sessionId = "";
};

const char* stateLabel(SealState state) {
  switch (state) {
    case WAITING_SEAL: return "WAITING_SEAL";
    case SEALED_STATE: return "SEALED";
    case IN_TRANSIT_STATE: return "IN_TRANSIT";
    case DELIVERED_STATE: return "DELIVERED";
    case OPENED_STATE: return "OPENED";
    case PRODUCT_REMOVED_STATE: return "PRODUCT_REMOVED";
    case VERDICT_STATE: return "VERDICT";
    default: return "UNKNOWN";
  }
}

