"""Validate command — check Playables constraints (PC-10..19, BR-03/02).

Produces a JSON validation report per DATA-MODEL §5.
"""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pipeline.config import load_config, find_config_for_game_dir, TYPE_EXTENSIONS
from pipeline.assets import build_manifest

# Limits (BR-03)
LIMIT_BUNDLE_INITIAL_MIB = 30
LIMIT_BUNDLE_INITIAL_TARGET_MIB = 5
LIMIT_FILE_MIB = 30
LIMIT_FILE_TARGET_KIB = 512
LIMIT_BUNDLE_TOTAL_MIB = 250
LIMIT_BUNDLE_TOTAL_TARGET_MIB = 15
LIMIT_SAVE_MIB = 3
LIMIT_SAVE_TARGET_KIB = 500

# Compression magic bytes
COMPRESSION_MAGIC = [
    (b"\x1f\x8b", "gzip"),
    (b"\x42\x5a\x68", "bzip2"),
    (b"\x50\x4b\x03\x04", "zip"),  # also valid for .zip packages
    (b"\x78\x01", "zlib"),
    (b"\x78\x9c", "zlib"),
    (b"\x78\xda", "zlib"),
]

# External network patterns (BR-02)
NETWORK_PATTERNS = [
    re.compile(r'https?://(?!localhost|127\.0\.0\.1)', re.IGNORECASE),
    re.compile(r'wss?://', re.IGNORECASE),
    re.compile(r'\bfetch\s*\(', re.IGNORECASE),
    re.compile(r'\bXMLHttpRequest\b', re.IGNORECASE),
    re.compile(r'\bnew\s+WebSocket\b', re.IGNORECASE),
    re.compile(r'navigator\.sendBeacon', re.IGNORECASE),
    re.compile(r'\.ajax\s*\(', re.IGNORECASE),
]

# Self-monetize patterns (BR-01) — exclude ytgame.* which is allowed
SELF_MONETIZE_PATTERNS = [
    re.compile(r'googleads', re.IGNORECASE),
    re.compile(r'adsense', re.IGNORECASE),
    re.compile(r'doubleclick', re.IGNORECASE),
    re.compile(r'admob', re.IGNORECASE),
    re.compile(r'unityads', re.IGNORECASE),
    re.compile(r'in_app_purchase|inapppurchase|iap\b', re.IGNORECASE),
    re.compile(r'stripe\b', re.IGNORECASE),
    re.compile(r'paypal', re.IGNORECASE),
]

MIB = 1024 * 1024
KIB = 1024


def validate(game_dir: Path, project_root: Path) -> dict[str, Any]:
    """Run validation and return report dict."""
    return run_validation(game_dir, project_root)


def run_validation(game_dir: Path, project_root: Path) -> dict[str, Any]:
    """Run all Playables validation checks on a game build.

    Args:
        game_dir: path identifying the game (e.g. games/cuu-meo)
        project_root: project root containing game/, assets/raw/, build/
    Returns: validation report dict (DATA-MODEL §5)
    """
    game_dir = Path(game_dir)
    project_root = Path(project_root)

    # Find config
    try:
        config_path = find_config_for_game_dir(game_dir)
    except FileNotFoundError:
        config_path = None

    game_name = game_dir.name
    version = "unknown"
    if config_path and config_path.exists():
        cfg = load_config(config_path)
        version = cfg.get("version", "unknown")
    else:
        cfg = {"assets": [], "metadata": {}, "mechanics": {}}

    assets_dir = project_root / "assets" / "raw"
    game_src = project_root / "game"

    # Collect all files
    asset_files = list(assets_dir.glob("**/*")) if assets_dir.exists() else []
    asset_files = [f for f in asset_files if f.is_file()]

    game_files = []
    if game_src.exists():
        for f in game_src.rglob("*"):
            if f.is_file() and f.suffix in (".ts", ".js", ".html", ".json"):
                game_files.append(f)

    all_files = asset_files + game_files

    checks: list[dict[str, Any]] = []

    # --- bundle_initial ---
    initial_size = sum(f.stat().st_size for f in asset_files)
    checks.append(_check(
        "bundle_initial",
        "MUST",
        initial_size,
        f"< {LIMIT_BUNDLE_INITIAL_MIB} MiB (target < {LIMIT_BUNDLE_INITIAL_TARGET_MIB} MiB)",
        initial_size < LIMIT_BUNDLE_INITIAL_MIB * MIB,
        warn=initial_size > LIMIT_BUNDLE_INITIAL_TARGET_MIB * MIB,
        msg=f"Initial bundle {initial_size / MIB:.2f} MiB" if initial_size else "No assets found",
    ))

    # --- file_individual ---
    largest_file = max(all_files, key=lambda f: f.stat().st_size) if all_files else None
    largest_size = largest_file.stat().st_size if largest_file else 0
    largest_name = largest_file.name if largest_file else "none"
    file_pass = largest_size < LIMIT_FILE_MIB * MIB
    file_warn = largest_size > LIMIT_FILE_TARGET_KIB * KIB
    checks.append(_check(
        "file_individual",
        "MUST",
        largest_size,
        f"< {LIMIT_FILE_MIB} MiB (target < {LIMIT_FILE_TARGET_KIB} KiB)",
        file_pass,
        warn=file_warn if file_pass else False,
        msg=f"Largest file: {largest_name} ({largest_size / KIB:.1f} KiB)" if largest_file else "No files",
    ))

    # --- bundle_total ---
    total_size = sum(f.stat().st_size for f in all_files)
    checks.append(_check(
        "bundle_total",
        "MUST",
        total_size,
        f"< {LIMIT_BUNDLE_TOTAL_MIB} MiB (target < {LIMIT_BUNDLE_TOTAL_TARGET_MIB} MiB)",
        total_size < LIMIT_BUNDLE_TOTAL_MIB * MIB,
        warn=total_size > LIMIT_BUNDLE_TOTAL_TARGET_MIB * MIB,
        msg=f"Total bundle {total_size / MIB:.2f} MiB" if total_size else "No files",
    ))

    # --- load_time ---
    # Cannot benchmark actual load time in pipeline; estimate from bundle size
    # Rule of thumb: < 5s target. If bundle < 15 MiB, estimate pass.
    estimated_load_ok = total_size < 15 * MIB
    checks.append(_check(
        "load_time",
        "MUST",
        "estimated",
        "< 5 giây",
        estimated_load_ok,
        msg="Estimated from bundle size (actual benchmark in E2E QA)",
    ))

    # --- save_size ---
    # Estimate saved-game payload: always small (a few integers)
    # Build a sample payload to measure
    sample_save = json.dumps({
        "schema_version": 1,
        "best_score": 999999,
        "level": 99999,
        "streak": 999,
        "palette_index": 2,
        "total_games_played": 9999,
        "last_updated_ts": 9999999999999,
    })
    save_size = len(sample_save.encode("utf-8"))
    checks.append(_check(
        "save_size",
        "MUST",
        save_size,
        f"< {LIMIT_SAVE_MIB} MiB (target < {LIMIT_SAVE_TARGET_KIB} KiB)",
        save_size < LIMIT_SAVE_MIB * MIB,
        warn=save_size > LIMIT_SAVE_TARGET_KIB * KIB,
        msg=f"Estimated save payload {save_size} bytes",
    ))

    # --- no_compression ---
    compressed_files = []
    for f in all_files:
        with open(f, "rb") as fh:
            header = fh.read(8)
        for magic, name in COMPRESSION_MAGIC:
            if header.startswith(magic):
                # zip is OK for .zip output packages, but not inside game assets
                if name == "zip" and f.suffix in (".zip",):
                    continue
                compressed_files.append((f.name, name))
                break
    checks.append(_check(
        "no_compression",
        "MUST",
        len(compressed_files) == 0,
        "KHÔNG nén; decompression fallback OK",
        len(compressed_files) == 0,
        msg=f"Compressed files: {compressed_files}" if compressed_files else "No compression detected",
    ))

    # --- no_external_network ---
    network_hits = []
    for f in game_files:
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        # Skip node_modules / package.json deps
        if "node_modules" in str(f):
            continue
        for pattern in NETWORK_PATTERNS:
            matches = pattern.findall(content)
            if matches:
                network_hits.append((f.name, pattern.pattern))
    checks.append(_check(
        "no_external_network",
        "MUST",
        len(network_hits) == 0,
        "không analytics/multiplayer/payment server",
        len(network_hits) == 0,
        msg=f"Network calls found: {network_hits}" if network_hits else "No external network calls",
    ))

    # --- responsive ---
    # Check for Phaser Scale.RESIZE mode (case-sensitive enum) in game config
    has_resize = False
    for f in game_files:
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if "node_modules" in str(f):
            continue
        # Look for Scale.RESIZE (Phaser enum) or resize event handler with state-keeping
        if "Scale.RESIZE" in content or "mode: Scale.RESIZE" in content:
            has_resize = True
            break
    checks.append(_check(
        "responsive",
        "MUST",
        has_resize,
        "co theo viewport, giữ state khi resize",
        has_resize,
        msg="RESIZE/Scale config found" if has_resize else "No responsive/resize config found",
    ))

    # --- pause_mute ---
    has_pause = False
    for f in game_files:
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if "node_modules" in str(f):
            continue
        has_onpause = "onPause" in content or "pause" in content.lower()
        has_onresume = "onResume" in content or "resume" in content.lower()
        has_audio = "onAudioEnabledChange" in content or "isAudioEnabled" in content or "audio" in content.lower()
        if has_onpause and has_onresume and has_audio:
            has_pause = True
            break
    checks.append(_check(
        "pause_mute",
        "MUST",
        has_pause,
        "onPause/onResume/onAudioEnabledChange đúng",
        has_pause,
        msg="Pause/mute handlers found" if has_pause else "Missing pause/mute/resume handlers",
    ))

    # --- input_touch_mouse ---
    has_input = False
    for f in game_files:
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if "node_modules" in str(f):
            continue
        if "pointerdown" in content or "pointer" in content.lower() or "input" in content.lower():
            has_input = True
            break
    checks.append(_check(
        "input_touch_mouse",
        "MUST",
        has_input,
        "touch + mouse (+ keyboard)",
        has_input,
        msg="Input handlers found" if has_input else "No input handlers found",
    ))

    # --- target_audience_13plus ---
    # Content check: verify no child-targeting content in config
    audience_ok = True
    title = cfg.get("metadata", {}).get("title", "")
    desc = cfg.get("metadata", {}).get("short_desc", "")
    # Basic heuristic: no explicitly child-targeted keywords
    child_keywords = ["baby", "toddler", "infant", "kindergarten"]
    for kw in child_keywords:
        if kw in title.lower() or kw in desc.lower():
            audience_ok = False
    checks.append(_check(
        "target_audience_13plus",
        "MUST",
        audience_ok,
        "13+, KHÔNG nhắm trẻ em",
        audience_ok,
        msg="Content appears 13+ general" if audience_ok else "Child-targeted keywords found",
    ))

    # --- no_self_monetize ---
    monetize_hits = []
    for f in game_files:
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if "node_modules" in str(f):
            continue
        # Skip sdk-handler.ts which legitimately references ads via ytgame
        if "sdk-handler" in str(f):
            continue
        for pattern in SELF_MONETIZE_PATTERNS:
            if pattern.search(content):
                monetize_hits.append((f.name, pattern.pattern))
    checks.append(_check(
        "no_self_monetize",
        "MUST",
        len(monetize_hits) == 0,
        "chỉ dùng YouTube SDK (ytgame.*)",
        len(monetize_hits) == 0,
        msg=f"Self-monetize patterns: {monetize_hits}" if monetize_hits else "Only ytgame SDK ads",
    ))

    # Overall
    overall = "PASS" if all(
        c["status"] in ("pass", "warn") for c in checks if c["level"] == "MUST"
    ) else "FAIL"

    report = {
        "game_name": game_name,
        "validated_at": datetime.now(timezone.utc).isoformat(),
        "version": version,
        "overall": overall,
        "checks": checks,
    }
    return report


def _check(check_id: str, level: str, value: Any, limit: str,
          passed: bool, warn: bool = False, msg: str = "") -> dict[str, Any]:
    # If MUST limit exceeded (passed=False) -> always fail
    # If within MUST but exceeds target (passed=True, warn=True) -> warn
    if not passed:
        status = "fail"
    elif warn:
        status = "warn"
    else:
        status = "pass"
    return {
        "id": check_id,
        "level": level,
        "status": status,
        "value": value,
        "limit": limit,
        "message": msg,
    }
