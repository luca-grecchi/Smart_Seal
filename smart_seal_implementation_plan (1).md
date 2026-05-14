# Smart Seal — Piano di implementazione PoC tecnico (24h, team di 3)

> Piano operativo tecnico per il PoC hackathon: anti-fraud device con disambiguazione consegna a 4 stati (A/B/C/D), dashboard OTP, simulatore eventi e Arduino UNO Q come dispositivo fisico. Il team è diviso in **3 ruoli tecnici**: firmware/device, backend/state engine, dashboard/simulatori/QA.

---

## 1. Obiettivo tecnico del PoC

Dimostrare che il sistema disambigua i 4 scenari di consegna tramite una pipeline end-to-end:

```txt
sensore fisico → evento Arduino → backend → dashboard → verdict
```

Scenari target:

- **A — Consegna pulita**: handshake corriere + cliente OK, apertura autorizzata, prodotto rimosso dal cliente.
- **B — Furto corriere post-segnalazione**: no handshake cliente, GPS errato, apertura immediata dopo consegna.
- **C — Porch piracy**: no handshake cliente, apertura dopo gap temporale simulato.
- **D — Empty box fraud cliente**: handshake OK, cliente dichiara pacco vuoto, ma il logic lock mostra che il prodotto è stato rimosso dopo apertura autorizzata.

Il PoC deve funzionare anche se Arduino/WiFi fallisce, grazie a una dashboard/simulatore che può inviare gli stessi eventi del device.

---

## 2. Team e ruoli tecnici

Tre persone, tutte tecniche. Ogni ruolo ha un'area owner, ma le interfacce devono essere condivise entro H+2.

### P1 — Device/Firmware Engineer

**Missione:** far diventare Arduino UNO Q un device affidabile che genera eventi fisici puliti.

**Owner di:**
- Arduino UNO Q
- sensori Grove / componenti fisici
- state machine locale minima
- logic lock unidirezionale
- comunicazione HTTP con backend
- OLED / LED / buzzer per feedback fisico

**Deliverable principali:**
```txt
firmware/smart_seal.ino
firmware/sensors.h
firmware/network.h
firmware/state_machine.h
firmware/secrets.h.example
```

**Output atteso:** Arduino legge i sensori, aggiorna OLED/LED e invia eventi reali al backend.

---

### P2 — Backend/State Engineer

**Missione:** costruire la verità logica del sistema: sessioni, OTP, comandi, eventi e verdict.

**Owner di:**
- Node.js + Express
- Socket.IO server
- session storage in memoria
- generazione e validazione OTP
- state machine backend
- verdict engine A/B/C/D
- API contract

**Deliverable principali:**
```txt
backend/server.js
backend/otp.js
backend/state_engine.js
backend/routes/seal.js
backend/routes/event.js
backend/routes/command.js
```

**Output atteso:** backend stabile che riceve eventi, invia comandi, aggiorna dashboard e calcola verdict corretti.

---

### P3 — Frontend/Test Automation Engineer

**Missione:** rendere il sistema controllabile, testabile e debuggabile anche senza Arduino.

**Owner di:**
- dashboard web
- simulatori eventi device
- pannelli OTP corriere/cliente
- log eventi live
- test end-to-end degli scenari A/B/C/D
- checklist QA tecnica
- fallback software se il device fisico fallisce

**Deliverable principali:**
```txt
dashboard/index.html
dashboard/retailer.js
dashboard/courier.js
dashboard/client.js
dashboard/device_view.js
demo/demo_runner.js
docs/test_checklist.md
```

**Output atteso:** dashboard usabile + pulsanti/script per simulare tutti gli eventi critici senza Arduino.

---

## 3. Regola di integrazione

La priorità non è aggiungere feature. La priorità è avere una pipeline end-to-end stabile.

Entro **H+6** deve funzionare una demo simulata senza Arduino.

Entro **H+12** devono funzionare almeno A e D con Arduino reale.

Entro **H+18** devono funzionare B e C, anche se con simulazione parziale.

Dopo **H+18** non si aggiungono feature: solo stabilizzazione, bug fix e fallback.

---

## 4. Stack tecnico consolidato

| Layer | Scelta | Note |
|---|---|---|
| Hardware | Arduino UNO Q + kit Grove / componenti base | Microswitch/button, fotoresistore, accelerometro opzionale, OLED, LED, buzzer |
| Connettività | WiFi onboard + HTTP REST Arduino → backend + HTTP polling backend → Arduino | Polling > WebSocket su Arduino per debug più semplice |
| Backend | Node.js 20 + Express + Socket.IO | Setup rapido, JSON nativo, WebSocket per dashboard live |
| Persistence | In-memory object store | Restart = reset, accettabile per PoC |
| Dashboard | HTML + Vanilla JS + Tailwind CDN + Socket.IO client | No build step, no framework overhead |
| OTP | 6 cifre random generate al sealing, scadenza 30 minuti | TOTP non necessario per PoC |
| GPS | Dropdown simulato | `client_home`, `courier_depot`, `random_location` |
| Crypto PoC | SHA-256 hash dei payload, opzionale | Non bloccare il PoC su crypto |
| ML edge | Non prioritario | Solo se tutto il Tier M è già stabile |
| Repo | GitHub privato, branch `main` + feature branch per layer | Push frequenti |

---

## 5. Struttura repo

```txt
smart-seal/
├── README.md
├── docs/
│   ├── api_contract.md          # endpoint + JSON schemas
│   ├── state_machine.md         # diagramma stati Arduino/backend
│   └── test_checklist.md        # scenari A/B/C/D + casi edge
├── firmware/
│   ├── smart_seal.ino           # sketch principale
│   ├── secrets.h.example        # WiFi creds template
│   ├── state_machine.h
│   ├── sensors.h
│   └── network.h
├── backend/
│   ├── package.json
│   ├── server.js                # Express + Socket.IO
│   ├── otp.js                   # generazione + validazione OTP
│   ├── state_engine.js          # state machine logica + verdict
│   └── routes/
│       ├── seal.js
│       ├── event.js
│       └── command.js
├── dashboard/
│   ├── index.html               # entry point con 4 tab
│   ├── retailer.js              # console retailer / verdict
│   ├── courier.js               # pannello corriere
│   ├── client.js                # pannello cliente
│   ├── device_view.js           # live sensori + event simulator
│   └── styles.css
└── demo/
    └── demo_runner.js           # script/preset per scenari simulati
```

---

## 6. API contract da congelare entro H+2

Questo è il documento più importante delle prime 2 ore. Una volta fissato, P1, P2 e P3 lavorano in parallelo.

### 6.1 Eventi Arduino/simulatore → backend

Per il PoC tenere pochi eventi, chiari e testabili:

```txt
SEALED
IN_TRANSIT
BOX_OPENED
PRODUCT_REMOVED
TAMPER
```

Eventi opzionali solo se non complicano il flusso:

```txt
STATIC
POST_REMOVAL_INSERTION
```

---

### 6.2 Comandi backend → Arduino

Arduino fa polling ogni 1-2 secondi.

```txt
COURIER_DELIVERED
CLIENT_AUTHENTICATED
RESET_SESSION
VERDICT_COMPUTED
```

---

### 6.3 `POST /api/seal`

Inizio ciclo. Arduino ha rilevato prodotto inserito + scatola chiusa.

**Request:**
```json
{
  "device_id": "ARD-001",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "session_id": "sess_abc123",
  "courier_otp": "847291",
  "client_otp": "192384",
  "expected_client_gps": "client_home"
}
```

---

### 6.4 `POST /api/event`

Arduino o simulatore notificano un evento al backend.

**Request:**
```json
{
  "session_id": "sess_abc123",
  "source": "arduino",
  "event": "BOX_OPENED",
  "timestamp": 1234567890,
  "sensor_data": {
    "light": 850,
    "accel_norm": 12.3,
    "product_present": false
  }
}
```

`source` può essere:

```txt
arduino
simulator
```

---

### 6.5 `GET /api/command/:session_id`

Arduino riceve comandi dal backend.

**Response:**
```json
{
  "commands": [
    { "type": "COURIER_DELIVERED", "gps": "client_home", "timestamp": 1234567890 },
    { "type": "CLIENT_AUTHENTICATED", "gps": "client_home", "timestamp": 1234567891 }
  ]
}
```

---

### 6.6 Endpoints dashboard → backend

```txt
POST /api/courier/scan
POST /api/client/authenticate
POST /api/client/dispute
GET  /api/session/:id
POST /api/session/:id/reset
```

#### `POST /api/courier/scan`

```json
{
  "session_id": "sess_abc123",
  "courier_otp": "847291",
  "gps": "client_home"
}
```

#### `POST /api/client/authenticate`

```json
{
  "session_id": "sess_abc123",
  "client_otp": "192384",
  "gps": "client_home"
}
```

#### `POST /api/client/dispute`

```json
{
  "session_id": "sess_abc123",
  "type": "EMPTY_BOX"
}
```

---

### 6.7 WebSocket events backend → dashboard

```txt
session.update
command.created
device.event
verdict.computed
error.event
```

---

## 7. State machine backend

```txt
WAITING_SEAL
  → SEALED
  → IN_TRANSIT
  → DELIVERED_AWAITING_RECIPIENT
      ├─ CLIENT_AUTHENTICATED
      │    → DELIVERED_CONFIRMED
      │    → OPENED_BY_CUSTOMER
      │    → REMOVED_BY_CUSTOMER
      │    → VERDICT_A oppure VERDICT_D se arriva dispute EMPTY_BOX
      │
      └─ BOX_OPENED senza CLIENT_AUTHENTICATED
           → OPENED_WITHOUT_AUTH
           ├─ gap < threshold + GPS != client_home → VERDICT_B
           └─ gap >= threshold → VERDICT_C
```

Per il PoC, il gap temporale può essere simulato così:

```txt
5 secondi = molte ore
```

---

## 8. Timeline a fasi

### Fase 0 — Setup e contratto (H+0 → H+2)

**Output obbligatorio entro H+2:** API contract approvato + repo bootstrappato + 3 ambienti dev funzionanti.

#### Tutti
- [ ] Repo GitHub creato, 3 collaboratori, struttura cartelle pushata
- [ ] Eventi e comandi congelati
- [ ] JSON request/response congelati
- [ ] Regola: da H+2 in poi niente rename di endpoint/eventi senza consenso di tutti

#### P1 — Device/Firmware
- [ ] Arduino IDE pronto
- [ ] Board UNO Q comunicante via Serial
- [ ] Test minimo OLED o Serial output
- [ ] `secrets.h.example` preparato

#### P2 — Backend/State
- [ ] `npm init`
- [ ] Express + Socket.IO installati
- [ ] `npm start` avvia server su `localhost:3000`
- [ ] endpoint stub creati

#### P3 — Dashboard/QA
- [ ] `dashboard/index.html` creato
- [ ] 4 tab vuoti: retailer, courier, client, device/simulator
- [ ] `docs/test_checklist.md` creato
- [ ] primi bottoni simulatori disegnati anche se non funzionanti

---

### Fase 1 — Skeleton parallelo e demo simulata (H+2 → H+6)

**Obiettivo H+6:** scenario A simulato funzionante senza Arduino.

#### P1 — Firmware skeleton
- [ ] Arduino connette al WiFi, testato con hotspot telefono come fallback
- [ ] Lettura microswitch/button funzionante su Serial
- [ ] Lettura fotoresistore o sensore luce funzionante su Serial
- [ ] OLED stampa `SMART SEAL v0.1` e stato corrente
- [ ] Primo `POST /api/seal` funzionante
- [ ] Polling `GET /api/command/:session_id` ogni 1-2s

#### P2 — Backend skeleton
- [ ] Tutti gli endpoint rispondono con JSON coerente
- [ ] Generazione OTP 6 cifre funzionante
- [ ] Session storage in memoria
- [ ] Socket.IO broadcast `session.update`
- [ ] `POST /api/event` accetta eventi da `source: simulator`

#### P3 — Dashboard + simulator skeleton
- [ ] Dashboard con input OTP corriere
- [ ] Dropdown GPS: `client_home`, `courier_depot`, `random_location`
- [ ] Input OTP cliente
- [ ] Bottone `simulate SEALED`
- [ ] Bottone `simulate BOX_OPENED`
- [ ] Bottone `simulate PRODUCT_REMOVED`
- [ ] Bottone `client dispute EMPTY_BOX`
- [ ] Event log live timestamped
- [ ] Scenario A simulato eseguibile da dashboard

---

### Fase 2 — Core logic e integrazione Arduino (H+6 → H+12)

**Obiettivo H+12:** A e D funzionano end-to-end con Arduino reale.

#### P1 — State machine Arduino
- [ ] Stati locali minimi: `WAITING_SEAL`, `SEALED`, `IN_TRANSIT`, `OPENED`, `PRODUCT_REMOVED`
- [ ] Eventi inviati al backend a ogni transizione rilevante
- [ ] Logic lock irreversibile su `PRODUCT_REMOVED`
- [ ] Gestione comandi backend: `COURIER_DELIVERED`, `CLIENT_AUTHENTICATED`, `RESET_SESSION`, `VERDICT_COMPUTED`
- [ ] OLED leggibile da 1 metro
- [ ] LED/buzzer solo se non rallentano integrazione

#### P2 — Verdict engine A/D
- [ ] Validazione OTP con scadenza
- [ ] Comandi accodati per Arduino dopo OTP corretti
- [ ] State machine backend per Scenario A
- [ ] State machine backend per Scenario D
- [ ] `verdict.computed` inviato via Socket.IO
- [ ] Log backend verbosi per debugging live

#### P3 — End-to-end QA A/D
- [ ] Test Scenario A da dashboard simulata
- [ ] Test Scenario A con Arduino reale
- [ ] Test Scenario D da dashboard simulata
- [ ] Test Scenario D con Arduino reale
- [ ] Checklist bug aggiornata
- [ ] Screenshot/log utili salvati per debug

#### Checkpoint H+12 — review tecnica

Rispondere onestamente:

1. Scenario A funziona end-to-end con Arduino?
2. Scenario D funziona end-to-end con Arduino?
3. Se Arduino fallisce, la demo simulata A/D funziona?
4. Il logic lock resta irreversibile nella stessa sessione?
5. Ogni persona sa eseguire il proprio componente da zero?

Se la risposta a 1 o 2 è NO, tutto il team converge su A/D. Niente B/C, niente polish, niente feature opzionali.

---

### Fase 3 — Scenari B/C e robustezza (H+12 → H+18)

**Obiettivo H+18:** tutti e 4 i verdict funzionano, anche con simulazione parziale per B/C.

#### P1 — Eventi fisici aggiuntivi
- [ ] Apertura senza client auth rilevata correttamente
- [ ] Soglie luce/microswitch stabilizzate
- [ ] Accelerometro usato solo come soglia semplice se già stabile
- [ ] OLED mostra messaggio caratteristico per verdict finale

#### P2 — Verdict engine B/C
- [ ] Scenario B: no client auth + GPS diverso da `client_home` + apertura immediata → `VERDICT_B`
- [ ] Scenario C: no client auth + gap temporale simulato → `VERDICT_C`
- [ ] Reset sessione robusto
- [ ] Errori OTP errati gestiti senza crash
- [ ] `GET /api/session/:id` restituisce stato completo per debug

#### P3 — Scenario runner e stress test
- [ ] Pulsante/script `Run Scenario A`
- [ ] Pulsante/script `Run Scenario B`
- [ ] Pulsante/script `Run Scenario C`
- [ ] Pulsante/script `Run Scenario D`
- [ ] Test refresh browser durante sessione
- [ ] Test backend restart + nuova sessione
- [ ] Test sequenza completa A → D → B → C

---

### Fase 4 — Hardening tecnico (H+18 → H+22)

**Obiettivo:** non aggiungere nuove feature. Rendere il sistema ripetibile.

#### Tutti
- [ ] Run-through tecnico completo almeno 3 volte
- [ ] Nessun rename di API/eventi
- [ ] Nessun refactor non necessario
- [ ] Fix solo di bug visibili o bloccanti

#### P1
- [ ] Cavi e soglie sensori controllati
- [ ] OLED sempre leggibile
- [ ] Recovery WiFi base o reset manuale rapido documentato
- [ ] Sketch stabile già caricato

#### P2
- [ ] `npm start` pulito
- [ ] Log backend leggibili
- [ ] Reset sessione affidabile
- [ ] Nessun crash su input sbagliati

#### P3
- [ ] Checklist QA completata
- [ ] Scenario runner funzionante
- [ ] Dashboard testata sul laptop finale
- [ ] Fallback simulato pronto

---

### Fase 5 — Final technical prep (H+22 → H+24)

- [ ] Backend running
- [ ] Dashboard aperta
- [ ] Arduino alimentato e pronto
- [ ] Hotspot WiFi testato
- [ ] Cavi USB e adattatori disponibili
- [ ] Scenario A testato
- [ ] Scenario D testato
- [ ] Scenario B/C testati o simulabili
- [ ] Video/log fallback disponibili se richiesti dal formato hackathon
- [ ] Nessuna modifica al codice negli ultimi 30 minuti salvo bug critico

---

## 9. Scope tier tecnico

In caso di ritardi, tagliare in ordine inverso. Il simulatore è **Must**, non Nice: serve per testare e per fallback.

### Tier M — Must

Senza questo il PoC tecnico non sta in piedi:

- [ ] API contract congelato
- [ ] `POST /api/seal` funzionante
- [ ] `POST /api/event` funzionante da Arduino e da simulatore
- [ ] `GET /api/command/:session_id` funzionante
- [ ] Dashboard mostra sessione, OTP, eventi, verdict
- [ ] Arduino manda almeno `BOX_OPENED` e `PRODUCT_REMOVED`
- [ ] Backend genera OTP
- [ ] Backend valida OTP corriere/cliente
- [ ] Scenario A funzionante
- [ ] Scenario D funzionante
- [ ] Logic lock irreversibile visibile su OLED o dashboard
- [ ] Simulatore eventi disponibile

### Tier S — Should

Da fare solo dopo Tier M:

- [ ] Scenario B funzionante
- [ ] Scenario C funzionante
- [ ] Accelerometro reale per `IN_TRANSIT`
- [ ] Buzzer su eventi critici
- [ ] Dashboard live più chiara

### Tier N — Nice

Da fare solo se tutto è già stabile:

- [ ] Edge Impulse classification
- [ ] Animazioni OLED
- [ ] Replay scenari precedenti
- [ ] Styling avanzato dashboard
- [ ] Hash payload / crypto PoC

---

## 10. Definition of Done per componente

### 10.1 Firmware DoD

- [ ] Si avvia in meno di 5 secondi
- [ ] Si connette al WiFi e logga IP via Serial
- [ ] OLED mostra stato corrente
- [ ] Almeno un LED o messaggio OLED segnala verdict finale
- [ ] `POST /api/seal` testato
- [ ] `POST /api/event` testato
- [ ] `GET /api/command/:session_id` testato
- [ ] Logic lock irreversibile testato: se `PRODUCT_REMOVED = true`, non torna false nella stessa sessione
- [ ] Reset sessione possibile

### 10.2 Backend DoD

- [ ] `npm start` parte senza errori
- [ ] Tutti gli endpoint rispondono coerentemente
- [ ] OTP scadono dopo 30 minuti o sono invalidabili con reset
- [ ] State machine calcola correttamente A/B/C/D
- [ ] `source: arduino` e `source: simulator` entrambi supportati
- [ ] WebSocket invia `session.update`, `device.event`, `verdict.computed`
- [ ] Input errati non fanno crashare il server
- [ ] Logs verbosi disponibili in console

### 10.3 Dashboard/Simulator DoD

- [ ] 4 tab navigabili: retailer, courier, client, device/simulator
- [ ] WebSocket si connette e riceve update
- [ ] OTP inserito in pannello produce effetto entro 2 secondi
- [ ] Verdict finale evidente
- [ ] Event log timestamped
- [ ] Bottoni per simulare `SEALED`, `BOX_OPENED`, `PRODUCT_REMOVED`, `TAMPER`
- [ ] Preset o script per Scenario A/B/C/D
- [ ] Funziona sul laptop finale

### 10.4 QA DoD

- [ ] Scenario A testato con Arduino
- [ ] Scenario D testato con Arduino
- [ ] Scenario B testato con Arduino o simulatore
- [ ] Scenario C testato con Arduino o simulatore
- [ ] OTP sbagliato rifiutato
- [ ] Apertura senza client auth classificata correttamente
- [ ] Reset sessione testato
- [ ] Refresh dashboard testato

---

## 11. Scenario test tecnici

### Scenario A — Consegna pulita

```txt
1. /api/seal crea sessione + OTP
2. Corriere inserisce courier_otp con gps = client_home
3. Cliente inserisce client_otp
4. Arduino/simulatore invia BOX_OPENED
5. Arduino/simulatore invia PRODUCT_REMOVED
6. Backend produce VERDICT_A
```

Expected:

```txt
VERDICT_A — CLEAN_DELIVERY
```

---

### Scenario D — Empty box fraud cliente

```txt
1. Eseguire Scenario A fino a PRODUCT_REMOVED
2. Cliente invia dispute EMPTY_BOX
3. Backend controlla logic lock/evidence
4. Backend produce VERDICT_D
```

Expected:

```txt
VERDICT_D — EMPTY_BOX_FRAUD
```

---

### Scenario B — Furto corriere post-segnalazione

```txt
1. /api/seal crea sessione + OTP
2. Corriere inserisce courier_otp con gps = courier_depot/random_location
3. Nessun client auth
4. Arduino/simulatore invia BOX_OPENED subito
5. Backend produce VERDICT_B
```

Expected:

```txt
VERDICT_B — COURIER_THEFT_SUSPECTED
```

---

### Scenario C — Porch piracy

```txt
1. /api/seal crea sessione + OTP
2. Corriere inserisce courier_otp con gps = client_home
3. Nessun client auth
4. Attendere gap simulato di 5 secondi
5. Arduino/simulatore invia BOX_OPENED
6. Backend produce VERDICT_C
```

Expected:

```txt
VERDICT_C — PORCH_PIRACY_SUSPECTED
```

---

## 12. Fallback tecnici

| Cosa fallisce | Fallback tecnico |
|---|---|
| WiFi non va | Hotspot telefono + IP backend configurabile in `secrets.h` |
| Arduino non manda eventi | Usare dashboard simulator / `demo_runner.js` |
| Sensore luce instabile | Sostituire con bottone manuale per `BOX_OPENED` |
| Microswitch instabile | Usare bottone manuale per `PRODUCT_REMOVED` |
| Accelerometro rumoroso | Disabilitare `IN_TRANSIT` reale e simularlo da dashboard |
| Backend crasha | Restart `npm start`, sessione nuova |
| Dashboard non aggiorna | Refresh pagina + fallback su `GET /api/session/:id` |
| API non allineata | Tornare al contract in `docs/api_contract.md`, niente fix divergenti |

---

## 13. Domande tecniche da chiudere entro H+2

- [ ] Backend su localhost del laptop di P2 o laptop più stabile?
- [ ] IP backend fisso tramite hotspot? Quale indirizzo va in `secrets.h`?
- [ ] Quale sensore rappresenta `BOX_OPENED`: fotoresistore o bottone?
- [ ] Quale sensore rappresenta `PRODUCT_REMOVED`: microswitch sotto prodotto o bottone?
- [ ] `IN_TRANSIT` reale con accelerometro o simulato?
- [ ] Gap Scenario C: 5 secondi confermati?
- [ ] `source: simulator` incluso in tutti gli endpoint?
- [ ] Reset sessione: endpoint dashboard o bottone fisico?
- [ ] Secondo Arduino disponibile oppure no?

---

## 14. Checklist comando rapido

### Avvio backend

```bash
cd backend
npm install
npm start
```

### Aprire dashboard

```txt
http://localhost:3000
```

### Test manuale endpoint evento

```bash
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sess_abc123",
    "source": "simulator",
    "event": "BOX_OPENED",
    "timestamp": 1234567890,
    "sensor_data": {"light": 850, "product_present": true}
  }'
```

---

## 15. Regole operative

- Congelare API entro H+2.
- Prima demo simulata entro H+6.
- Prima demo con Arduino entro H+12.
- Non aggiungere ML finché A/D non funzionano.
- Non fare styling avanzato finché A/B/C/D non funzionano.
- Non fare refactor dopo H+18 salvo bug bloccante.
- Ogni commit deve lasciare almeno una modalità funzionante: Arduino reale oppure simulatore.
- Se una feature richiede più di 30 minuti e non è Tier M, tagliarla.

---

*Piano vivo: aggiornare checklist e bug list a H+6, H+12, H+18. Push frequenti. Priorità assoluta: pipeline end-to-end stabile.*
