"""Generate the short spoken cues used by the page's "Voice cues" switch, once, with ElevenLabs.

Usage:  py make_audio.py
Reads ELEVENLABS_API_KEY from .env.local (git-ignored; never printed or committed) and writes
assets/audio/<name>.mp3. The clips are static files: the key is never sent to a browser.
"""
import os
import sys

from elevenlabs.client import ElevenLabs

HERE = os.path.dirname(os.path.abspath(__file__))


def load_env(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env(os.path.join(HERE, ".env.local"))
if not os.environ.get("ELEVENLABS_API_KEY"):
    sys.exit("ELEVENLABS_API_KEY is not set (expected in .env.local)")

CUES = {
    "cue_left": "Imagine moving your left hand.",
    "cue_right": "Imagine moving your right hand.",
    "read_left": "The model read left.",
    "read_right": "The model read right.",
    "no_match": "No match. No feedback.",
    "wrong_hand": "Wrong hand.",
}
VOICE = "Xb7hH8MSUJpSbSDYk0k2"  # "Alice", a premade voice (library voices need a paid plan)

client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
out_dir = os.path.join(HERE, "assets", "audio")
os.makedirs(out_dir, exist_ok=True)
for name, text in CUES.items():
    audio = client.text_to_speech.convert(
        voice_id=VOICE, text=text, model_id="eleven_multilingual_v2", output_format="mp3_44100_128"
    )
    with open(os.path.join(out_dir, name + ".mp3"), "wb") as f:
        for chunk in audio:
            f.write(chunk)
    print("wrote", name)
