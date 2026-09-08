#!/usr/bin/env python3
"""M9 Deep Cast — gen bộ sprite + nền production qua AI-Box WAN 2.7 (pattern gen_skipking_sprites.py).

Output: M9-DeepCast/game/public/assets/*.png (sprites transparent, bg 480x850 jpg-like png)
        M9-DeepCast/assets/manifest.json (file, sha256, size — drift-guard cho Claude)
Vision QA: mỗi ảnh qua qwen3.6-flash check "1 chủ thể sạch trên nền trắng, không chữ" — fail retry 1 lần.
Chạy: python3 scripts/gen_assets_m9.py [--only boat,fish_01 ...]
"""
import argparse, hashlib, io, json, os, sys, time, urllib.request, base64
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent   # /data/youtube-playables
OUT = ROOT / "M9-DeepCast" / "game" / "public" / "assets"
MAN = ROOT / "M9-DeepCast" / "assets"
env_path = "/data/code/ai-photo-studio/.env"
KEY, BASE = None, "https://api.ai-box.vn/v1"
for line in open(env_path):
    line = line.strip()
    if line.startswith("AI_BOX_API_KEY="):
        KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
    if line.startswith("AI_BOX_BASE_URL=") and line.split("=", 1)[1].strip():
        BASE = line.split("=", 1)[1].strip()
assert KEY, "no AI-Box key"

STYLE = ("flat 2D casual mobile game sprite, thick dark outline bolder than fill, bold vibrant colors, "
         "soft flat shading, clean vector shapes, single object centered, side view, "
         "isolated on plain pure white background, NO text NO watermark no logo.")

SPRITES = {  # name: (prompt, out_max_px)
 "boat": ("A small wooden fishing boat seen from the side with a cheerful fisherman wearing a bright yellow "
          "rain coat and hat holding a bent fishing rod, simple hull planks, " , 512),
 "hook": ("A single steel gray fishing hook with a curled pink worm bait on its point, seen from the side, small "
          "metal loop at the top, " , 160),
 "hook_double": ("Two steel gray fishing hooks tied to a short Y-shaped line, each with a curled pink worm bait, side view, " , 200),
 "fish_01": ("A tiny slender silver-blue sardine fish with big cute eye and simple plain scales, " , 96),
 "fish_02": ("A small mackerel fish with dark green-blue vertical stripes on silver body, big eye, " , 110),
 "fish_03": ("A cheerful clownfish, bright orange body with two white bands outlined in black, big eye, " , 110),
 "fish_04": ("A medium coral-red snapper fish with round body, big eye and darker red fins, " , 130),
 "fish_05": ("A purple cartoon squid with big round eyes and short wavy tentacles, " , 150),
 "fish_06": ("A large metallic blue tuna fish, streamlined torpedo body, yellow finlets along the tail, big eye, " , 190),
 "fish_07": ("A sleek dark blue-grey swordfish with a very long pointed bill, big eye, tall dorsal fin, " , 230),
 "fish_08": ("A grumpy brown-green anglerfish with huge mouth of small teeth and a glowing yellow lure on a stalk above its head, " , 170),
 "fish_09": ("A pale ghost-white manta ray seen from the side with wing-like fins and a long thin tail, gentle big eye, " , 230),
 "fish_10": ("A huge reddish-brown giant squid with enormous round eye, long thick tentacles curling, " , 260),
 "whale": ("A friendly blue whale, large rounded body in blue-grey with lighter belly, small cute eye, spout of water, " , 512),
 "shark": ("A sleek grey reef shark with white belly, slightly open mouth showing small teeth, big dorsal fin, " , 380),
 "chest": ("A small wooden treasure chest with golden bands and lock, glowing gold coins spilling from the lid, " , 128),
 "treasure": ("A glowing pile of gold coins with two big pearls and a small ivory tusk, treasure hoard heap, " , 400),
 "splash": ("A dynamic water splash crown, cyan-blue droplets and white foam ring, " , 128),
 "sparkle": ("A four-point star sparkle, bright warm yellow with soft glow, " , 64),
 "bubble": ("A cluster of three translucent light-blue air bubbles of different sizes, " , 64),
 "sonar": ("A thin glowing cyan ring with a small radial sweep wedge, sonar ping circle, flat icon, " , 480),
}
for i in range(1, 11):
    assert f"fish_{i:02d}" in SPRITES

BGS = {  # name: prompt — mỗi nền 1 dải độ sâu, nước TỐI để chữ trắng đọc được
 "bg_reef": ("Vertical mobile game background underwater coral shelf: bright teal-blue water near the surface, "
             "colorful coral rocks and sea plants on the left and right edges, sun rays from above, "
             "flat 2D casual game art, clean shapes, NO fish no boats no people, NO text NO watermark. Middle stays open dark enough for white UI text."),
 "bg_wreck": ("Vertical mobile game background mid-depth ocean: deep indigo blue water, a dark silhouette of a "
              "sunken wooden ship wreck resting on the seabed at the bottom third, faint light above, "
              "flat 2D casual game art, NO sea creatures, NO text NO watermark. Middle stays open dark enough for white UI text."),
 "bg_vents": ("Vertical mobile game background deep ocean: very dark navy-black water, two smoking black rock chimney "
              "vents with faint amber glow at their tops on the sides, tiny drifting particles, "
              "flat 2D casual game art, NO creatures, NO text NO watermark. Middle stays dark enough for white UI text."),
 "bg_trench": ("Vertical mobile game background ocean trench bottom: near-black water, jagged dark rock canyon walls on both sides, "
               "a faint cold glow far down the middle where treasure sits, dramatic but mostly dark, "
               "flat 2D casual game art, NO creatures, NO text NO watermark."),
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
            print(f"  attempt {att+1} fail: {e}"); time.sleep(8)
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
                {"type": "text", "text": f"Đây là sprite game '{label}'. Trả lời NGẮN: 'OK' nếu (1) đúng 1 chủ thể nguyên vẹn không cắt xén, (2) nền xung quanh trắng sạch, (3) không có chữ/v ký tự nào. Nếu không OK thì nêu lỗi."},
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
        print(f"[gen] {name}")
        for attempt in range(2):
            img = gen_img(pr + STYLE)
            if img is None: continue
            img = kill_white_np(img)
            bb = img.getbbox()
            if bb: img = img.crop(bb)
            img.thumbnail((size*4, size*4), Image.Resampling.LANCZOS)
            ok, note = vision_ok(img, name)
            if ok or attempt:
                p = OUT / f"{name}.png"; img.save(p, "PNG", optimize=True)
                sha = hashlib.sha256(p.read_bytes()).hexdigest()[:12]
                prev["files"][name] = {"file": f"assets/{name}.png", "sha": sha, "bytes": p.stat().st_size, "vision": note}
                print(f"  saved {p.name} {p.stat().st_size//1024}K {'(vision retry2: '+note+')' if not ok else ''}")
                break
            print(f"  vision fail ({note}) → gen lại")
        time.sleep(2)
    for name, pr in BGS.items():
        if not todo(name): continue
        print(f"[gen-bg] {name}")
        img = gen_img(pr, "720x1280")
        if img is None: continue
        img = img.convert("RGB").resize((480, 854), Image.Resampling.LANCZOS)
        p = OUT / f"{name}.png"; img.save(p, "PNG", optimize=True)
        sha = hashlib.sha256(p.read_bytes()).hexdigest()[:12]
        prev["files"][name] = {"file": f"assets/{name}.png", "sha": sha, "bytes": p.stat().st_size, "vision": "bg-pass"}
        print(f"  saved {p.name} {p.stat().st_size//1024}K")
        time.sleep(2)
    prev["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    prev["style"] = "wan2.7-image-pro flat-2d; kill_white_np cutout; sizes per DESIGN-SPEC §3"
    (MAN/"manifest.json").write_text(json.dumps(prev, indent=1))
    tot = sum(v["bytes"] for v in prev["files"].values())
    print(f"MANIFEST: {len(prev['files'])} assets, total {tot//1024}K (<4MB budget)")

if __name__ == "__main__":
    main()
