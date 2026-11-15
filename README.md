# strokesignal

A stroke patient tries to move a hand and nothing answers. strokesignal reads the attempt from EEG and answers it, using g.tec's recordings of three stroke patients. Hack The Nest 2026 (Eastern Michigan University), Mind and Machine track. A prototype, not a medical device.

Live: https://strokesignal.health

## What is on the page
- A forearm and hand pair rigged from real anatomy (bones, muscles, tendons from BodyParts3D). It stays on screen while you scroll.
- One recorded EEG trial on chart paper, the decoder's reading, and the arm answering: tendons draw, fingers close, a stimulation pulse is shown on the tendons.
- Evidence from unseen test runs: accuracy per session with 95% Wilson intervals, a label-shuffle test, calibration, and a learning curve (accuracy against calibration trials).
- A replay of every test trial from six sessions, where the visitor picks the session, speed and feedback rule.
- A section on what the project does not show.

## Real, simulated, not shown
- Real: g.tec's stroke-rehab recordings (3 patients, first and last session, 16 channels, 256 Hz). Decoder: band-pass 8-30 Hz, 3-6 s imagery window, CSP (3 pairs) and LDA, fit on each session's training run and scored on that session's test run it never saw. Accuracy: P1 92.5% then 86.2%, P2 81.2% then 98.8%, P3 80.0% then 82.5%. Chance is 50%.
- Simulated: the arm, the muscle activation and the stimulation. No patient, no stimulator.
- Not shown: that therapy improves recovery. Changes of -6, +18 and +2 points on 3 people are inconclusive.
- Not new: g.tec's recoveriX already does brain-controlled stimulation for stroke rehab in clinics.
- Not live: every trace is a recording.

See `LIMITS.md`.

## Run it
```
py -m http.server 8000
```
Open http://localhost:8000/strokesignal.html (it must be served, not opened as a file). No build step and no keys; three.js r160 is vendored in `assets/vendor/three`. `simulator-2d.html` is the plain 2D version and the fallback when WebGL is off.

## Reproduce the numbers
You need the g.tec stroke-rehab `.mat` files (not included here).
```
py -I export_data.py <folder with P1_pre_training.mat ...> data.js
py -I evidence.py <same folder> evidence.json
py -I -c "import json;d=json.load(open('evidence.json'));open('evidence.js','w').write('window.EVIDENCE = '+json.dumps(d,separators=(',',':'))+';')"
py -I -m pytest -q
```
`data.js` holds only derived, downsampled traces (C3 and C4, 64 Hz) and the decoder's reading for each test trial. The tests check that the page's trial data reproduces the reported accuracies, that the intervals match the Wilson formula, and that the changes quoted on the page are right.

## Files
- `strokesignal.html`, `arm.js`: the page and the rigged arm (three.js).
- `assets/anatomy/`: 33 BodyParts3D meshes and `rig.json` (joint pivots found from the mesh ends).
- `export_data.py`, `evidence.py`, `test_evidence.py`: the decoder, the evidence, and the checks.
- `DESIGN-BRIEF.md`: why the page looks the way it does.

## Licenses and credit
- Code: MIT (`LICENSE`).
- Anatomy meshes and the rig: BodyParts3D, (c) The Database Center for Life Science, licensed under Creative Commons Attribution-Share Alike 2.1 Japan. Mitsuhashi et al., Nucleic Acids Research, 2009. https://lifesciencedb.jp/bp3d/. Files under `assets/anatomy/` stay under that license.
- three.js: MIT (`assets/vendor/three/LICENSE`).
- EEG data: g.tec Hack The Nest 2026 stroke-rehab dataset. Not redistributed beyond the derived traces above.

## Sources for the numbers on the page
- CDC, Stroke Facts: more than 795,000 strokes a year in the US.
- World Stroke Organization, Global Stroke Fact Sheet 2025: almost 12 million new strokes a year worldwide.
