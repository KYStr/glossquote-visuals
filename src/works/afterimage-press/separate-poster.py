"""Separate the approved key visual into two inks and matching proofs.

Run from repository root: python src/works/afterimage-press/separate-poster.py KEY_VISUAL.png
Requires NumPy, Pillow and resvg-py for the local press geometry.
"""
from argparse import ArgumentParser
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from resvg_py import svg_to_bytes

OUT = Path("public/media/afterimage-press")
PAPER = np.array([247., 225., 195.], np.float32)
BLUE = np.array([3., 23., 107.], np.float32)
RED = np.array([242., 11., 3.], np.float32)
PURPLE = np.array([49., 14., 57.], np.float32)


def smooth(lo, hi, value):
    t = np.clip((value - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def press(paper, blue, red):
    blue, red = blue[..., None], red[..., None]
    return (1 - red) * ((1 - blue) * paper + blue * BLUE) + red * ((1 - blue) * RED + blue * PURPLE)


def separate(origin):
    height, width = origin.shape[:2]
    x = np.arange(width)[None, :]
    y = np.arange(height)[:, None]
    # The project palette is a sampled four-corner space: paper, cobalt,
    # vermilion and their overprint. Solve red/blue absorptions iteratively.
    r = PAPER[0] - origin[..., 0]
    b = PAPER[2] - origin[..., 2]
    blue = np.clip(r / 244, 0, 1)
    for _ in range(6):
        red = np.clip((b - 88 * blue) / (192 - 142 * blue), 0, 1)
        blue = np.clip((r - 5 * red) / (244 - 51 * red), 0, 1)

    bare = (origin[..., 0] > 213) & (origin[..., 1] > 171) & (origin[..., 2] > 130)
    blue[bare] = 0
    red[bare] = 0
    # Lettering and event details have explicitly designated plates. The
    # microphone is solved from both channels and retains the displaced mesh.
    nx, ny = x / width, y / height
    blue_head = (nx < .5) & (ny < .457 - .164 * (nx * 2) ** .76)
    red_head = (nx >= .5) & (ny < .306 + .116 * np.maximum(nx * 2 - 1, 0) ** 1.55)
    red[blue_head] = 0
    blue[red_head] = 0
    red_ink = (origin[..., 0] > 185) & (origin[..., 0] - origin[..., 2] > 105)
    red[(ny > .74) & (nx > .686) & ~red_ink] = 0
    pure_cobalt = (origin[..., 0] < 16) & (origin[..., 2] > origin[..., 0] + 66)
    red[pure_cobalt] *= .20

    # Reuse clean stock from the art, without its lettering. Alternate mirror
    # tiles keep the grain continuous underneath the separated impressions.
    stock = origin[int(height * .56):int(height * .71), int(width * .8125):]
    grain = stock[..., 1] - np.mean(stock[..., 1])
    def mirror(index, period):
        point = index % (2 * period)
        return np.minimum(point, 2 * period - 1 - point)
    stock_grain = np.where(bare, origin[..., 1] - PAPER[1],
                           grain[mirror(y, grain.shape[0]), mirror(x, grain.shape[1])])
    # RGB encodes cobalt coverage, red coverage and substrate tooth.
    values = np.stack((blue * 255, red * 255, 128 + stock_grain), axis=-1)
    return np.clip(np.rint(values / 8) * 8, 0, 255)


def save(rgb, name, **options):
    data = np.rint(np.clip(rgb, 0, 255)).astype(np.uint8)
    Image.fromarray(data).save(OUT / name, **options)


def bake_proofs(origin, packed):
    blue, red = (packed[..., i] / 255 for i in (0, 1))
    stock = PAPER + (packed[..., 2:3] - 128) * np.array([.66, 1, 1.15])
    delta = origin - press(stock, blue, red)
    blue_detail = smooth(.03, .2, blue) * (1 - smooth(.02, .12, red))
    red_detail = smooth(.03, .2, red) * (1 - smooth(.02, .12, blue))
    blue_only = press(stock, blue, red * 0) + delta * blue_detail[..., None]
    red_only = press(stock, blue * 0, red) + delta * red_detail[..., None]
    for data, name in ((blue_only, "plate-cobalt.webp"), (red_only, "plate-orange.webp")):
        save(data, name, quality=81, method=6)
    save(origin, "plate-both.webp", quality=83, method=6)
    save(packed, "ink-plates.webp", lossless=True, method=6)

    poster = Image.fromarray(origin.astype(np.uint8))
    poster.resize((1200, 800), Image.Resampling.LANCZOS).save(OUT / "cover.webp", quality=83, method=6)
    poster.resize((640, 427), Image.Resampling.LANCZOS).save(OUT / "feedback.webp", quality=87, method=6)


def bake_bed():
    source = (OUT / "press-bed.svg").read_text(encoding="utf-8")
    source = source.replace('width="1000" height="720"', 'width="2000" height="1440"', 1)
    image = Image.open(BytesIO(bytes(svg_to_bytes(svg_string=source)))).convert("RGB")
    image.save(OUT / "bed-texture.webp", lossless=True, method=6)


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("approved_visual", type=Path)
    args = parser.parse_args()
    origin = np.asarray(Image.open(args.approved_visual).convert("RGB"), dtype=np.float32)
    if origin.shape != (1024, 1536, 3):
        parser.error("Expected the approved 1536 × 1024 key visual.")
    origin = np.asarray(Image.fromarray(origin.astype(np.uint8)).resize((1200, 800), Image.Resampling.LANCZOS), dtype=np.float32)
    bake_proofs(origin, separate(origin))
    bake_bed()
