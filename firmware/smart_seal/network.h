#pragma once

const unsigned long BRIDGE_RESPONSE_TIMEOUT_MS = 5000;

String httpRequest(const String& method, const String& path, const String& body) {
  Serial.println("===DEVICE_REQUEST_BEGIN===");
  Serial.print("METHOD:");
  Serial.println(method);
  Serial.print("PATH:");
  Serial.println(path);
  Serial.print("BODY:");
  Serial.println(body);
  Serial.println("===DEVICE_REQUEST_END===");

  unsigned long startedAt = millis();
  bool inResponse = false;
  String responseBody = "";

  while (millis() - startedAt < BRIDGE_RESPONSE_TIMEOUT_MS) {
    if (!Serial.available()) {
      delay(10);
      continue;
    }

    String line = Serial.readStringUntil('\n');
    line.trim();

    if (line == "===DEVICE_RESPONSE_BEGIN===") {
      inResponse = true;
      continue;
    }

    if (line == "===DEVICE_RESPONSE_END===") {
      return responseBody;
    }

    if (inResponse && line.startsWith("BODY:")) {
      responseBody = line.substring(5);
    }
  }

  Serial.println("[NET] UNO Q bridge response timeout");
  return "";
}

bool connectNetwork() {
  Serial.println("[NET] UNO Q uses Linux-side serial HTTP bridge");
  return true;
}
