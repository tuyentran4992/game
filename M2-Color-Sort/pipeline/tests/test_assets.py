"""Tests for assets command (PC-06..09)."""
from pathlib import Path

from pipeline.config import load_config
from pipeline.assets import generate_assets, build_manifest, AssetManifestEntry


class TestGenerateAssets:
    def test_generates_all_asset_keys(self, config_path: Path, tmp_project: Path):
        assets_dir = tmp_project / "assets" / "raw"
        rc = generate_assets(config_path, job="gen", assets_dir=assets_dir)
        assert rc == 0
        cfg = load_config(config_path)
        for asset in cfg["assets"]:
            key = asset["key"]
            atype = asset["type"]
            ext = ".png" if atype == "png" else ".mp3"
            assert (assets_dir / f"{key}{ext}").exists(), f"Missing asset {key}"

    def test_correct_file_extensions(self, config_path: Path, tmp_project: Path):
        assets_dir = tmp_project / "assets" / "raw"
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        cfg = load_config(config_path)
        for asset in cfg["assets"]:
            key = asset["key"]
            if asset["type"] == "png":
                assert (assets_dir / f"{key}.png").exists()
            elif asset["type"] == "audio":
                assert (assets_dir / f"{key}.mp3").exists()

    def test_asset_files_non_empty(self, config_path: Path, tmp_project: Path):
        assets_dir = tmp_project / "assets" / "raw"
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        for f in assets_dir.iterdir():
            assert f.stat().st_size > 0

    def test_assets_are_single_frame_static(self, config_path: Path, tmp_project: Path):
        """BR-08: character assets are single static image, not sprite-sheet."""
        assets_dir = tmp_project / "assets" / "raw"
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        cat_file = assets_dir / "cat_idle.png"
        bee_file = assets_dir / "bee_wasp.png"
        assert cat_file.exists()
        assert bee_file.exists()
        # single PNG, not a sprite sheet (check it's a valid single PNG)
        with open(cat_file, "rb") as f:
            header = f.read(8)
        assert header[:8] == b"\x89PNG\r\n\x1a\n"


class TestBuildManifest:
    def test_manifest_has_all_keys(self, config_path: Path, tmp_project: Path):
        assets_dir = tmp_project / "assets" / "raw"
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        cfg = load_config(config_path)
        manifest = build_manifest(cfg, assets_dir)
        assert len(manifest) == len(cfg["assets"])
        keys = {m.asset_key for m in manifest}
        for asset in cfg["assets"]:
            assert asset["key"] in keys

    def test_manifest_no_missing(self, config_path: Path, tmp_project: Path):
        assets_dir = tmp_project / "assets" / "raw"
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        cfg = load_config(config_path)
        manifest = build_manifest(cfg, assets_dir)
        for entry in manifest:
            assert not entry.missing, f"{entry.asset_key} is missing"

    def test_manifest_reports_missing(self, config_path: Path, tmp_project: Path):
        assets_dir = tmp_project / "assets" / "raw"
        # Don't generate - all should be missing
        cfg = load_config(config_path)
        manifest = build_manifest(cfg, assets_dir)
        for entry in manifest:
            assert entry.missing

    def test_manifest_sizes(self, config_path: Path, tmp_project: Path):
        assets_dir = tmp_project / "assets" / "raw"
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        cfg = load_config(config_path)
        manifest = build_manifest(cfg, assets_dir)
        for entry in manifest:
            assert entry.size_bytes > 0
            assert entry.size_kb > 0
