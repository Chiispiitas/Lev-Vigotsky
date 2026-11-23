"""Package the Wix server build and a standalone source archive."""
import os
from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
destination = Path(sys.argv[1]).resolve()
destination.mkdir(parents=True, exist_ok=True)
with ZipFile(destination / "assessment-build.zip", "w", ZIP_DEFLATED) as archive:
    for folder in ("dist", ".wix"):
        for file in sorted((root / folder).rglob("*")):
            if file.is_file() and not file.name.startswith((".env", ".dev.vars")):
                archive.write(file, file.relative_to(root).as_posix())

with ZipFile(destination / "assessment-source.zip", "w", ZIP_DEFLATED) as archive:
    omitted = {"node_modules", "dist", ".wix", ".wix-release", ".astro", ".wrangler",
               ".agents", "generated", "canonical"}
    for directory, dirs, names in os.walk(root):
        dirs[:] = sorted(name for name in dirs if name not in omitted)
        for name in sorted(names):
            file = Path(directory) / name
            if name.startswith((".env", ".dev.vars")) or file.suffix == ".zip":
                continue
            archive.write(file, file.relative_to(root).as_posix())
    keys = root.parent / "English/answer-keys"
    if not keys.is_dir():
        keys = root / "canonical/answer-keys"
    for file in sorted((keys / "versions").glob("*/*.json")):
        archive.write(file, (Path("canonical/answer-keys") / file.relative_to(keys)).as_posix())

for filename in ("assessment-build.zip", "assessment-source.zip"):
    print(filename, (destination / filename).stat().st_size)
