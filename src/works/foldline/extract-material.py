"""Extract the Foldline UV atlas from the approved 1536 × 1024 key visual."""
from pathlib import Path
import argparse
from PIL import Image


def extract(source, size, corners):
    return source.transform(size, Image.Transform.QUAD, corners, Image.Resampling.BICUBIC)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", type=Path)
    parser.add_argument("atlas", type=Path, nargs="?", default=Path("public/media/foldline/material.webp"))
    args = parser.parse_args()
    source = Image.open(args.reference).convert("RGB")
    if source.size != (1536, 1024):
        parser.error("expected the original 1536 × 1024 approved image")
    atlas = Image.new("RGB", (1024, 512))
    # Corners in Pillow's order: top-left, bottom-left, bottom-right, top-right.
    atlas.paste(extract(source, (1024, 256), (200,727, 210,805, 745,645, 716,549)), (0,0))
    atlas.paste(extract(source, (512, 256), (319,684, 346,709, 612,613, 593,555)), (0,256))
    atlas.paste(extract(source, (512, 256), (1044,305, 1019,429, 1127,410, 1155,325)), (512,256))
    atlas.save(args.atlas, quality=95, method=6)


if __name__ == "__main__":
    main()
