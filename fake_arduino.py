"""Simulates the Arduino serial output for testing the bridge pipeline."""
import socket, time, json, re

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(('localhost', 9999))
server.listen(1)
print("Waiting for bridge...")
conn, _ = server.accept()
print("Bridge connected")
time.sleep(2)


def send_line(text):
    conn.sendall((text + "\r\n").encode())


def send_frame(method, path, body=""):
    frame = (
        "===DEVICE_REQUEST_BEGIN===\r\n"
        f"METHOD:{method}\r\n"
        f"PATH:{path}\r\n"
        f"BODY:{body}\r\n"
        "===DEVICE_REQUEST_END===\r\n"
    )
    conn.sendall(frame.encode())


def read_response():
    buf = b""
    while b"===DEVICE_RESPONSE_END===" not in buf:
        chunk = conn.recv(1024)
        if not chunk:
            break
        buf += chunk
    match = re.search(rb"BODY:(.*?)\r?\n", buf)
    if match:
        return json.loads(match.group(1).decode())
    return {}


# ── Startup prints (non-frame lines) ──────────────────────
send_line("SMART SEAL v0.1")
time.sleep(0.3)
send_line("light baseline=850")
time.sleep(0.3)
send_line("accelerometer=ready")
time.sleep(0.5)

# ── Seal session ───────────────────────────────────────────
send_frame("POST", "/api/seal", '{"device_id":"HW-001","timestamp":1000}')
resp = read_response()
session_id = resp.get("session_id", "")
print(f"[fake] sealed: {session_id}")
send_line(f"sealed session={session_id}")
time.sleep(0.5)

# ── Impact detected ────────────────────────────────────────
send_line("[IMPACT] detected, ensuring session")
time.sleep(0.3)

impact_body = json.dumps({
    "session_id": session_id,
    "source": "arduino",
    "event": "IMPACT_DETECTED",
    "timestamp": 2000,
    "severity": "heavy",
    "confidence": 0.95
})
send_frame("POST", "/api/event", impact_body)
resp = read_response()
resp_len = len(json.dumps(resp))
send_line(f"[IMPACT] heavy conf=0.95 response bytes={resp_len}")
time.sleep(0.5)

print("[fake] impact simulation complete")
conn.close()
