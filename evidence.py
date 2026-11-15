"""Extra evidence for the strokesignal page, computed only from g.tec's stroke-rehab recordings.

Usage:  py -I evidence.py <stroke-rehab folder> evidence.json

For each patient and stage (first session = pre, last = post):
  - decoder: band-pass 8-30 Hz, 3-6 s imagery window, CSP (3 pairs) + LDA, fit on the training run,
    scored on the unseen test run (same pipeline as export_data.py);
  - 95% Wilson interval on the test accuracy;
  - permutation p-value against chance (5000 label shuffles of the test run);
  - calibration: hit rate by predicted-confidence bin;
  - learning curve: accuracy on the test run when only the first k training trials are used
    (answers "how much calibration does a patient need").
Nothing is tuned on the test runs.
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
RNG = np.random.default_rng(0)


def load(path):
    m = sio.loadmat(path, squeeze_me=True)
    return int(m["fs"]), m["y"].astype(float), m["trig"].astype(int)


def onsets(trig):
    return np.flatnonzero((trig != 0) & (np.concatenate([[0], trig[:-1]]) == 0))


def band(y, fs, lo, hi):
    sos = butter(4, [lo / (fs / 2), hi / (fs / 2)], btype="band", output="sos")
    return sosfiltfilt(sos, y, axis=0)


def windows(y, fs, on, t0=3.0, t1=6.0):
    return np.stack([y[o + int(t0 * fs): o + int(t1 * fs)].T for o in on])


def csp_fit(X, L, k=3):
    covs = [np.mean([x @ x.T / np.trace(x @ x.T) for x in X[L == c]], axis=0) for c in (1, -1)]
    w, V = sla.eigh(covs[0], covs[0] + covs[1])
    return V[:, np.r_[np.arange(k), np.arange(len(w) - k, len(w))]].T


def feats(W, X):
    v = np.array([np.var(W @ x, axis=1) for x in X])
    return np.log(v / v.sum(axis=1, keepdims=True))


def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(float(c - h), 3), round(float(c + h), 3)]


def fit_eval(Xtr, Ltr, Xte, Lte):
    W = csp_fit(Xtr, Ltr)
    clf = LDA().fit(feats(W, Xtr), Ltr)
    p = clf.predict_proba(feats(W, Xte))[:, list(clf.classes_).index(1)]
    return p, np.where(p >= 0.5, 1, -1)


sessions = []
for pnum in (1, 2, 3):
    for stage in ("pre", "post"):
        fs, ytr, ttr = load(os.path.join(SRC, "P%d_%s_training.mat" % (pnum, stage)))
        otr = onsets(ttr)
        Xtr = windows(band(ytr, fs, 8, 30), fs, otr)
        Ltr = ttr[otr]
        fs, yte, tte = load(os.path.join(SRC, "P%d_%s_test.mat" % (pnum, stage)))
        ote = onsets(tte)
        Xte = windows(band(yte, fs, 8, 30), fs, ote)
        Lte = tte[ote]
        p, pred = fit_eval(Xtr, Ltr, Xte, Lte)
        n = len(Lte)
        k = int((pred == Lte).sum())
        acc = k / n
        perm = np.array([(pred == RNG.permutation(Lte)).mean() for _ in range(5000)])
        pval = float((np.sum(perm >= acc) + 1) / (len(perm) + 1))
        conf = np.maximum(p, 1 - p)
        bins = [(0.5, 0.7), (0.7, 0.9), (0.9, 1.01)]
        calib = []
        for lo, hi in bins:
            sel = (conf >= lo) & (conf < hi)
            calib.append({"lo": lo, "hi": min(hi, 1.0), "n": int(sel.sum()),
                          "hit": round(float((pred[sel] == Lte[sel]).mean()), 3) if sel.sum() else None})
        curve = []
        for kk in (10, 20, 30, 40, 60, len(Ltr)):
            kk = min(kk, len(Ltr))
            sub_L = Ltr[:kk]
            if len(set(sub_L)) < 2 or min((sub_L == 1).sum(), (sub_L == -1).sum()) < 4:
                continue
            _, pr = fit_eval(Xtr[:kk], sub_L, Xte, Lte)
            curve.append({"trials": int(kk), "accuracy": round(float((pr == Lte).mean()), 3)})
        sessions.append({
            "id": "P%d_%s" % (pnum, stage), "patient": "P%d" % pnum, "stage": stage,
            "n_test": n, "n_train": int(len(Ltr)), "correct": k, "accuracy": round(acc, 3),
            "ci95": wilson(k, n), "perm_p": round(pval, 4),
            "calibration": calib, "learning_curve": curve,
            "train_minutes_estimate": None,
        })
        print("P%d %-4s acc %.1f%% CI %s perm p %.4f (n=%d)" % (pnum, stage, 100 * acc, wilson(k, n), pval, n))

with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"note": "Computed from g.tec stroke-rehab recordings; unseen test runs; chance is 0.5.", "sessions": sessions}, f, indent=1)
print("wrote", OUT)
