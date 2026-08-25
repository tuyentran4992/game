#!/usr/bin/env python3
"""gen_assets_m2_v2 — PRODUCTION-GRADE image assets for M2 "Neon Sort: Galaxy Pour".

v2 upgrade over scripts/gen_assets_m2.py. Same AI-Box WAN call pattern
(`POST /images/generations`, model `wan2.7-image-pro`, key from
/data/code/ai-photo-studio/.env -> fallback /data/scripts/aibox_key.txt) but:

  * ART-DIRECTED prompts (the old generic ones are why the game looked amateur).
    Every prompt is built from a shared NEON-GALAXY style spine locked to
    DESIGN-SPEC.md tokens (bg #0B0B1E -> #16123B -> #2A1668, primary #B967FF,
    accent #00E5FF) + a hard negative block (no text/logo/watermark/photo).
  * 4 assets: bg_space, tube_base, liquid_neon (NEW), ui_chrome (NEW).
  * SMART matting instead of the naive global white threshold:
      - cut_white_flood(): removes ONLY white connected to the image border
        (border flood fill) -> white specular highlights INSIDE the glass
        survive; plus a feathered alpha band = no jaggy halo.
      - alpha_from_luma(): turns a glow-on-black render into a TINTABLE sprite
        (alpha = luminance, RGB pushed to near-white) so liquid_neon can be
        setTint()-ed to any nz.liquid.* color at runtime.
      - rm_white(): the legacy v1 helper, KEPT for back-compat / fallback.
  * Per-asset KB budget: optimize -> adaptive quantize -> downscale loop, so bg
    stays <= ~800KB and sprites stay tiny.
  * Writes every PNG to BOTH assets/raw/ and game/public/raw/.

Run:
  python3 scripts/gen_assets_m2_v2.py                 # all 4
  python3 scripts/gen_assets_m2_v2.py bg_space        # only named keys
  python3 scripts/gen_assets_m2_v2.py --dry-run       # print prompts, no API
  python3 scripts/gen_assets_m2_v2.py --reprocess     # re-run post-processing from
                                                      # assets/.gen_cache, no API cost
"""
import io
import json
import sys
import time
import urllib.request
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

# ------------------------------------------------------------------ key + base --
ENV_PATH = "/data/code/ai-photo-studio/.env"
FALLBACK_KEY_PATH = "/data/scripts/aibox_key.txt"
BASE_DEFAULT = "https://api.ai-box.vn/v1"
MODEL = "wan2.7-image-pro"


def load_key():
    """AI-Box key: .env (the WAN key) first, fallback to the plain-text key file."""
    key, base = None, BASE_DEFAULT
    try:
        for line in open(ENV_PATH):
            line = line.strip()
            if line.startswith("AI_BOX_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("AI_BOX_BASE_URL="):
                v = line.split("=", 1)[1].strip().strip('"').strip("'")
                if v:
                    base = v
    except OSError as e:
        print(f"[key] {ENV_PATH} unreadable ({e})")
    if not key:
        try:
            key = open(FALLBACK_KEY_PATH).read().strip()
            print(f"[key] fallback -> {FALLBACK_KEY_PATH}")
        except OSError as e:
            print(f"FATAL: no AI_BOX_API_KEY in {ENV_PATH} nor {FALLBACK_KEY_PATH} ({e})")
            sys.exit(1)
    return key, base


KEY, BASE = load_key()

# ------------------------------------------------------------------ out dirs ----
RAW = Path("/data/youtube-playables/M2-Color-Sort/assets/raw")
PUB = Path("/data/youtube-playables/M2-Color-Sort/game/public/raw")
# Cache of the UNPROCESSED model output. Generation costs money and the API is
# slow, so every download is kept here; a later post-processing bug can then be
# fixed and re-applied for free (`--reprocess`) instead of re-generating.
CACHE = Path("/data/youtube-playables/M2-Color-Sort/assets/.gen_cache")
for _d in (RAW, PUB, CACHE):
    _d.mkdir(parents=True, exist_ok=True)

try:
    LANCZOS = Image.Resampling.LANCZOS
except AttributeError:  # Pillow < 9.1
    LANCZOS = Image.LANCZOS

# ============================================================== PROMPT SPINE ====
# DESIGN-SPEC.md tokens - single source of truth for every prompt below.
TOK_BG = "deep space navy #0B0B1E to dark violet #16123B to magenta-violet #2A1668"
TOK_PRIMARY = "neon violet #B967FF"
TOK_ACCENT = "neon cyan #00E5FF"

# Quality spine appended to EVERY prompt (requested keywords + art-direction).
QUALITY = (
    "premium, high polish, clean flat 2D mobile game asset, consistent neon-galaxy art style, "
    "next-gen casual game art, art-directed by a senior game art director, crisp clean edges, "
    "smooth banding-free gradients, tasteful restrained glow (bloom not blown out), "
    "cohesive limited palette, no text, no logo, no watermark"
)

# Hard negative block (WAN respects plain-language prohibitions best).
NEGATIVE = (
    "NO text, NO words, NO letters, NO numbers, NO labels, NO logo, NO watermark, NO signature, "
    "NO UI frame, NO border frame, NO grid, NO photo, NO photorealistic render, NO 3D CGI clay look, "
    "NO people, NO hands, NO characters, NO clutter, NO busy noise, NO jpeg artifacts, "
    "NO oversaturated rainbow mess, NO duplicated objects, NO cropped subject"
)

PROMPTS = {
    # ---------------------------------------------------------------- 1. bg -----
    "bg_space": (
        "Atmospheric deep-space neon galaxy background for a premium mobile puzzle game, "
        f"vertical gradient sky from {TOK_BG}, "
        "layered volumetric nebula clouds with real depth: a soft magenta-violet nebula bank in the upper third, "
        f"a cooler {TOK_ACCENT} wisp drifting from the left edge, dark dust lanes silhouetted in front, "
        "delicate fine starfield of tiny white and pale-cyan pinpoint stars concentrated in the top 40 percent, "
        "a few subtle 4-point star sparkles, "
        "a huge dark planet arc rising along the very bottom edge with a thin luminous violet atmosphere rim-glow, "
        "IMPORTANT COMPOSITION: the whole center of the frame is deliberate calm negative space, "
        "almost pure dark navy, unlit, empty, no nebula detail and no bright stars in the middle, "
        f"all detail pushed to the outer edges and corners, gentle vignette, {TOK_PRIMARY} accent light only at the rim, "
        "cinematic depth, soft focus background layers, elegant and moody rather than flashy, "
        "hand-painted studio-quality game background, "
        f"{QUALITY}. {NEGATIVE}, no galaxy in the middle, no bright object in the center, no stock wallpaper look."
    ),
    # -------------------------------------------------------------- 2. tube -----
    "tube_base": (
        "A single premium empty glass test tube for a color-sort puzzle game, standing perfectly upright and centered, "
        "straight vertical cylindrical body with a smoothly ROUNDED U-shaped bottom and a slightly flared open top rim, "
        "crystal-clear high-purity glass: visible glass thickness on the walls, gentle refraction and caustic bend, "
        "two slim vertical specular highlight streaks on the left wall, one faint reflection line on the right, "
        "elegant inner depth with a soft shadow inside the concave bottom, completely EMPTY interior, no liquid, "
        f"a very thin subtle neon rim-light tracing the glass silhouette: cool {TOK_ACCENT} along the left contour "
        f"fading into {TOK_PRIMARY} along the right contour, restrained and classy, only a whisper of glow, "
        "a soft elliptical contact base under the tube, "
        "product-shot clarity, sharp clean vector-like silhouette, high-end game asset, "
        "isolated on a plain pure flat white background, fully surrounded by white margin, "
        f"{QUALITY}. {NEGATIVE}, no liquid, no bubbles, no cork, no stopper, no rack, no stand, no shadow on the "
        "background, no gray backdrop, no gradient background, not tilted, no multiple tubes."
    ),
    # ------------------------------------------------------------ 3. liquid -----
    "liquid_neon": (
        "A single glossy neon liquid segment sprite for a water-sort puzzle game, "
        "one horizontal rounded blob of thick luminous liquid, wide capsule shape with softly rounded corners, "
        "the top surface is a smooth curved MENISCUS with a bright crisp white specular highlight streak running along it, "
        "a second softer sheen lower down, slightly darker denser base so it reads as volume, "
        "the liquid GLOWS from inside and is wrapped in a soft wide halo of light bleeding outward, "
        "IMPORTANT: render it in pure bright WHITE and light silver-gray monochrome only, luminous white-hot liquid, "
        "absolutely no color hue, neutral grayscale so it can be tinted later, "
        "on a solid pure black background so the glow reads cleanly, high contrast, "
        "smooth glossy liquid material, clean simple readable shape, single object, centered, "
        f"{QUALITY}. {NEGATIVE}, no color, no rainbow, no colored tint, no tube, no glass, no container, "
        "no splash droplets flying, no foam, no bubbles, no background stars, no gradient background."
    ),
    # ----------------------------------------------------------- 4. ui chrome ---
    "ui_chrome": (
        "A single empty dark glass UI panel backdrop for a premium neon sci-fi mobile game, "
        "horizontal rounded rectangle with generous evenly rounded corners, "
        "fill is deep translucent smoky navy-violet frosted glass (#16123B) with a faint vertical sheen and a "
        "subtle darker bottom, glassmorphism blur look, "
        f"outlined by ONE thin crisp continuous neon border line that gradates from {TOK_PRIMARY} at the top-left "
        f"to {TOK_ACCENT} at the bottom-right, the border emits a soft narrow outer glow and a gentle inner bloom, "
        "two tiny neon corner accent ticks, a very faint highlight along the top inner edge like polished glass, "
        "perfectly empty inside, nothing inside the panel, flat straight-on front view, "
        "refined minimal high-end UI kit quality, "
        "isolated on a plain pure flat white background with clean white margin all around, "
        f"{QUALITY}. {NEGATIVE}, no content inside, no icons, no buttons inside, no screws, no bolts, no metal frame, "
        "no drop shadow on the background, no gray backdrop, no double frame, no rectangles stacked."
    ),
}

# key -> (request_size, post-processing recipe)
#   matte: "white" = border-flood white cut | "luma" = glow-on-black -> tintable | None
#   target: longer-side px after crop (None = keep) ; budget_kb: hard file budget
SPECS = {
    "bg_space":    dict(size=(1024, 1536), matte=None,    target=None, budget_kb=800, calm_center=True),
    "tube_base":   dict(size=(1024, 1024), matte="white",  target=640, budget_kb=150),
    "liquid_neon": dict(size=(1024, 512),  matte="luma",   target=384, budget_kb=60),
    "ui_chrome":   dict(size=(1024, 512),  matte="white",  target=512, budget_kb=120),
}

# Fallback request sizes if the API rejects the preferred one (never waste a run).
SIZE_FALLBACKS = {
    (1024, 1536): [(1024, 1536), (896, 1344), (1024, 1024)],
    (1024, 512): [(1024, 512), (1024, 576), (1024, 1024)],
    (1024, 1024): [(1024, 1024)],
}

WHITE_THRESH = 238        # min-channel >= this counts as "white background"
SOFT_THRESH = 205         # feather band lower bound


# ============================================================ MATTE HELPERS =====
def rm_white(img, thresh=240):
    """LEGACY v1 helper (kept): global near-white -> alpha 0. Blunt; punches holes
    in white specular highlights. Retained as a fallback for the tube."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > thresh and g > thresh and b > thresh:
                px[x, y] = (r, g, b, 0)
    return img


def cut_white_flood(img, thresh=WHITE_THRESH, soft=SOFT_THRESH, feather=2):
    """Remove the white BACKDROP only: 4-connected flood fill of near-white pixels
    starting from the image border. Interior white (glass highlights, meniscus
    sheen) is preserved. Then feather `feather` px of the boundary using
    "whiteness" as partial alpha so the cutout has no stair-step halo."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    minch = bytearray(w * h)              # per-pixel min(r,g,b)
    for y in range(h):
        row = y * w
        for x in range(w):
            r, g, b, _ = px[x, y]
            m = r if r < g else g
            if b < m:
                m = b
            minch[row + x] = m

    bg = bytearray(w * h)                 # 1 = background
    dq = deque()
    for x in range(w):                    # seed: top+bottom rows
        for y in (0, h - 1):
            i = y * w + x
            if minch[i] >= thresh and not bg[i]:
                bg[i] = 1
                dq.append((x, y))
    for y in range(h):                    # seed: left+right cols
        for x in (0, w - 1):
            i = y * w + x
            if minch[i] >= thresh and not bg[i]:
                bg[i] = 1
                dq.append((x, y))

    while dq:
        x, y = dq.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if not bg[j] and minch[j] >= thresh:
                    bg[j] = 1
                    dq.append((nx, ny))

    # Feather: pixels kept but adjacent (within `feather`) to background AND light
    # -> partial alpha scaled by how white they are.
    near = bytearray(w * h)
    frontier = [(i % w, i // w) for i in range(w * h) if bg[i]]
    for _ in range(max(0, feather)):
        nxt = []
        for x, y in frontier:
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if not bg[j] and not near[j]:
                        near[j] = 1
                        nxt.append((nx, ny))
        frontier = nxt

    span = max(1, thresh - soft)
    for y in range(h):
        row = y * w
        for x in range(w):
            i = row + x
            r, g, b, a = px[x, y]
            if bg[i]:
                px[x, y] = (r, g, b, 0)
            elif near[i]:
                m = minch[i]
                if m > soft:
                    k = 1.0 - (m - soft) / span         # white-ish -> more transparent
                    px[x, y] = (r, g, b, int(max(0.0, min(1.0, k)) * a))
    return img


def alpha_from_luma(img, gamma=0.85, whiten=0.72, floor=6):
    """Glow-on-BLACK render -> tintable RGBA sprite.
    alpha = luminance (gamma-shaped) so the soft halo becomes a soft alpha halo;
    RGB is desaturated and lifted toward white so Phaser setTint(color) yields a
    faithful neon color at runtime."""
    img = img.convert("RGB")
    w, h = img.size
    src = img.load()
    out = Image.new("RGBA", (w, h))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            lum = (r * 299 + g * 587 + b * 114) // 1000
            a = 0 if lum <= floor else int(255.0 * (lum / 255.0) ** gamma)
            # desaturate then lift toward white -> neutral tintable base
            nr = int(lum + (r - lum) * (1.0 - whiten))
            ng = int(lum + (g - lum) * (1.0 - whiten))
            nb = int(lum + (b - lum) * (1.0 - whiten))
            boost = 1.0 + 0.55 * (1.0 - lum / 255.0)      # keep body bright when tinted
            nr = min(255, int(nr * boost) if a else 0)
            ng = min(255, int(ng * boost) if a else 0)
            nb = min(255, int(nb * boost) if a else 0)
            dst[x, y] = (nr, ng, nb, a)
    return out


def calm_center(img, strength=0.14, radius=0.62):
    """Guarantee DESIGN-SPEC's 'calm dark center' (HUD/board legibility): multiply a
    very smooth elliptical falloff over the middle of the background so the UI area
    stays quiet even if the model put detail there. Mild by design (<=14%)."""
    img = img.convert("RGB")
    w, h = img.size
    px = img.load()
    cx, cy = w / 2.0, h / 2.0
    rx, ry = w * radius, h * radius
    for y in range(h):
        dy = (y - cy) / ry
        dy2 = dy * dy
        for x in range(w):
            dx = (x - cx) / rx
            d = (dx * dx + dy2) ** 0.5
            if d >= 1.0:
                continue
            t = 1.0 - d
            s = t * t * (3.0 - 2.0 * t)                  # smoothstep
            f = 1.0 - strength * s
            r, g, b = px[x, y]
            px[x, y] = (int(r * f), int(g * f), int(b * f))
    return img


# ============================================================ SAVE / BUDGET =====
def _write(img, name, quantize=None, resize=None):
    """Serialize once to bytes so we can measure before committing to disk."""
    im = img
    if resize:
        im = im.resize(resize, LANCZOS)
    if quantize:
        if im.mode == "RGBA":
            # Pillow: only FASTOCTREE (2) / libimagequant (3) support RGBA. MEDIANCUT
            # raises ValueError, and libimagequant is not compiled in here
            # (features.check('libimagequant') == False) -> FASTOCTREE is the only option.
            im = im.quantize(colors=quantize, method=Image.Quantize.FASTOCTREE)
        else:
            im = im.convert("RGB").convert(
                "P", palette=Image.Palette.ADAPTIVE, colors=quantize, dither=Image.Dither.FLOYDSTEINBERG
            )
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return buf.getvalue(), im


def save_budget(img, name, budget_kb):
    """optimize -> (mode-aware) quantize / downscale, until <= budget_kb.

    RGBA sprites: prefer DOWNSCALE before palette reduction — FASTOCTREE on RGBA
    tends to posterize the soft alpha halo (visible banding on glow edges),
    whereas LANCZOS downscale keeps the gradient smooth.
    Opaque RGB backgrounds: prefer palette reduction (256-color PNG of a smooth
    nebula is visually lossless and roughly halves the file)."""
    w, h = img.size
    plan = [dict(quantize=None, resize=None)]
    if img.mode == "RGBA":
        for scale in (0.85, 0.72, 0.6, 0.5):
            rs = (max(1, int(w * scale)), max(1, int(h * scale)))
            plan.append(dict(quantize=None, resize=rs))
        for scale in (1.0, 0.8, 0.65):
            rs = None if scale == 1.0 else (max(1, int(w * scale)), max(1, int(h * scale)))
            for q in (256, 192, 128):
                plan.append(dict(quantize=q, resize=rs))
    else:
        for q in (256, 192, 128, 96):
            plan.append(dict(quantize=q, resize=None))
        for scale in (0.85, 0.72, 0.6):
            rs = (max(1, int(w * scale)), max(1, int(h * scale)))
            plan.append(dict(quantize=256, resize=rs))
            plan.append(dict(quantize=128, resize=rs))

    best = None
    for step in plan:
        data, im = _write(img, name, **step)
        kb = len(data) / 1024
        if best is None or kb < best[1]:
            best = (data, kb, im, step)
        if kb <= budget_kb:
            best = (data, kb, im, step)
            break
    data, kb, im, step = best
    for d in (RAW, PUB):
        (d / f"{name}.png").write_bytes(data)
    tag = f"q={step['quantize']}" if step["quantize"] else "rgb"
    if step["resize"]:
        tag += f" resized={step['resize'][0]}x{step['resize'][1]}"
    flag = "OK" if kb <= budget_kb else f"WARN >budget {budget_kb}KB"
    print(f"  saved {name}.png  {im.size[0]}x{im.size[1]}  {kb:.1f}KB  [{tag}]  {flag}")
    return kb


# ================================================================== API CALL ====
def api_image(prompt, size, tries=4):
    """POST /images/generations -> data[0].url, with backoff + size fallbacks."""
    for cand in SIZE_FALLBACKS.get(size, [size]):
        body = {"model": MODEL, "prompt": prompt, "size": f"{cand[0]}x{cand[1]}"}
        for att in range(tries):
            try:
                req = urllib.request.Request(
                    BASE + "/images/generations",
                    data=json.dumps(body).encode(),
                    headers={"Content-Type": "application/json",
                             "Authorization": f"Bearer {KEY}"},
                )
                with urllib.request.urlopen(req, timeout=240) as r:
                    d = json.loads(r.read())
                return d["data"][0]["url"], cand
            except Exception as e:
                msg = str(e)
                if hasattr(e, "read"):
                    try:
                        msg += " | " + e.read().decode()[:300]
                    except Exception:
                        pass
                print(f"    attempt {att+1}/{tries} @{cand[0]}x{cand[1]} fail: {msg[:300]}")
                bad_size = "size" in msg.lower() or "400" in msg
                if bad_size and att == 0:
                    break                                # try next candidate size
                time.sleep(8 * (att + 1))                # backoff 8/16/24s
    return None, None


def fetch(url, tries=3):
    for att in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=240) as r:
                return Image.open(io.BytesIO(r.read()))
        except Exception as e:
            print(f"    download attempt {att+1}/{tries} fail: {e}")
            time.sleep(6 * (att + 1))
    return None


def crop_alpha(img):
    bbox = img.getchannel("A").getbbox()
    return img.crop(bbox) if bbox else img


def resize_long(img, target):
    if not target:
        return img
    w, h = img.size
    m = max(w, h) or 1
    if m == target:
        return img
    return img.resize((max(1, round(w * target / m)), max(1, round(h * target / m))), LANCZOS)


# ==================================================================== BUILD =====
def postprocess(img, spec):
    """Apply the matte / tint / vignette recipe. Pure function of (image, spec) so
    it can be re-run from cache for free."""
    matte = spec["matte"]
    if matte == "white":
        img = cut_white_flood(img)
        img = crop_alpha(img)
        img = resize_long(img, spec["target"])
    elif matte == "luma":
        img = alpha_from_luma(img)
        img = crop_alpha(img)
        img = resize_long(img, spec["target"])
        # tidy the halo edge a touch after downscale
        a = img.getchannel("A").filter(ImageFilter.SMOOTH)
        img.putalpha(a)
    else:
        img = img.convert("RGB")
        if spec.get("calm_center"):
            img = calm_center(img)
        img = resize_long(img, spec["target"])
    return img


def build(name, dry=False, reprocess=False):
    spec = SPECS[name]
    prompt = PROMPTS[name]
    cache_file = CACHE / f"{name}.src.png"
    print(f"[gen] {name}  req={spec['size'][0]}x{spec['size'][1]}  matte={spec['matte']}")
    if dry:
        print("  PROMPT:", prompt, "\n")
        return None

    if reprocess and cache_file.exists():
        img = Image.open(cache_file)
        print(f"  reprocess from cache {cache_file.name} {img.size[0]}x{img.size[1]} (no API call)")
    else:
        url, used = api_image(prompt, spec["size"])
        if not url:
            print(f"  FAIL {name}: no image url after retries")
            return None
        time.sleep(2)
        img = fetch(url)
        if img is None:
            print(f"  FAIL {name}: download failed")
            return None
        print(f"  got {img.size[0]}x{img.size[1]} (requested {used[0]}x{used[1]})")
        try:                                   # cache BEFORE post-processing
            img.save(cache_file)
        except Exception as e:
            print(f"  (cache write failed, non-fatal: {e})")

    img = postprocess(img, spec)
    return save_budget(img, name, spec["budget_kb"])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    reprocess = "--reprocess" in sys.argv
    keys = [k for k in SPECS if not args or k in args]
    unknown = [a for a in args if a not in SPECS]
    if unknown:
        print(f"unknown asset key(s): {unknown} ; valid: {list(SPECS)}")
        sys.exit(2)

    results = {}
    for k in keys:
        results[k] = build(k, dry=dry, reprocess=reprocess)
    if dry:
        return

    print("\n==================== VERIFY ====================")
    ok = 0
    for k in keys:
        line = [f"{k:12s}"]
        good = True
        for label, d in (("raw", RAW), ("pub", PUB)):
            p = d / f"{k}.png"
            if p.exists():
                line.append(f"{label}={p.stat().st_size/1024:7.1f}KB")
            else:
                line.append(f"{label}=MISSING")
                good = False
        budget = SPECS[k]["budget_kb"]
        if good:
            kb = (RAW / f"{k}.png").stat().st_size / 1024
            line.append("<=budget" if kb <= budget else f">BUDGET({budget}KB)")
            ok += 1
        print("  " + "  ".join(line))
    print(f"DONE {ok}/{len(keys)} asset(s) present in BOTH dirs")


if __name__ == "__main__":
    main()
