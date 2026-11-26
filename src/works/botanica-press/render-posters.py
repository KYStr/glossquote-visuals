"""Bake mathematically matched cyanotype botanical plates & icon for V014 botanica-press."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/botanica-press"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def render_plate(width, height, specimen=0, exposure=0.96, sun_pos=0.18):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect
    py = (uv_y - 0.50)
    feather = 1.6 / max(180.0, height)

    grain = 0.5 + 0.5 * np.sin(px * 16.0 + 2.0 * np.sin(py * 5.0)) * np.cos(py * 52.0)
    plen = np.sqrt(px * px + py * py)
    col = np.array([0.84, 0.77, 0.67], dtype=np.float32) * (0.94 + 0.05 * grain - 0.08 * plen)[..., None]

    paper_dist = np.maximum(np.abs(px) - 0.60, np.abs(py) - 0.42)
    paper_mask = 1.0 - smoothstep(-feather, feather, paper_dist)

    shadow_dist = np.maximum(np.abs(px - 0.018) - 0.60, np.abs(py - 0.022) - 0.42)
    sheet_shadow = np.exp(-np.maximum(shadow_dist, 0.0) * 32.0) * smoothstep(0.08, -0.01, shadow_dist)
    col *= (1.0 - 0.24 * sheet_shadow)[..., None]

    fiber = np.mod(np.sin(np.floor(px * 260.0) * 127.1 + np.floor(py * 260.0) * 311.7) * 43758.5453, 1.0)
    paper_base = np.array([0.965, 0.952, 0.922], dtype=np.float32) - np.array([0.022, 0.020, 0.018], dtype=np.float32) * fiber[..., None]

    bristle_x = 0.008 * np.sin(py * 85.0) + 0.006 * np.cos(py * 210.0 + 1.1) + 0.005 * np.sin(py * 19.0)
    bristle_y = 0.006 * np.cos(px * 72.0 + 0.5) + 0.004 * np.sin(px * 165.0) + 0.004 * np.cos(px * 16.0)
    brush_x = 0.515 + bristle_x
    brush_y = 0.345 + bristle_y
    coat_dist = np.maximum(np.abs(px) - brush_x, np.abs(py) - brush_y)
    coat_mask = 1.0 - smoothstep(-0.005, 0.006, coat_dist)

    if specimen == 0:
        gx, gy = px, py - 0.14
        gr = np.sqrt(gx * gx + gy * gy)
        ga = np.arctan2(-gy, gx) - np.pi * 0.5
        side_dist = (np.abs(ga) - 0.96) * np.maximum(gr, 0.02)
        in_angle = 1.0 - smoothstep(-feather, feather, side_dist)
        cleft = 0.14 * np.exp(-ga * ga * 42.0)
        scallop = 0.014 * np.sin(ga * 14.0) + 0.007 * np.cos(ga * 27.0)
        outer = 0.44 - cleft + scallop
        blade = in_angle * (1.0 - smoothstep(-feather, feather, gr - outer)) * smoothstep(0.0, 0.012, -gy + 0.008)
        stem_curve = 0.04 * np.sin((py - 0.14) * 7.0)
        stem = (1.0 - smoothstep(0.007, 0.011, np.abs(px - stem_curve))) * smoothstep(0.11, 0.135, py) * (1.0 - smoothstep(0.32, 0.34, py))
        leaf_mask = np.maximum(blade, stem)
        vein_mask = blade * np.power(0.5 + 0.5 * np.cos(ga * 46.0), 8.0) * smoothstep(0.05, 0.36, gr)
    elif specimen == 1:
        curve_x = 0.08 * np.sin(py * 4.5 + 0.4)
        fx, fy = px - curve_x, py
        stem = (1.0 - smoothstep(0.0045, 0.008, np.abs(fx))) * smoothstep(-0.31, -0.29, fy) * (1.0 - smoothstep(0.31, 0.33, fy))
        taper = np.clip(1.0 - (fy + 0.30) * 1.15, 0.18, 1.0) * smoothstep(0.30, 0.18, fy)
        y_off = fy * 15.0 + np.where(fx >= 0.0, 0.5, 0.0)
        cell_y = np.mod(y_off, 1.0) - 0.5
        leaf_len = 0.25 * taper
        local_x = (np.abs(fx) - 0.015) / np.maximum(leaf_len, 0.02)
        local_y = (cell_y + local_x * 0.22) * 2.1
        pinna_dist = np.sqrt(((local_x - 0.5) * 1.9) ** 2 + local_y ** 2) - 0.82
        pinnae = (1.0 - smoothstep(-0.08, 0.08, pinna_dist)) * smoothstep(0.0, 0.05, local_x) * smoothstep(-0.31, -0.26, fy) * (1.0 - smoothstep(0.27, 0.31, fy))
        leaf_mask = np.maximum(stem, pinnae)
        vein_mask = pinnae * (1.0 - smoothstep(0.0, 0.14, np.abs(local_y)))
    else:
        curve_x = 0.055 * np.sin(py * 5.2 - 0.3)
        ex, ey = px - curve_x, py
        stem = (1.0 - smoothstep(0.0055, 0.009, np.abs(ex))) * smoothstep(-0.32, -0.30, ey) * (1.0 - smoothstep(0.31, 0.33, ey))
        leaves = np.zeros_like(px)
        midribs = np.zeros_like(px)
        for cy, rad in ((-0.20, 0.058), (-0.07, 0.076), (0.07, 0.084), (0.20, 0.072)):
            dl = np.sqrt(((ex + rad * 1.15) * 0.95) ** 2 + ((ey - (cy - 0.015)) * 1.12) ** 2) - rad
            dr = np.sqrt(((ex - rad * 1.15) * 0.95) ** 2 + ((ey - (cy + 0.015)) * 1.12) ** 2) - rad
            ml = 1.0 - smoothstep(-feather, feather, dl)
            mr = 1.0 - smoothstep(-feather, feather, dr)
            leaves = np.maximum(leaves, np.maximum(ml, mr))
            midribs = np.maximum(midribs, (ml + mr) * (1.0 - smoothstep(0.0, 0.008, np.abs(ey - cy))))
        leaf_mask = np.maximum(stem, leaves)
        vein_mask = midribs

    diag = px * 0.72 + py * 0.52
    local_uv = np.clip(exposure * 1.25 - (diag - sun_pos) * 0.38, 0.0, 1.0)
    unexposed = np.array([0.84, 0.85, 0.62], dtype=np.float32)
    mid_tone = np.array([0.18, 0.44, 0.50], dtype=np.float32)
    prussian = np.array([0.068, 0.195, 0.365], dtype=np.float32) * (0.94 + 0.08 * np.sin(px * 22.0 + py * 17.0))[..., None]

    t1 = smoothstep(0.0, 0.48, local_uv)[..., None]
    t2 = smoothstep(0.35, 1.0, local_uv)[..., None]
    emulsion = unexposed * (1.0 - t1) + mid_tone * t1
    emulsion = emulsion * (1.0 - t2) + prussian * t2

    lm = (leaf_mask * 0.92)[..., None]
    print_tone = emulsion * (1.0 - lm) + (paper_base + np.array([0.01, 0.01, 0.015], dtype=np.float32)) * lm
    vm = (vein_mask * 0.48)[..., None]
    veined = print_tone * (1.0 - vm) + (paper_base * 0.66 + mid_tone * 0.34) * vm

    sheet_col = paper_base * (1.0 - coat_mask[..., None]) + veined * coat_mask[..., None]
    sun_band = np.exp(-((diag - sun_pos) ** 2) * 14.0) * 0.14
    glass_bevel = np.exp(-np.abs(paper_dist + 0.016) * 140.0) * 0.28 * paper_mask
    sheet_col += np.array([1.0, 0.96, 0.84], dtype=np.float32) * (sun_band + glass_bevel)[..., None]

    out = col * (1.0 - paper_mask[..., None]) + sheet_col * paper_mask[..., None]
    return Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("ginkgo", "fern", "eucalyptus")):
        render_plate(1200, 800, specimen=idx, exposure=0.96, sun_pos=0.18).save(media / f"{name}.webp", quality=90, method=6)
    render_plate(1200, 800, specimen=0, exposure=0.88, sun_pos=-0.05).save(media / "cover.webp", quality=90, method=6)
    render_plate(128, 128, specimen=0, exposure=0.96, sun_pos=0.15).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked botanica-press posters and icon.")
