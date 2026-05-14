# Smart Seal

PoC tecnico hackathon per disambiguare quattro scenari di consegna tramite device fisico o simulatore:

- `VERDICT_A` - consegna pulita
- `VERDICT_B` - sospetto furto corriere
- `VERDICT_C` - sospetto porch piracy
- `VERDICT_D` - empty box fraud cliente

## Avvio rapido

```bash
cd backend
npm install
npm start
```

Dashboard:

```txt
http://localhost:3000
```

## Arduino UNO Q

Lo sketch non deve usare `WiFiS3.h` su UNO Q. Il firmware stampa richieste HTTP
incapsulate su Serial e il lato Linux di UNO Q le inoltra al backend.

1. Caricare `firmware/smart_seal/smart_seal.ino` sulla parte Arduino.
2. Avviare il backend.
3. Sul lato Linux di UNO Q, o su un laptop collegato alla seriale, eseguire:

```bash
python3 -m pip install pyserial
python3 firmware/uno_q_serial_bridge.py --port /dev/ttyACM0 --backend http://localhost:3000
```

Sostituire `/dev/ttyACM0` con la porta seriale effettiva. Se il backend gira su
un laptop diverso da UNO Q, usare l'IP del laptop al posto di `localhost`.

## Struttura

```txt
backend/    API, session store in memoria, OTP, verdict engine
dashboard/  dashboard e simulatore senza build step
demo/       runner CLI per scenari A/B/C/D
docs/       contratto API, state machine, checklist QA
firmware/   sketch Arduino e header di integrazione
```

## Workflow team

- P1 lavora in `firmware/`.
- P2 lavora in `backend/`.
- P3 lavora in `dashboard/`, `demo/` e `docs/test_checklist.md`.
- Il contratto API vive in `docs/api_contract.md`: evitare rename di endpoint, eventi e payload senza allineamento del team.
