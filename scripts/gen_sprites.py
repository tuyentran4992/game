#!/usr/bin/env python3
"""Gen 2 game sprites (mèo, ong) qua AI-Box WAN 2.7 → khử nền trắng → transparent PNG vào assets/raw/."""
import json, os, re, sys, time, urllib.request, io
from pathlib import Path
import requests
from PIL import Image

# ---- load AI-Box key từ env ai-photo-studio ----
env_path = "/data/code/ai-photo-studio/.env"
key = None; base = "https://api.ai-box.vn/v1"
for line in open(env_path):
    line = line.strip()
    if line.startswith("AI_BOX_API_KEY="):
        key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if line.startswith("AI_BOX_BASE_URL="):
        v = line.split("=", 1)[1].strip(); 
        if v: base = v
if not key:
    print("FATAL: AI_BOX_API_KEY not found"); sys.exit(1)

RAW = Path("/data/youtube-playables/M1-Rescue-Dodge/assets/raw")
RAW.mkdir(parents=True, exist_ok=True)

SPRITES = {
    "cat_idle": ("Cute chunky orange tabby cat, full body, 3/4 side view, big round head, "
                 "slightly crouched ready-to-dodge pose, flat 2D casual mobile game sprite, "
                 "thick dark brown outline, bold vibrant colors, soft flat shading, "
                 "isolated on plain pure white background, NO text NO watermark no logo."),
    "bee_wasp": ("Cute plump round yellow bee, angry determined cartoon face, two small wings spread, "
                 "flying toward viewer, flat 2D casual mobile game sprite, thick dark outline, "
                 "black and yellow stripes, bold vibrant colors, isolated on plain pure white background, "
                 "NO text NO watermark no logo."),
}

def gen(prompt, out, size=(1024, 1024)):
    body = {"model": "wan2.7-image-pro", "prompt": prompt, "size": f"{size[0]}x{size[1]}"}
    req = urllib.request.Request(
        base + "/images/generations",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    url = None
    for att in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
            url = d["data"][0]["url"]; break
        except Exception as e:
            print(f"  attempt {att+1} fail: {e}"); time.sleep(8)
    if not url:
        print(f"FATAL: gen {out} failed"); return False
    time.sleep(3)
    with urllib.request.urlopen(url, timeout=120) as r:
        img = Image.open(io.BytesIO(r.read())).convert("RGBA")
    # khử nền trắng -> transparent (threshold + feather nhẹ)
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 243 and g > 243 and b > 243:
                px[x, y] = (r, g, b, 0)
    img.save(out)
    print(f"  saved {out} {img.size} {os.path.getsize(out)} bytes")
    return True

if __name__ == "__main__":
    for name, prompt in SPRITES.items():
        print(f"[gen] {name}")
        gen(prompt, RAW / f"{name}.png")
    print("DONE")