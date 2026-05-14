#pragma once

enum SealState {
  WAITING_SEAL,           // Nessuna sessione — aspetta prodotto + scatola chiusa
  SEALED_STATE,           // Sessione creata dal backend, sigillo attivo
  IN_TRANSIT_STATE,       // Movimento rilevato (accelerometro)
  DELIVERED_STATE,        // Backend ha confermato COURIER_DELIVERED
  OPENED_STATE,           // Scatola aperta (spike luce)
  PRODUCT_REMOVED_STATE,  // Prodotto rimosso — logic lock ON (irreversibile)
  VERDICT_STATE           // Backend ha calcolato il verdict finale
};


enum SealEvent {
  EVENT_SEALED,
  EVENT_MOVING,
  EVENT_BOX_OPENED,
  EVENT_PRODUCT_REMOVED,
  EVENT_COURIER_DELIVERED,
  EVENT_CLIENT_AUTH,
  EVENT_VERDICT,
  EVENT_TAMPER
};


struct SealRuntime {
  SealState state          = WAITING_SEAL;
  bool productRemovedLock  = false;
  bool courierDelivered    = false;
  bool clientAuthenticated = false;
  String sessionId         = "";
};

void transitionTo(SealRuntime& rt, SealEvent ev) {
  switch (rt.state) {

    case WAITING_SEAL:
      if (ev == EVENT_SEALED) rt.state = SEALED_STATE;
      break;

    case SEALED_STATE:
      if (ev == EVENT_MOVING)     rt.state = IN_TRANSIT_STATE;
      if (ev == EVENT_BOX_OPENED) rt.state = OPENED_STATE;
      if (ev == EVENT_TAMPER)     rt.state = OPENED_STATE;
      break;

    case IN_TRANSIT_STATE:
      if (ev == EVENT_COURIER_DELIVERED) rt.state = DELIVERED_STATE;
      if (ev == EVENT_BOX_OPENED)        rt.state = OPENED_STATE;
      if (ev == EVENT_TAMPER)            rt.state = OPENED_STATE;
      break;

    case DELIVERED_STATE:
      if (ev == EVENT_CLIENT_AUTH) rt.clientAuthenticated = true;
      if (ev == EVENT_BOX_OPENED)  rt.state = OPENED_STATE;
      break;

    case OPENED_STATE:
      if (ev == EVENT_PRODUCT_REMOVED) {
        rt.productRemovedLock = true;
        rt.state = PRODUCT_REMOVED_STATE;
      }
      break;

    case PRODUCT_REMOVED_STATE:
      if (ev == EVENT_VERDICT) rt.state = VERDICT_STATE;
      break;

    default: break;
  }
}


const char* stateLabel(SealState state) {
  switch (state) {
    case WAITING_SEAL:          return "WAITING_SEAL";
    case SEALED_STATE:          return "SEALED";
    case IN_TRANSIT_STATE:      return "IN_TRANSIT";
    case DELIVERED_STATE:       return "DELIVERED";
    case OPENED_STATE:          return "OPENED";
    case PRODUCT_REMOVED_STATE: return "PRODUCT_REMOVED";
    case VERDICT_STATE:         return "VERDICT";
    default:                    return "UNKNOWN";
  }
}