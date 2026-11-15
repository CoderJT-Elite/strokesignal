# What strokesignal does not show

1. Recorded, not live. Every EEG trace is from g.tec's stroke-rehab recordings of three patients. Nothing is a live brain, and nothing live is claimed.
2. Not a medical device. The arm, the muscle activation and the stimulation pulse are simulated. No patient has used this and it is not for treatment.
3. Not new. g.tec's recoveriX already provides brain-controlled stimulation for stroke rehab in clinics. This project is a small, open, readable replay of that idea.
4. Three patients prove little. Test accuracy changed by -6, +18 and +2 points between each patient's first and last session. That does not show that therapy improves recovery.
5. Calibration is the cost. Each session needs about 17 minutes of calibration recording before the model can be used.
6. Protocol versus real use. In the recorded therapy, feedback was given only when the reading matched the instruction. A home system cannot know the instruction, so "Real use" mode lets wrong guesses move the wrong hand.
7. The arm is a visual model. Joint angles and muscle swelling are drawn to be readable, not computed from a biomechanical model. The anatomy comes from BodyParts3D (CC BY-SA 2.1 Japan).
8. Accuracy is on one test run per session (80 trials), left versus right only. Intervals are 95% Wilson intervals. The permutation p-value uses 5,000 label shuffles, so its floor is about 0.0002.
9. Data: the page serves only derived, downsampled traces (C3 and C4) and the model's reading per trial, not the raw recordings.
