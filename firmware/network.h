#pragma once

#include <WiFiS3.h>
#include "secrets.h"

WiFiClient client;

bool connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi status: ");
  Serial.println(WiFi.status());
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  return WiFi.status() == WL_CONNECTED;
}

String httpRequest(const String& method, const String& path, const String& body) {
  if (!client.connect(BACKEND_HOST, BACKEND_PORT)) {
    return "";
  }

  client.print(method + " " + path + " HTTP/1.1\r\n");
  client.print("Host: " + String(BACKEND_HOST) + "\r\n");
  client.print("Content-Type: application/json\r\n");
  client.print("Connection: close\r\n");
  if (body.length() > 0) {
    client.print("Content-Length: " + String(body.length()) + "\r\n");
  }
  client.print("\r\n");
  if (body.length() > 0) {
    client.print(body);
  }

  String response = "";
  unsigned long startedAt = millis();
  while (client.connected() && millis() - startedAt < 5000) {
    while (client.available()) {
      response += char(client.read());
    }
  }
  client.stop();
  return response;
}

