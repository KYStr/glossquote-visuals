
"""Render complete swatches and the first shuttle position without WebGPU."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUTPUT = Path(__file__).resolve().parents[3] / "public/media/selvedge"
PATTERNS = ("plain", "twill", "satin")
DYES = {
    "plain": ((0.57, 0.18, 0.16), (0.91, 0.73, 0.53), (0.99, 0.74, 0.45)),
    "twill": ((0.24, 0.37, 0.28), (0.75, 0.69, 0.48), (0.99, 0.72, 0.28)),
    "satin": ((0.30, 0.23, 0.43), (0.71, 0.52, 0.33), (0.98, 0.64, 0.39)),
}


def smooth(lo, hi, value):
    t = np.clip((value - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, amount):
    return a * (1 - amount) + b * amount


def warp_on_top(col, row, pattern):
    if pattern == "plain":
        return (col + row) % 2 == 0
    if pattern == "twill":
        return (col - row) % 4 < 2
    return (col - 2 * row) % 5 != 0


def pick_position(seconds):
    """The live cloth takes up one row per six-second shuttle stroke."""
    stroke = seconds / 6 + 0.316
    pick = np.floor(stroke)
    beat = stroke - pick
    advance = smooth(0.04, 0.62, beat)
    return pick, beat, mix(-1.40, 18.45, advance)


def paint(width, height, pattern, *, macro=False, seconds=None):
    u, v = np.meshgrid(
        (np.arange(width, dtype=np.float32) + 0.5) / width,
        (np.arange(height, dtype=np.float32) + 0.5) / height,
    )
    px, py = u - 0.5, v - 0.5
    live = seconds is not None
    pick, beat, head = pick_position(seconds or 0)
    active = 6 if live else 9
    gx = u * 18.7 + 1.15 * py - 0.70
    gy = v * 12.3 + 2.4 * px - 0.78
    if macro:
        # Same eight ends and six picks in each product plate.
        gx, gy = 3.5 + 8 * u, 0.5 + 6 * v
    takeup = smooth(0.76, 0.98, beat) if live else 0
    gy += takeup
    col, row = np.floor(gx + 0.5), np.floor(gy + 0.5)
    draft = row + pick
    seam = gy - active
    along = gx if pick % 2 == 0 else 17 - gx
    ahead = along - head
    nose = 1 - smooth(0.08, 0.82, abs(ahead)) if live else np.zeros_like(gx)
    joined = 1 - smooth(-0.13, 0.05, ahead) if live else np.ones_like(gx)
    raised = warp_on_top(col, active + pick, pattern)
    spread = smooth(-0.48, 0.28, seam) * (1 - smooth(2.15, 4.1, seam))
    spread *= smooth(0.02, 0.13, beat) * (1 - smooth(0.60, 0.75, beat)) if live else 0
    split = np.where(raised, 1.0, -1.0)
    warp_x = gx - col - split * spread * 0.13 - 0.032 * np.sin(2.5 * (gy + pick) + col * 2.17)
    weft_y = gy - row - 0.030 * np.sin(2.65 * gx + draft * 2.1) - (row == active) * 0.18 * nose
    laid = np.where(row < active, 1.0, np.where(row == active, joined, 0.0))
    warp_press = (1 - smooth(0.05, 0.37, abs(gy - row))) * laid
    weft_press = 1 - smooth(0.03, 0.35, abs(gx - col))
    aa = min(0.105, max(0.014, 11.2 / height))
    edge_detail = 1 - smooth(0.027, 0.085, aa)
    nap_w = 0.0090 * np.sin(35 * (gy + pick) + 1.7 * col) * edge_detail
    nap_f = 0.0075 * np.sin(39 * gx + 1.9 * draft) * edge_detail
    warp_width = {"plain": 0.365, "twill": 0.43, "satin": 0.46}[pattern] * (1 - 0.32 * spread)
    warp_width = warp_width * (1 + 0.080 * warp_press) + nap_w
    weft_width = (0.34 if pattern == "satin" else 0.39) * (1 + 0.072 * weft_press)
    weft_width += (row == active) * 0.065 * nose + nap_f
    wx, wy = warp_x / warp_width, weft_y / weft_width
    wu, wv = wx * wx, wy * wy
    warp_round = np.sqrt(np.maximum(0, 1 - wu * (0.54 + 0.46 * wu)))
    weft_round = np.sqrt(np.maximum(0, 1 - wv * (0.54 + 0.46 * wv)))
    soft_edge = aa + 0.024
    warp_cover = 1 - smooth(warp_width - soft_edge, warp_width + soft_edge, abs(warp_x))
    weft_cover = (1 - smooth(weft_width - soft_edge, weft_width + soft_edge, abs(weft_y))) * laid

    warp_dye, weft_dye, accent = np.asarray(DYES[pattern], dtype=np.float32)
    tracer = draft % 5 == 1
    beam = u + 0.70 * v - (0.91 + 0.15 * np.cos(2 * np.pi * (beat - 0.316)))
    light = 0.60 + 0.40 * np.exp(-4.5 * beam * beam)
    ridge_center = gx - gy - pick - 0.44
    ridge_highlight = 0.5 + 0.5 * np.cos(np.pi * 0.5 * ridge_center)
    central_ridge = gx - gy + takeup - 4.44
    ridge = 1 if pattern != "twill" else (0.73 + 0.38 * smooth(0.04, 0.85, ridge_highlight)) * (
        0.93 + 0.17 * np.exp(-0.085 * central_ridge * central_ridge)
    )
    warp_twist = gy + pick
    ply_w = 47 * warp_x + 5.2 * warp_twist + 0.71 * col + 0.55 * np.sin(3 * warp_twist + col)
    ply_f = 52 * weft_y - 5 * gx + 0.62 * draft + 0.55 * np.sin(3.1 * gx - draft)
    fibre_warp = (0.053 * np.sin(ply_w) + 0.020 * np.sin(ply_w * 1.82 + warp_twist) * edge_detail) * edge_detail
    fibre_weft = (0.058 * np.sin(ply_f) + 0.021 * np.sin(ply_f * 1.77 - gx) * edge_detail) * edge_detail
    warp_shade = (0.34 + warp_round * 0.57 - 0.11 * wx * warp_round + fibre_warp - 0.057 * warp_press)
    warp_shade *= light * ridge * (1 + 0.42 * split * spread)
    weft_shade = (0.34 + weft_round * 0.59 - 0.08 * wy * weft_round + fibre_weft - 0.045 * weft_press)
    weft_shade *= light * ridge
    sheen = (0.145 if pattern == "satin" else 0.026) * warp_round ** 2 * light
    warp_color = warp_dye * warp_shade[..., None] + (sheen * (1 - 0.5 * spread))[..., None]
    weft_color = mix(weft_dye, accent, (0.81 * tracer + 0.19 * nose * (row == active))[..., None])
    weft_color *= weft_shade[..., None]

    laid_edge = seam + (1 - joined)
    y_edge = smooth(0.2, 1.4, laid_edge)[..., None]
    x_edge = smooth(-0.53, -0.36, gx) * (1 - smooth(17.33, 17.58, gx))
    paper = np.array((0.86, 0.80, 0.70)) * (0.89 + 0.10 * light + 0.026 * np.sin(11 * px - 8 * py))[..., None]
    recess = np.array((0.11, 0.085, 0.064)) * (0.8 + 0.2 * light)[..., None]
    ground = mix(recess, paper, y_edge)
    warp_cover = warp_cover[..., None]
    weft_cover = weft_cover[..., None]
    warp_layer = mix(mix(ground, weft_color * (1 - 0.59 * warp_cover), weft_cover), warp_color, warp_cover)
    weft_layer = mix(mix(ground, warp_color * (1 - 0.40 * weft_cover), warp_cover), weft_color, weft_cover)
    woven = np.where(warp_on_top(col, draft, pattern)[..., None], warp_layer, weft_layer)
    loose_thread = mix(paper * (1 - 0.20 * warp_cover), warp_color, warp_cover * 0.95)
    art = mix(woven, loose_thread, y_edge)
    falloff = ((1 - 0.82 * smooth(1, 5.7, laid_edge)) * x_edge)[..., None]
    return Image.fromarray(np.uint8(np.clip(mix(paper, art, falloff), 0, 1) * 255))


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
        poster = "cover" if name == "twill" else name
        paint(1200, 800, name).save(OUTPUT / f"{poster}.webp", quality=89, method=6)
        paint(640, 440, name, macro=True).save(OUTPUT / f"{name}-macro.webp", quality=91, method=6)
    paint(1200, 800, "twill", seconds=0).save(OUTPUT / "shuttle-start.webp", quality=89, method=6)
