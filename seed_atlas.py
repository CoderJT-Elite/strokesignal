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
