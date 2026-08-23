"""Package command — create build zip + metadata folder (PC-20..26, BR-07)."""
import json
import shutil
import struct
import zlib
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

from pipeline.config import load_config, find_config_for_game_dir


def package(game_dir: Path, project_root: Path, build_dir: Path) -> int:
    """Create build/<game-name>.zip + build/metadata/ from game + assets.

    Returns 0 on success.
    """
    game_dir = Path(game_dir)
    project_root = Path(project_root)
    build_dir = Path(build_dir)

    # Find config
    try:
        config_path = find_config_for_game_dir(game_dir)
    except FileNotFoundError:
        print(f"ERROR: config not found for game-dir {game_dir}")
        return 1

    cfg = load_config(config_path)
    name = cfg["name"]

    # Clean build dir for idempotency (PC-26)
    build_dir.mkdir(parents=True, exist_ok=True)
    zip_path = build_dir / f"{name}.zip"
    metadata_dir = build_dir / "metadata"

    # Remove old outputs
    if zip_path.exists():
        zip_path.unlink()
    if metadata_dir.exists():
        shutil.rmtree(metadata_dir)
    metadata_dir.mkdir(parents=True)

    # --- Create zip ---
    game_src = project_root / "game"
    assets_dir = project_root / "assets" / "raw"

    # --- Create zip (dùng game/dist — vite bundle đã build, entry trỏ đúng assets) ---
    dist_dir = game_src / "dist"
    if not (dist_dir / "index.html").exists():
        print("ERROR: chưa build game — cần `npm run build` trong game/ trước. Huỷ package.")
        return 1

    with ZipFile(zip_path, "w", ZIP_DEFLATED) as zf:
        # Entry index.html từ dist (trỏ ./assets/index-*.js + ./raw/ đúng)
        zf.write(dist_dir / "index.html", "index.html")
        # JS bundle
        for f in sorted((dist_dir / "assets").glob("*")):
            if f.is_file():
                zf.write(f, f"assets/{f.name}")
        # Asset raw (preload baseURL './raw/')
        raw_dir = dist_dir / "raw"
        for f in (sorted(raw_dir.glob("*")) if raw_dir.exists() else []):
            if f.is_file():
                zf.write(f, f"raw/{f.name}")

    # --- Create metadata ---
    _write_metadata(cfg, metadata_dir, project_root)

    print(f"OK: packaged '{name}' -> {zip_path}")
    print(f"  metadata -> {metadata_dir}")
    return 0


def _build_index_html(cfg: dict) -> str:
    title = cfg["metadata"]["title"]
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>{title}</title>
  <style>
    body {{ margin: 0; overflow: hidden; background: #000; }}
    #game {{ width: 100vw; height: 100vh; }}
  </style>
</head>
<body>
  <div id="game"></div>
  <script src="game/dist/main.js"></script>
</body>
</html>
"""


def _write_metadata(cfg: dict, metadata_dir: Path, project_root: Path) -> None:
    """Write metadata.json + thumbnails + preview per BR-07."""
    meta = cfg["metadata"]
    pub = cfg["publisher"]

    # metadata.json (BR-07)
    metadata = {
        "title": meta["title"],
        "short_desc": meta["short_desc"],
        "genre": meta["genre"],
        "theme": meta["theme"],
        "version": cfg["version"],
        "publisher": {
            "name": pub["name"],
            "contact_email": pub.get("contact_email", ""),
        },
        "thumbnails": {
            "1:1": "thumbnail_1x1.png",
            "5:7": "thumbnail_5x7.png",
            "16:9": "thumbnail_16x9.png",
        },
        "preview_video": {
            "16:9": "preview_16x9.mp4",
        },
    }
    (metadata_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Generate placeholder thumbnails (BR-07: 1:1, 5:7, 16:9)
    # Small placeholders — real thumbnails from gameplay screenshots in production
    _create_placeholder_png(metadata_dir / "thumbnail_1x1.png", 16, 16, cfg)
    _create_placeholder_png(metadata_dir / "thumbnail_5x7.png", 14, 20, cfg)
    _create_placeholder_png(metadata_dir / "thumbnail_16x9.png", 32, 18, cfg)

    # Generate placeholder preview video (BR-07: 16:9)
    _create_placeholder_mp4(metadata_dir / "preview_16x9.mp4")


def _create_placeholder_png(path: Path, width: int, height: int, cfg: dict) -> None:
    """Create a minimal valid PNG thumbnail."""
    # Use palette colors from config for a themed thumbnail
    palettes = cfg.get("mechanics", {}).get("progression", {}).get("palettes", [])
    bg_color = (253, 241, 220)  # default warm
    if palettes:
        hex_color = palettes[0].get("bg_top", "#FDF1DC").lstrip("#")
        bg_color = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    raw = b""
    for y in range(height):
        raw += b"\x00"  # filter: none
        raw += bytes(bg_color) + (b"\xff" if len(bg_color) < 4 else b"")  # RGBA
        raw += (bytes(bg_color) + b"\xff") * (width - 1)

    def _chunk(chunk_type: bytes, data: bytes) -> bytes:
        c = chunk_type + data
        crc = zlib.crc32(c) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + c + struct.pack(">I", crc)

    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    # Compress raw data (this is not "compression in game bundle" — it's PNG encoding)
    png += _chunk(b"IDAT", zlib.compress(raw, 9))
    png += _chunk(b"IEND", b"")

    path.write_bytes(png)


def _create_placeholder_mp4(path: Path) -> None:
    """Create a minimal placeholder MP4 file for preview video."""
    # Minimal MP4 box structure: ftyp + free
    # ftyp box
    ftyp_data = b"isom" + struct.pack(">I", 0x200) + b"isomiso2mp41"
    ftyp_box = struct.pack(">I", 8 + len(ftyp_data)) + b"ftyp" + ftyp_data
    # free box (padding)
    free_data = b"\x00" * 256
    free_box = struct.pack(">I", 8 + len(free_data)) + b"free" + free_data

    path.write_bytes(ftyp_box + free_box)
