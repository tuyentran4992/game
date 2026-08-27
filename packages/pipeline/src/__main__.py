"""CLI entry point: python -m pipeline <command> [args]."""
import argparse
import json
import sys
from pathlib import Path

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from .config import load_config, validate_config, find_config_for_game_dir
from .scaffold import scaffold as scaffold_cmd
from .assets import generate_assets, build_manifest
from .validate import run_validation
from .package import package as package_cmd


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="pipeline",
        description="Game Factory Pipeline CLI",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # scaffold
    p_sc = sub.add_parser("scaffold", help="Sinh code game từ template")
    p_sc.add_argument("--config", required=True, help="Path to games/*.yaml")

    # assets
    p_as = sub.add_parser("assets", help="Gọi AI-Box sinh asset")
    p_as.add_argument("--config", required=True, help="Path to games/*.yaml")
    p_as.add_argument("--job", default="gen", help="Job: gen (default)")

    # validate
    p_va = sub.add_parser("validate", help="Check chuẩn Playables")
    p_va.add_argument("--game-dir", required=True, help="Game directory (e.g. M3-Juicy-Merge or games/cuu-meo)")

    # package
    p_pk = sub.add_parser("package", help="Tạo zip + metadata folder")
    p_pk.add_argument("--game-dir", required=True, help="Game directory (e.g. M3-Juicy-Merge or games/cuu-meo)")

    args = parser.parse_args(argv)

    if args.command == "scaffold":
        config_path = Path(args.config)
        project_root = config_path.parent.parent
        game_dir = project_root / "game"
        return scaffold_cmd(config_path, game_dir)

    elif args.command == "assets":
        config_path = Path(args.config)
        project_root = config_path.parent.parent
        assets_dir = project_root / "assets" / "raw"
        return generate_assets(config_path, args.job, assets_dir)

    elif args.command == "validate":
        game_dir = Path(args.game_dir)
        report = run_validation(game_dir)
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0 if report["overall"] == "PASS" else 1

    elif args.command == "package":
        game_dir = Path(args.game_dir)
        return package_cmd(game_dir)

    return 1


if __name__ == "__main__":
    sys.exit(main())
