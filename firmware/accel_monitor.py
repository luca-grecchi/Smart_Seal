#!/usr/bin/env python3
"""Live accelerometer monitor for Smart Seal firmware.

Two modes depending on how the sketch was flashed:

  Normal mode (default):
    Parses the periodic log line printed every second:
      state=... accelNorm=X.XX ...
    Run: python3 firmware/accel_monitor.py --port /dev/ttyACM0

  CSV mode (IMPACT_DATA_COLLECTION uncommented in smart_seal.ino):
    Parses raw CSV rows: timestamp_ms,accel_x,accel_y,accel_z
    Run: python3 firmware/accel_monitor.py --port /dev/ttyACM0 --csv
"""

from __future__ import annotations

import argparse
import math
import sys

try:
    import serial
except ImportError:
    print("Missing dependency: python3 -m pip install pyserial", file=sys.stderr)
    sys.exit(1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Live accelerometer monitor.")
    parser.add_argument("--port", required=True, help="Serial port, e.g. /dev/ttyACM0")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--csv", action="store_true", help="Expect IMPACT_DATA_COLLECTION CSV output")
    return parser.parse_args()


def _parse_log_line(line: str) -> dict[str, str] | None:
    """Extract key=value pairs from the periodic log line."""
    if "accelNorm=" not in line:
        return None
    fields: dict[str, str] = {}
    for token in line.split():
        if "=" in token:
            k, _, v = token.partition("=")
            fields[k] = v
    return fields if "accelNorm" in fields else None


def run_normal(ser: serial.Serial) -> None:
    print("Listening for log lines (accelNorm)… Ctrl-C to stop.\n")
    print(f"{'state':<20} {'accelNorm':>10}  {'light':>6}  {'open':>5}  {'product':>7}")
    print("-" * 60)
    while True:
        raw = ser.readline().decode("utf-8", errors="replace").strip()
        if not raw:
            continue
        fields = _parse_log_line(raw)
        if fields is None:
            print(f"  [{raw}]")
            continue
        print(
            f"{fields.get('state', '?'):<20}"
            f" {float(fields.get('accelNorm', 0)):>10.4f}"
            f"  {fields.get('light', '?'):>6}"
            f"  {fields.get('open', '?'):>5}"
            f"  {fields.get('productPresent', '?'):>7}"
        )


def run_csv(ser: serial.Serial) -> None:
    print("Listening for CSV rows… Ctrl-C to stop.\n")
    print(f"{'t_ms':>10}  {'x':>10}  {'y':>10}  {'z':>10}  {'norm':>10}")
    print("-" * 55)
    for raw_line in ser:
        line = raw_line.decode("utf-8", errors="replace").strip()
        if line.startswith("timestamp") or not line:
            continue
        parts = line.split(",")
        if len(parts) != 4:
            continue
        try:
            t_ms, x, y, z = int(parts[0]), float(parts[1]), float(parts[2]), float(parts[3])
        except ValueError:
            continue
        norm = math.sqrt(x * x + y * y + z * z)
        print(f"{t_ms:>10}  {x:>10.4f}  {y:>10.4f}  {z:>10.4f}  {norm:>10.4f}")


def main() -> None:
    args = parse_args()
    try:
        ser = serial.Serial(args.port, args.baud, timeout=2)
    except serial.SerialException as exc:
        print(f"Cannot open {args.port}: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"Connected to {args.port} @ {args.baud} baud")
    try:
        if args.csv:
            run_csv(ser)
        else:
            run_normal(ser)
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        ser.close()


if __name__ == "__main__":
    main()
