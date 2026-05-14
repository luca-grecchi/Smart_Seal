# Smart Seal API Contract

Base URL locale: `http://localhost:3000`

## Eventi device

- `SEALED`
- `IN_TRANSIT`
- `BOX_OPENED`
- `PRODUCT_REMOVED`
- `TAMPER`
- `STATIC`
- `POST_REMOVAL_INSERTION`

## Comandi backend

- `COURIER_DELIVERED`
- `CLIENT_AUTHENTICATED`
- `RESET_SESSION`
- `VERDICT_COMPUTED`

## Endpoints

### `POST /api/seal`

Request:

```json
{
  "device_id": "ARD-001",
  "timestamp": 1234567890
}
```

Response:

```json
{
  "session_id": "sess_abc123",
  "courier_otp": "847291",
  "client_otp": "192384",
  "expected_client_gps": "client_home"
}
```

### `POST /api/event`

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

`source`: `arduino` oppure `simulator`.

### `GET /api/command/:session_id`

```json
{
  "commands": [
    { "type": "COURIER_DELIVERED", "gps": "client_home", "timestamp": 1234567890 }
  ]
}
```

### `POST /api/courier/scan`

```json
{
  "session_id": "sess_abc123",
  "courier_otp": "847291",
  "gps": "client_home"
}
```

### `POST /api/client/authenticate`

```json
{
  "session_id": "sess_abc123",
  "client_otp": "192384",
  "gps": "client_home"
}
```

### `POST /api/client/dispute`

```json
{
  "session_id": "sess_abc123",
  "type": "EMPTY_BOX"
}
```

### `GET /api/session/:id`

Restituisce stato completo per debug dashboard.

### `POST /api/session/:id/reset`

Crea una nuova sessione per lo stesso device e invalida quella precedente.

## Socket.IO

- `session.update`
- `command.created`
- `device.event`
- `verdict.computed`
- `error.event`

