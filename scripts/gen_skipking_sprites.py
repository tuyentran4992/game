#!/usr/bin/env python3
"""T6 SkipKing — gen 3 sprite (stone/splash/ripple) + 1 bg sunset 720x1280 qua AI-Box WAN 2.7.

Pattern gốc: scripts/gen_sprites.py (M1) — key AI_BOX_API_KEY trong /data/code/ai-photo-studio/.env,
base api.ai-box.vn/v1, model wan2.7-image-pro. 3 sprite: khử nền trắng → transparent PNG.
bg: giữ nguyên (full-bleed), quantize 256 màu dither để đạt budget <512KB.
Output: M7-SkipKing/game/public/assets/ (chạy từ repo/worktree root).
"""
import io
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

# ---- load AI-Box key từ env ai-photo-studio (pattern gen_sprites.py) ----
env_path = "/data/code/ai-photo-studio/.env"
key = None
base = "https://api.ai-box.vn/v1"
for line in open(env_path):
    line = line.strip()
    if line.startswith("AI_BOX_API_KEY="):
        key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if line.startswith("AI_BOX_BASE_URL="):
        v = line.split("=", 1)[1].strip()
        if v:
            base = v
if not key:
    print("FATAL: AI_BOX_API_KEY not found")
    sys.exit(1)

OUT = Path("M7-SkipKing/game/public/assets")
OUT.mkdir(parents=True, exist_ok=True)

STYLE = ("flat 2D casual mobile game sprite, bold clean colors, soft flat shading, "
         "isolated on plain pure white background, NO text NO watermark no logo.")

SPRITES = {
    # stone ~256px — đá dẹt oval dùng skip nước, mặt nhìn nghiêng 3/4, outline dày đậm hơn fill
    "stone": ("Smooth flat gray oval skipping stone, rounded disc pebble seen from a 3/4 tilted view, "
              "slightly darker gray top face, thick dark gray outline much bolder than the fill, " + STYLE),
    # splash — vệt nước tung tóe nhỏ, tông xanh dương dễ tách khỏi nền trắng
    "splash": ("Small water splash spray burst, bright cyan-blue droplets and white foam crown, "
               "dynamic upward spray, thin blue outline, " + STYLE),
    # ripple — vòng ellipse mảnh trắng-đục, viền xanh xám mảnh để không bị ăn mất khi khử nền trắng
    "ripple": ("Thin concentric elliptical water ripple rings seen from above, pale ice-white rings "
               "with thin gray-blue outline, wide flat ellipse shape, " + STYLE),
}

BG_PROMPT = ("Vertical portrait mobile game background 720x1280, calm wide sea at sunset viewed straight on. "
             "Top 45 percent of the image: sky gradient from deep purple at the top edge to warm glowing orange "
             "at the horizon, small glowing sun sitting exactly on the horizon line. "
             "Bottom 55 percent: very dark teal-navy water, uniformly dark, flat and matte, only very subtle dim "
             "wave texture, NO bright sun reflection, NO bright or glowing band below the horizon, no bright spots "
             "in the water at all, the water must stay dark enough for white UI text to be clearly readable. "
             "One sharp clean horizontal horizon line at 45 percent of the image height. "
             "Smooth flat 2D casual mobile game art style, clean gradients, "
             "no boats no people no birds, NO text NO watermark no logo.")


def api_gen(prompt: str, size: str) -> Image.Image | None:
    """Gọi AI-Box images/generations → trả PIL Image (RGBA). 3 attempt như recipe gốc."""
    body = {"model": "wan2.7-image-pro", "prompt": prompt, "size": size}
    req = urllib.request.Request(
        base + "/images/generations",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    )
    url = None
    for att in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
            url = d["data"][0]["url"]
            break
        except Exception as e:  # noqa: BLE001 — recipe gốc dùng Exception rộng
            print(f"  attempt {att + 1} fail: {e}")
            time.sleep(8)
    if not url:
        return None
    time.sleep(3)
    with urllib.request.urlopen(url, timeout=120) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


def kill_white(img: Image.Image) -> Image.Image:
    """Khử nền trắng → transparent (threshold + feather nhẹ ở mép 224..243)."""
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 243 and g > 243 and b > 243:
                px[x, y] = (r, g, b, 0)
            elif r > 224 and g > 224 and b > 224 and max(r, g, b) - min(r, g, b) < 18:
                # pixel gần trắng (mép anti-alias) → alpha tỉ lệ nghịch độ trắng
                lum = (r + g + b) // 3
                px[x, y] = (r, g, b, max(0, min(255, (243 - lum) * 255 // 19)))
    return img


def gen_sprite(name: str, prompt: str, out_size: int) -> bool:
    print(f"[gen] {name}.png (1024 → {out_size}px, khử nền trắng)")
    img = api_gen(prompt, "1024x1024")
    if img is None:
        print(f"FATAL: gen {name} failed")
        return False
    img = kill_white(img)
    # crop content rồi contain về out_size (giữ tỉ lệ)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.thumbnail((out_size, out_size), Image.Resampling.LANCZOS)
    out = OUT / f"{name}.png"
    img.save(out, optimize=True)
    print(f"  saved {out} {img.size} {os.path.getsize(out)} bytes")
    return True


def detect_horizon_y(img: Image.Image) -> int:
    """Hàng có độ rơi luminance lớn nhất (trời sáng → nước tối) = horizon."""
    rgb = img.convert("RGB")
    px = rgb.load()
    W, H = rgb.size
    rows = []
    for y in range(H):
        s = 0.0
        for x in range(0, W, 4):
            r, g, b = px[x, y]
            s += 0.2126 * r + 0.7152 * g + 0.0722 * b
        rows.append(s / (W // 4))
    best_y, best_drop = 0, 0.0
    for y in range(H // 6, H * 5 // 6):
        if y + 3 >= H:
            break
        drop = rows[y] - rows[y + 3]
        if drop > best_drop:
            best_drop, best_y = drop, y
    return best_y


def fix_horizon_45(img: Image.Image) -> Image.Image:
    """Đưa horizon về đúng 45% chiều cao: crop đỉnh (bớt trời) → resize 720x1280.

    Nước giữ nguyên pixel, tỉ lệ nước tăng: water_px / (H - t) = 0.55 → t = H - water_px/0.55.
    Deterministic — không regen thêm lần nào (chống roulette WAN vẽ horizon lệch).
    """
    H = img.height
    hy = detect_horizon_y(img)
    pct = hy / H * 100
    if 44.0 <= pct <= 46.0:
        print(f"  horizon {pct:.1f}% — trong biên 44–46%, giữ nguyên")
        return img
    water_px = H - hy
    t = round(H - water_px / 0.55)
    if t <= 0 or t >= H // 2:
        print(f"  horizon {pct:.1f}% — ngoài khả năng fix bằng crop đỉnh (t={t}), giữ nguyên")
        return img
    print(f"  horizon {pct:.1f}% → crop đỉnh {t}px + resize về {img.width}x{H} (horizon ~45%)")
    out = img.crop((0, t, img.width, H))
    return out.resize((img.width, H), Image.Resampling.LANCZOS)


def gen_bg() -> bool:
    print("[gen] sunset_bg.png (720x1280 portrait)")
    img = None
    for size in ("720x1280", "768x1344", "832x1216"):
        img = api_gen(BG_PROMPT, size)
        if img is not None:
            if img.size != (720, 1280):
                # cover-crop về đúng 720x1280
                src_w, src_h = img.size
                scale = max(720 / src_w, 1280 / src_h)
                img = img.resize((round(src_w * scale), round(src_h * scale)), Image.Resampling.LANCZOS)
                left = (img.width - 720) // 2
                top = (img.height - 1280) // 2
                img = img.crop((left, top, left + 720, top + 1280))
            break
    if img is None:
        print("FATAL: gen sunset_bg failed")
        return False
    img = img.convert("RGB")
    img = fix_horizon_45(img)
    out = OUT / "sunset_bg.png"
    # quantize 256 màu (PIL cap) + dither → PNG nhỏ (budget <512KB/file, zip tổng ≤1.6MB)
    q = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    q.save(out, optimize=True)
    print(f"  saved {out} {q.size} {os.path.getsize(out)} bytes")
    return True


if __name__ == "__main__":
    ok = True
    if "--bg-only" in sys.argv:
        ok = gen_bg()
    else:
        for name, prompt in SPRITES.items():
            ok = gen_sprite(name, prompt, 256) and ok
        ok = gen_bg() and ok
    print("DONE" if ok else "FAILED")
    sys.exit(0 if ok else 1)
