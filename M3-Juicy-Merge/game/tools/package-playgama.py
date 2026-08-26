import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

dist_dir = Path(__file__).resolve().parent.parent / "dist"
build_dir = Path(__file__).resolve().parent.parent.parent / "build"
build_dir.mkdir(parents=True, exist_ok=True)
out_zip = build_dir / "juicy-merge-playgama.zip"

if not (dist_dir / "index.html").exists():
    print("Error: dist/index.html does not exist. Run npm run build:web first.")
    sys.exit(1)

with ZipFile(out_zip, "w", ZIP_DEFLATED) as zf:
    for f in dist_dir.rglob("*"):
        if f.is_file():
            rel = f.relative_to(dist_dir).as_posix()
            # Do not include Reddit server or devvit client bundles in Playgama zip
            if not rel.startswith("server") and not rel.startswith("client"):
                zf.write(f, rel)

size_mb = out_zip.stat().st_size / (1024 * 1024)
print(f"Playgama package created successfully: {out_zip} ({size_mb:.2f} MB)")
