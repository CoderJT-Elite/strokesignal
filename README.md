# strokesignal

Twelve million times a year, a stroke patient's brain says move and nothing answers. strokesignal is the first simulated BCI stroke rehab: it reads the attempt from EEG, and an anatomical arm answers. Built on g.tec's recordings of three stroke patients for Hack The Nest 2026 (Eastern Michigan University), Mind and Machine track.

Live: https://strokesignal.health

## What is on the page
- A forearm and hand pair rigged from real anatomy (bones, muscles, tendons from BodyParts3D). It stays on screen while you scroll.
- One recorded EEG trial on chart paper, the decoder's reading, and the arm answering: tendons draw, fingers close, a stimulation pulse is shown on the tendons.
- Evidence from unseen test runs: accuracy per session with 95% Wilson intervals, a label-shuffle test, calibration, and a learning curve (accuracy against calibration trials).
- A replay of every test trial from six sessions, where the visitor picks the session, speed and feedback rule.
- `/judge.html`: the demo-first version (arm and controls on one screen).

## How it works
- Data: g.tec's stroke-rehab recordings (3 patients, first and last session, 16 channels, 256 Hz). Decoder: band-pass 8-30 Hz, 3-6 s imagery window, CSP (3 pairs) and LDA, fit on each session's training run and scored on that session's test run it never saw. Accuracy: P1 92.5% then 86.3%, P2 81.2% then 98.8%, P3 80.0% then 82.5%. Chance is 50%.
- Arm: BodyParts3D meshes rigged in three.js, with tendons and muscle swelling driven by the decoder's reading.
- When the model is at least 90% sure it is right 94% of the time (367 of 390 trials).

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

## AI tools used, and how (Hack The Nest asks for this)
- Claude Code (Anthropic) wrote most of the code in this repository under John's direction: the decoder export, the evidence script, the rigged arm, the page, the server setup and the tests. John chose the project, set the honesty rules and reviewed the results.
- Gemini (`explain.py`) writes a two-sentence plain-language note per session from that session's figures. A script rejects any note containing a number that is not in those figures or any wording about recovery or treatment.
- ElevenLabs (`make_audio.py`) generated six spoken cue clips once; they are static files.
- No AI tool touched the decoder's numbers: they come from `evidence.py` on g.tec's recordings, and `test_evidence.py` checks them.

## Services
- MongoDB Atlas: `seed_atlas.py` loads the evidence and notes; `api.py` serves them read-only to the page (`/api/evidence`). The page falls back to bundled copies if the API is down.
- Vultr: serves the site and the API behind nginx with HTTPS.
- Keys live in git-ignored `.env`, `.env.local` and `atlas-credentials.env` and are never sent to a browser.
