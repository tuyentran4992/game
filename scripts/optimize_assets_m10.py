#!/usr/bin/env python3
"""M10 — (1) regen icon_pickle prompt rõ hơn; (2) optimize toàn bộ assets về size game thật + quantize PNG; (3) rebuild manifest sha.
Budget: tổng < 4MB (gate TB-03)."""
import hashlib, io, json, subprocess, sys, time
from pathlib import Path
from PIL import Image

ROOT = Path("/data/youtube-playables")
OUT = ROOT / "M10-BanhMi-Master/game/public/assets"
MAN = ROOT / "M10-BanhMi-Master/assets/manifest.json"

# --- Bước 1: regen icon_pickle (xoá khỏi manifest trước, chạy gen --only) ---
man = json.loads(MAN.read_text())
if "icon_pickle" in man["files"]:
    del man["files"]["icon_pickle"]
    MAN.write_text(json.dumps(man, indent=1))
    (OUT / "icon_pickle.png").unlink(missing_ok=True)
    print("[1] icon_pickle removed → regen...", flush=True)
    r = subprocess.run([sys.executable, str(ROOT / "scripts/gen_assets_m10.py"), "--only", "icon_pickle"],
                       capture_output=True, text=True, timeout=600)
    print(r.stdout[-500:], flush=True)

# --- Bước 2: optimize size + quantize ---
# Size thật trong game (DESIGN-SPEC §3) — sprite hiển thị bao nhiêu thì để bấy nhiêu (×1.5 cho retina nhẹ)
TARGET = {
    "bg_street": (720, None),          # full canvas 720×1280
    "tray_bg": (680, None),
    "hero_sandwich": (640, None),
    "stall_closed": (640, None),
    "bread_bottom": (300, None), "bread_top": (300, None),
}
DEFAULT_MAX = {"cust": 330, "icon": 110, "layer": 240, "fx": 96}  # prefix → max px

man = json.loads(MAN.read_text())
total = 0
for name, meta in list(man["files"].items()):
    p = OUT / f"{name}.png"
    if not p.exists():
        print(f"  !! MISSING {name}", flush=True); continue
    img = Image.open(p)
    # target max width
    if name in TARGET:
        maxw = TARGET[name][0]
    else:
        maxw = next((v for k, v in DEFAULT_MAX.items() if name.startswith(k)), 200)
    if img.width > maxw:
        h = round(img.height * maxw / img.width)
        img = img.resize((maxw, h), Image.Resampling.LANCZOS)
    # quantize: RGBA → palette 256 màu (PNG8) — sprite flat 2D nén rất tốt
    img = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).convert("RGBA")
    img.save(p, "PNG", optimize=True)
    sha = hashlib.sha256(p.read_bytes()).hexdigest()[:12]
    man["files"][name] = {"file": f"assets/{name}.png", "sha": sha, "bytes": p.stat().st_size,
                          "vision": meta.get("vision", "")}
    total += p.stat().st_size
    print(f"  opt {name}: {p.stat().st_size//1024}K ({img.width}x{img.height})", flush=True)

man["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
man["style"] = "wan2.7-image-pro candy-volumetric flat-2d; kill_white cutout; resized+quantized 256-color (boss approved style 09/09)"
MAN.write_text(json.dumps(man, indent=1))
mb = total / 1024 / 1024
print(f"\nMANIFEST: {len(man['files'])} assets, total {total//1024}K = {mb:.2f}MB — {'OK <4MB' if mb < 4 else 'STILL OVER 4MB'}", flush=True)
