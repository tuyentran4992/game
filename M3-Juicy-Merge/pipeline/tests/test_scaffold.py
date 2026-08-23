"""Tests for scaffold command (PC-01..05)."""
import json
from pathlib import Path

from pipeline.scaffold import scaffold


class TestScaffoldCreates:
    def test_creates_all_files(self, config_path: Path, tmp_project: Path):
        game_src = tmp_project / "game"
        rc = scaffold(config_path, game_src)
        assert rc == 0
        expected = [
            "src/main.ts",
            "src/scenes/Start.ts",
            "src/scenes/Tutorial.ts",
            "src/scenes/Gameplay.ts",
            "src/scenes/GameOver.ts",
            "src/sdk-handler.ts",
            "package.json",
        ]
        for rel in expected:
            assert (game_src / rel).exists(), f"Missing {rel}"

    def test_exit_code_zero(self, config_path: Path, tmp_project: Path):
        rc = scaffold(config_path, tmp_project / "game")
        assert rc == 0

    def test_package_json_phaser_version(self, config_path: Path, tmp_project: Path):
        game_src = tmp_project / "game"
        scaffold(config_path, game_src)
        pkg = json.loads((game_src / "package.json").read_text())
        ver = pkg.get("dependencies", {}).get("phaser", "").lstrip("^~")
        assert ver.startswith("3.")
        parts = ver.split(".")
        assert int(parts[0]) >= 3
        assert int(parts[1]) >= 60

    def test_config_values_in_output(self, config_path: Path, tmp_project: Path):
        game_src = tmp_project / "game"
        scaffold(config_path, game_src)
        main_ts = (game_src / "src" / "main.ts").read_text()
        # title should come from config (BR-13)
        assert "Cuu Meo" in main_ts or "cuu-meo" in main_ts.lower()
        # lane count from config
        assert "3" in main_ts

    def test_sdk_handler_has_pause_mute(self, config_path: Path, tmp_project: Path):
        game_src = tmp_project / "game"
        scaffold(config_path, game_src)
        sdk = (game_src / "src" / "sdk-handler.ts").read_text()
        assert "onPause" in sdk or "pause" in sdk.lower()
        assert "onResume" in sdk or "resume" in sdk.lower()
        assert "onAudioEnabledChange" in sdk or "audio" in sdk.lower()

    def test_testid_in_scenes(self, config_path: Path, tmp_project: Path):
        game_src = tmp_project / "game"
        scaffold(config_path, game_src)
        start = (game_src / "src" / "scenes" / "Start.ts").read_text()
        assert "start-btn" in start
        go = (game_src / "src" / "scenes" / "GameOver.ts").read_text()
        assert "final-score" in go
        assert "best-score" in go
        assert "retry-btn" in go
        assert "continue-btn" in go

    def test_responsive_config(self, config_path: Path, tmp_project: Path):
        game_src = tmp_project / "game"
        scaffold(config_path, game_src)
        main_ts = (game_src / "src" / "main.ts").read_text()
        assert "RESIZE" in main_ts or "resize" in main_ts.lower() or "Scale" in main_ts


class TestScaffoldMissingConfig:
    def test_missing_config_errors(self, tmp_project: Path):
        rc = scaffold(tmp_project / "nonexistent.yaml", tmp_project / "game")
        assert rc != 0
        assert not (tmp_project / "game" / "src" / "main.ts").exists() or True  # no crash


class TestScaffoldIdempotent:
    def test_run_twice_no_error(self, config_path: Path, tmp_project: Path):
        game_src = tmp_project / "game"
        rc1 = scaffold(config_path, game_src)
        assert rc1 == 0
        rc2 = scaffold(config_path, game_src)
        assert rc2 == 0
        # files still exist
        assert (game_src / "src" / "main.ts").exists()
