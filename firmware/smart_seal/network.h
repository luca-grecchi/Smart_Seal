#pragma once

String httpRequest(const String& method, const String& path, const String& body) {
  Serial.println("===DEVICE_REQUEST_BEGIN===");
  Serial.print("METHOD:");
  Serial.println(method);
  Serial.print("PATH:");
  Serial.println(path);
  Serial.print("BODY:");
  Serial.println(body);
  Serial.println("===DEVICE_REQUEST_END===");

  return "{\"ok\":true,\"transport\":\"uno_q_linux_bridge\"}";
}

bool connectWifi() {
  Serial.println("[NET] WiFi handled by UNO Q Linux bridge");
  return true;
}