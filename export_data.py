"""Build data.js for the replay simulator from g.tec's stroke-rehab recordings.

For each patient and stage (first session = pre, last session = post):
  1. band-pass 8-30 Hz, take the 3-6 s window after each trial start,
  2. learn CSP filters + LDA from that session's TRAINING run,
  3. score every trial of that session's TEST run (never seen by the model),
  4. save truth, decoder guess, probability, and a short C3/C4 trace per test trial.

Usage:  py -I export_data.py <folder with P1_pre_test.mat etc.> <output data.js>
Nothing here is tuned on the test runs.
"""
import json
import os
import sys

import numpy as np
import scipy.io as sio
import scipy.linalg as sla
from scipy.signal import butter, sosfiltfilt
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis as LDA

SRC, OUT = sys.argv[1], sys.argv[2]
CH_C3, CH_C4 = 4, 8  # 0-based; montage: 1 FC3, 2 FCz, 3 FC4, 4 C5, 5 C3, 6 C1, 7 Cz, 8 C2, 9 C4 ...
TRACE_FS = 64


def load(path):
    m = sio.loadmat(path, squeeze_me=True)
    return int(m["fs"]), m["y"].astype(float), m["trig"].astype(int)


def trial_onsets(trig):
    return np.flatnonzero((trig != 0) & (np.concatenate([[0], trig[:-1]]) == 0))


def band(y, fs, lo, hi):
    sos = butter(4, [lo / (fs / 2), hi / (fs / 2)], btype="band", output="sos")
    return sosfiltfilt(sos, y, axis=0)


def windows(y, fs, on, t0=3.0, t1=6.0):
    return np.stack([y[o + int(t0 * fs) : o + int(t1 * fs)].T for o in on])


def csp_fit(X, L, k=3):
    covs = [np.mean([x @ x.T / np.trace(x @ x.T) for x in X[L == c]], axis=0) for c in (1, -1)]
    w, V = sla.eigh(covs[0], covs[0] + covs[1])
    return V[:, np.r_[np.arange(k), np.arange(len(w) - k, len(w))]].T


def csp_feat(W, X):
    v = np.array([np.var(W @ x, axis=1) for x in X])
    return np.log(v / v.sum(axis=1, keepdims=True))


sessions = []
for p in (1, 2, 3):
    for stage in ("pre", "post"):
        fs, ytr, ttr = load(os.path.join(SRC, "P%d_%s_training.mat" % (p, stage)))
        otr = trial_onsets(ttr)
        Xtr = windows(band(ytr, fs, 8, 30), fs, otr)
        Ltr = ttr[otr]
        W = csp_fit(Xtr, Ltr)
        clf = LDA().fit(csp_feat(W, Xtr), Ltr)

        fs, yte, tte = load(os.path.join(SRC, "P%d_%s_test.mat" % (p, stage)))
        ote = trial_onsets(tte)
        yb = band(yte, fs, 8, 30)
        Xte = windows(yb, fs, ote)
        Lte = tte[ote]
        feats = csp_feat(W, Xte)
        pleft = clf.predict_proba(feats)[:, list(clf.classes_).index(1)]
        pred = np.where(pleft >= 0.5, 1, -1)
        # trace for display: 0.5-30 Hz, from 1 s before to 8 s after trial start, decimated to 64 Hz
        yd = band(yte, fs, 0.5, 30)
        step = fs // TRACE_FS
        trials = []
        for i, o in enumerate(ote):
            a, b = o - fs, min(o + 8 * fs, len(yd))
            seg = yd[a:b:step]
            # power in 8-30 Hz over C3 and C4 during the imagery window (what the decoder mostly sees)
            pw = [float(np.log(np.var(Xte[i][c]))) for c in (CH_C3, CH_C4)]
            trials.append({
                "truth": int(Lte[i]),
                "pred": int(pred[i]),
                "pLeft": round(float(pleft[i]), 3),
                "c3": np.round(seg[:, CH_C3], 1).tolist(),
                "c4": np.round(seg[:, CH_C4], 1).tolist(),
                "pw": [round(pw[0], 2), round(pw[1], 2)],
            })
        acc = float((pred == Lte).mean())
        sessions.append({"id": "P%d_%s" % (p, stage), "patient": "P%d" % p, "stage": stage, "accuracy": round(acc, 3), "n": len(Lte), "trials": trials})
        print("P%d %-4s test accuracy %.1f%% (%d trials)" % (p, stage, 100 * acc, len(Lte)))

data = {
    "traceFs": TRACE_FS,
    "traceStart": -1.0,
    "cueAt": 2.0,
    "imageryFrom": 3.0,
    "imageryTo": 6.0,
    "source": "g.tec Hack The Nest 2026 stroke-rehab dataset (3 stroke patients, 16 channels, 256 Hz). Recorded data replayed; nothing here is live.",
    "sessions": sessions,
}
with open(OUT, "w", encoding="utf-8") as f:
    f.write("window.STROKE_DATA = ")
    json.dump(data, f, separators=(",", ":"))
    f.write(";\n")
print("wrote", OUT, "%.1f MB" % (os.path.getsize(OUT) / 1e6))
