#!/usr/bin/env python3
"""T6 U4 — đo contrast WCAG của chữ trắng HUD trên nền sunset_bg THẬT (AA ≥4.5:1).

Vùng đo = các nơi HUD/banner/end-card sẽ đặt (theo CONTRACT mục 4 + 3):
  A sky_top   (y 20–100):  hàng HUD trên cùng (score/skips/best)
  B sky_upper (y 100–220): HUD phụ / aim gauge hint
  C mid       (y 610–690): combo banner giữa màn
  D water_low (y 900–1100): end-card / THROW AGAIN
Với mỗi vùng: worst-case = pixel SÁNG NHẤT vùng đó (nền sáng nhất против chữ trắng).
"""
from PIL import Image

IMG = Image.open("M7-SkipKing/game/public/assets/sunset_bg.png").convert("RGB")
W, H = IMG.size
assert (W, H) == (720, 1280), f"bg size {IMG.size} != 720x1280"

def lum(c):
    def lin(u):
        u /= 255.0
        return u / 12.92 if u <= 0.03928 else ((u + 0.055) / 1.055) ** 2.4
    r, g, b = c
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def contrast(c1, c2):
    l1, l2 = lum(c1), lum(c2)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)

WHITE = (255, 255, 255)
REGIONS = [
    ("A sky_top  y20-100   (HUD hàng trên: score/skips/best)", 20, 100),
    ("B sky_upper y100-220 (HUD phụ)", 100, 220),
    ("C mid y610-690       (combo banner)", 610, 690),
    ("D water_low y900-1100(end-card/THROW AGAIN)", 900, 1100),
]

px = IMG.load()
print(f"bg 720x1280 — đo contrast chữ trắng trên nền thật (worst-case pixel sáng nhất / vùng)")
all_pass = True
for name, y0, y1 in REGIONS:
    brightest = max((px[x, y] for y in range(y0, y1) for x in range(0, W, 2)), key=lum)
    avg_r = sum(px[x, y][0] for y in range(y0, y1, 2) for x in range(0, W, 8))
    avg_g = sum(px[x, y][1] for y in range(y0, y1, 2) for x in range(0, W, 8))
    avg_b = sum(px[x, y][2] for y in range(y0, y1, 2) for x in range(0, W, 8))
    n = len(range(y0, y1, 2)) * len(range(0, W, 8))
    avg = (avg_r // n, avg_g // n, avg_b // n)
    c_avg = contrast(WHITE, avg)
    c_worst = contrast(WHITE, brightest)
    ok = "PASS" if c_worst >= 4.5 else "FAIL"
    if c_worst < 4.5:
        all_pass = False
    print(f"  {name}: avg RGB{avg} → {c_avg:.1f}:1 | worst RGB{brightest} → {c_worst:.1f}:1 [{ok}]")
print("U4 CONTRAST:", "PASS (>=4.5:1 mọi vùng HUD)" if all_pass else "FAIL")
