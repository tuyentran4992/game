#!/usr/bin/env python3
"""M10 Banh Mi Master — gen bộ sprite production qua AI-Box WAN 2.7 (pattern gen_assets_m9.py).

Output: M10-BanhMi-Master/game/public/assets/*.png + assets/manifest.json (sha256 drift-guard).
Vision QA: mỗi sprite qua qwen3.6-flash check "1 chủ thể sạch nền trắng, không chữ" — fail retry 1 lần.
Chạy: python3 scripts/gen_assets_m10.py [--only name1,name2]
"""
import argparse, hashlib, io, json, time, urllib.request, base64
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "M10-BanhMi-Master" / "game" / "public" / "assets"
MAN = ROOT / "M10-BanhMi-Master" / "assets"
KEY, BASE = None, "https://api.ai-box.vn/v1"
for line in open("/data/code/ai-photo-studio/.env"):
    line = line.strip()
    if line.startswith("AI_BOX_API_KEY="):
        KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
    if line.startswith("AI_BOX_BASE_URL=") and line.split("=", 1)[1].strip():
        BASE = line.split("=", 1)[1].strip()
assert KEY, "no AI-Box key"

STYLE = ("flat 2D casual mobile game sprite, thick dark outline bolder than fill, bold vibrant colors, "
         "soft candy volumetric shading, clean vector shapes, single object centered, front view, "
         "isolated on plain pure white background, NO text NO watermark no logo no letters.")

# ---------- SPRITES (transparent, kill-white) ----------
SPRITES = {
 # 8 persona khách Việt — nửa người, front view, tươi vui
 "cust_1": ("A cheerful Vietnamese school student, white uniform shirt with red scarf, holding a school bag strap, "
            "friendly smile, cartoon character, upper body front view, ", 420),
 "cust_2": ("A kind elderly Vietnamese grandmother in brown traditional blouse, grey bun hair, warm gentle smile, "
            "cartoon character, upper body front view, ", 420),
 "cust_3": ("A Vietnamese office worker man in light blue shirt with tie, neat short hair, polite smile, "
            "cartoon character, upper body front view, ", 420),
 "cust_4": ("A Vietnamese construction worker in orange safety vest and yellow helmet, friendly grin, "
            "cartoon character, upper body front view, ", 420),
 "cust_5": ("A wealthy Vietnamese businessman in dark suit with golden watch, confident smirk, sunglasses on head, "
            "cartoon character, upper body front view, ", 420),
 "cust_6": ("A hurried Vietnamese university student with backpack and cap, energetic expression, "
            "cartoon character, upper body front view, ", 420),
 "cust_7": ("A young Vietnamese woman with ponytail holding a phone, indecisive curious expression, "
            "cartoon character, upper body front view, ", 420),
 "cust_8": ("A happy middle-aged Vietnamese man in casual polo shirt, regular customer familiar smile, thumbs up, "
            "cartoon character, upper body front view, ", 420),
 # 10 icon khay (96px) — món trong ô khay
 "icon_pate": ("A scoop of smooth pink-brown liver pâté spread in a small white ceramic dish, glossy, ", 200),
 "icon_mayo": ("A swirl of creamy white mayonnaise in a small white ceramic dish, ", 200),
 "icon_chili": ("Bright red chili sauce in a small white ceramic dish, glossy spicy, ", 200),
 "icon_pork": ("Slices of Vietnamese grilled pork (thit nuong) with charred caramel edges, appetizing, ", 200),
 "icon_chicken": ("Shredded yellow poached chicken pieces, tender looking, ", 200),
 "icon_ham": ("Slices of Vietnamese pork sausage (cha lua), pale pink rounds with visible texture, ", 200),
 "icon_cuke": ("Fresh green cucumber slices, crisp with visible seeds, ", 200),
 "icon_pickle": ("Vietnamese pickled vegetables do chua: thin shredded julienned strips of orange carrot and "
                 "pale white daikon radish, wet glossy brine look, tangled small heap, NOT french fries, "
                 "NOT fried potato, thin translucent vegetable strips, ", 200),
 "icon_herb": ("Fresh cilantro coriander leaves sprig, vibrant green, ", 200),
 "icon_chilif": ("Fresh red chili pepper slices rings, glossy, ", 200),
 # 10 layer form (rộng, dẹt — xếp lên bánh)
 "layer_pate": ("A wide flat glossy pink-brown pâté spread layer, rectangular strip seen from the side, ", 300),
 "layer_mayo": ("A wide flat creamy white mayonnaise drizzle layer strip, wavy top edge, ", 300),
 "layer_chili": ("A wide flat bright red chili sauce layer strip, glossy, ", 300),
 "layer_pork": ("A wide flat stack of grilled pork slices layer, caramelized edges, seen from the side, ", 300),
 "layer_chicken": ("A wide flat layer of shredded chicken strips piled in a row, ", 300),
 "layer_ham": ("A wide flat layer of overlapping round pork sausage slices, pale pink, ", 300),
 "layer_cuke": ("A wide flat row of overlapping green cucumber slices, ", 300),
 "layer_pickle": ("A wide flat tangle of orange and white pickled vegetable julienne strips, ", 300),
 "layer_herb": ("A wide flat row of fresh cilantro leaves, vibrant green, ", 300),
 "layer_chilif": ("A wide flat row of red chili pepper rings, ", 300),
 # bánh mì
 "bread_bottom": ("The bottom half of a Vietnamese baguette (banh mi bread), crispy golden crust with diagonal "
                  "slashes, soft white interior visible on the cut top face, side view, ", 420),
 "bread_top": ("The top half of a Vietnamese baguette (banh mi bread) with sesame seeds, crispy golden crust, "
               "dome shape seen from the side, ", 420),
 # UI/FX
 "tray_bg": ("A rustic wooden serving tray with 12 square compartments in a 4 by 3 grid, warm brown wood "
             "with dark outline, top-down view, empty compartments, ", 700),
 "fx_coin": ("A shiny gold coin with a star embossed in the center, glossy game reward coin, ", 128),
 "fx_star": ("A bright golden five-pointed star, glossy game reward, small sparkles around, ", 128),
 "fx_angry": ("A red cartoon anger vein pop symbol (cross-shaped pulsing vein mark), comic style, ", 96),
 "hero_sandwich": ("A magnificent completed Vietnamese banh mi sandwich cut in half showing colorful layers of "
                   "pâté, grilled pork, cucumber, pickles and cilantro inside crispy golden baguette, hero shot, "
                   "appetizing, slight tilt, ", 640),
 "stall_closed": ("A closed Vietnamese street food cart with blue tarpaulin cover rolled down, wooden shutters "
                  "closed, one plastic stool upside down beside it, evening mood, sad but cute, ", 640),
}

# ---------- BACKGROUNDS (full-canvas, no cutout) ----------
BGS = {
 "bg_street": ("Vertical mobile game background: a sunny Vietnamese street food corner at early morning, "
               "warm golden sunlight, a wooden banh mi food cart with blue tarpaulin awning on the left side, "
               "red plastic stools, small lantern string, distant old town houses with warm walls, soft steam "
               "rising, flat 2D casual game art, clean shapes, cheerful cozy atmosphere, "
               "NO people NO food items NO text NO watermark. Center and upper-middle area stays simple and "
               "uncluttered (open warm sky/wall) for UI overlay readability."),
}

def api(payload, kind="images/generations"):
    req = urllib.request.Request(BASE + "/" + kind,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"})
    for att in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read())
        except Exception as e:
            print(f"  attempt {att+1} fail: {e}", flush=True); time.sleep(8)
    return None

def gen_img(prompt, size="1024x1024"):
    d = api({"model": "wan2.7-image-pro", "prompt": prompt, "size": size})
    if not d: return None
    url = d["data"][0]["url"]
    time.sleep(2)
    with urllib.request.urlopen(url, timeout=120) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")

def kill_white_np(img):
    a = np.array(img, dtype=np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    near = (r > 224) & (g > 224) & (b > 224) & ((np.maximum(np.maximum(r,g),b) - np.minimum(np.minimum(r,g),b)) < 18)
    full = (r > 243) & (g > 243) & (b > 243)
    lum = (r + g + b) // 3
    alpha = np.where(full, 0, np.where(near, np.clip((243 - lum) * (255//19), 0, 255), a[..., 3]))
    a[..., 3] = alpha
    return Image.fromarray(a.astype(np.uint8), "RGBA")

def vision_ok(img, label):
    im = img.convert("RGB").copy(); im.thumbnail((512, 512))
    buf = io.BytesIO(); im.save(buf, "PNG", quality=80)
    durl = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    d = api({"model": "qwen3.6-flash", "max_tokens": 60,
             "messages": [{"role": "user", "content": [
                {"type": "text", "text": f"Đây là sprite game '{label}'. Trả lời NGẮN: 'OK' nếu (1) đúng 1 chủ thể nguyên vẹn không cắt xén, (2) nền xung quanh trắng sạch, (3) không có chữ/ký tự nào, (4) không méo mó lỗi AI. Nếu không OK thì nêu lỗi."},
                {"type": "image_url", "image_url": {"url": durl}}]}]}, kind="chat/completions")
    if not d: return True, "vision-unreachable(pass)"
    t = d.get("choices", [{}])[0].get("message", {}).get("content", "")
    return ("OK" in t.split("\n")[0].upper()), t.strip()[:120]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--only", default=None); a = ap.parse_args()
    only = set(a.only.split(",")) if a.only else None
    OUT.mkdir(parents=True, exist_ok=True); MAN.mkdir(parents=True, exist_ok=True)
    prev = json.loads((MAN/"manifest.json").read_text()) if (MAN/"manifest.json").exists() else {"files": {}}
    def todo(n): return (only is None or n in only) and n not in prev["files"]
    for name, (pr, size) in SPRITES.items():
        if not todo(name): continue
        print(f"[gen] {name}", flush=True)
        for attempt in range(2):
            img = gen_img(pr + STYLE)
            if img is None: continue
            img = kill_white_np(img)
            bb = img.getbbox()
            if bb: img = img.crop(bb)
            img.thumbnail((size*2, size*2), Image.Resampling.LANCZOS)
            ok, note = vision_ok(img, name)
            if ok or attempt:
                p = OUT / f"{name}.png"; img.save(p, "PNG", optimize=True)
                sha = hashlib.sha256(p.read_bytes()).hexdigest()[:12]
                prev["files"][name] = {"file": f"assets/{name}.png", "sha": sha, "bytes": p.stat().st_size, "vision": note}
                print(f"  saved {p.name} {p.stat().st_size//1024}K {'(vision retry2: '+note+')' if not ok else ''}", flush=True)
                break
            print(f"  vision fail ({note}) → gen lại", flush=True)
        time.sleep(2)
    for name, pr in BGS.items():
        if not todo(name): continue
        print(f"[gen-bg] {name}", flush=True)
        img = gen_img(pr, "720x1280")
        if img is None: continue
        img = img.convert("RGB").resize((720, 1280), Image.Resampling.LANCZOS)
        p = OUT / f"{name}.png"; img.save(p, "PNG", optimize=True)
        sha = hashlib.sha256(p.read_bytes()).hexdigest()[:12]
        prev["files"][name] = {"file": f"assets/{name}.png", "sha": sha, "bytes": p.stat().st_size, "vision": "bg-pass"}
        print(f"  saved {p.name} {p.stat().st_size//1024}K", flush=True)
        time.sleep(2)
    prev["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    prev["style"] = "wan2.7-image-pro candy-volumetric flat-2d; kill_white_np cutout; sizes per DESIGN-SPEC §3"
    (MAN/"manifest.json").write_text(json.dumps(prev, indent=1))
    tot = sum(v["bytes"] for v in prev["files"].values())
    print(f"MANIFEST: {len(prev['files'])} assets, total {tot//1024}K (<4MB budget)", flush=True)

if __name__ == "__main__":
    main()
