"""Bake the two secondary catalogue posters and the padded squeegee material."""
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from resvg_py import svg_to_bytes

OUT = Path("public/media/afterimage-press")
DISPLAY = "public/fonts/night-barlow-condensed-extrabold.ttf"
MONO = "public/fonts/prism-plex-mono.ttf"
PAPER = np.array([246, 239, 221])
COBALT = np.array([20, 58, 214])
ORANGE = np.array([255, 81, 29])
OVERPRINT = np.array([49, 27, 69])
DARK = (24, 25, 36)


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


def bake_squeegee():
    handle = (OUT / "squeegee.svg").read_text(encoding="utf-8").split(">", 1)[1].rsplit("</svg>", 1)[0]
    # Padding around the same tool lets the blade cast a contact shadow.
    tool = f"""<svg xmlns="http://www.w3.org/2000/svg" width="2120" height="340" viewBox="-30 -20 1060 170">
      <filter id="contact" filterUnits="userSpaceOnUse" x="-30" y="-20" width="1060" height="170">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#151219" flood-opacity=".68"/>
        <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#15121b" flood-opacity=".34"/>
      </filter>
      <g filter="url(#contact)">{handle}</g>
    </svg>"""
    image = Image.open(BytesIO(bytes(svg_to_bytes(svg_string=tool)))).convert("RGBA")
    image.save(OUT / "tool-texture.webp", lossless=True, method=6)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bake_squeegee()
    specimen("orbital.webp", "02", ["ORBITAL", "RELAY"], "21 NOV / 19:30", "ELECTRONIC SETS  /  ROOM 04", second_art())
    specimen("side-b.webp", "03", ["SIDE B", "SOCIAL"], "28 NOV / 17:00", "RECORD SWAP  /  SOUTH ARCADE", third_art())

if __name__ == "__main__":
    main()
