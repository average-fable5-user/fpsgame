"""
FPS, the kinda weird way. — desktop launcher.

Serves the game files from a local HTTP server (ES modules and .glb models
can't be loaded from file://) and shows them in a native window via pywebview
(Edge WebView2 on Windows). Packed into a single .exe by build.py.
"""
import mimetypes
import os
import socket
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import webview

APP_TITLE = "FPS, the kinda weird way."
PREFERRED_PORT = 47823   # fixed so localStorage (settings, career) survives restarts

# Windows' registry often maps .js to text/plain, which breaks <script type="module">.
for ext, mime in {".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".html": "text/html",
                  ".json": "application/json", ".glb": "model/gltf-binary", ".png": "image/png", ".ico": "image/x-icon"}.items():
    mimetypes.add_type(mime, ext)


def game_dir() -> str:
    """Folder holding index.html: PyInstaller's unpack dir when frozen, else the repo root."""
    if getattr(sys, "frozen", False):
        return os.path.join(sys._MEIPASS, "game")  # type: ignore[attr-defined]
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class QuietHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"   # keep-alive: the game fetches ~10 large models in parallel
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".glb": "model/gltf-binary"}

    log_file = os.environ.get("FPS_LOG")   # set FPS_LOG=<path> to record every request (troubleshooting)

    def log_message(self, fmt, *args):
        if self.log_file:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write((fmt % args) + "\n")


class Server(ThreadingHTTPServer):
    request_queue_size = 128   # default backlog of 5 drops connections when the models load in parallel
    daemon_threads = True


def start_server(root: str) -> int:
    handler = partial(QuietHandler, directory=root)
    for port in (PREFERRED_PORT, 0):  # fall back to any free port if ours is taken
        try:
            httpd = Server(("127.0.0.1", port), handler)
            break
        except OSError:
            continue
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd.server_address[1]


def main():
    root = game_dir()
    if not os.path.isfile(os.path.join(root, "index.html")):
        raise SystemExit(f"index.html not found in {root}")
    port = start_server(root)
    data_dir = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "FPSKindaWeird")
    os.makedirs(data_dir, exist_ok=True)
    window = webview.create_window(APP_TITLE, f"http://127.0.0.1:{port}/", width=1600, height=900, min_size=(1024, 600),
                                   background_color="#070b10", text_select=False)
    webview.start(report_assets, window, private_mode=False, storage_path=data_dir)


def report_assets(window):
    """With FPS_LOG set: write the game's own asset status line to the log once loading has finished."""
    log = QuietHandler.log_file
    if not log:
        return
    import time
    for _ in range(120):
        time.sleep(1)
        try:
            note = window.evaluate_js("document.getElementById('assetnote').textContent")
        except Exception as e:  # window not ready yet
            note = None
        if note and "loading" not in note:
            with open(log, "a", encoding="utf-8") as f:
                f.write("ASSETS: " + note + "\n")
            return


if __name__ == "__main__":
    main()
