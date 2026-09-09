#!/usr/bin/env python3
"""Xóa icon_chilif + layer_chilif khỏi manifest/disk -> regen bằng prompt mới -> optimize -> rebuild manifest sha."""
import json, subprocess, sys
from pathlib import Path

ROOT = Path("/data/youtube-playables/M10-BanhMi-Master")
MAN = ROOT / "assets" / "manifest.json"
OUT = ROOT / "game" / "public" / "assets"

man = json.loads(MAN.read_text())
for k in ("icon_chilif", "layer_chilif"):
    man["files"].pop(k, None)
    f = OUT / f"{k}.png"
    if f.exists():
        f.unlink()
        print("removed", f.name)
MAN.write_text(json.dumps(man, indent=1))
print("manifest entries removed; regen via gen_assets_m10 --only")

r = subprocess.run([sys.executable, "/data/youtube-playables/scripts/gen_assets_m10.py",
                    "--only", "icon_chilif,layer_chilif"], capture_output=True, text=True, timeout=600)
print(r.stdout[-1500:]); print(r.stderr[-500:] if r.returncode else "")
if r.returncode:
    sys.exit(1)

r2 = subprocess.run([sys.executable, "/data/youtube-playables/scripts/optimize_assets_m10.py", "--skip-regen"],
                    capture_output=True, text=True, timeout=600)
print("optimize:", r2.stdout[-900:], "rc", r2.returncode)
