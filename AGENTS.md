# Repository Guidelines

## Project Structure & Module Organization

This repository is a Smart Seal proof of concept:

- `backend/`: Node.js 20 Express API, in-memory session store, OTP handling, verdict engine, and Socket.IO events.
- `dashboard/`: static browser dashboard and simulator views served by the backend.
- `firmware/`: Arduino UNO Q sketch, sensor code, network/Serial bridge code, and firmware examples.
- `demo/`: CLI scenario runner for end-to-end backend flows.
- `docs/`: API contract, state-machine notes, and manual QA checklist.

Keep payloads aligned with `docs/api_contract.md`. Do not rename endpoints, events, or commands without updating firmware, dashboard, demo scripts, and docs together.

## Build, Test, and Development Commands

Run from `backend/`:

```bash
npm install
npm start
npm run dev
npm run demo
```

- `npm start`: starts Express/Socket.IO on port `3000`.
- `npm run dev`: starts Node watch mode.
- `npm run demo`: runs scripted A/B/C/D scenarios.

For UNO Q bridge testing:

```bash
python3 -m pip install pyserial
python3 firmware/uno_q_serial_bridge.py --port /dev/ttyACM0 --backend http://localhost:3000
```

## Coding Style & Naming Conventions

Use ES modules in backend JavaScript (`import`/`export`) and keep route handlers small. Use two-space indentation in JavaScript, JSON, HTML, and CSS. Prefer existing constants from `backend/state_engine.js`, such as `BOX_OPENED`, `PRODUCT_REMOVED`, and `VERDICT_COMPUTED`.

Firmware should stay Arduino-compatible C++. On UNO Q, keep networking on the Linux-side Serial bridge.

## Testing Guidelines

There is no automated test framework yet. Validate backend changes with:

```bash
cd backend
npm run demo
```

Also follow `docs/test_checklist.md`. Verify affected verdict scenarios and `GET /api/command/:session_id` draining.

## Commit & Pull Request Guidelines

Git history uses short, direct commits, with optional Conventional Commit prefixes, for example `feat: scaffold smart seal poc`. Prefer imperative summaries under 72 characters.

Pull requests should include:

- brief change summary
- affected areas, such as `backend`, `dashboard`, or `firmware`
- test/demo results
- screenshots for dashboard UI changes
- notes for API contract or firmware protocol changes

## Security & Configuration Tips

Do not commit real WiFi credentials, OTP secrets, or local network values. Use `firmware/secrets.h.example` and keep machine-specific config untracked.

## Hardware Constraints

The only target hardware is Arduino UNO Q with 4GB RAM. Do not assume other Arduino boards, ESP32 WiFi stacks, Raspberry Pi hardware, or accelerators.

The available kit is Arduino Sensor Kit - Base `TPX00031`: https://docs.rs-online.com/74c5/A700000011212451.pdf. Prefer its Grove modules, including light, movement/accelerometer, OLED, button, buzzer, sound, pressure, and temperature/humidity.
