#!/usr/bin/env python3
"""Slice Studio — gen 4 interior-art atlases via AI-Box WAN 2.7 (pattern gen_sprites.py, parameterized).

Per chapter m1..m4 (DESIGN-SPEC §2): one full-canvas sprite = ellipse interior art
with rough baked mask edge (±12px inward-biased, deterministic per ART config).
Output: game/public/atlas-m<k>.png (≤2048², <512KB, Latin names)
+ game/public/atlas-manifest.json (drift-guard for S1-T2).

Usage: python3 scripts/gen_slice_sprites.py [--chapters 1,2,3,4] [--force]
"""
import argparse, json, math, sys, time, urllib.request, io
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

# ---- AI-Box key (same env source as scripts/gen_sprites.py) ----
ENV_PATH = "/data/code/ai-photo-studio/.env"
BASE = "https://api.ai-box.vn/v1"
KEY = None
for line in open(ENV_PATH):
    line = line.strip()
    if line.startswith("AI_BOX_API_KEY="):
        KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
    if line.startswith("AI_BOX_BASE_URL=") and line.split("=", 1)[1].strip():
        BASE = line.split("=", 1)[1].strip()
if not KEY:
    print("FATAL: AI_BOX_API_KEY not found in", ENV_PATH)
    sys.exit(1)

# ---- output (game/public → vite copies to dist root; verify gate rào 4 scans public/) ----
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "M8-SliceStudio" / "game" / "public"

# ---- geometry MUST mirror src/config/theme-config.ts ART (drift-guard S1-T2) ----
MASK_AMP = 12          # px jitter bound (inward-biased)
MASK_INWARD = 1.7      # jitter = (u*INWARD - 1) * AMP
MASK_STEPS = 64
SEEDS = {1: 1101, 2: 2202, 3: 3303, 4: 4404}
SIZES = {1: 1024, 2: 1024, 3: 1408, 4: 1408}  # canvas N×N per chapter (≤2048)
MAX_BYTES = 512 * 1024
SAFE_MARGIN = 24       # mask radius shrink from canvas edge

STYLE = ("flat 2D casual mobile game interior texture, thick dark outline, bold vibrant "
         "colors, soft flat shading, clean vector shapes, top-down flat illustration, "
         "isolated on plain pure white background, NO text, NO letters, NO numbers, "
         "NO watermark, NO logo, NO signature, NO frame border")

PROMPTS = {
    1: "playful composition of simple geometric shapes — circle, triangle, square, blob — "
       "floating inside a round organic form, fresh sky-blue and navy palette accents",
    2: "secret garden still life — one big shiny red apple, one vintage clock face, one "
       "striped ball, tucked inside a round organic form, purple and lavender palette accents",
    3: "steady-hand curves — large crescent moon and soft wave curves inside a round organic "
       "form, deep green and mint palette accents",
    4: "danger studio — one large bold shape with a glowing molten core, ember sparks around, "
       "deep dark red and orange palette accents",
}


def mulberry32(seed: int):
    """Bit-identical to mulberry32 in src/config/theme-config.ts (verified against node)."""
    a = seed & 0xFFFFFFFF

    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ ((t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t = (t ^ (t >> 14)) & 0xFFFFFFFF
        return t / 4294967296

    return rnd


def bake_mask(n: int, seed: int):
    """Ellipse mask polygon, deterministic inward-biased rough edge (mirrors theme-config)."""
    rng = mulberry32(seed)
    pts = []
    for i in range(MASK_STEPS):
        a = (i / MASK_STEPS) * 2 * math.pi
        u = rng()
        j = (u * MASK_INWARD - 1) * MASK_AMP
        j = min(j, 0.0)  # clamp: mask NEVER bulges outside the hit-shape ellipse
        r = n / 2 - SAFE_MARGIN + j
        pts.append((n / 2 + r * math.cos(a), n / 2 + r * math.sin(a)))
    return pts


def gen_image(prompt: str, size: int, out: Path) -> bool:
    body = {"model": "wan2.7-image-pro", "prompt": prompt, "size": f"{size}x{size}"}
    req = urllib.request.Request(
        BASE + "/images/generations",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"})
    url = None
    for att in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
            url = d["data"][0]["url"]
            break
        except Exception as e:
            print(f"  gen attempt {att + 1} fail: {e}")
            time.sleep(8)
    if not url:
        return False
    time.sleep(3)
    with urllib.request.urlopen(url, timeout=120) as r:
        img = Image.open(io.BytesIO(r.read())).convert("RGBA")
    img.save(out)
    return True


def vision_check(img: Image.Image) -> list:
    """0 text / 0 watermark heuristics — flag suspicious artifacts (hard gate is human vision)."""
    from collections import Counter
    probs = []
    small = img.convert("RGB").resize((256, 256))
    w, h = small.size
    px = small.load()
    # 1) watermark bands live in margins — near-black pixels in outer 6% frame
    m = max(2, int(w * 0.06))
    ys = list(range(m)) + list(range(h - m, h))
    xs = list(range(m)) + list(range(w - m, w))
    dark_margin = sum(
        1
        for y in ys for x in xs
        if all(c < 60 for c in px[x, y])
    )
    if dark_margin > 40:
        probs.append(f"dark pixels in margin ({dark_margin}) — possible text/watermark band")
    # 2) flat vector art has a dominant flat color; busy/photo-ish output skews spread
    colors = Counter()
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            colors[tuple(c // 32 for c in px[x, y])] += 1
    total = len(range(0, h, 4)) * len(range(0, w, 4))
    if colors.most_common(1)[0][1] / total < 0.18:
        probs.append("low flat-color dominance — possible busy/watermarked output")
    return probs


def process(chapter: int, force: bool) -> dict:
    n = SIZES[chapter]
    seed = SEEDS[chapter]
    out = OUT_DIR / f"atlas-m{chapter}.png"
    meta = {"file": out.name, "seed": seed, "size": [n, n], "bytes": 0}
    if out.exists() and not force:
        print(f"[m{chapter}] exists, skip (use --force to re-gen)")
        meta["bytes"] = out.stat().st_size
        return meta
    prompt = f"{PROMPTS[chapter]}, {STYLE}"
    tmp = OUT_DIR / f"atlas-m{chapter}.raw.png"
    if not gen_image(prompt, n, tmp):
        print(f"FATAL: gen atlas-m{chapter} failed after retries")
        sys.exit(2)
    img = Image.open(tmp).convert("RGBA")
    if img.size != (n, n):
        img = img.resize((n, n), Image.LANCZOS)

    # white→transparent (pattern gen_sprites.py)
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 243 and g > 243 and b > 243:
                px[x, y] = (r, g, b, 0)

    # bake deterministic rough-edge mask (alpha outside polygon → 0, 1px feather)
    mask_img = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mask_img).polygon(bake_mask(n, seed), fill=255)
    mask_img = mask_img.filter(ImageFilter.GaussianBlur(1))
    img.putalpha(Image.composite(img.getchannel("A"), Image.new("L", (n, n), 0), mask_img))

    # vision check on full-res before compression
    probs = vision_check(img)
    if probs:
        print(f"[m{chapter}] VISION WARN: {probs}")

    # compress ≤512KB: palette quantize first, then gradual downscale
    img.quantize(colors=192, method=Image.FASTOCTREE).convert("RGBA").save(out, optimize=True)
    while out.stat().st_size > MAX_BYTES and img.size[0] > 256:
        img = img.resize((int(img.size[0] * 0.9), int(img.size[1] * 0.9)), Image.LANCZOS)
        img.quantize(colors=160, method=Image.FASTOCTREE).convert("RGBA").save(out, optimize=True)

    tmp.unlink(missing_ok=True)
    meta["bytes"] = out.stat().st_size
    meta["size"] = list(img.size)
    print(f"[m{chapter}] {out.name} {img.size} {meta['bytes']}B vision_probs={probs}")
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chapters", default="1,2,3,4")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    chs = [int(c) for c in args.chapters.split(",") if c.strip()]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    chapters = {}
    for ch in chs:
        chapters[str(ch)] = process(ch, args.force)
    manifest = {
        "model": "wan2.7-image-pro",
        "bakedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "mask": {"ampPx": MASK_AMP, "inwardBias": MASK_INWARD, "steps": MASK_STEPS},
        "chapters": chapters,
    }
    (OUT_DIR / "atlas-manifest.json").write_text(json.dumps(manifest, indent=2))
    print("MANIFEST", OUT_DIR / "atlas-manifest.json")


if __name__ == "__main__":
    main()
