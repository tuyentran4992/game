"""Tests for validate command (PC-10..19)."""
import json
from pathlib import Path

from pipeline.config import load_config
from pipeline.scaffold import scaffold
from pipeline.assets import generate_assets, build_manifest
from pipeline.validate import validate, run_validation


class TestValidatePass:
    def test_pass_on_clean_build(self, config_path: Path, tmp_project: Path):
        game_src = tmp_project / "game"
        assets_dir = tmp_project / "assets" / "raw"
        game_dir = tmp_project / "games" / "cuu-meo"
        game_dir.mkdir(parents=True, exist_ok=True)

        scaffold(config_path, game_src)
        generate_assets(config_path, job="gen", assets_dir=assets_dir)

        report = run_validation(game_dir, tmp_project)
        assert report["overall"] == "PASS"
        for check in report["checks"]:
            if check["level"] == "MUST":
                assert check["status"] in ("pass", "warn"), \
                    f"MUST check {check['id']} failed: {check}"


class TestValidateFailures:
    def _setup_clean(self, config_path, tmp_project):
        game_src = tmp_project / "game"
        assets_dir = tmp_project / "assets" / "raw"
        game_dir = tmp_project / "games" / "cuu-meo"
        game_dir.mkdir(parents=True, exist_ok=True)
        scaffold(config_path, game_src)
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        return game_dir, assets_dir, game_src

    def test_file_individual_too_large(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        # create a file > 30 MiB
        big_file = assets_dir / "big.png"
        big_file.write_bytes(b"\x00" * (31 * 1024 * 1024))
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "file_individual")
        assert check["status"] == "fail"
        assert report["overall"] == "FAIL"

    def test_file_individual_warn_over_512kb(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        # create a file > 512 KiB but < 30 MiB
        warn_file = assets_dir / "medium.png"
        warn_file.write_bytes(b"\x00" * (600 * 1024))
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "file_individual")
        assert check["status"] == "warn"

    def test_bundle_total_too_large(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        big_file = assets_dir / "huge.png"
        big_file.write_bytes(b"\x00" * (251 * 1024 * 1024))
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "bundle_total")
        assert check["status"] == "fail"

    def test_compression_detected(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        # gzip magic bytes
        gz_file = assets_dir / "compressed.gz"
        gz_file.write_bytes(b"\x1f\x8b" + b"\x00" * 100)
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "no_compression")
        assert check["status"] == "fail"

    def test_external_network_detected(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        # inject external URL into game source
        main_ts = game_src / "src" / "main.ts"
        content = main_ts.read_text()
        main_ts.write_text(content + '\nfetch("https://evil-analytics.com/track");\n')
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "no_external_network")
        assert check["status"] == "fail"

    def test_external_websocket_detected(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        main_ts = game_src / "src" / "main.ts"
        content = main_ts.read_text()
        main_ts.write_text(content + '\nnew WebSocket("wss://evil.com/ws");\n')
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "no_external_network")
        assert check["status"] == "fail"

    def test_save_size_check(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "save_size")
        assert check["status"] == "pass"

    def test_responsive_check_pass(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "responsive")
        assert check["status"] == "pass"

    def test_responsive_check_fail(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        # remove resize config
        main_ts = game_src / "src" / "main.ts"
        content = main_ts.read_text()
        main_ts.write_text(content.replace("RESIZE", "NONE").replace("resize", "noresize"))
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "responsive")
        assert check["status"] == "fail"

    def test_pause_mute_check(self, config_path: Path, tmp_project: Path):
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        report = run_validation(game_dir, tmp_project)
        check = next(c for c in report["checks"] if c["id"] == "pause_mute")
        assert check["status"] == "pass"

    def test_validate_lists_all_errors(self, config_path: Path, tmp_project: Path):
        """PC-19: validate lists all errors, exit != 0, no crash."""
        game_dir, assets_dir, game_src = self._setup_clean(config_path, tmp_project)
        # introduce multiple failures
        big_file = assets_dir / "big.png"
        big_file.write_bytes(b"\x00" * (31 * 1024 * 1024))
        gz_file = assets_dir / "compressed.gz"
        gz_file.write_bytes(b"\x1f\x8b" + b"\x00" * 100)
        main_ts = game_src / "src" / "main.ts"
        content = main_ts.read_text()
        main_ts.write_text(content + '\nfetch("https://evil.com/track");\n')
        report = run_validation(game_dir, tmp_project)
        failed = [c for c in report["checks"] if c["status"] == "fail"]
        assert len(failed) >= 3
        assert report["overall"] == "FAIL"

    def test_validate_no_crash_on_empty(self, config_path: Path, tmp_project: Path):
        """Validate should not crash even with empty game dir."""
        game_dir = tmp_project / "games" / "cuu-meo"
        game_dir.mkdir(parents=True, exist_ok=True)
        report = run_validation(game_dir, tmp_project)
        assert report["overall"] == "FAIL"  # missing files
        # should still have checks
        assert len(report["checks"]) > 0
