# Smart Box — Piano di Implementazione Completo

## 1. Obiettivo del progetto

**Smart Box** è un contenitore intelligente riutilizzabile che monitora cosa succede a un pacco durante il trasporto.

Il sistema usa sensori collegati ad **Arduino UNO Q** per rilevare:

- urti;
- handling normale;
- apertura non autorizzata;
- rischio temperatura/umidità;
- stato finale del pacco;
- log degli eventi;
- eventuale notifica cloud.

L’obiettivo non è impedire fisicamente il danno, ma:

> **rilevare eventi critici, aggiornare uno score di rischio e comunicare se il pacco è sicuro, a rischio, manomesso o compromesso.**

Gli stati principali previsti sono:

- `SAFE`
- `WATCH`
- `AT_RISK`
- `COMPROMISED`
- `TAMPERED`

---

## 2. Idea in una frase

> **Smart Box trasforma un pacco passivo in un oggetto intelligente che osserva, registra, interpreta e comunica cosa gli è successo durante il trasporto.**

In inglese, per il pitch:

> **Smart Box turns a passive package into an intelligent object that detects what happened during transport and gives a clear decision at arrival: safe, at risk, tampered, or compromised.**

---

## 3. Problema

Durante la catena logistica, un pacco può subire:

- urti;
- cadute;
- vibrazioni eccessive;
- apertura non autorizzata;
- esposizione a temperatura/umidità rischiose;
- handling scorretto;
- condizioni di trasporto non tracciate.

Il problema è che spesso il pacco **non comunica cosa gli è successo**.

Esempi:

- un prodotto fragile arriva apparentemente integro ma ha subito molti urti;
- un farmaco o alimento sensibile è stato esposto a temperatura non ideale;
- il pacco è stato aperto durante il trasporto;
- il destinatario non sa se accettare o rifiutare il pacco;
- mittente, corriere e destinatario non hanno una timeline chiara degli eventi.

La Smart Box risolve questo problema producendo:

1. **rilevamento locale degli eventi**;
2. **score di rischio cumulativo**;
3. **stato finale leggibile**;
4. **log degli eventi**;
5. **notifica cloud opzionale**.

---

## 4. Architettura generale

### 4.1 Architettura ad alto livello

```text
Sensori fisici
  ↓
Arduino UNO Q
  ↓
Pre-processing dei dati
  ↓
Event detection / Edge AI
  ↓
Risk score + State machine
  ↓
Output locale
  ↓
Cloud / Dashboard / Notifica
```

---

### 4.2 Architettura logica

```text
[Accelerometro] ─┐
[Luce] ──────────┤
[Temperatura] ───┤
[Umidità] ───────┤
[Microfono]* ────┤
[Pressione]* ────┘
        ↓
Sensor Manager
        ↓
Feature Extraction
        ↓
Event Detection
        ↓
Risk Score
        ↓
State Machine
        ↓
Output Manager
        ↓
Cloud Sync / Notification
```

I sensori con `*` sono opzionali per il primo MVP.

---

## 5. Componenti hardware

| Componente | Ruolo |
|---|---|
| Arduino UNO Q | Unità centrale di calcolo |
| Accelerometro | Rileva handling, urti, cadute, vibrazioni |
| Sensore di luce | Rileva apertura non autorizzata |
| Temperatura/umidità | Rileva rischio cold-chain o ambiente non sicuro |
| Pressione | Possibile rilevamento di cambio ambiente/quota |
| Microfono | Possibile supporto per discriminare urti/manomissioni |
| OLED | Mostra stato della box |
| LED | Feedback visivo rapido |
| Buzzer | Allarme per eventi critici |
| Pulsante | Arm/disarm o reset demo |
| Power bank | Alimentazione portatile |
| Box fisica | Contenitore del prototipo |

---

## 6. Tipo di box consigliato

### Scelta consigliata

Usare una **scatola rigida di plastica trasparente o semi-trasparente**.

Dimensione consigliata:

```text
circa 20 × 15 × 8 cm
```

### Perché questa scelta

- è economica;
- è facile da modificare;
- protegge Arduino e sensori;
- permette di vedere l’elettronica;
- si apre e chiude facilmente;
- rende il test di tampering molto chiaro;
- sembra più “prodotto” rispetto a una scatola di cartone.

---

### Alternative

| Tipo box | Pro | Contro | Valutazione |
|---|---|---|---|
| Plastica rigida trasparente | Robusta, bella demo, visibile | Serve fissare bene componenti | Migliore |
| Cartone tipo pacco Amazon | Realistico | Meno robusto, meno pulito | Buona |
| Lunch box | Economica, rigida | Estetica meno tech | Molto valida |
| Valigetta piccola | Molto scenografica | Più ingombrante | Buona |
| Scatola stampata 3D | Professionale | Richiede tempo | Rischiosa |

---

## 7. Posizionamento dei sensori

### 7.1 Accelerometro

L’accelerometro deve essere fissato rigidamente alla box.

Posizione consigliata:

```text
fondo interno della box oppure parete interna laterale
```

Materiali consigliati:

- biadesivo forte;
- colla a caldo;
- fascette;
- nastro resistente.

Errore da evitare:

> Non lasciare l’accelerometro libero dentro la box, perché misurerebbe il movimento del sensore che rimbalza, non il movimento reale della box.

---

### 7.2 Sensore di luce

Va messo **dentro la box**, rivolto verso il coperchio.

Obiettivo:

```text
box chiusa → luce bassa
box aperta → luce alta
```

Serve per rilevare:

```text
box aperta mentre è armata → TAMPERED
```

---

### 7.3 Temperatura/umidità

Va messo dentro la box, ma non troppo vicino a:

- Arduino;
- power bank;
- regolatori di tensione;
- componenti che scaldano.

Per la demo può essere stimolato con:

- mano;
- respiro;
- tazza tiepida vicina;
- piccolo panno caldo.

Da evitare:

- phon molto caldo;
- fiamme;
- fonti di calore aggressive.

---

### 7.4 OLED e LED

Devono essere visibili ai giudici.

Opzioni:

- OLED montato fuori dalla box;
- OLED visibile attraverso coperchio trasparente;
- LED sul coperchio;
- buzzer dentro o sul lato.

---

## 8. Stati della Smart Box

| Stato | Significato | Output |
|---|---|---|
| `SAFE` | Nessuna anomalia importante | LED verde, OLED “SAFE” |
| `WATCH` | Piccola anomalia | LED giallo, evento loggato |
| `AT_RISK` | Rischio cumulativo elevato | LED arancione, warning |
| `COMPROMISED` | Pacco probabilmente danneggiato | LED rosso, buzzer, OLED “DO NOT USE” |
| `TAMPERED` | Apertura/manomissione | LED rosso lampeggiante, buzzer, alert |

---

## 9. Eventi rilevati

| Evento | Sensore principale | Esempio |
|---|---|---|
| `NORMAL_HANDLING` | Accelerometro | Box spostata normalmente |
| `SHOCK` | Accelerometro | Colpo o caduta |
| `STRONG_SHOCK` | Accelerometro | Urto molto forte |
| `TAMPERING` | Luce + accelerometro | Box aperta mentre è armata |
| `THERMAL_WARNING` | Temperatura | Temperatura vicina al limite |
| `THERMAL_RISK` | Temperatura/umidità | Esposizione prolungata |
| `SYSTEM_ARMED` | Pulsante | Box attivata |
| `SYSTEM_RESET` | Pulsante | Reset demo |

---

## 10. Risk score

Il sistema mantiene tre score principali:

```text
shock_score
thermal_score
tamper_score
```

Lo score totale è:

```text
total_risk = shock_score + thermal_score + tamper_score
```

---

### 10.1 Esempio di aggiornamento score

```text
if shock_detected:
    shock_score += 5

if strong_shock_detected:
    shock_score += 10

if temperature_near_limit:
    thermal_score += 1

if temperature_out_of_range:
    thermal_score += 3

if box_opened_while_armed:
    tamper_score += 15
```

---

### 10.2 Esempio di decisione finale

```text
if tamper_score >= 15:
    state = TAMPERED

elif total_risk >= 20:
    state = COMPROMISED

elif total_risk >= 10:
    state = AT_RISK

elif total_risk >= 3:
    state = WATCH

else:
    state = SAFE
```

---

### 10.3 Perché lo score cumulativo è importante

Un logger tradizionale spesso usa solo soglie istantanee:

```text
if temperatura > 8°C:
    alert
```

La Smart Box invece considera anche la storia degli eventi:

```text
tanti piccoli urti + temperatura vicina al limite + apertura sospetta
→ rischio più alto
```

Questo rende il sistema più intelligente e più coerente con il concetto di **decision making basato sui dati**.

---

## 11. Architettura software

### 11.1 Moduli principali

```text
src/
├── sensors/
│   ├── accelerometer.cpp
│   ├── light_sensor.cpp
│   ├── temperature_sensor.cpp
│   └── humidity_sensor.cpp
│
├── processing/
│   ├── feature_extraction.cpp
│   ├── event_detection.cpp
│   └── risk_score.cpp
│
├── state/
│   └── state_machine.cpp
│
├── output/
│   ├── oled_display.cpp
│   ├── led_control.cpp
│   └── buzzer.cpp
│
├── cloud/
│   ├── cloud_sync.cpp
│   └── notification_client.cpp
│
└── main.cpp
```

---

### 11.2 Flusso del programma

```text
setup()
  ↓
inizializza sensori
inizializza OLED/LED/buzzer
inizializza connessione cloud
stato iniziale = SAFE

loop()
  ↓
leggi sensori
  ↓
estrai feature
  ↓
rileva evento
  ↓
aggiorna risk score
  ↓
aggiorna stato
  ↓
mostra output locale
  ↓
salva log
  ↓
sincronizza cloud se disponibile
```

---

## 12. Edge AI: cosa implementare davvero

### 12.1 Versione base consigliata

Per il primo MVP, usare:

```text
regole + soglie + risk score
```

Questa versione è:

- più veloce da implementare;
- più robusta;
- più facile da debuggare;
- più sicura per una demo hackathon.

---

### 12.2 Versione AI opzionale

Se resta tempo, usare Edge Impulse per classificare pattern dell’accelerometro.

Classi possibili:

- `idle`
- `normal_handling`
- `shock`
- `suspicious_motion`

Pipeline:

```text
accelerometro
  ↓
finestre temporali
  ↓
feature extraction
  ↓
classifier
  ↓
classe movimento
```

---

### 12.3 Strategia consigliata

```text
Prima: regole robuste
Dopo: Edge Impulse come bonus
```

Non partire subito da LSTM/GRU: è rischioso, richiede dati e potrebbe consumare troppo tempo.

---

## 13. Cloud architecture

### 13.1 Versione minima

```text
Arduino UNO Q
  ↓ HTTP/MQTT
Backend semplice / Arduino IoT Cloud
  ↓
Dashboard
  ↓
Telegram / Email alert
```

---

### 13.2 Ruolo del cloud

La box deve decidere localmente.

Il cloud serve per:

- salvare la timeline;
- mostrare dashboard;
- inviare notifiche;
- generare messaggi leggibili;
- sincronizzare eventi quando torna la connessione.

Formula chiave:

> **Edge AI decide subito. Cloud AI interpreta meglio e comunica.**

---

### 13.3 Dati inviati al cloud

Esempio payload:

```json
{
  "box_id": "SMARTBOX-01",
  "timestamp": "2026-05-14T15:30:00",
  "state": "TAMPERED",
  "event": "BOX_OPENED",
  "shock_score": 5,
  "thermal_score": 2,
  "tamper_score": 15,
  "total_risk": 22,
  "temperature": 8.4,
  "humidity": 61,
  "light": 830,
  "message": "Box opened while armed"
}
```

---

### 13.4 Notifiche

Quando lo stato diventa critico, il cloud invia un messaggio.

Esempio:

```text
🚨 Smart Box Alert

Box ID: SMARTBOX-01
Status: TAMPERED
Reason: box opened while armed
Risk score: 22/100

Action: inspect the package before accepting it.
```

---

## 14. Suddivisione del lavoro in 3 persone

## Persona 1 — Hardware & Sensor Integration

### Responsabilità

Questa persona si occupa di far funzionare la parte fisica.

### Task principali

- Montare Arduino UNO Q nella box.
- Collegare accelerometro, luce, temperatura/umidità.
- Fissare bene l’accelerometro alla box.
- Posizionare il sensore di luce dentro la box.
- Collegare OLED, LED e buzzer.
- Gestire alimentazione con USB/power bank.
- Testare lettura grezza dei sensori.
- Calibrare soglie base.
- Preparare la box per la demo.

### Deliverable

- Box fisica funzionante.
- Sensori leggibili da Arduino.
- Output OLED/LED/buzzer funzionante.
- Setup stabile per demo.

### Rischi

- Sensori instabili.
- Cavi che si staccano.
- Accelerometro fissato male.
- OLED non visibile durante la demo.
- Alimentazione non stabile.

---

## Persona 2 — Edge AI / Event Detection / State Machine

### Responsabilità

Questa persona si occupa della logica intelligente on-device.

### Task principali

- Leggere dati dai sensori.
- Calcolare feature su finestre temporali.
- Implementare rilevamento shock.
- Implementare rilevamento tampering.
- Implementare score termico cumulativo.
- Implementare risk score.
- Implementare macchina a stati.
- Eventualmente integrare Edge Impulse.
- Creare modalità demo assistita.

### Deliverable

- Codice di detection eventi.
- Risk score funzionante.
- Stati `SAFE`, `WATCH`, `AT_RISK`, `COMPROMISED`, `TAMPERED`.
- Logica robusta per demo live.
- Eventuale classificatore movimento con Edge Impulse.

### Rischi

- Soglie difficili da calibrare.
- Falsi positivi.
- ML troppo ambizioso.
- Mancanza di dati per training.
- Eventi rilevati in modo inconsistente.

### Strategia consigliata

```text
Prima: regole + risk score
Dopo: Edge Impulse per motion classifier
```

---

## Persona 3 — Cloud / Dashboard / Pitch Demo

### Responsabilità

Questa persona si occupa di rendere visibile e comunicabile il progetto.

### Task principali

- Creare dashboard o pagina semplice.
- Ricevere dati da Arduino.
- Salvare eventi in una timeline.
- Inviare notifiche Telegram/email.
- Preparare mock cloud se la connessione fallisce.
- Preparare pitch.
- Scrivere script demo da 60–90 secondi.
- Curare storytelling e spiegazione ai giudici.
- Preparare eventuali screenshot di backup.

### Deliverable

- Dashboard o console log leggibile.
- Notifica funzionante.
- Script demo.
- Pitch finale.
- Backup visivo in caso di problemi cloud.

### Rischi

- Wi-Fi instabile.
- API Telegram/email non funzionante.
- Troppo tempo speso sul cloud invece che sulla demo locale.
- Dashboard troppo complessa.

### Strategia consigliata

```text
Demo locale = must-have
Cloud alert = bonus forte
```

---

## 15. Fasi di implementazione

## Fase 0 — Definizione MVP

### Obiettivo

Decidere cosa deve assolutamente funzionare.

### MVP minimo

- Box fisica.
- Accelerometro per shock.
- Sensore luce per tampering.
- Temperatura per thermal risk.
- OLED per stato.
- LED + buzzer per alert.
- Risk score.
- State machine.

### Non-MVP

- LSTM/GRU.
- Cloud AI complessa.
- Dashboard avanzata.
- Dataset pubblico perfetto.
- Certificazione legale reale.

---

## Fase 1 — Setup hardware

### Task

- Preparare box.
- Montare Arduino.
- Collegare sensori.
- Testare ogni sensore singolarmente.
- Verificare alimentazione.
- Fissare componenti.
- Verificare visibilità OLED/LED.

### Test di completamento

```text
Serial monitor mostra:
- accelerazione
- luce
- temperatura
- umidità
```

Output:

```text
OLED: SENSOR TEST OK
LED: verde
```

---

## Fase 2 — Lettura dati e calibrazione

### Task

- Misurare valori baseline.
- Misurare luce a box chiusa/aperta.
- Misurare accelerometro a box ferma.
- Misurare accelerometro durante handling.
- Misurare accelerometro durante shock controllato.
- Definire soglie iniziali.
- Definire soglia temperatura demo.

### Output atteso

```text
light_closed ≈ basso
light_open ≈ alto

acc_idle ≈ stabile
acc_handling ≈ medio
acc_shock ≈ picco alto
```

---

## Fase 3 — Event detection base

### Task

Implementare detection per:

```text
BOX_OPENED
NORMAL_HANDLING
SHOCK
STRONG_SHOCK
THERMAL_WARNING
THERMAL_RISK
```

### Esempio logica

```text
if light_value > light_threshold and box_armed:
    event = BOX_OPENED

if acceleration_peak > shock_threshold:
    event = SHOCK

if temperature > warning_temperature:
    event = THERMAL_WARNING
```

### Test di completamento

- Aprire box → `BOX_OPENED`
- Dare colpo → `SHOCK`
- Scaldare sensore → `THERMAL_WARNING`

---

## Fase 4 — Risk score

### Task

- Creare variabili score.
- Aggiornare score a ogni evento.
- Implementare decadimento opzionale.
- Salvare evento con timestamp.
- Calcolare `total_risk`.

### Esempio

```text
SHOCK → shock_score += 5
STRONG_SHOCK → shock_score += 10
BOX_OPENED → tamper_score += 15
THERMAL_WARNING → thermal_score += 1
THERMAL_RISK → thermal_score += 3
```

### Test

Sequenza:

```text
handling normale → risk basso
shock → risk medio
apertura → risk alto
```

---

## Fase 5 — State machine

### Task

Implementare transizione stati:

```text
SAFE → WATCH → AT_RISK → COMPROMISED
           ↘
            TAMPERED
```

### Regola importante

`TAMPERED` deve avere priorità alta.

```text
if tamper_detected:
    state = TAMPERED
```

### Test

| Azione | Stato atteso |
|---|---|
| box ferma | SAFE |
| piccolo urto | WATCH |
| tanti urti | AT_RISK |
| urto forte | COMPROMISED |
| apertura | TAMPERED |

---

## Fase 6 — Output locale

### Task

Mappare stato a OLED/LED/buzzer.

| Stato | OLED | LED | Buzzer |
|---|---|---|---|
| SAFE | `SAFE` | verde | off |
| WATCH | `WATCH` | giallo | off |
| AT_RISK | `AT-RISK` | arancione | beep breve |
| COMPROMISED | `DO NOT USE` | rosso | beep |
| TAMPERED | `TAMPERED` | rosso lampeggiante | on/beep |

### Test

Forzare ogni stato e verificare output.

---

## Fase 7 — Cloud e notifiche

### Task

- Inviare evento tramite HTTP/MQTT.
- Ricevere evento su backend/dashboard.
- Mostrare log.
- Inviare notifica Telegram/email per stati critici.

### Eventi che notificano

```text
AT_RISK
COMPROMISED
TAMPERED
```

### Eventi che non notificano

```text
SAFE
NORMAL_HANDLING
WATCH leggero
```

### Test

Simulare `TAMPERED` e verificare ricezione messaggio.

---

## Fase 8 — Modalità demo

### Perché serve

Durante hackathon, i sensori possono essere instabili. Serve una modalità sicura per mostrare il progetto.

### Implementazione

Usare pulsante o potenziometro:

```text
short press → ARM/DISARM
long press → reset
potentiometer high → simulate thermal risk
double click → simulate compromised
```

Oppure via seriale:

```text
send "shock" → simula shock
send "tamper" → simula tampering
send "thermal" → simula rischio termico
```

### Regola

La demo assistita non deve sostituire i sensori reali, ma servire come backup.

---

## Fase 9 — Test finale end-to-end

### Sequenza demo consigliata

```text
1. Box chiusa e armata
2. OLED mostra SAFE
3. Spostamento normale → HANDLING
4. Colpo controllato → SHOCK / WATCH
5. Apertura box → TAMPERED
6. Buzzer + LED rosso
7. Cloud invia alert
8. Dashboard mostra timeline
```

### Obiettivo

Il giudice deve capire in meno di 90 secondi:

> La box sa cosa le è successo e comunica se il pacco è ancora affidabile.

---

## 16. Timeline consigliata per hackathon

### Se avete 24 ore

| Tempo | Obiettivo |
|---|---|
| 0–2h | Definizione MVP, divisione ruoli |
| 2–5h | Setup hardware e test sensori |
| 5–8h | Event detection base |
| 8–11h | Risk score + state machine |
| 11–14h | OLED/LED/buzzer |
| 14–17h | Cloud/notifiche |
| 17–20h | Integrazione completa |
| 20–22h | Demo script + pitch |
| 22–24h | Debug, backup, rifinitura |

---

### Se avete 48 ore

| Tempo | Obiettivo |
|---|---|
| 0–4h | MVP, box fisica, architettura |
| 4–10h | Sensori + output |
| 10–16h | Detection eventi |
| 16–22h | Risk score + state machine |
| 22–28h | Cloud + notifiche |
| 28–34h | Edge Impulse / ML opzionale |
| 34–40h | Dashboard + demo assistita |
| 40–44h | Pitch + storytelling |
| 44–48h | Test ripetuti e fallback |

---

## 17. Priorità di sviluppo

### Must-have

- Box fisica.
- Sensore luce per tampering.
- Accelerometro per shock.
- OLED con stato.
- Risk score.
- State machine.
- LED/buzzer per eventi critici.

### Should-have

- Temperatura/umidità.
- Log eventi.
- Cloud sync.
- Notifica Telegram/email.

### Nice-to-have

- Edge Impulse.
- Dashboard bella.
- Microfono.
- Pressione.
- Explainable AI message.
- QR code per vedere timeline.

### Avoid

- Modello ML troppo complesso.
- LSTM/GRU se non c’è tempo.
- Dipendenza totale dal cloud.
- Troppe classi da classificare.
- Promesse legali o mediche troppo forti.

---

## 18. Strategia tecnica consigliata

### Prima versione

Usare regole + risk score.

```text
sensori → soglie calibrate → eventi → risk score → stato
```

Questa versione è robusta e fattibile.

---

### Seconda versione

Aggiungere Edge Impulse per classificare movimento.

```text
accelerometro → feature extraction → classifier → idle / handling / shock
```

---

### Terza versione

Aggiungere Cloud AI per spiegare eventi.

```text
event log → cloud AI/template → messaggio leggibile
```

---

## 19. Piano di test durante hackathon

### Test 1 — Box armata e sicura

Azione:

```text
chiudere box e premere ARM
```

Output atteso:

```text
OLED: BOX ARMED
STATE: SAFE
LED: verde
Risk: 0
```

---

### Test 2 — Handling normale

Azione:

```text
prendere la box e spostarla lentamente
```

Output atteso:

```text
STATE: SAFE / HANDLING
Risk: +1
LED: verde o giallo leggero
```

Obiettivo:

> Dimostrare che il sistema non genera falso allarme per ogni movimento.

---

### Test 3 — Shock

Azione:

```text
dare un colpo controllato alla box
oppure farla cadere da pochi centimetri su uno zaino/tappetino
```

Output atteso:

```text
EVENT: SHOCK
STATE: WATCH / AT_RISK
Risk: +5
LED: giallo/arancione
```

Se il colpo è forte:

```text
STATE: COMPROMISED
OLED: DO NOT USE
LED: rosso
Buzzer: beep
```

---

### Test 4 — Tampering

Azione:

```text
aprire la box mentre è armata
```

Output atteso:

```text
EVENT: TAMPERED
STATE: TAMPERED
OLED: OPENING DETECTED
LED: rosso lampeggiante
Buzzer: ON
```

Questo è il test più affidabile e convincente.

---

### Test 5 — Cold-chain risk

Azione:

```text
scaldare il sensore con la mano o avvicinare una tazza tiepida
```

Output atteso:

Prima:

```text
STATE: WATCH
Thermal risk increasing
```

Poi:

```text
STATE: AT_RISK
LED: arancione
```

Se continua:

```text
STATE: COMPROMISED
OLED: DO NOT USE
```

---

## 20. Piano demo

### Oggetti necessari

- Box plastica rigida trasparente.
- Arduino UNO Q.
- Sensori Grove.
- Power bank.
- Laptop.
- Telefono per ricevere notifica.
- Nastro/biadesivo/colla a caldo.
- Tappetino/zaino per shock controllato.

---

### Script demo

#### 1. Introduzione

> “I pacchi oggi sono passivi. Se subiscono urti, aperture o condizioni rischiose, spesso lo scopriamo troppo tardi.”

---

#### 2. Box armata

```text
OLED: SAFE
LED: verde
```

> “La Smart Box monitora i sensori localmente.”

---

#### 3. Handling normale

Spostare piano la box.

```text
OLED: HANDLING
Risk basso
```

> “Il sistema distingue il movimento normale da un evento critico.”

---

#### 4. Shock

Dare un colpo controllato.

```text
OLED: SHOCK DETECTED
Risk aumenta
```

> “L’urto viene registrato e aumenta lo score di rischio.”

---

#### 5. Tampering

Aprire la box.

```text
OLED: TAMPERED
LED rosso
Buzzer
```

> “L’apertura non autorizzata genera uno stato critico.”

---

#### 6. Cloud alert

Mostrare notifica.

```text
🚨 Smart Box Alert
Status: TAMPERED
Action: inspect package
```

> “La decisione è locale. Il cloud serve per notificare e salvare la timeline.”

---

## 21. Backup plan

### Se il cloud non funziona

Mostrare solo:

- OLED;
- LED;
- buzzer;
- serial monitor con log.

Frase da usare:

> “La box funziona offline. Il cloud sincronizza quando la rete è disponibile.”

---

### Se l’accelerometro è instabile

Usare:

- sensore luce per tampering;
- temperatura per rischio;
- pulsante per simulare shock.

---

### Se l’OLED non funziona

Usare:

- LED;
- buzzer;
- serial monitor;
- dashboard laptop.

---

### Se il sensore temperatura è lento

Usare:

- soglia demo più bassa;
- mano/tazza tiepida;
- potenziometro come simulatore termico.

---

## 22. Cosa dire ai giudici

### Frase principale

> Smart Box turns a passive package into an intelligent object that detects what happened during transport and gives a clear decision at arrival: safe, at risk, tampered, or compromised.

---

### Frase tecnica

> The system combines sensor fusion, edge decision-making, cumulative risk scoring, and cloud notification.

---

### Frase di valore

> We are not trying to prevent every failure. We make failures visible, traceable, and actionable.

---

### Frase su Edge e Cloud

> The box makes the first decision locally, so it works even without internet. When connectivity is available, the event log is uploaded to the cloud, where the incident can be explained and the right person can be notified.

---

## 23. Limiti dichiarati

Per essere credibili, dichiarare chiaramente cosa il progetto **non** fa.

La Smart Box non promette:

- refrigerazione attiva;
- prevenzione fisica del danno;
- certificazione legale reale;
- accuratezza industriale;
- funzionamento perfetto in ogni scenario logistico;
- sostituzione di sistemi enterprise.

La Smart Box promette:

- rilevamento eventi;
- decisione locale;
- log;
- stato finale leggibile;
- notifica;
- dimostrazione di sensor fusion + edge decision making.

---

## 24. Future work

Possibili estensioni:

- Edge Impulse motion classifier più robusto;
- anomaly detection addestrata su viaggi normali;
- dashboard web completa;
- QR code sul pacco per visualizzare timeline;
- integrazione con Telegram/WhatsApp/email;
- batteria integrata;
- casing stampato 3D;
- dataset logistico reale;
- firma digitale del log;
- più box monitorate contemporaneamente;
- modello predittivo cloud basato su storico eventi.

---

## 25. Criteri di successo

Il progetto è riuscito se:

- la box cambia stato correttamente;
- almeno tre eventi sono dimostrabili live;
- OLED/LED/buzzer rendono la demo chiara;
- il risk score è comprensibile;
- il cloud/notifica funziona almeno una volta;
- il pitch spiega bene perché non è solo un logger;
- il sistema ha un fallback offline.

---

## 26. Deliverable finali

Alla fine dell’hackathon dovreste avere:

### 1. Smart Box fisica

- Arduino montato;
- sensori fissati;
- output visivi funzionanti.

### 2. Firmware

- lettura sensori;
- event detection;
- risk score;
- state machine;
- output locale.

### 3. Cloud/demo

- dashboard o log;
- notifica Telegram/email;
- timeline eventi.

### 4. Pitch

- problema;
- soluzione;
- architettura;
- demo;
- limiti;
- future work.

### 5. Backup demo

- modalità simulazione;
- screenshot dashboard;
- serial log;
- script demo.

---

## 27. Checklist finale

### Hardware

- [ ] Box pronta
- [ ] Arduino fissato
- [ ] Accelerometro fissato rigidamente
- [ ] Sensore luce interno
- [ ] Sensore temperatura funzionante
- [ ] OLED visibile
- [ ] LED funzionante
- [ ] Buzzer funzionante
- [ ] Power bank funzionante

### Software locale

- [ ] Lettura sensori
- [ ] Detection shock
- [ ] Detection tampering
- [ ] Detection thermal warning
- [ ] Risk score
- [ ] State machine
- [ ] Output OLED
- [ ] Output LED
- [ ] Output buzzer
- [ ] Reset demo

### Cloud

- [ ] Invio evento
- [ ] Ricezione evento
- [ ] Dashboard/log
- [ ] Notifica Telegram/email
- [ ] Backup offline

### Pitch

- [ ] Problema chiaro
- [ ] Demo in 90 secondi
- [ ] Architettura spiegata
- [ ] Ruolo Edge AI chiaro
- [ ] Ruolo Cloud chiaro
- [ ] Limiti dichiarati
- [ ] Future work pronto

---

## 28. Conclusione

La Smart Box è un progetto forte per hackathon perché combina:

- hardware fisico;
- sensori reali;
- edge decision making;
- risk score cumulativo;
- output visivo immediato;
- possibile cloud notification;
- demo facile da capire.

Il punto chiave del progetto non è costruire una scatola perfetta, ma dimostrare che un pacco può diventare un oggetto intelligente:

> **non solo trasporta un prodotto, ma racconta cosa gli è successo e aiuta a decidere se ci si può fidare.**
