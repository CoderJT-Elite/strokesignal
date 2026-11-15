"""Checks that the numbers shown on the page agree with each other and with basic statistics.

Run:  py -I -m pytest -q
Needs evidence.json (made by evidence.py) and data.js (made by export_data.py).
"""
import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
EV = json.load(open(os.path.join(HERE, "evidence.json"), encoding="utf-8"))["sessions"]
DATA = json.loads(re.sub(r"^window\.STROKE_DATA\s*=\s*", "", open(os.path.join(HERE, "data.js"), encoding="utf-8").read()).rstrip().rstrip(";"))
PAGE = {s["id"]: s for s in DATA["sessions"]}


def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return c - h, c + h


def test_six_sessions():
    assert [s["id"] for s in EV] == ["P1_pre", "P1_post", "P2_pre", "P2_post", "P3_pre", "P3_post"]


def test_accuracy_matches_counts():
    for s in EV:
        assert abs(s["accuracy"] - s["correct"] / s["n_test"]) < 0.001


def test_page_trials_reproduce_accuracy():
    # data.js carries each test trial's truth and prediction; recount from them
    for s in EV:
        trials = PAGE[s["id"]]["trials"]
        assert len(trials) == s["n_test"]
        k = sum(1 for t in trials if (t["pLeft"] >= 0.5) == (t["truth"] == 1))
        assert k == s["correct"], s["id"]


def test_intervals_contain_estimate_and_match_wilson():
    for s in EV:
        lo, hi = s["ci95"]
        assert lo < s["accuracy"] < hi
        wl, wh = wilson(s["correct"], s["n_test"])
        assert abs(lo - wl) < 0.002 and abs(hi - wh) < 0.002


def test_all_better_than_chance():
    for s in EV:
        assert s["ci95"][0] > 0.5, s["id"]
        assert s["perm_p"] < 0.001


def test_calibration_counts_add_up():
    for s in EV:
        assert sum(b["n"] for b in s["calibration"]) == s["n_test"]
        for b in s["calibration"]:
            if b["n"]:
                assert 0.0 <= b["hit"] <= 1.0


def test_learning_curve_ends_at_full_training():
    for s in EV:
        last = s["learning_curve"][-1]
        assert last["trials"] == s["n_train"]
        assert abs(last["accuracy"] - s["accuracy"]) < 0.001


def test_changes_quoted_on_the_page():
    acc = {s["id"]: s["accuracy"] for s in EV}
    d = [round((acc["P%d_post" % p] - acc["P%d_pre" % p]) * 100) for p in (1, 2, 3)]
    assert d == [-6, 18, 2]
