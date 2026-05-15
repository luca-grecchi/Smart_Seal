# Smart Seal

Hackathon PoC that disambiguates four delivery fraud scenarios using a physical IoT device (Arduino UNO Q) or a browser-based simulator.

| Verdict | Scenario |
|---------|----------|
| `VERDICT_A` | Clean delivery — both handshakes verified, product removed by recipient |
| `VERDICT_B` | Courier theft — box opened at wrong GPS without recipient auth |
| `VERDICT_C` | Porch piracy — correct GPS, ≥ 5 s gap, opened without recipient auth |
| `VERDICT_D` | Empty-box fraud — recipient disputes after a clean delivery |

## Quick start

```bash
cd backend
npm install
npm start
```

Dashboard → `http://localhost:3000`

## Demo scenarios (no hardware needed)

```bash
cd backend
node ../demo/demo_runner.js A   # clean delivery  → VERDICT_A
node ../demo/demo_runner.js B   # courier theft   → VERDICT_B
node ../demo/demo_runner.js C   # porch piracy    → VERDICT_C (waits 5 s)
node ../demo/demo_runner.js D   # empty-box fraud → VERDICT_D
```

Or use the **Scenario Runner** cards in the dashboard — click a card and watch the animated stepper resolve in real time.

## Arduino UNO Q

The sketch has no WiFi — it prints HTTP frames to `Serial`; the Linux side of UNO Q forwards them to the backend.

1. Flash `firmware/smart_seal/smart_seal.ino` onto the MCU side.
2. Start the backend (`npm start`).
3. On the Linux side of UNO Q (or a laptop connected via USB):

```bash
python3 -m pip install pyserial
python3 firmware/uno_q_serial_bridge.py --port <port> --backend http://localhost:3000
```

**Find your port:**

- **Linux:** `ls /dev/ttyACM*` → typically `/dev/ttyACM0`
- **macOS:** `ls /dev/tty.usb*` → typically `/dev/tty.usbmodem...`

If the backend runs on a separate machine, replace `localhost` with its IP.

Connect the dashboard to the live backend by entering the backend URL in the header and clicking **Connect backend**.

## Impact classifier

The firmware runs a hybrid impact classifier on the LIS3DHTR accelerometer:

- **Heuristic pre-filter** — instant, no model needed.
- **TFLite Micro 1D CNN** — optional; enabled once `impact_model_data.h` is generated.

### Collect training data

Flash with `#define IMPACT_DATA_COLLECTION 1` uncommented:

```bash
python3 -m serial.tools.miniterm --raw /dev/ttyACM0 115200 > raw.csv
```

### Train the model

```bash
python3 firmware/train_impact_model.py \
    --data labeled_impacts.csv \
    --output firmware/smart_seal/impact_model_data.h
```

Then reflash and set `impactClassifier.cnnEnabled = true` in `smart_seal.ino`.

## Project structure

```
backend/    Express + Socket.IO API, in-memory session store, OTP, verdict engine
dashboard/  React operator console — no build step, served by the backend at /
demo/       CLI scenario runner (A / B / C / D)
docs/       API contract, state machine diagram, QA checklist
firmware/   Arduino sketch + header modules + Python serial bridge + model trainer
```

### Key files

| File | Role |
|------|------|
| `backend/server.js` | Entry point — Express + Socket.IO, serves `dashboard/` |
| `backend/state_engine.js` | All verdict logic, session state (in-memory Map) |
| `dashboard/App.jsx` | React root — wires local state engine ↔ live backend |
| `dashboard/MissionControl.jsx` | Animated 5-step parcel journey stepper |
| `firmware/smart_seal/smart_seal.ino` | Arduino sketch entry point |
| `firmware/smart_seal/hybrid_impact_classifier.h` | Heuristic + CNN impact classifier |
| `firmware/uno_q_serial_bridge.py` | Forwards Serial frames → HTTP and back |

## Architecture

```
[Arduino sketch] --Serial--> [uno_q_serial_bridge.py] --HTTP--> [backend]
                <--Serial--                            <--HTTP--
                                                           |
                                                    [dashboard] (Socket.IO)
```

The Arduino sketch prints raw HTTP request frames; the bridge forwards them and writes the response back. The dashboard connects via Socket.IO and receives live session updates.

