"""Load evidence.json into MongoDB Atlas (database strokesignal, collection evidence).

Usage:  py seed_atlas.py
Reads MONGODB_URI from atlas-credentials.env (git-ignored). Idempotent: replaces each session by id.
"""
import json
import os
import sys

from pymongo import MongoClient

HERE = os.path.dirname(os.path.abspath(__file__))


def load_env(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env(os.path.join(HERE, "atlas-credentials.env"))
uri = os.environ.get("MONGODB_URI")
if not uri:
    sys.exit("MONGODB_URI not set")
ev = json.load(open(os.path.join(HERE, "evidence.json"), encoding="utf-8"))
col = MongoClient(uri, serverSelectionTimeoutMS=15000)["strokesignal"]["evidence"]
for s in ev["sessions"]:
    col.replace_one({"_id": s["id"]}, {"_id": s["id"], **s}, upsert=True)
col.database["meta"].replace_one({"_id": "evidence"}, {"_id": "evidence", "note": ev["note"]}, upsert=True)
print("evidence docs:", col.count_documents({}))

# One profile per patient, derived only from the recordings' own fields (no invented clinical details).
pat = col.database["patients"]
for pid in sorted({s["patient"] for s in ev["sessions"]}):
    ss = sorted((s for s in ev["sessions"] if s["patient"] == pid), key=lambda s: s["stage"] != "pre")
    rows = []
    for s in ss:
        hi = s["calibration"][-1]
        rows.append({"stage": s["stage"], "n_train": s["n_train"], "n_test": s["n_test"], "correct": s["correct"],
                     "accuracy": s["accuracy"], "ci95": s["ci95"], "confident_trials": hi["n"],
                     "confident_correct": round(hi["hit"] * hi["n"]) if hi["hit"] is not None else None})
    pat.replace_one({"_id": pid}, {"_id": pid, "channels": 16, "sample_rate_hz": 256,
                                   "source": "g.tec Hack The Nest 2026 stroke-rehab recordings", "sessions": rows}, upsert=True)
print("patient docs:", pat.count_documents({}))
