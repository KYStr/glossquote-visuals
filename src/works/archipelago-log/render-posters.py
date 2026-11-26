"""Bake mathematically matched aerial coral lagoon plates & icon for V016 archipelago-log."""
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

    arc_dist = np.sqrt(((px + 0.22) * 0.88) ** 2 + ((py + 0.04) * 1.18) ** 2) - 0.25
    bite = np.sqrt((px + 0.04) ** 2 + (py - 0.06) ** 2) - 0.21
    main_island = np.maximum(arc_dist, -bite)
    shoal = np.sqrt(((px - 0.38) * 0.82) ** 2 + ((py + 0.22) * 1.25) ** 2) - 0.14
    wobble = 0.022 * np.sin(px * 14.0 + py * 9.0) + 0.011 * np.cos(py * 23.0 - px * 16.0)
    land_signed = np.minimum(main_island, shoal) + wobble
    depth = np.maximum(land_signed, 0.0)

    if sea == 0:
        deep_col = np.array([0.032, 0.19, 0.34], dtype=np.float32)
        mid_col = np.array([0.06, 0.49, 0.57], dtype=np.float32)
        shallow_col = np.array([0.36, 0.80, 0.78], dtype=np.float32)
        sand_col = np.array([0.96, 0.93, 0.86], dtype=np.float32)
        flora_col = np.array([0.24, 0.43, 0.27], dtype=np.float32)
    elif sea == 1:
        deep_col = np.array([0.04, 0.13, 0.30], dtype=np.float32)
        mid_col = np.array([0.09, 0.34, 0.58], dtype=np.float32)
        shallow_col = np.array([0.38, 0.71, 0.80], dtype=np.float32)
        sand_col = np.array([0.94, 0.91, 0.85], dtype=np.float32)
        flora_col = np.array([0.55, 0.56, 0.44], dtype=np.float32)
    else:
        deep_col = np.array([0.05, 0.27, 0.35], dtype=np.float32)
        mid_col = np.array([0.22, 0.64, 0.64], dtype=np.float32)
        shallow_col = np.array([0.60, 0.88, 0.85], dtype=np.float32)
        sand_col = np.array([0.95, 0.94, 0.89], dtype=np.float32)
        flora_col = np.array([0.14, 0.36, 0.20], dtype=np.float32)

    m1 = smoothstep(0.0, 0.16, depth)[..., None]
    m2 = smoothstep(0.14, 0.48, depth)[..., None]
    water = shallow_col * (1.0 - m1) + mid_col * m1
    water = water * (1.0 - m2) + deep_col * m2

    ca = np.sin(px * 26.0 + py * 18.0 + t * 1.4 + 1.2 * np.sin(py * 12.0 - t * 0.9))
    cb = np.sin(px * 19.0 - py * 27.0 - t * 1.1 + 1.1 * np.cos(px * 14.0 + t * 0.8))
    caustic = np.power(np.clip(0.5 + 0.5 * ca * cb, 0.0, 1.0), 4.0) * (1.0 - smoothstep(0.04, 0.34, depth))
    water += np.array([0.26, 0.34, 0.32], dtype=np.float32) * (caustic * 0.65)[..., None]

    surf_phase = np.mod(depth * 24.0 - t * 0.42, 1.0)
    surf_line = np.exp(-(((surf_phase - 0.5) * 9.0) ** 2)) * (1.0 - smoothstep(0.0, 0.065, depth)) * smoothstep(0.0, 0.006, depth)
    shore_foam = np.exp(-depth * 75.0) * 0.72
    foam = np.clip(surf_line * 0.55 + shore_foam, 0.0, 0.88)[..., None]
    water = water * (1.0 - foam) + np.array([0.97, 0.98, 0.99], dtype=np.float32) * foam

    gx = 1.0 - smoothstep(0.0, 0.0028, np.abs(np.mod(px * 3.0 + 0.5, 1.0) - 0.5))
    gy = 1.0 - smoothstep(0.0, 0.0028, np.abs(np.mod(py * 3.0 + 0.5, 1.0) - 0.5))
    water += np.maximum(gx, gy)[..., None] * np.array([0.10, 0.16, 0.18], dtype=np.float32) * 0.38

    route_y = 0.24 - 0.18 * np.sin((px + 0.45) * 2.1)
    route_dash = smoothstep(0.35, 0.55, np.sin(px * 46.0))
    route_line = (1.0 - smoothstep(0.002, 0.0045, np.abs(py - route_y))) * route_dash * smoothstep(0.02, 0.06, depth)
    water = water * (1.0 - (route_line * 0.58)[..., None]) + np.array([0.98, 0.96, 0.90], dtype=np.float32) * (route_line * 0.58)[..., None]

    land_mask = (1.0 - smoothstep(-feather, feather, land_signed))
    inland = np.maximum(-land_signed, 0.0)
    wt = smoothstep(0.0, 0.022, inland)[..., None]
    wet_sand = (sand_col * 0.84) * (1.0 - wt) + sand_col * wt
    flora_mask = smoothstep(0.032, 0.068, inland + 0.012 * np.sin(px * 34.0) * np.cos(py * 34.0))[..., None]
    canopy = (0.84 + 0.18 * np.sin(px * 65.0) * np.cos(py * 65.0))[..., None]
    land = wet_sand * (1.0 - flora_mask) + (flora_col * canopy) * flora_mask

    out = water * (1.0 - land_mask[..., None]) + land * land_mask[..., None]

    boat_x = -0.48 + 0.96 * cyc
    boat_y = 0.24 - 0.18 * np.sin((boat_x + 0.45) * 2.1)
    slope = -0.18 * 2.1 * np.cos((boat_x + 0.45) * 2.1)
    heading = np.arctan2(slope, 1.0)
    ch, sh = np.cos(heading), np.sin(heading)
    rx, ry = px - boat_x, py - boat_y
    bx = rx * ch + ry * sh
    by = -rx * sh + ry * ch

    behind = smoothstep(0.0, -0.02, bx) * smoothstep(-0.34, -0.02, bx)
    wake_spread = -bx * 0.24 + 0.014
    wake_edge = np.exp(-(((np.abs(by) - wake_spread) * 70.0) ** 2)) * behind * np.exp(np.minimum(bx, 0.0) * 6.0)
    wk = (wake_edge * 0.52 * (1.0 - land_mask))[..., None]
    out = out * (1.0 - wk) + np.array([0.95, 0.98, 0.99], dtype=np.float32) * wk

    sh_hull = 1.0 - smoothstep(0.022, 0.032, np.sqrt(((bx + 0.012) * 0.65) ** 2 + ((by + 0.016) * 1.4) ** 2))
    out *= (1.0 - sh_hull * 0.22 * (1.0 - land_mask))[..., None]

    hull_l = np.sqrt((bx * 0.48) ** 2 + ((by - 0.012) * 3.8) ** 2) - 0.022
    hull_r = np.sqrt((bx * 0.48) ** 2 + ((by + 0.012) * 3.8) ** 2) - 0.022
    deck = np.maximum(np.abs(bx + 0.005) - 0.022, np.abs(by) - 0.014)
    boat_mask = (1.0 - smoothstep(-feather, feather, np.minimum(np.minimum(hull_l, hull_r), deck)))[..., None]
    out = out * (1.0 - boat_mask) + np.array([0.99, 0.98, 0.96], dtype=np.float32) * boat_mask

    sail = (1.0 - smoothstep(-feather, feather, np.sqrt(((bx + 0.006) * 0.9) ** 2 + (by * 2.2) ** 2) - 0.012)) * 0.85
    out = out * (1.0 - sail[..., None]) + np.array([0.84, 0.39, 0.25], dtype=np.float32) * sail[..., None]

    return Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("miyako", "cyclades", "palau")):
        render_plate(1200, 800, sea=idx, t=5.4).save(media / f"{name}.webp", quality=90, method=6)
    render_plate(1200, 800, sea=0, t=5.4).save(media / "cover.webp", quality=90, method=6)
    render_plate(128, 128, sea=0, t=5.4).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked archipelago-log posters and icon.")
