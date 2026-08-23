"""Config loading and validation for games/*.yaml (BR-13)."""
from pathlib import Path
from typing import Any

import yaml


# Asset type -> file extension mapping
TYPE_EXTENSIONS = {
    "png": ".png",
    "audio": ".mp3",
    "json": ".json",
}


def load_config(path: Path) -> dict[str, Any]:
    """Load a game config YAML file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    if not isinstance(cfg, dict):
        raise ValueError(f"Config is not a dict: {path}")
    return cfg


def validate_config(cfg: dict[str, Any]) -> list[str]:
    """Validate config against schema (DATA-MODEL §1). Returns list of error strings."""
    errors: list[str] = []

    # --- name ---
    name = cfg.get("name")
    if not name:
        errors.append("name is required (ASCII lowercase, no diacritics)")
    elif not isinstance(name, str) or not all(c.isascii() and (c.islower() or c in "-_") for c in name):
        errors.append(f"name must be ASCII lowercase: {name!r}")

    # --- version ---
    version = cfg.get("version")
    if not version:
        errors.append("version is required (semver major.minor.patch)")
    elif not _is_semver(version):
        errors.append(f"version must be semver: {version!r}")

    # --- metadata ---
    meta = cfg.get("metadata")
    if not isinstance(meta, dict):
        errors.append("metadata block is required")
        meta = {}
    title = meta.get("title", "")
    if not title:
        errors.append("metadata.title is required")
    elif len(title) > 50:
        errors.append(f"metadata.title must be <= 50 chars (got {len(title)})")
    short_desc = meta.get("short_desc", "")
    if not short_desc:
        errors.append("metadata.short_desc is required")
    elif len(short_desc) > 150:
        errors.append(f"metadata.short_desc must be <= 150 chars (got {len(short_desc)})")
    genre = meta.get("genre")
    if not genre or not isinstance(genre, list):
        errors.append("metadata.genre is required (list of 1-2)")
    elif not (1 <= len(genre) <= 2):
        errors.append(f"metadata.genre must have 1-2 items (got {len(genre)})")
    theme = meta.get("theme")
    if not theme:
        errors.append("metadata.theme is required")
    style = meta.get("style")
    if not style:
        errors.append("metadata.style is required")

    # --- assets ---
    assets = cfg.get("assets")
    if not isinstance(assets, list) or not assets:
        errors.append("assets list is required and non-empty")
        assets = []
    keys: list[str] = []
    for i, a in enumerate(assets):
        if not isinstance(a, dict):
            errors.append(f"assets[{i}] must be a dict")
            continue
        key = a.get("key")
        if not key:
            errors.append(f"assets[{i}].key is required")
        else:
            keys.append(key)
        atype = a.get("type")
        if atype not in TYPE_EXTENSIONS:
            errors.append(f"assets[{i}].type must be one of {list(TYPE_EXTENSIONS)}")
        desc = a.get("description")
        if not desc:
            errors.append(f"assets[{i}].description is required")
    # check duplicate keys
    seen: set[str] = set()
    for k in keys:
        if k in seen:
            errors.append(f"asset key duplicate: {k}")
        seen.add(k)

    # --- mechanics ---
    mechanics = cfg.get("mechanics")
    if not isinstance(mechanics, dict):
        errors.append("mechanics block is required")
        mechanics = {}
    prog = mechanics.get("progression", {})
    if not isinstance(prog, dict):
        errors.append("mechanics.progression is required")
        prog = {}
    palettes = prog.get("palettes")
    if not isinstance(palettes, list) or len(palettes) < 3:
        errors.append(f"progression.palettes must have >= 3 (got {len(palettes) if isinstance(palettes, list) else 0})")
    mi = prog.get("milestone_interval")
    if mi is None or not isinstance(mi, int) or mi <= 0:
        errors.append("progression.milestone_interval must be positive int")
    combo_per = prog.get("combo_per")
    if combo_per is None or not isinstance(combo_per, int) or combo_per <= 0:
        errors.append("progression.combo_per must be positive int")
    combo_bonus = prog.get("combo_bonus")
    if combo_bonus is None or not isinstance(combo_bonus, int) or combo_bonus < 0:
        errors.append("progression.combo_bonus must be non-negative int")

    # --- publisher ---
    pub = cfg.get("publisher")
    if not isinstance(pub, dict):
        errors.append("publisher block is required")
        pub = {}
    if not pub.get("name"):
        errors.append("publisher.name is required")
    email = pub.get("contact_email", "")
    if not email or "@" not in email:
        errors.append("publisher.contact_email must be a valid email")

    return errors


def find_config_for_game_dir(game_dir: Path) -> Path:
    """Find the config YAML for a game-dir path.

    games/cuu-meo  ->  games/cuu-meo.yaml
    """
    game_dir = Path(game_dir)
    config_path = Path(str(game_dir) + ".yaml")
    if not config_path.exists():
        raise FileNotFoundError(f"Config for game-dir {game_dir} not found at {config_path}")
    return config_path


def _is_semver(v: Any) -> bool:
    if not isinstance(v, str):
        return False
    parts = v.split(".")
    if len(parts) != 3:
        return False
    return all(p.isdigit() for p in parts)
