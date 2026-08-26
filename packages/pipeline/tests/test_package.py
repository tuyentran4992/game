"""Tests for package command (PC-20..26)."""
import json
import zipfile
from pathlib import Path

from pipeline.config import load_config
from pipeline.scaffold import scaffold
from pipeline.assets import generate_assets
from pipeline.package import package


class TestPackageZip:
    def _setup(self, config_path, tmp_project):
        game_src = tmp_project / "game"
        assets_dir = tmp_project / "assets" / "raw"
        build_dir = tmp_project / "build"
        game_dir = tmp_project / "games" / "cuu-meo"
        game_dir.mkdir(parents=True, exist_ok=True)
        scaffold(config_path, game_src)
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        return game_dir, build_dir

    def test_creates_zip(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        rc = package(game_dir, tmp_project, build_dir)
        assert rc == 0
        zip_path = build_dir / "cuu-meo.zip"
        assert zip_path.exists()

    def test_zip_contains_game_files(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        zip_path = build_dir / "cuu-meo.zip"
        with zipfile.ZipFile(zip_path) as zf:
            names = zf.namelist()
        assert len(names) > 0
        # should contain some game files
        assert any("index" in n.lower() or "main" in n.lower() or "game" in n.lower() for n in names)

    def test_zip_contains_assets(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        zip_path = build_dir / "cuu-meo.zip"
        with zipfile.ZipFile(zip_path) as zf:
            names = zf.namelist()
        assert any("assets" in n.lower() for n in names)


class TestPackageMetadata:
    def _setup(self, config_path, tmp_project):
        game_src = tmp_project / "game"
        assets_dir = tmp_project / "assets" / "raw"
        build_dir = tmp_project / "build"
        game_dir = tmp_project / "games" / "cuu-meo"
        game_dir.mkdir(parents=True, exist_ok=True)
        scaffold(config_path, game_src)
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        return game_dir, build_dir

    def test_metadata_dir_exists(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        assert (build_dir / "metadata").exists()

    def test_metadata_json(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        meta = json.loads((build_dir / "metadata" / "metadata.json").read_text())
        cfg = load_config(config_path)
        assert meta["title"] == cfg["metadata"]["title"]
        assert meta["short_desc"] == cfg["metadata"]["short_desc"]
        assert meta["genre"] == cfg["metadata"]["genre"]
        assert meta["publisher"]["name"] == cfg["publisher"]["name"]

    def test_title_length(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        meta = json.loads((build_dir / "metadata" / "metadata.json").read_text())
        assert len(meta["title"]) <= 50

    def test_short_desc_length(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        meta = json.loads((build_dir / "metadata" / "metadata.json").read_text())
        assert len(meta["short_desc"]) <= 150

    def test_thumbnails_present(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        meta_dir = build_dir / "metadata"
        assert (meta_dir / "thumbnail_1x1.png").exists()
        assert (meta_dir / "thumbnail_5x7.png").exists()
        assert (meta_dir / "thumbnail_16x9.png").exists()

    def test_preview_present(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        meta_dir = build_dir / "metadata"
        assert (meta_dir / "preview_16x9.mp4").exists()

    def test_no_branding_in_metadata(self, config_path: Path, tmp_project: Path):
        """PC-24: no branding/logo in title/desc."""
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        meta = json.loads((build_dir / "metadata" / "metadata.json").read_text())
        # title and desc should not contain publisher branding keywords
        for field in ["title", "short_desc"]:
            val = meta[field].lower()
            # common branding indicators that should not appear
            assert "logo" not in val
            assert "brand" not in val

    def test_genre_1_to_2(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        meta = json.loads((build_dir / "metadata" / "metadata.json").read_text())
        assert 1 <= len(meta["genre"]) <= 2

    def test_publisher_present(self, config_path: Path, tmp_project: Path):
        game_dir, build_dir = self._setup(config_path, tmp_project)
        package(game_dir, tmp_project, build_dir)
        meta = json.loads((build_dir / "metadata" / "metadata.json").read_text())
        assert "publisher" in meta
        assert meta["publisher"]["name"]


class TestPackageIdempotent:
    def test_run_twice(self, config_path: Path, tmp_project: Path):
        game_src = tmp_project / "game"
        assets_dir = tmp_project / "assets" / "raw"
        build_dir = tmp_project / "build"
        game_dir = tmp_project / "games" / "cuu-meo"
        game_dir.mkdir(parents=True, exist_ok=True)
        scaffold(config_path, game_src)
        generate_assets(config_path, job="gen", assets_dir=assets_dir)
        rc1 = package(game_dir, tmp_project, build_dir)
        assert rc1 == 0
        zip1_size = (build_dir / "cuu-meo.zip").stat().st_size
        rc2 = package(game_dir, tmp_project, build_dir)
        assert rc2 == 0
        zip2 = build_dir / "cuu-meo.zip"
        assert zip2.exists()
        assert zip2.stat().st_size > 0
