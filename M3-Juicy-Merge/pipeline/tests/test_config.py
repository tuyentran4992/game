"""Tests for config loading and validation (BR-13)."""
from pathlib import Path

from pipeline.config import load_config, validate_config, find_config_for_game_dir


class TestLoadConfig:
    def test_load_valid_config(self, config_path: Path):
        cfg = load_config(config_path)
        assert cfg["name"] == "cuu-meo"
        assert cfg["version"] == "0.1.0"
        assert cfg["metadata"]["title"] == "Cuu Meo - Bee Dodge"

    def test_load_missing_file(self, tmp_path: Path):
        with __import__("pytest").raises(FileNotFoundError):
            load_config(tmp_path / "nonexistent.yaml")


class TestValidateConfig:
    def test_valid_config_no_errors(self, config_path: Path):
        cfg = load_config(config_path)
        errors = validate_config(cfg)
        assert errors == []

    def test_missing_name(self, tmp_path: Path):
        cfg = {"version": "0.1.0", "metadata": {}, "assets": [], "mechanics": {}, "publisher": {}}
        errors = validate_config(cfg)
        assert any("name" in e for e in errors)

    def test_title_too_long(self, config_path: Path):
        cfg = load_config(config_path)
        cfg["metadata"]["title"] = "x" * 51
        errors = validate_config(cfg)
        assert any("title" in e.lower() and "50" in e for e in errors)

    def test_short_desc_too_long(self, config_path: Path):
        cfg = load_config(config_path)
        cfg["metadata"]["short_desc"] = "x" * 151
        errors = validate_config(cfg)
        assert any("short_desc" in e.lower() and "150" in e for e in errors)

    def test_genre_count(self, config_path: Path):
        cfg = load_config(config_path)
        cfg["metadata"]["genre"] = ["A", "B", "C"]
        errors = validate_config(cfg)
        assert any("genre" in e.lower() for e in errors)

    def test_palettes_minimum_3(self, config_path: Path):
        cfg = load_config(config_path)
        cfg["mechanics"]["progression"]["palettes"] = cfg["mechanics"]["progression"]["palettes"][:2]
        errors = validate_config(cfg)
        assert any("palette" in e.lower() and "3" in e for e in errors)

    def test_asset_keys_unique(self, config_path: Path):
        cfg = load_config(config_path)
        cfg["assets"][1]["key"] = cfg["assets"][0]["key"]
        errors = validate_config(cfg)
        assert any("unique" in e.lower() or "duplicate" in e.lower() for e in errors)


class TestFindConfig:
    def test_find_config_from_game_dir(self, game_dir: Path, config_path: Path):
        found = find_config_for_game_dir(game_dir)
        assert found == config_path
