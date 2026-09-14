#!/usr/bin/env python3
"""
Nghiệm thu HOẠT CẢNH (gấp giấy / mở bung) của Paper Crease bằng browser thật.

CÁCH DÙNG (local):
  1) python -m pip install playwright pillow && python -m playwright install chromium
  2) cd M11-Gap/game && npm run build:standalone
  3) python -m http.server 8080 --directory dist      (giữ chạy)
  4) python ../tools/qa_motion_probe.py http://localhost:8080

ĐẠT khi:
  - VÀO MÀN: >= 4 khung liên tiếp đổi > 2000 px, và tới lúc bấm được (rect ô đáp án ổn định) <= 1.0s
  - CHỌN ĐÁP ÁN: layerScales (window.__pcMotion) đi qua >= 3 mốc khác nhau và ảnh đổi ở >= 3 khung
  - __pcMotion tồn tại (chỉ kênh dev/standalone)
"""
import sys, time, json
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"

def diff(f1, f2):
    a, b = Image.open(f1).convert("RGB"), Image.open(f2).convert("RGB")
    return sum(ImageChops.difference(a, b).convert("L").point(lambda v: 1 if v > 8 else 0).getdata())

def main():
    with sync_playwright() as p:
        br = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])
        pg = br.new_page(viewport={"width": 640, "height": 900})
        pg.goto(URL, wait_until="load"); time.sleep(3)
        print("__pcMotion:", pg.evaluate("()=>typeof window.__pcMotion"))
        r = pg.evaluate("()=>window.__pcTestids&&window.__pcTestids['testid-title-play']||null")
        if not r: print("KHÔNG thấy nút PLAY"); return
        pg.mouse.click(r["x"]+r["w"]/2, r["y"]+r["h"]/2)
        prev = None; in_frames = 0; t0 = time.time(); ready_at = None
        for i in range(15):
            time.sleep(0.2); f = f"/tmp/qa-in-{i}.png"; pg.screenshot(path=f)
            d = diff(prev, f) if prev else -1; prev = f
            if d > 2000: in_frames += 1
            st = pg.evaluate("()=>({ph:window.__pcMotion&&window.__pcMotion.phase, f:+(window.__pcMotion&&window.__pcMotion.foldProgress||0).toFixed(2)})")
            o = pg.evaluate("()=>window.__pcTestids&&window.__pcTestids['testid-option-0']||null")
            if o and ready_at is None: ready_at = time.time()-t0
            print(f"  vào màn t={0.2*(i+1):.1f}s px_đổi={d:6} {st} ócó_ô_đáp_án={bool(o)}")
        print(f"  => khung có chuyển động: {in_frames} (cần >=4) · bấm được sau {ready_at and round(ready_at,2)}s (cần <=1.0)")
        o = pg.evaluate("()=>window.__pcTestids&&window.__pcTestids['testid-option-0']||null")
        if o:
            pg.mouse.click(o["x"]+o["w"]/2, o["y"]+o["h"]/2)
            prev = None; ans_frames = 0; scales = set()
            for i in range(12):
                time.sleep(0.1); f = f"/tmp/qa-ans-{i}.png"; pg.screenshot(path=f)
                d = diff(prev, f) if prev else -1; prev = f
                if d > 2000: ans_frames += 1
                m = pg.evaluate("()=>({ls:(window.__pcMotion&&window.__pcMotion.layerScales||[]).map(v=>+v.toFixed(2)), ph:window.__pcMotion&&window.__pcMotion.phase})")
                scales.add(tuple(m["ls"]))
                print(f"  trả lời t={0.1*(i+1):.1f}s px_đổi={d:6} {m}")
            print(f"  => khung chuyển động khi trả lời: {ans_frames} (cần >=3) · số mốc layerScales khác nhau: {len(scales)} (cần >=3)")
        br.close()

if __name__ == "__main__":
    main()
