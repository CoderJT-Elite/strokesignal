"""Write a plain-language note for each session with Gemini, then check it against the numbers.

Usage:  py explain.py
Reads GOOGLE_AI_STUDIO from .env and MONGODB_URI from atlas-credentials.env (both git-ignored).
Writes explainers.json and stores the notes in MongoDB Atlas (collection explainers).
Rules the script enforces: every number in a note must come from that session's own figures, and
the note may not use words that claim recovery, treatment or medical effect. A note that fails is
regenerated up to 4 times; if it still fails, the session gets no note (the page shows none).
"""
import json
import os
import re
import sys
import time

from google import genai

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = "gemini-3.1-flash-lite"   # gemini-3.5-flash hit its free daily quota on 2026-11-15
RATIO = re.compile(r"\bout of (every |each )?(one hundred|a hundred|hundred|ten|five|four|100|10|5|4)\b|\b(one|two|three|four|five|six|seven|eight|nine) (in|out of) (every )?(ten|five|four)\b|\b(nine|eight|seven) in ten\b", re.I)
BANNED = re.compile(r"\b(recover|recovery|cure|cured|treat|treatment|therapy works|improv|heal|diagnos|clinical|medical advice|guarantee)\w*", re.I)


def load_env(path):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env(os.path.join(HERE, ".env"))
load_env(os.path.join(HERE, "atlas-credentials.env"))
from google.genai import types
client = genai.Client(api_key=os.environ["GOOGLE_AI_STUDIO"],
                      http_options=types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1)))
ev = json.load(open(os.path.join(HERE, "evidence.json"), encoding="utf-8"))["sessions"]


def facts(s):
    pct = lambda x: round(x * 100, 1)
    hi = s["calibration"][-1]
    return {
        "patient": s["patient"], "session": "first" if s["stage"] == "pre" else "last",
        "test_trials": s["n_test"], "correct": s["correct"], "accuracy_percent": pct(s["accuracy"]),
        "interval_95_percent": [pct(s["ci95"][0]), pct(s["ci95"][1])], "chance_percent": 50,
        "calibration_trials_used": s["n_train"],
        "confident_trials": hi["n"], "confident_hit_percent": pct(hi["hit"]) if hi["hit"] is not None else None,
    }


def numbers_in(text):
    return {float(x) for x in re.findall(r"\d+(?:\.\d+)?", text)}


def allowed_numbers(f):
    vals = {95.0, 50.0, 100.0}   # the 95 percent interval, the 50 percent chance line, "percent"
    vals |= {float(d) for d in re.findall(r"\d+", str(f["patient"]))}   # "patient 2"
    for v in f.values():
        for x in (v if isinstance(v, list) else [v]):
            if isinstance(x, (int, float)):
                vals.add(float(x)); vals.add(float(round(x))); vals.add(float(int(x)))
                vals.add(round(float(x), 1))
    return vals


def write_note(f):
    prompt = (
        "Write exactly two plain sentences for a visitor to a web page about a brain-signal decoder, describing how it did on one "
        "recorded session. Use only the figures given below, nothing else. Say what the accuracy means in everyday terms and give the "
        "95 percent interval as a range. Do not say or imply that anyone recovered, improved, was treated or healed, and do not give "
        "medical advice. Give the accuracy as a percent and the counts exactly as given; do not rephrase it as 'N out of 10' or 'N out of 100'. No hype words. Sentence case, no lists, no quotation marks.\n\nFigures: " + json.dumps(f)
    )
    for wait in (13, 55, 55):   # free tier allows 5 requests a minute
        time.sleep(wait if wait == 13 else wait)
        try:
            r = client.models.generate_content(model=MODEL, contents=prompt)
            break
        except Exception as e:  # rate limit: wait and retry
            print("  api error, waiting:", str(e)[:60])
    else:
        return ""
    return " ".join((r.text or "").split())


notes = {}
for s in ev:
    f = facts(s)
    ok = None
    for attempt in range(4):
        t = write_note(f)
        bad_nums = numbers_in(t) - allowed_numbers(f)
        if t and not BANNED.search(t) and not RATIO.search(t) and not bad_nums and 1 <= len(re.split(r"(?<=[.!?])\s+", t.strip())) <= 3:
            ok = t
            break
        print("  rejected", s["id"], "attempt", attempt + 1, "stray numbers:", sorted(bad_nums), "banned:", bool(BANNED.search(t)))
    notes[s["id"]] = ok
    print(s["id"], "->", ok)

out = {"model": MODEL, "note": "Written by Gemini from each session's figures; numbers and wording checked by explain.py.", "notes": notes}
json.dump(out, open(os.path.join(HERE, "explainers.json"), "w", encoding="utf-8"), indent=1)
if os.environ.get("MONGODB_URI"):
    from pymongo import MongoClient
    col = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=15000)["strokesignal"]["explainers"]
    for k, v in notes.items():
        col.replace_one({"_id": k}, {"_id": k, "text": v, "model": MODEL}, upsert=True)
    print("stored in Atlas:", col.count_documents({}))
if any(v is None for v in notes.values()):
    sys.exit("some sessions have no checked note")
