"""Tiny read-only API that serves strokesignal's evidence and session notes from MongoDB Atlas.

Run on the server behind nginx (proxy /api/ to 127.0.0.1:8081):
    MONGODB_URI=... py api.py
Endpoints (GET only):
    /api/health    -> {"ok": true}
    /api/evidence  -> {"source": "MongoDB Atlas", "sessions": [...], "notes": {id: text}}
The page falls back to its bundled evidence.js and explainers when this is unreachable.
"""
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from pymongo import MongoClient

db = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=8000)["strokesignal"]
cache = {"t": 0, "body": None}


def build():
    sessions = sorted(db["evidence"].find({}, {"_id": 0}), key=lambda s: s["id"])
    notes = {d["_id"]: d["text"] for d in db["explainers"].find({}) if d.get("text")}
    meta = db["meta"].find_one({"_id": "evidence"}) or {}
    return json.dumps({"source": "MongoDB Atlas", "note": meta.get("note", ""), "sessions": sessions, "notes": notes}).encode()


class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=60")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/health":
            return self._send(200, b'{"ok": true}')
        if path == "/api/evidence":
            try:
                if time.time() - cache["t"] > 60 or cache["body"] is None:
                    cache["body"], cache["t"] = build(), time.time()
                return self._send(200, cache["body"])
            except Exception:
                return self._send(503, b'{"error": "database unavailable"}')
        self._send(404, b'{"error": "not found"}')

    def log_message(self, *a):
        pass


ThreadingHTTPServer(("127.0.0.1", 8081), H).serve_forever()
