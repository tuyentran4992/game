#!/usr/bin/env python3
"""Gen asset png thật cho M2 Neon Sort: bg_space (nền galaxy) + tube_base (ống thủy tinh). Khử nền trắng."""
import json, os, sys, time, urllib.request, io
from pathlib import Path
from PIL import Image

env_path = "/data/code/ai-photo-studio/.env"
key = None; base = "https://api.ai-box.vn/v1"
for line in open(env_path):
    line = line.strip()
    if line.startswith("AI_BOX_API_KEY="):
        key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if line.startswith("AI_BOX_BASE_URL="):
        v = line.split("=", 1)[1].strip()
        if v: base = v
if not key:
    print("FATAL: AI_BOX_API_KEY not found"); sys.exit(1)

RAW = Path("/data/youtube-playables/M2-Color-Sort/assets/raw")
PUB = Path("/data/youtube-playables/M2-Color-Sort/game/public/raw")
for d in (RAW, PUB): d.mkdir(parents=True, exist_ok=True)

SPRITES = {
    "bg_space": ("Deep space background for a casual puzzle game, dark navy-blue to deep violet vertical gradient, "
                 "many tiny faint stars, soft cyan and magenta nebula wisps, subtle atmospheric glow, "
                 "clean flat 2D mobile background, no objects no text no logo, beautiful and calm"),
    "tube_base": ("Empty transparent glass laboratory test tube, straight vertical, rounded bottom, "
                  "thin crystal glass rim with subtle glowing neon cyan edge, transparent interior (no liquid), "
                  "isolated on plain pure white background, clean flat 2D mobile game asset, no text"),
}

def rm_white(img):
    img = img.convert("RGBA"); px = img.load(); w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 240 and g > 240 and b > 240:
                px[x, y] = (r, g, b, 0)
    return img

def gen(name, prompt, size=(1024, 1024), strip_white=False):
    body = {"model": "wan2.7-image-pro", "prompt": prompt, "size": f"{size[0]}x{size[1]}"}
    req = urllib.request.Request(base + "/images/generations", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    url = None
    for att in range(4):
        try:
            with urllib.request.urlopen(req, timeout=150) as r:
                d = json.loads(r.read())
            url = d["data"][0]["url"]; break
        except Exception as e:
            print(f"  attempt {att+1} fail: {e}"); time.sleep(10)
    if not url:
        print(f"FATAL gen {name}"); return False
    time.sleep(3)
    with urllib.request.urlopen(url, timeout=150) as r:
        img = Image.open(io.BytesIO(r.read()))
    if strip_white:
        img = rm_white(img)
    else:
        img = img.convert("RGBA")
    for d in (RAW, PUB):
        img.save(d / f"{name}.png")
    print(f"  OK {name} {img.size}")
    return True

for name, p in SPRITES.items():
    print(f"[gen] {name}")
    gen(name, p, strip_white=(name == "tube_base"))
print("DONE")