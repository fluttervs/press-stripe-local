#!/usr/bin/env python3
"""
Local server for press.stripe.com mirror.
Run: python server.py
Open: http://localhost:8080/poor-charlies-almanack
Log: server.log  (all 404s printed here)
"""

import os
import sys
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, unquote

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8080
LOG = open(os.path.join(BASE_DIR, "server.log"), "w", buffering=1)

LOCAL_DOMAINS = [
    "b.stripecdn.com",
    "images.ctfassets.net",
    "images.stripeassets.com",
    "assets.stripeassets.com",
    "q.stripe.com",
    "www.googletagmanager.com",
]

def rewrite(content: str) -> str:
    for d in LOCAL_DOMAINS:
        content = content.replace(f"https://{d}/", f"http://localhost:{PORT}/{d}/")
        content = content.replace(f"http://{d}/",  f"http://localhost:{PORT}/{d}/")
    # Patch the module-import domain whitelist so localhost is allowed
    content = content.replace(
        'Object.freeze(["stripecdn.com"])',
        'Object.freeze(["stripecdn.com","localhost"])',
    )
    return content


MIME = {
    ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
    ".svg": "image/svg+xml", ".js": "text/javascript", ".mjs": "text/javascript",
    ".css": "text/css", ".html": "text/html; charset=utf-8",
    ".json": "application/json", ".png": "image/png",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif",
}

def mime(path):
    mt, _ = mimetypes.guess_type(path)
    return mt or MIME.get(os.path.splitext(path)[1].lower(), "application/octet-stream")

def local_path(url_path):
    p = url_path.split("?")[0].split("#")[0]
    p = unquote(p).lstrip("/")
    c = os.path.join(BASE_DIR, p.replace("/", os.sep))
    return c if os.path.isfile(c) else None


class Handler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass  # silence default per-request noise

    def headers_common(self, ct, length):
        self.send_header("Content-Type", ct)
        self.send_header("Content-Length", str(length))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        # Prevent the browser from caching old (pre-patch) module versions
        self.send_header("Cache-Control", "no-store")

    def send_data(self, data, ct):
        self.send_response(200)
        self.headers_common(ct, len(data))
        self.end_headers()
        self.wfile.write(data)

    def serve_file(self, path, ct):
        with open(path, "rb") as f:
            raw = f.read()
        # Rewrite text files: HTML, JS, CSS
        if ct.startswith("text/html") or "javascript" in ct or ct.startswith("text/css"):
            raw = rewrite(raw.decode("utf-8", errors="replace")).encode("utf-8")
        self.send_data(raw, ct)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        # ── Main page ──────────────────────────────────────────────────────
        if path in ("/", "/poor-charlies-almanack", "/poor-charlies-almanack.html"):
            hp = os.path.join(BASE_DIR, "press.stripe.com", "poor-charlies-almanack.html")
            if os.path.isfile(hp):
                self.serve_file(hp, "text/html; charset=utf-8")
            else:
                self.send_error(404, "Main HTML missing")
            return

        # ── Static assets ──────────────────────────────────────────────────
        lp = local_path(self.path)
        if lp:
            self.serve_file(lp, mime(lp))
            return

        # 404 — log it so we can spot missing files
        LOG.write(f"404  {self.path}\n")
        self.send_response(404)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b"")   # empty body — don't send error text to JS

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()


if __name__ == "__main__":
    mimetypes.init()
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"  http://localhost:{PORT}/poor-charlies-almanack")
    print(f"  404s logged to: {os.path.join(BASE_DIR, 'server.log')}")
    print("  Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        LOG.close()
        print("\nStopped.")
