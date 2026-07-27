import threading
import socket
import webview
from server import app
import db

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(('8.8.8.8', 80))
    ip = s.getsockname()[0]
    s.close()
    return ip



if __name__ == '__main__':
    db.init_db()

    ip = get_local_ip()
    print(f"\n  Phone: http://{ip}:5050\n")

    t = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=5050), daemon=True)
    t.start()

    webview.create_window('BrainDump', 'http://localhost:5050', width=820, height=660, resizable=False)
    webview.start()