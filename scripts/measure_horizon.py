#!/usr/bin/env python3
"""T6 — detect vị trí horizon trên sunset_bg (hàng có độ rơi luminance lớn nhất)."""
from PIL import Image

img = Image.open("M7-SkipKing/game/public/assets/sunset_bg.png").convert("RGB")
W, H = img.size
px = img.load()
rows = []
for y in range(H):
    s = 0
    for x in range(0, W, 4):
        r, g, b = px[x, y]
        s += 0.2126 * r + 0.7152 * g + 0.0722 * b
    rows.append(s / (W // 4))
best_y, best_drop = 0, 0.0
for y in range(200, 1000):
    drop = rows[y] - rows[y + 3]
    if drop > best_drop:
        best_drop, best_y = drop, y
print(f"horizon detect: y={best_y} ({best_y / H * 100:.1f}% chieu cao), drop={best_drop:.1f}")


def lum(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


bright = max(((x, y) for y in range(600, 700) for x in range(0, W, 2)), key=lambda p: lum(px[p]))
print(f"brightest pixel y600-700: {bright} RGB{px[bright]}")
