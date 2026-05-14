# save as fake_arduino.py and run: python fake_arduino.py
import socket, time

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(('localhost', 9999))
server.listen(1)
print("Waiting for bridge...")
conn, _ = server.accept()
print("Bridge connected")
time.sleep(2)

# Non-frame line — should appear as [arduino] in the bridge terminal
conn.sendall(b"SMART SEAL v0.1\r\n")
time.sleep(0.5)
conn.sendall(b"light baseline=850\r\n")
time.sleep(0.5)

# Full request frame — should be forwarded to backend
frame = (
    "===DEVICE_REQUEST_BEGIN===\r\n"
    "METHOD:POST\r\n"
    "PATH:/api/seal\r\n"
    'BODY:{"device_id":"HW-001","timestamp":1000}\r\n'
    "===DEVICE_REQUEST_END===\r\n"
)
conn.sendall(frame.encode())
time.sleep(1)
resp = conn.recv(1024)
print("Got response frame:\n", resp.decode(errors="replace"))
conn.close()