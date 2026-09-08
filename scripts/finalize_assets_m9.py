#!/usr/bin/env python3
"""M9 finalize — (1) regen whale bang flood-fill cutout (giu bung sang ben trong),
(2) resize moi sprite ve kich thiet ke + quantize 256 mau, (3) quantize 4 nen,
(4) ghi lai manifest sha/bytes. Target: tong < 4MB."""
import io, json, sys, time, urllib.request
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "M9-DeepCast" / "game" / "public" / "assets"
MAN = ROOT / "M9-DeepCast" / "assets"
env = "/data/code/ai-photo-studio/.env"
KEY = BASE = None
for line in open(env):
    line = line.strip()
    if line.startswith("AI_BOX_API_KEY="): KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
    if line.startswith("AI_BOX_BASE_URL=") and line.split("=", 1)[1].strip(): BASE = line.split("=", 1)[1].strip()
BASE = BASE or "https://api.ai-box.vn/v1"

SIZES = {"boat":512,"hook":160,"hook_double":200,"fish_01":96,"fish_02":110,"fish_03":110,"fish_04":130,
 "fish_05":150,"fish_06":190,"fish_07":230,"fish_08":170,"fish_09":230,"fish_10":260,"whale":512,
 "shark":380,"chest":128,"treasure":400,"splash":128,"sparkle":64,"bubble":64,"sonar":480}
WHALE_PROMPT = ("A friendly blue whale, large rounded body in blue-grey with lighter pale belly, small cute eye, "
 "spout of water, side view, flat 2D casual mobile game sprite, thick dark outline bolder than fill, "
 "bold vibrant colors, soft flat shading, clean vector shapes, single object centered, "
 "isolated on plain pure white background, NO text NO watermark no logo.")

def flood_cut(img):
    """Xoa nền trắng connect từ BIÊN vào (BFS) — giữ vùng trắng BEN TRONG thân."""
    a = np.array(img.convert("RGBA"), dtype=np.int16)
    near = (a[..., 0] > 218) & (a[..., 1] > 218) & (a[..., 2] > 218) & \
           ((np.maximum(np.maximum(a[..., 0], a[..., 1]), a[..., 2]) - np.minimum(np.minimum(a[..., 0], a[..., 1]), a[..., 2])) < 26)
    h, w = near.shape
    bg = np.zeros_like(near)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not bg[y, x]: bg[y, x] = True; dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not bg[y, x]: bg[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for yy, xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0 <= yy < h and 0 <= xx < w and near[yy, xx] and not bg[yy, xx]:
                bg[yy, xx] = True; dq.append((yy, xx))
    a[..., 3] = np.where(bg, 0, a[..., 3])
    im = Image.fromarray(a.astype(np.uint8), "RGBA")
    bb = im.getbbox()
    return im.crop(bb) if bb else im

def api(payload, kind="images/generations"):
    req = urllib.request.Request(BASE + "/" + kind, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"})
    for att in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r: return json.loads(r.read())
        except Exception as e:
            print(f"  attempt {att+1}: {e}"); time.sleep(8)
    return None

def regen_whale():
    print("[whale] regen flood-fill")
    for attempt in range(3):
        d = api({"model": "wan2.7-image-pro", "prompt": WHALE_PROMPT, "size": "1024x1024"})
        if not d: continue
        time.sleep(2)
        with urllib.request.urlopen(d["data"][0]["url"], timeout=120) as r:
            img = Image.open(io.BytesIO(r.read())).convert("RGBA")
        img = flood_cut(img)
        img.thumbnail((SIZES["whale"]*2, SIZES["whale"]*2), Image.Resampling.LANCZOS)
        # kiem tra bung: vung giua duoi than phai co pixel sang DAN (alpha=255)
        a = np.array(img)
        h, w = a.shape[:2]
        core = a[h//2:h*4//5, w//4:w*3//4]
        opaque = core[..., 3] > 240
        light = opaque & (core[..., 0] > 180) & (core[..., 1] > 180)
        ratio = light.sum() / max(1, opaque.sum())
        print(f"  attempt {attempt+1}: belly-light ratio {ratio:.2f} (can >0.15)")
        if ratio > 0.15:
            img.save(OUT / "whale.png", "PNG", optimize=True)
            return True
    return False

def optimize():
    total = 0
    for p in sorted(OUT.glob("*.png")):
        im = Image.open(p).convert("RGBA")
        n = p.stem
        if n.startswith("bg_"):
            im = im.resize((480, 854), Image.Resampling.LANCZOS)
            q = im.convert("RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            q.save(p, "PNG", optimize=True)
        else:
            tgt = SIZES.get(n)
            if tgt and max(im.size) > tgt * 2:
                im.thumbnail((tgt*2, tgt*2), Image.Resampling.LANCZOS)
            q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
            q.save(p, "PNG", optimize=True)
        kb = p.stat().st_size // 1024
        total += p.stat().st_size
        print(f"  {p.name:16s} {kb:5d}K")
    return total

def write_manifest():
    man = json.loads((MAN / "manifest.json").read_text())
    tot = 0
    for n, v in man["files"].items():
        p = OUT / f"{n}.png"
        import hashlib
        b = p.read_bytes()
        v["sha"] = hashlib.sha256(b).hexdigest()[:12]
        v["bytes"] = len(b)
        tot += len(b)
    man["total_bytes"] = tot
    man["note"] = "finalize: flood-fill whale, quantize 256, sizes per DESIGN-SPEC"
    (MAN / "manifest.json").write_text(json.dumps(man, indent=1))
    print(f"TOTAL {tot//1024}K  ({'OK' if tot < 4*1024*1024 else 'OVER 4MB'})")

if __name__ == "__main__":
    ok = regen_whale()
    print("whale", "OK" if ok else "FAIL-kept-old")
    optimize()
    write_manifest()
