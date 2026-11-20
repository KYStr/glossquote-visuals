
"""Render the original digital cloth with the same draft and projection as cloth.wgsl."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUTPUT = Path(__file__).resolve().parents[3] / "public/media/selvedge"
PATTERNS = ("plain", "twill", "satin")


def smooth(lo, hi, value):
    t = np.clip((value - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, amount):
    return a * (1 - amount) + b * amount


def rgb(value):
    return np.asarray(value, dtype=np.float32)


def paint(width, height, pattern, macro=False):
    u, v = np.meshgrid(
        (np.arange(width, dtype=np.float32) + 0.5) / width,
        (np.arange(height, dtype=np.float32) + 0.5) / height,
    )
    if macro:
        # Identical sampling window for all three draft plates.
        gx, gy = 14.5 + 8 * u, 10.5 + 6 * v
        beam = 0.54
        aa = 0.023
    else:
        x = u - 0.5 + 0.12 * (v - 0.5)
        y = v - 0.5 + 0.16 * (u - 0.5) - 0.055 * (u - 0.5) ** 2
        gx, gy = (x + 0.47) * 54, (y + 0.355) * 55
        beam = np.exp(-31 * (u - v * 0.58 + 0.12) ** 2)
        aa = max(0.015, 33 / height)

    col, row = np.floor(gx + 0.5), np.floor(gy + 0.5)
    seed = (np.sin(col * 23.71 + 14.02) * 314.17) % 1
    seed_y = (np.sin(row * 18.31 + 21.12) * 215.37) % 1
    warp = gx - col - 0.052 * np.sin(1.38 * gy + seed * 6.28)
    weft = gy - row - 0.040 * np.sin(1.63 * gx + seed_y * 6.28)
    warp_cover = 1 - smooth(0.395 - aa, 0.395 + aa, abs(warp))
    weft_cover = 1 - smooth(0.420 - aa, 0.420 + aa, abs(weft))
    warp_round = np.sqrt(np.maximum(0, 1 - (warp / 0.45) ** 2))
    weft_round = np.sqrt(np.maximum(0, 1 - (weft / 0.46) ** 2))
    warp_dye = np.where((seed > 0.83)[..., None], rgb((0.67, 0.46, 0.39)), rgb((0.47, 0.178, 0.169)))
    weft_dye = mix(rgb((0.48, 0.28, 0.22)), rgb((0.79, 0.65, 0.49)), (0.56 + 0.41 * seed_y)[..., None])
    aspect = smooth(-0.06, 0.06, u - v * 0.58 + 0.12)
    warp_twist = np.sin(warp * 16 + gy * 8.4) * min(1, 0.05 / aa)
    weft_twist = np.sin(weft * 18 - gx * 9.4) * min(1, 0.05 / aa)
    warp_shade = (
        0.47 + 0.49 * warp_round + 0.12 * seed + 0.045 * warp_twist
        + 0.43 * beam * np.maximum(0, warp_round + 1.39 * warp * (aspect - 0.73))
    )
    weft_shade = (
        0.45 + 0.42 * weft_round + 0.10 * seed_y + 0.048 * weft_twist
        + 0.36 * beam * np.maximum(0, weft_round - 1.60 * weft)
    )
    warp_color = warp_dye * warp_shade[..., None]
    weft_color = weft_dye * weft_shade[..., None]
    recessed = rgb((0.23, 0.105, 0.095)) * np.asarray(0.66 + 0.22 * beam)[..., None]
    warp_layer = mix(mix(recessed, weft_color * 0.72, weft_cover[..., None]), warp_color, warp_cover[..., None])
    weft_layer = mix(mix(recessed, warp_color * 0.72, warp_cover[..., None]), weft_color, weft_cover[..., None])

    if pattern == "plain":
        warp_top = (col + row) % 2 == 0
    elif pattern == "twill":
        warp_top = (col - row) % 4 < 2
    else:
        warp_top = (col - 2 * row) % 5 != 0
    woven = np.where(warp_top[..., None], warp_layer, weft_layer)
    if macro:
        return Image.fromarray(np.uint8(np.clip(woven, 0, 1) * 255))

    grain = 0.5 * np.sin(291 * u + 193 * v) * np.sin(233 * v - 102 * u)
    paper = rgb((0.91, 0.85, 0.76)) + (0.023 * grain + 0.047 * beam)[..., None]
    end = 37.6 + 0.49 * np.sin(0.21 * col) + 0.31 * np.sin(0.9 * col)
    edge = np.maximum.reduce((-gx, gx - 50, -gy, gy - end))
    paper *= (1 - 0.23 * (1 - smooth(-0.6, 1.50, edge)) * (0.86 + 0.14 * beam))[..., None]
    cloth = 1 - smooth(-aa, aa, edge)
    bound = smooth(47.7, 48.2, gx) * (1 - smooth(49.65, 50.05, gx))
    color = mix(paper, woven * mix(rgb((1, 1, 1)), rgb((0.85, 0.63, 0.58)), bound[..., None]), cloth[..., None])

    loose = np.isin(col, (15, 27, 37))
    length = 0.30 + 1.16 * seed + loose * (2.1 + 4.3 * seed)
    dy = gy - end
    hanging = warp - np.sin(dy * 0.76 + seed * 3.6) * np.minimum(0.35, dy * 0.16)
    fringe = smooth(-aa, aa, dy) * (1 - smooth(length - aa, length + aa, dy))
    fringe *= (col >= 0) & (col <= 50)
    shadow = 1 - smooth(0.06, 0.59, abs(hanging - 0.27 - 0.14 * beam))
    strand = 1 - smooth(0.17 - aa, 0.19 + aa, abs(hanging))
    color *= (1 - 0.25 * fringe * shadow)[..., None]
    color = mix(color, warp_dye * (0.56 + 0.56 * beam + 0.48 * (1 - abs(hanging)))[..., None], (fringe * strand)[..., None])
    fiber_spread = np.clip(dy / np.maximum(length, 0.3), 0, 1)
    fiber_offset = 0.15 + 0.21 * fiber_spread * (0.35 + 0.65 * seed)
    fine = 1 - smooth(0.018, 0.035 + aa, abs(abs(hanging + 0.05 * np.sin(gy * 3)) - fiber_offset))
    fuzz = fringe * fine * smooth(0.03, 0.35, dy)
    color = mix(color, warp_dye * (0.76 + 0.74 * beam)[..., None], (0.53 * fuzz)[..., None])
    return Image.fromarray(np.uint8(np.clip(color, 0, 1) * 255))


def render_icon():
    """A 4 × 4 plain-weave brand mark, rasterized for browser chrome."""
    image = Image.new("RGB", (192, 192), "#54232a")
    draw = ImageDraw.Draw(image)
    for row in range(4):
        for col in range(4):
            x, y = 24 + 36 * col, 24 + 36 * row
            shape = (x + 5, y, x + 30, y + 36) if (row + col) % 2 == 0 else (x, y + 5, x + 36, y + 30)
            draw.rounded_rectangle(shape, radius=3, fill="#f3e5d3")
    image.resize((48, 48), Image.Resampling.LANCZOS).save(OUTPUT / "icon.png", optimize=True)


if __name__ == "__main__":
    render_icon()
    for name in PATTERNS:
        poster = "cover" if name == "plain" else name
        paint(1200, 800, name).save(OUTPUT / f"{poster}.webp", quality=89, method=6)
        paint(640, 440, name, macro=True).save(OUTPUT / f"{name}-macro.webp", quality=91, method=6)
