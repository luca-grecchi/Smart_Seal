# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend

```bash
cd backend
npm install       # first time
npm start         # production
npm run dev       # watch mode (node --watch)
npm run demo      # run a demo scenario (see below)
```

### Serial bridge (Arduino UNO Q)

```bash
python3 -m pip install pyserial
python3 firmware/uno_q_serial_bridge.py --port /dev/ttyACM0 --backend http://localhost:3000
```

Replace `/dev/ttyACM0` with the actual port; replace `localhost` with the laptop IP if the backend runs on a separate machine.

### Demo scenarios

```bash
cd backend
node ../demo/demo_runner.js A   # clean delivery → VERDICT_A
node ../demo/demo_runner.js B   # courier theft  → VERDICT_B
node ../demo/demo_runner.js C   # porch piracy   → VERDICT_C
node ../demo/demo_runner.js D   # empty box fraud → VERDICT_D
```

### Training the impact model (after collecting CSV data)

```bash
python3 firmware/train_impact_model.py \
    --data labeled_impacts.csv \
    --output firmware/smart_seal/impact_model_data.h
```

### Collecting accelerometer training data

Flash `smart_seal.ino` with `#define IMPACT_DATA_COLLECTION 1` uncommented, then:

```bash
python3 -m serial.tools.miniterm --raw /dev/ttyACM0 115200 > raw_idle.csv
```

## Architecture

### System overview

The device is an **Arduino UNO Q** (dual-chip: STM32U585 MCU runs the Arduino sketch; Qualcomm QRB2210 Linux MPU runs the Python bridge). The sketch has no WiFi library — it prints HTTP request frames to `Serial`, the bridge forwards them to the backend, and writes the response back over the same serial port. This framing protocol is defined in `firmware/smart_seal/network.h`.

```
[Arduino sketch] --Serial--> [uno_q_serial_bridge.py] --HTTP--> [backend]
                <--Serial--                            <--HTTP--
```

### Backend (`backend/`)

- **`server.js`** — Express + Socket.IO entry point. Serves `dashboard/` as static files on `/`, mounts three route modules under `/api`.
- **`state_engine.js`** — All business logic lives here (no database; sessions are in a `Map`). Functions: `createSession`, `ingestEvent`, `scanCourier`, `authenticateClient`, `disputeClient`, `drainCommands`, `computeVerdict`. `computeVerdict` runs after every mutation and queues a `VERDICT_COMPUTED` command when a verdict is reached.
- **`routes/`** — Thin Express handlers that call `state_engine.js` and emit Socket.IO events. `seal.js` handles `/api/seal`, `event.js` handles `/api/event`, `command.js` handles `/api/command/:id` (polled by the Arduino every 2 s).
- **`otp.js`** — Generates a courier OTP and a client OTP per session.

Session state lives only in memory — a process restart clears all sessions.

### Firmware (`firmware/smart_seal/`)

Each concern is a single header included by `smart_seal.ino`:

| Header | Role |
|--------|------|
| `state_machine.h` | `SealState` enum + `SealRuntime` struct |
| `sensors.h` | LIS3DHTR accelerometer + light sensor + product reed switch |
| `network.h` | Serial framing protocol (`httpRequest`) |
| `secrets.h` | `DEVICE_ID`, `BACKEND_HOST`, `BACKEND_PORT` (gitignored; copy from `secrets.h.example`) |
| `impact_classifier.h` | TFLite Micro 1D CNN wrapper (requires `impact_model_data.h`) |
| `hybrid_impact_classifier.h` | Heuristic pre-filter + optional CNN fusion (`cnnEnabled=false` by default) |
| `oled_display.h` | Adafruit SSD1306 wrapper for the SSD1315 OLED |

`smart_seal.ino` instantiates `HybridImpactClassifier impactClassifier` (not the raw CNN directly). The hybrid runs heuristic-only until `impactClassifier.cnnEnabled = true` is set (once `impact_model_data.h` is generated and flashed).

### Verdict logic

Four verdicts are computed in `state_engine.js:computeVerdict`:

| Verdict | Condition |
|---------|-----------|
| `VERDICT_A` | `client_authenticated && productRemovedLock` |
| `VERDICT_B` | `BOX_OPENED` without auth AND `courier_gps != client_home` |
| `VERDICT_C` | `BOX_OPENED` without auth AND gap since delivery ≥ 5 s |
| `VERDICT_D` | `dispute.type == EMPTY_BOX` after `productRemovedLock` |

`productRemovedLock` is a one-way latch — it never resets within a session.

### Dashboard (`dashboard/`)

Vanilla JS, no build step. Served directly by the backend's `express.static`. `client.js` connects via Socket.IO and renders session state in real time.

### Dashboard (`dashboard/`)

Vanilla JS, no build step. Served directly by the backend's `express.static`. `client.js` connects via Socket.IO and renders session state in real time.

## Hardware

### Arduino UNO Q

The only supported board. It is a dual-brain platform:

| Side | Chip | Role |
|------|------|------|
| MCU | STM32U585 (Cortex-M33 @ 160 MHz, 786 KB SRAM, 2 MB Flash) | Runs the Arduino sketch (`smart_seal.ino`) |
| MPU | Qualcomm Dragonwing™ QRB2210 (4× Cortex-A53 @ 2 GHz, 4 GB LPDDR4, Debian Linux) | Runs `uno_q_serial_bridge.py` |

The two sides communicate over an internal serial connection. Do not assume any other Arduino board, ESP32, or Raspberry Pi.

### Available sensors (Arduino Sensor Kit Base TPX00031)

Modules connect via Grove cables to the Base Shield — no breadboard, no manual VCC/GND wiring. Only these modules are available; do not propose anything outside this list.

| Module | Interface | Pin | Current use in Smart Seal |
|--------|-----------|-----|---------------------------|
| LED | Digital/PWM | `D6` | — |
| Button | Digital | `D4` | — |
| Buzzer | Digital | `D5` | — |
| Potentiometer | Analog | `A0` | — |
| Sound Sensor / Mic | Analog | `A2` | — |
| Light Sensor | Analog | `A3` | Box-open detection |
| Temperature & Humidity | Library (`Environment`) | — | — |
| Air Pressure Sensor | I2C | I2C port | — |
| Accelerometer (LIS3DHTR) | I2C | I2C port | Impact classification |
| OLED Screen (SSD1315) | I2C | I2C port (0x3C) | State + impact display |

Pin defines to use consistently across firmware:

```cpp
#define BUZZER 5
#define BUTTON 4
#define LED    6
#define POT    A0
#define MIC    A2
#define LIGHT  A3
// Accelerometer and OLED share the I2C bus (Wire)
```

## Key constraints

- **Do not add `WiFiS3.h`** to the Arduino sketch. HTTP must go through the serial bridge.
- **Do not rename API endpoints or payload fields** without updating both `docs/api_contract.md` and all callers (firmware, dashboard, demo runner).
- `secrets.h` is gitignored. Always edit `secrets.h.example` when adding new secrets.
- The backend has no persistence layer — all session state resets on restart by design.
- **Only use sensors from the kit listed above.** The MCU side has 786 KB SRAM — avoid large buffers beyond what TFLite Micro already allocates.
