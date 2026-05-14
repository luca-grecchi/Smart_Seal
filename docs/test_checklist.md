# Smart Seal Test Checklist

## Setup

- [ ] `cd backend && npm install`
- [ ] `npm start`
- [ ] Aprire `http://localhost:3000`
- [ ] Creare una nuova sessione dalla dashboard
- [ ] Verificare Socket.IO con `session.update` nell'event log

## Scenario A - Clean delivery

- [ ] Nuova sessione
- [ ] Corriere scansiona OTP con `gps=client_home`
- [ ] Cliente autentica OTP con `gps=client_home`
- [ ] Simulare `BOX_OPENED`
- [ ] Simulare `PRODUCT_REMOVED`
- [ ] Verificare `VERDICT_A`

## Scenario D - Empty box fraud

- [ ] Eseguire Scenario A fino a `PRODUCT_REMOVED`
- [ ] Cliente invia dispute `EMPTY_BOX`
- [ ] Verificare `productRemovedLock=true`
- [ ] Verificare `VERDICT_D`

## Scenario B - Courier theft suspected

- [ ] Nuova sessione
- [ ] Corriere scansiona OTP con `gps=courier_depot`
- [ ] Non autenticare cliente
- [ ] Simulare subito `BOX_OPENED`
- [ ] Verificare `VERDICT_B`

## Scenario C - Porch piracy suspected

- [ ] Nuova sessione
- [ ] Corriere scansiona OTP con `gps=client_home`
- [ ] Non autenticare cliente
- [ ] Attendere almeno 5 secondi
- [ ] Simulare `BOX_OPENED`
- [ ] Verificare `VERDICT_C`

## Edge cases

- [ ] OTP corriere sbagliato viene rifiutato
- [ ] OTP cliente sbagliato viene rifiutato
- [ ] `GET /api/command/:session_id` ritorna e svuota comandi
- [ ] Reset sessione crea nuovo `session_id`
- [ ] Refresh dashboard e reload sessione funzionano

