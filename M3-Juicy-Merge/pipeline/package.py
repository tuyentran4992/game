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
    metadata_dir.mkdir(parents=True, exist_ok=True)

    # Copy real metadata if available in project_root/metadata
    src_metadata_dir = project_root / "metadata"
    if src_metadata_dir.exists() and src_metadata_dir != metadata_dir:
        for f in src_metadata_dir.glob("*"):
            if f.is_file():
                shutil.copy2(f, metadata_dir / f.name)

    # --- Create zip ---
    game_src = project_root / "game"
    assets_dir = project_root / "assets" / "raw"

    # --- Create zip (dùng game/dist — vite bundle đã build, entry trỏ đúng assets) ---
    dist_dir = game_src / "dist"
    if not (dist_dir / "index.html").exists():
        print("ERROR: chưa build game — cần `npm run build` trong game/ trước. Huỷ package.")
        return 1

    with ZipFile(zip_path, "w", ZIP_DEFLATED) as zf:
        # Root files in dist (index.html, playgama-bridge-config.json, etc.)
        for f in sorted(dist_dir.glob("*")):
            if f.is_file():
                zf.write(f, f.name)
        # JS bundle
        assets_subdir = dist_dir / "assets"
        if assets_subdir.exists():
            for f in sorted(assets_subdir.glob("*")):
                if f.is_file():
                    zf.write(f, f"assets/{f.name}")
        # Asset raw (preload baseURL './raw/')
        raw_dir = dist_dir / "raw"
        if raw_dir.exists():
            for f in sorted(raw_dir.glob("*")):
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
            "9:16": "thumbnail_9x16.png",
            "16:9": "thumbnail_16x9.png",
        },
        "preview_video": {
            "16:9": "preview_16x9.mp4",
        },
    }
    (metadata_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Generate placeholder thumbnails (Playgama: 1:1 800x800, 9:16 1080x1920, 16:9 1920x1080) if not present
    for thumb_name, (w, h) in [("thumbnail_1x1.png", (800, 800)), ("thumbnail_9x16.png", (1080, 1920)), ("thumbnail_16x9.png", (1920, 1080))]:
        thumb_path = metadata_dir / thumb_name
        if not thumb_path.exists() or thumb_path.stat().st_size < 1000:
            _create_placeholder_png(thumb_path, w, h, cfg)

    # Generate placeholder preview video (BR-07: 16:9) if not present
    preview_path = metadata_dir / "preview_16x9.mp4"
    if not preview_path.exists() or preview_path.stat().st_size < 1000:
        _create_placeholder_mp4(preview_path)


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
