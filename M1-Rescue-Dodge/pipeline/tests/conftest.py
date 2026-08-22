"""Shared pytest fixtures for pipeline tests."""
import shutil
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
REAL_CONFIG = REPO_ROOT / "games" / "cuu-meo.yaml"


@pytest.fixture()
def tmp_project(tmp_path: Path) -> Path:
    """A temporary project root with config + empty dirs."""
    games_dir = tmp_path / "games"
    games_dir.mkdir()
    shutil.copy(REAL_CONFIG, games_dir / "cuu-meo.yaml")
    (tmp_path / "assets" / "raw").mkdir(parents=True)
    (tmp_path / "game").mkdir(parents=True)
    (tmp_path / "build").mkdir(parents=True)
    return tmp_path


@pytest.fixture()
def config_path(tmp_project: Path) -> Path:
    return tmp_project / "games" / "cuu-meo.yaml"


@pytest.fixture()
def game_dir(tmp_project: Path) -> Path:
    return tmp_project / "games" / "cuu-meo"
