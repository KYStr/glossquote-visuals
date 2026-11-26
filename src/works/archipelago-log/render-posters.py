"""Bake mathematically matched luxury hydrographic lagoon plates & icon for V016 archipelago-log."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/archipelago-log"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def render_plate(width, height, sea=0, t=5.4):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect
    py = (uv_y - 0.50)
    feather = 1.6 / max(180.0, height)
    cyc = (t * 0.1) % 1.0

    wobble = 0.018 * np.sin(px * 13.0 + py * 8.5) + 0.009 * np.cos(py * 21.0 - px * 15.0 + 0.7) + 0.004 * np.sin(px * 37.0 + py * 29.0)
    if sea == 0:
        arc_dist = np.sqrt(((px + 0.24) * 0.88) ** 2 + ((py + 0.04) * 1.18) ** 2) - 0.25
        bite = np.sqrt((px + 0.06) ** 2 + (py - 0.06) ** 2) - 0.21
        main_island = np.maximum(arc_dist, -bite)
        shoal = np.sqrt(((px - 0.38) * 0.82) ** 2 + ((py + 0.22) * 1.25) ** 2) - 0.14
        land_signed = np.minimum(main_island, shoal) + wobble
    elif sea == 1:
        cal_outer = np.sqrt(((px - 0.28) * 0.95) ** 2 + ((py - 0.08) * 1.05) ** 2) - 0.27
        cal_bay = np.sqrt((px - 0.11) ** 2 + (py - 0.05) ** 2) - 0.19
        caldera = np.maximum(cal_outer, -cal_bay)
        islet_a = np.sqrt(((px + 0.42) * 1.05) ** 2 + ((py + 0.24) * 1.25) ** 2) - 0.11
        islet_b = np.sqrt(((px + 0.14) * 1.20) ** 2 + ((py + 0.32) * 1.10) ** 2) - 0.08
        land_signed = np.minimum(caldera, np.minimum(islet_a, islet_b)) + wobble * 0.85
    else:
        r1 = np.sqrt(((px + 0.38) * 1.05) ** 2 + ((py - 0.20) * 1.15) ** 2) - 0.125
        r2 = np.sqrt(((px + 0.16) * 1.10) ** 2 + ((py + 0.24) * 1.20) ** 2) - 0.115
        r3 = np.sqrt(((px - 0.16) * 1.15) ** 2 + ((py + 0.25) * 1.05) ** 2) - 0.12
        r4 = np.sqrt(((px - 0.42) * 1.00) ** 2 + ((py - 0.04) * 1.25) ** 2) - 0.12
        r5 = np.sqrt(((px - 0.12) * 1.05) ** 2 + ((py - 0.28) * 1.25) ** 2) - 0.11
        land_signed = np.minimum(np.minimum(np.minimum(r1, r2), np.minimum(r3, r4)), r5) + wobble * 0.7
    depth = np.maximum(land_signed, 0.0)

    if sea == 0:
        deep_col = np.array([0.038, 0.135, 0.225], dtype=np.float32)
        mid_col = np.array([0.075, 0.335, 0.405], dtype=np.float32)
        shallow_col = np.array([0.285, 0.615, 0.625], dtype=np.float32)
        sand_col = np.array([0.925, 0.892, 0.825], dtype=np.float32)
        flora_col = np.array([0.205, 0.345, 0.235], dtype=np.float32)
    elif sea == 1:
        deep_col = np.array([0.035, 0.095, 0.215], dtype=np.float32)
        mid_col = np.array([0.085, 0.245, 0.435], dtype=np.float32)
        shallow_col = np.array([0.285, 0.545, 0.655], dtype=np.float32)
        sand_col = np.array([0.915, 0.885, 0.825], dtype=np.float32)
        flora_col = np.array([0.435, 0.445, 0.345], dtype=np.float32)
    else:
        deep_col = np.array([0.045, 0.185, 0.255], dtype=np.float32)
        mid_col = np.array([0.165, 0.465, 0.485], dtype=np.float32)
        shallow_col = np.array([0.455, 0.725, 0.705], dtype=np.float32)
        sand_col = np.array([0.920, 0.905, 0.855], dtype=np.float32)
        flora_col = np.array([0.135, 0.305, 0.185], dtype=np.float32)

    m1 = smoothstep(0.0, 0.14, depth)[..., None]
    m2 = smoothstep(0.12, 0.44, depth)[..., None]
    water = shallow_col * (1.0 - m1) + mid_col * m1
    water = water * (1.0 - m2) + deep_col * m2

    isobath = ((1.0 - smoothstep(0.0, 0.045, np.abs(np.mod(depth * 18.0, 1.0) - 0.5))) * (1.0 - smoothstep(0.06, 0.26, depth)) * smoothstep(0.012, 0.025, depth) * 0.22)[..., None]
    water = water * (1.0 - isobath) + (shallow_col * 1.18) * isobath

    ca = np.sin(px * 24.0 + py * 16.0 + t * 1.2 + 1.1 * np.sin(py * 11.0 - t * 0.8))
    cb = np.sin(px * 17.0 - py * 25.0 - t * 0.95 + 1.0 * np.cos(px * 13.0 + t * 0.7))
    caustic = np.power(np.clip(0.5 + 0.5 * ca * cb, 0.0, 1.0), 5.0) * (1.0 - smoothstep(0.04, 0.28, depth))
    water += np.array([0.18, 0.26, 0.26], dtype=np.float32) * (caustic * 0.42)[..., None]

    surf_phase = np.mod(depth * 22.0 - t * 0.38, 1.0)
    surf_line = np.exp(-(((surf_phase - 0.5) * 10.0) ** 2)) * (1.0 - smoothstep(0.0, 0.055, depth)) * smoothstep(0.0, 0.006, depth)
    shore_foam = np.exp(-depth * 85.0) * 0.58
    foam = np.clip(surf_line * 0.42 + shore_foam, 0.0, 0.76)[..., None]
    water = water * (1.0 - foam) + np.array([0.95, 0.96, 0.95], dtype=np.float32) * foam

    gx = 1.0 - smoothstep(0.0, 0.0018, np.abs(np.mod(px * 3.0 + 0.5, 1.0) - 0.5))
    gy = 1.0 - smoothstep(0.0, 0.0018, np.abs(np.mod(py * 3.0 + 0.5, 1.0) - 0.5))
    water += np.maximum(gx, gy)[..., None] * np.array([0.08, 0.14, 0.16], dtype=np.float32) * 0.32

    if sea == 0:
        route_y = 0.24 - 0.18 * np.sin((px + 0.45) * 2.1)
    elif sea == 1:
        route_y = -0.06 + 0.22 * np.sin((px - 0.14) * 2.2) + 0.12 * px
    else:
        route_y = 0.02 + 0.12 * np.sin((px + 0.14) * 3.8)
    route_dash = smoothstep(0.35, 0.55, np.sin(px * 46.0))
    route_line = (1.0 - smoothstep(0.0018, 0.0040, np.abs(py - route_y))) * route_dash * smoothstep(0.02, 0.06, depth)
    water = water * (1.0 - (route_line * 0.55)[..., None]) + np.array([0.95, 0.92, 0.84], dtype=np.float32) * (route_line * 0.55)[..., None]

    land_mask = 1.0 - smoothstep(-feather, feather, land_signed)
    inland = np.maximum(-land_signed, 0.0)
    wt = smoothstep(0.0, 0.024, inland)[..., None]
    wet_sand = (sand_col * 0.82) * (1.0 - wt) + sand_col * wt
    n1 = np.sin(px * 29.0 + py * 17.0) * np.cos(py * 23.0 - px * 13.0)
    n2 = np.sin(px * 53.0 - py * 41.0 + 1.4) * np.cos(px * 31.0 + py * 47.0)
    organic = 0.5 + 0.35 * n1 + 0.15 * n2
    flora_mask = smoothstep(0.026, 0.060, inland + 0.010 * n1)[..., None]
    island_shade = (0.84 + 0.26 * organic + 0.12 * smoothstep(-0.2, 0.2, -(px + py)))[..., None]
    land = wet_sand * (1.0 - flora_mask) + (flora_col * island_shade) * flora_mask
    if sea == 1:
        village_rim = (smoothstep(0.018, 0.042, inland) * (1.0 - smoothstep(0.052, 0.082, inland)) * (px >= 0.06))[..., None] * 0.72
        land = land * (1.0 - village_rim) + np.array([0.95, 0.94, 0.90], dtype=np.float32) * village_rim

    out = water * (1.0 - land_mask[..., None]) + land * land_mask[..., None]

    if sea == 0:
        boat_x = -0.48 + 0.96 * cyc
        boat_y = 0.24 - 0.18 * np.sin((boat_x + 0.45) * 2.1)
        slope = -0.18 * 2.1 * np.cos((boat_x + 0.45) * 2.1)
        heading = np.arctan2(slope, 1.0)
    elif sea == 1:
        boat_x = 0.42 - 0.88 * cyc
        boat_y = -0.06 + 0.22 * np.sin((boat_x - 0.14) * 2.2) + 0.12 * boat_x
        slope = -(0.22 * 2.2 * np.cos((boat_x - 0.14) * 2.2) + 0.12)
        heading = np.arctan2(slope, -1.0)
    else:
        boat_x = -0.50 + 1.00 * cyc
        boat_y = 0.02 + 0.12 * np.sin((boat_x + 0.14) * 3.8)
        slope = 0.12 * 3.8 * np.cos((boat_x + 0.14) * 3.8)
        heading = np.arctan2(slope, 1.0)

    ch, sh = np.cos(heading), np.sin(heading)
    rx, ry = px - boat_x, py - boat_y
    bx = rx * ch + ry * sh
    by = -rx * sh + ry * ch

    behind = smoothstep(0.0, -0.02, bx) * smoothstep(-0.32, -0.02, bx)
    wake_spread = -bx * 0.22 + 0.013
    wake_edge = np.exp(-(((np.abs(by) - wake_spread) * 72.0) ** 2)) * behind * np.exp(np.minimum(bx, 0.0) * 6.5)
    wk = (wake_edge * 0.46 * (1.0 - land_mask))[..., None]
    out = out * (1.0 - wk) + np.array([0.94, 0.96, 0.96], dtype=np.float32) * wk

    sh_hull = 1.0 - smoothstep(0.020, 0.030, np.sqrt(((bx + 0.012) * 0.65) ** 2 + ((by + 0.015) * 1.4) ** 2))
    out *= (1.0 - sh_hull * 0.20 * (1.0 - land_mask))[..., None]

    hull_l = np.sqrt((bx * 0.48) ** 2 + ((by - 0.012) * 3.8) ** 2) - 0.022
    hull_r = np.sqrt((bx * 0.48) ** 2 + ((by + 0.012) * 3.8) ** 2) - 0.022
    deck = np.maximum(np.abs(bx + 0.005) - 0.022, np.abs(by) - 0.014)
    boat_mask = (1.0 - smoothstep(-feather, feather, np.minimum(np.minimum(hull_l, hull_r), deck)))[..., None]
    out = out * (1.0 - boat_mask) + np.array([0.98, 0.97, 0.94], dtype=np.float32) * boat_mask

    sail = (1.0 - smoothstep(-feather, feather, np.sqrt(((bx + 0.006) * 0.9) ** 2 + (by * 2.2) ** 2) - 0.011)) * 0.85
    out = out * (1.0 - sail[..., None]) + np.array([0.76, 0.34, 0.20], dtype=np.float32) * sail[..., None]

    vig = np.clip(1.0 - 0.14 * ((px * 0.85) ** 2 + (py * 1.05) ** 2), 0.78, 1.02)[..., None]
    out *= vig

    return Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("miyako", "cyclades", "palau")):
        render_plate(1200, 800, sea=idx, t=5.4).save(media / f"{name}.webp", quality=90, method=6)
    render_plate(1200, 800, sea=0, t=5.4).save(media / "cover.webp", quality=90, method=6)
    render_plate(128, 128, sea=0, t=5.4).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked archipelago-log posters and icon.")
