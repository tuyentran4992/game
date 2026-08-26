"""Assets command — generate AI-Box assets + build manifest (PC-06..09).

NOTE: AI-Box API integration is stubbed in M1. This module creates minimal
valid placeholder PNG/audio files matching the asset spec in config.
Real AI-Box/WAN integration replaces _generate_placeholder_* in production.
"""
import struct
import zlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .config import load_config, validate_config, TYPE_EXTENSIONS


@dataclass
class AssetManifestEntry:
    asset_key: str
    file_path: str
    type: str
    size_bytes: int
    size_kb: float
    usage_scenes: list[str]
    missing: bool = False


def generate_assets(config_path: Path, job: str, assets_dir: Path) -> int:
    """Generate assets per config spec into assets/raw/.

    job='gen': generate (stub AI-Box in M1)
    Returns 0 on success.
    """
    config_path = Path(config_path)
    if not config_path.exists():
        print(f"ERROR: config not found: {config_path}")
        return 1

    cfg = load_config(config_path)
    errors = validate_config(cfg)
    if errors:
        print("ERROR: config invalid")
        for e in errors:
            print(f"  - {e}")
        return 1

    if job not in ("gen",):
        print(f"ERROR: unknown job '{job}'. Use --job gen")
        return 1

    assets_dir = Path(assets_dir)
    assets_dir.mkdir(parents=True, exist_ok=True)

    assets_spec = cfg.get("assets", [])
    if not assets_spec:
        print("ERROR: no assets in config")
        return 1

    count = 0
    for spec in assets_spec:
        key = spec["key"]
        atype = spec["type"]
        ext = TYPE_EXTENSIONS.get(atype, ".bin")
        out_path = assets_dir / f"{key}{ext}"

        if atype == "png":
            _generate_placeholder_png(out_path, spec)
        elif atype == "audio":
            _generate_placeholder_audio(out_path, spec)
        elif atype == "json":
            _generate_placeholder_json(out_path, spec)
        else:
            print(f"WARN: unknown asset type {atype} for {key}")

        count += 1
        print(f"  generated: {out_path.name} ({out_path.stat().st_size} bytes)")

    print(f"OK: generated {count} assets -> {assets_dir}")
    return 0


def build_manifest(cfg: dict, assets_dir: Path) -> list[AssetManifestEntry]:
    """Build asset manifest from config + assets/raw/ contents."""
    assets_dir = Path(assets_dir)
    manifest: list[AssetManifestEntry] = []

    for spec in cfg.get("assets", []):
        key = spec["key"]
        atype = spec["type"]
        ext = TYPE_EXTENSIONS.get(atype, ".bin")
        file_path = f"assets/raw/{key}{ext}"
        actual = assets_dir / f"{key}{ext}"

        if actual.exists():
            size_bytes = actual.stat().st_size
            missing = False
        else:
            size_bytes = 0
            missing = True

        manifest.append(AssetManifestEntry(
            asset_key=key,
            file_path=file_path,
            type=atype,
            size_bytes=size_bytes,
            size_kb=round(size_bytes / 1024, 2),
            usage_scenes=spec.get("_usage_scenes", []),
            missing=missing,
        ))

    return manifest


# --- Placeholder generators (replace with real AI-Box API in production) ---

def _generate_placeholder_png(path: Path, spec: dict) -> None:
    """Create a minimal valid 4x4 PNG file."""
    width = 4
    height = 4
    # Build raw image data: each scanline starts with filter byte 0
    raw = b""
    for _ in range(height):
        raw += b"\x00"  # filter: none
        raw += b"\x80\x80\x80\xff" * width  # RGBA grey pixels

    def _chunk(chunk_type: bytes, data: bytes) -> bytes:
        c = chunk_type + data
        crc = zlib.crc32(c) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + c + struct.pack(">I", crc)

    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += _chunk(b"IDAT", zlib.compress(raw))
    png += _chunk(b"IEND", b"")

    path.write_bytes(png)


def _generate_placeholder_audio(path: Path, spec: dict) -> None:
    """Create a minimal valid MP3 file (silent, ~1 frame)."""
    # Minimal MP3 header: MPEG1 Layer3, 128kbps, 44100Hz
    # Frame header: 0xFF 0xFB 0x90 0x00
    header = b"\xff\xfb\x90\x00"
    # Pad with silence to make a valid-ish frame (~417 bytes for 128kbps)
    frame_data = header + b"\x00" * 413
    path.write_bytes(frame_data)


def _generate_placeholder_json(path: Path, spec: dict) -> None:
    """Create a minimal JSON config file."""
    import json
    path.write_text(json.dumps({"key": spec.get("key", ""), "type": "config"}, indent=2))
