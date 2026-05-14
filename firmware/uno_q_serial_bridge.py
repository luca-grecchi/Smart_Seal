#!/usr/bin/env python3
"""Forward Smart Seal Arduino Serial request frames to the backend.

Run this on the Arduino UNO Q Linux side, or on a laptop connected to the
Arduino serial port. It expects frames printed by firmware/smart_seal/network.h
and writes a response frame back to the same serial port.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

try:
    import serial
except ImportError:  # pragma: no cover - user setup path
    print("Missing dependency: install pyserial with `python3 -m pip install pyserial`.", file=sys.stderr)
    raise


REQUEST_BEGIN = "===DEVICE_REQUEST_BEGIN==="
REQUEST_END = "===DEVICE_REQUEST_END==="
RESPONSE_BEGIN = "===DEVICE_RESPONSE_BEGIN==="
RESPONSE_END = "===DEVICE_RESPONSE_END==="
FRAME_READ_TIMEOUT_S = 3.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="UNO Q serial-to-HTTP bridge for Smart Seal firmware.")
    parser.add_argument("--port", required=True, help="Serial device, for example /dev/ttyACM0 or /dev/tty.usbmodemXXXX.")
    parser.add_argument("--baud", type=int, default=115200, help="Serial baud rate. Must match Serial.begin(...).")
    parser.add_argument("--backend", default="http://localhost:3000", help="Backend base URL.")
    return parser.parse_args()


class SerialLineReader:
    def __init__(self, ser: serial.Serial) -> None:
        self.ser = ser
        self.buffer = bytearray()

    def read_line(self, timeout: float | None = None) -> str | None:
        deadline = None if timeout is None else time.monotonic() + timeout

        while True:
            newline_at = self.buffer.find(b"\n")
            if newline_at >= 0:
                raw = self.buffer[:newline_at]
                del self.buffer[:newline_at + 1]
                return raw.decode("utf-8", errors="replace").strip()

            if deadline is not None and time.monotonic() >= deadline:
                return None

            chunk = self.ser.read(1)
            if chunk:
                self.buffer.extend(chunk)
            elif timeout is None:
                return None


def read_request(reader: SerialLineReader) -> dict[str, str] | None:
    line = reader.read_line()
    if line is None:
        return None
    if line != REQUEST_BEGIN:
        if line:
            print(f"[arduino] {line}")
        return None

    request = {"method": "", "path": "", "body": ""}
    while True:
        raw = reader.read_line(FRAME_READ_TIMEOUT_S)
        if raw is None:
            print("[bridge] incomplete request frame")
            return None
        if raw == REQUEST_END:
            if not request["method"] or not request["path"]:
                print(f"[bridge] invalid request frame {request}")
                return None
            return request
        if raw.startswith("METHOD:"):
            request["method"] = raw.removeprefix("METHOD:")
        elif raw.startswith("PATH:"):
            request["path"] = raw.removeprefix("PATH:")
        elif raw.startswith("BODY:"):
            request["body"] = raw.removeprefix("BODY:")


def forward_request(backend: str, request: dict[str, str]) -> str:
    url = f"{backend.rstrip('/')}{request['path']}"
    method = request["method"].upper()
    body = request["body"].encode("utf-8") if request["body"] else None
    headers = {"Content-Type": "application/json"} if body else {}

    http_request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(http_request, timeout=5) as response:
            return response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        return json.dumps({"error": "HTTP_ERROR", "status": error.code, "detail": detail})
    except Exception as error:  # Keep the firmware alive during demo failures.
        return json.dumps({"error": "BRIDGE_ERROR", "detail": str(error)})


def write_response(ser: serial.Serial, body: str) -> None:
    # Firmware reads a single BODY line, so compact JSON must stay on one line.
    body = body.replace("\r", "").replace("\n", "")
    frame = f"{RESPONSE_BEGIN}\nBODY:{body}\n{RESPONSE_END}\n"
    ser.write(frame.encode("utf-8"))
    ser.flush()


def main() -> int:
    args = parse_args()
    with serial.Serial(args.port, args.baud, timeout=1) as ser:
        time.sleep(2)
        reader = SerialLineReader(ser)
        print(f"[bridge] forwarding {args.port} -> {args.backend}")
        while True:
            request = read_request(reader)
            if not request:
                continue
            print(f"[bridge] {request['method']} {request['path']} {request['body']}")
            response_body = forward_request(args.backend, request)
            print(f"[bridge] response {response_body}")
            write_response(ser, response_body)


if __name__ == "__main__":
    raise SystemExit(main())
