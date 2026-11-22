"""Pack approved photography and the generated clean layers for Jelly Hour."""
from argparse import ArgumentParser
from pathlib import Path

from PIL import Image, ImageDraw

parser = ArgumentParser(description=__doc__)
for name in ("approved", "dish", "whole", "spoon"):
    parser.add_argument(name, type=Path)
args = parser.parse_args()

atlas = Image.new("RGBA", (1200, 1696))
approved = Image.open(args.approved).convert("RGBA")
dish = Image.open(args.dish).convert("RGBA")
whole = Image.open(args.whole).convert("RGBA")
spoon = Image.open(args.spoon).convert("RGBA")
resample = Image.Resampling.LANCZOS
atlas.paste(dish.resize((1200, 800), resample), (0, 0))

# Extend the projected material by reflection so deformation never exposes
# pixels from the background of the reference photograph.
rows = (
    (315, 860, 953), (334, 853, 948), (350, 758, 997), (370, 727, 1061),
    (405, 674, 1112), (440, 628, 1146), (480, 598, 1172), (530, 575, 1193),
    (600, 545, 1211), (670, 521, 1236), (750, 499, 1246), (817, 530, 1246),
    (853, 565, 1199), (882, 627, 1105), (906, 704, 1006), (940, 776, 846),
)
body = Image.new("RGBA", (840, 625))
for row in range(body.height):
    y = 315 + row
    for (y0, l0, r0), (y1, l1, r1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            f = (y - y0) / (y1 - y0)
            left = round(l0 + (l1 - l0) * f)
            right = round(r0 + (r1 - r0) * f)
            break
    source_y = max(337, min(893, y))
    for x in range(body.width):
        interval = right - left
        offset = (440 + x - left) % (2 * interval)
        source_x = left + min(offset, 2 * interval - offset)
        body.putpixel((x, row), whole.getpixel((source_x, source_y)))
atlas.paste(body, (0, 800))

# The approved image supplies the actual raised orange segment, separate
# from its spoon. The surface uses it only inside the derived piece volume.
mask = Image.new("L", approved.size)
ImageDraw.Draw(mask).polygon([
    (1029, 491), (1042, 457), (1067, 420), (1095, 388), (1133, 364), (1192, 327),
    (1224, 297), (1276, 277), (1319, 269), (1351, 284), (1377, 319), (1379, 362),
    (1357, 406), (1320, 445), (1274, 474), (1236, 497), (1188, 518), (1128, 532),
    (1084, 527), (1047, 518), (1029, 502),
], fill=255)
approved.putalpha(mask)
atlas.paste(approved.crop((1023, 265, 1384, 538)).resize((336, 256), resample), (864, 800))
atlas.paste(spoon.crop((30, 135, 2148, 628)).resize((1200, 256), resample), (0, 1440))
target = Path(__file__).resolve().parents[3] / "public/media/sorbet-hour/morning-material.webp"
atlas.save(target, quality=89, method=6)

# Recover coverage from the wine-red lettering on the light plaster.
# The localized HTML heading remains the accessible name.
reference = Image.open(args.approved).convert("RGB")
wordmark = Image.new("RGBA", (566, 478))
for y in range(wordmark.height):
    for x in range(wordmark.width):
        if y >= 390 and x >= 220:
            continue
        red, green, blue = reference.getpixel((x + 35, y + 34))
        value = red * 0.22 + green * 0.68 + blue * 0.10
        opacity = round(255 * max(0.0, min(1.0, (109 - value) / 86)))
        wordmark.putpixel((x, y), (73, 9, 8, opacity))
wordmark.save(target.with_name("jelly-hour-wordmark.webp"), lossless=True)
