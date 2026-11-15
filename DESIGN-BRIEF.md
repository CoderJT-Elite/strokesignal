# strokesignal: design brief

Subject: a stroke patient tries to move a hand and nothing answers. We decode the attempt from EEG and answer it. Audience: hackathon judges (some technical, some not) who give a project about 20 seconds before deciding whether they understand it. Primary job: make the problem and the response obvious at a glance, then let a judge drive the demo.

## What the first plan looked like, and why it was rejected
The four comps already shown (cream paper with a serif and a clay accent; matte green scope; white journal page; dark blue cinema) were the common generated defaults: cream or near-black grounds, serif display, one warm accent, framed panels, a big stat at the top, all-caps labels, flat clip-art hand. The new plan removes each of those.

## Concept
The arm is the page. A real anatomical forearm and hand (bones and muscles from scanned anatomy, BodyParts3D) stays on screen while the text scrolls past it. The one memorable thing is the arm answering: its tendons draw and its fingers close in step with a real EEG decode.

The second subject-specific idea is the material of EEG itself. A trace is clinically read on chart paper: millimetre grid in rose, ink trace. The EEG strip is drawn that way and nowhere else on the page, so it reads as a real recording.

## Tokens
Colour (all drawn from the subject):
- Seamless: #AEBBC0, the cool grey-blue of a photographic backdrop; the page ground, the arm sits on it.
- Ink: #15222B, blue-black for text.
- Bone: #EDE4D0, the bones and the light surfaces.
- Muscle: #7B2D2B, deep madder; muscles and the only dark accent.
- Chart rose: #E9B9B6 on #F7F1EC, used only for the EEG chart paper.
- Stimulation: #F2A93B, used only for the pulse and the active tendon.

Type (two families, clearly different):
- Literata for headlines and body (a reading face made for long text, with a medical-journal tone but not a display serif cliche). Body in 19 px with 1.6 line height, lines under 70 characters.
- Archivo, using its width axis, for numbers and short labels: condensed for large figures, normal for labels. Sentence case labels only, no tracked caps.

Layout: two columns on desktop. The arm is a sticky full-height canvas on the right, 55 percent of the width. Text sits left-aligned in a 34 rem column on the left and scrolls. On a phone the arm is a pinned strip at the top and the text scrolls beneath it. No cards, no equal boxes, no icon rows, no numbered eyebrows. Structure comes from white space and a few plain rules where the content is genuinely a table.

Sequence (this one is a real sequence, so progress is shown by the arm, not by numbers):
1. The attempt gets no answer (arm at rest; one sentence).
2. The signal (EEG chart strip draws; the motor area for the imagined hand goes quiet).
3. The decode (probability reading, left or right).
4. The answer (tendons draw, fingers close, a stimulation pulse).
5. The evidence (three patients, accuracies with intervals, chance line).
6. Try it (full controls: session, speed, feedback rule; the judge drives).
7. What this does not show (limits in plain words, attribution).

Motion: one orchestrated moment, the arm responding. Nothing else animates on its own. No scroll-triggered fade-ups, no hover transitions on every element. Reduced-motion users get the arm pose without the sweep.

Copy: plain, specific, active voice, sentence case. No marketing adjectives. Numbers appear in sentences where they matter and large only where the page is about that number.

## Honest numbers on the page
Verified at build time, each with a source line: US strokes per year (CDC), worldwide burden (WHO or World Stroke Organization, checked live), our accuracies with 95 percent intervals on unseen runs, the 50 percent chance line, and the limits (three patients, recorded and replayed, simulated limb and stimulation, session changes of -6, +18 and +2 points do not show therapy works, recoveriX already exists, not a medical device).

## Slop audit (a gate before any screenshot is shown)
Fail the build if any of these appear: cream ground with terracotta accent; near-black ground with one neon accent; tracked all-caps labels; eyebrows above headings; middle-dot meta strings; spaced em-dash labels; arrows on links; identical rounded cards; the same soft shadow under things; gradient washes or glows; icons in circles; a headline with one accented word; centered everything; fade-and-slide-up on every section; stock-photo or emoji decoration.
