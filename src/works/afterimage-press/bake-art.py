"""Bake the still ink proofs and the three original specimen posters.

Run from the repository root with Pillow and NumPy. The live artwork uses the
same fixed stencil distances in press.wgsl.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path("public/media/afterimage-press")
DISPLAY = "public/fonts/night-barlow-condensed-extrabold.ttf"
MONO = "public/fonts/prism-plex-mono.ttf"
PAPER = np.array([246, 239, 221])
COBALT = np.array([20, 58, 214])
ORANGE = np.array([255, 81, 29])
OVERPRINT = np.array([49, 27, 69])
DARK = (24, 25, 36)


def smooth(low, high, value):
    amount = np.clip((value - low) / (high - low), 0, 1)
    return amount * amount * (3 - 2 * amount)


def stencil(width, height, mode=0, ink_edge=1):
    u = (np.arange(width) + .5)[None, :] / width
    v = (np.arange(height) + .5)[:, None] / height
    image_v = (v - .5) / .92 + .5
    bx, by = u - .493, image_v - .503
    ox, oy = u - .510, image_v - .500
    face = bx - by * .14
    cabinet = np.maximum(np.maximum(-face - .238, face - .238), np.abs(by) - .413)
    driver = np.hypot((bx + .057) * 1.94, by - .035)
    cone = np.maximum(driver - .264, .222 - driver)
    ring = np.maximum(driver - .2, .181 - driver)
    core = driver - .109
    vents = np.maximum(np.minimum(np.abs(by + .318 + .27 * bx), np.abs(by + .365 + .27 * bx)) - .012,
                       np.abs(face + .086) - .126)
    studs = np.minimum(np.hypot((bx - .165) * 1.94, by + .3),
                       np.hypot((bx + .156) * 1.94, by - .33)) - .031
    blue = np.minimum(np.maximum(cabinet, -np.minimum(driver - .284, np.minimum(vents, studs))),
                      np.minimum(np.minimum(cone, ring), core))

    x = ox + .1 * oy
    bell = .16 + .66 * (x + .22) + .29 * (x + .22) ** 2
    fold = np.abs(oy + .038 - .15 * x)
    horn = np.maximum(np.maximum(-.238 - x, x - .205), fold - bell)
    mouth = np.hypot((ox - .200) * 4.25, oy + .008)
    flare = np.maximum(mouth - .44, .35 - mouth)
    lip = np.maximum(mouth - .312, .295 - mouth)
    channel = np.maximum(np.maximum(fold - bell * .13, -.148 - x), x - .075)
    throat = np.hypot((ox + .232) * 2.04, oy + .072)
    orange = np.minimum(np.minimum(np.maximum(horn, -np.minimum(mouth - .35, channel)), flare),
                        np.minimum(lip, np.maximum(throat - .138, .059 - throat)))

    def screened(distance, x, y, slope, start):
        spot = np.hypot((x * 107 + slope * y * 55) % 1 - .5, (y * 55) % 1 - .5)
        cell = max(107 / width, 55 / height)
        aa = cell * .60 + .025
        strength = (1 - smooth(.24, .49, cell)) * .48
        edge = max(1.15 / width, .0008)
        return (1 - smooth(-edge, edge, distance)) * (
            1 - strength * (1 - smooth(.17 - aa, .17 + aa, spot)) * smooth(start, .33, y)
        )

    a = screened(blue, bx, by, .5, .11)[:, :, None] if mode != 2 else 0
    b = screened(orange, ox, oy, -.5, .08)[:, :, None] if mode != 1 else 0
    if mode == 0:
        b *= (1 - smooth(ink_edge - .5 / height, ink_edge + .5 / height, v))[:, :, None]
    rgb = PAPER * (1 - a) * (1 - b) + COBALT * a * (1 - b) + ORANGE * b * (1 - a) + OVERPRINT * a * b
    return Image.fromarray(np.rint(rgb).astype(np.uint8))


def ink(color):
    return tuple(map(int, color))


def second_art():
    width, height = 580, 470
    x = np.linspace(-1.2, 1.2, width)[None, :]
    y = np.linspace(-1, 1, height)[:, None]
    # Off-register orbit traces around two focal points.
    u, v = x + .24 + .41 * y, y - .08
    radius = np.hypot(u * .91, v * 1.18)
    radial = np.abs((radius * 6.75 + .5) % 1 - .5)
    a = ((radius < .98) & ((radial < .22) | (radius < .119)))
    u, v = x - .22 - .51 * y, y + .04
    radius = np.hypot(u * 1.02, v * 1.25)
    radial = np.abs((radius * 6.75 + .5) % 1 - .5)
    b = ((radius < .97) & ((radial < .23) | (radius < .118)))
    return compose(a, b)


def third_art():
    width, height = 580, 470
    x = np.linspace(-1.2, 1.2, width)[None, :]
    y = np.linspace(-1, 1, height)[:, None]
    # Record-groove ribs broken up by a staggered frequency display.
    height_a = .75 - .43 * np.sin(x * 3.6) ** 2
    height_b = .63 + .27 * np.sin(x * 3.3 + 1.7)
    groove = (x * 7 + .26 * y) % 1
    groove_b = (x * 7 + .42 - .21 * y) % 1
    a = (np.abs(y + .18) < height_a) & (groove < .47) & (np.abs(x + .12) < .98)
    b = (np.abs(y - .19) < height_b) & (groove_b < .56) & (np.abs(x - .14) < .97)
    return compose(a, b)


def compose(a, b):
    rgb = np.where(a[:, :, None], COBALT, PAPER)
    rgb = np.where(b[:, :, None], np.where(a[:, :, None], OVERPRINT, ORANGE), rgb)
    return Image.fromarray(rgb.astype(np.uint8))


def text(draw, xy, value, size, font=DISPLAY, fill=DARK, anchor="lt"):
    draw.text(xy, value, font=ImageFont.truetype(font, size), fill=fill, anchor=anchor)


def register(draw, x, y, size=9):
    draw.ellipse((x - size, y - size, x + size, y + size), outline=DARK, width=1)
    draw.line((x - size - 4, y, x + size + 4, y), fill=DARK)
    draw.line((x, y - size - 4, x, y + size + 4), fill=DARK)


def specimen(file, code, title, date, venue, art):
    image = Image.new("RGB", (640, 820), ink(PAPER))
    draw = ImageDraw.Draw(image)
    draw.line((29, 56, 611, 56), fill=DARK, width=2)
    text(draw, (30, 25), f"AFTERIMAGE PRESS   /   AP–{code}", 17, MONO)
    text(draw, (610, 25), "TWO INKS", 17, MONO, anchor="rt")
    for i, line in enumerate(title):
        text(draw, (29, 76 + 82 * i), line, 105)
    image.paste(art.resize((580, 439), Image.Resampling.LANCZOS), (30, 251))
    draw.line((29, 703, 611, 703), fill=DARK, width=2)
    text(draw, (29, 725), date, 62)
    text(draw, (30, 791), venue, 16, MONO)
    register(draw, 598, 765)
    image.save(OUT / file, quality=90, method=6)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(("both", "cobalt", "orange")):
        stencil(1200, 600, mode=index).save(OUT / f"plate-{name}.webp", quality=93, method=6)
    specimen("feedback.webp", "01", ["FEEDBACK", "ASSEMBLY"], "14 NOV / 20:00", "LIVE SET  /  LOADING BAY B", stencil(1160, 878, 0))
    specimen("orbital.webp", "02", ["ORBITAL", "RELAY"], "21 NOV / 19:30", "ELECTRONIC SETS  /  ROOM 04", second_art())
    specimen("side-b.webp", "03", ["SIDE B", "SOCIAL"], "28 NOV / 17:00", "RECORD SWAP  /  SOUTH ARCADE", third_art())

    image = Image.new("RGB", (1200, 800), (23, 24, 34))
    draw = ImageDraw.Draw(image)
    accent = ink(ORANGE)
    text(draw, (45, 58), "AFTERIMAGE", 57, fill=ink(PAPER))
    text(draw, (45, 125), "PRESS", 57, fill=ink(PAPER))
    draw.line((46, 212, 319, 212), fill=accent, width=2)
    text(draw, (46, 238), "TWO-INK", 52, fill=accent)
    text(draw, (46, 289), "GIG POSTERS", 52, fill=accent)
    text(draw, (46, 696), "A3 / A2", 27, MONO, fill=ink(PAPER))
    text(draw, (46, 739), "25–250 COPIES", 20, MONO, fill=ink(PAPER))

    draw.rectangle((352, 37, 1155, 761), fill=ink(PAPER))
    draw.line((379, 80, 1128, 80), fill=DARK, width=2)
    text(draw, (379, 54), "AP–01     /     LIVE SET     /     LOADING BAY B", 16, MONO)
    text(draw, (379, 100), "FEEDBACK ASSEMBLY", 97)
    image.paste(stencil(748, 369), (379, 233))
    draw.line((379, 632, 1128, 632), fill=DARK, width=2)
    text(draw, (379, 654), "14 NOV 2026", 74)
    text(draw, (1128, 722), "20:00   /   TAIPEI", 17, MONO, anchor="rt")
    register(draw, 1113, 666)
    image.save(OUT / "cover.webp", quality=92, method=6)


if __name__ == "__main__":
    main()
