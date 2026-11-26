"""Bake mathematically matched Swiss topographic relief plates & icon for V017 contour-expedition."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/contour-expedition"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def height_field(px, py, region):
    if region == 0:
        d1x, d1y = (px - 0.08) * 1.6, (py + 0.06) * 2.1
        d2x, d2y = (px + 0.28) * 2.1, (py - 0.10) * 2.2
        return 0.92 * np.exp(-(d1x * d1x + d1y * d1y)) \
            + 0.62 * np.exp(-(d2x * d2x + d2y * d2y)) \
            + 0.10 * np.sin(px * 7.5 + py * 4.2) * np.cos(py * 6.5 - px * 3.1) \
            + 0.04 * np.sin(px * 16.0 - py * 14.0)
    if region == 1:
        s = py - 0.42 * px
        return 0.88 * np.exp(-s * s * 14.0) * np.exp(-px * px * 2.0) \
            + 0.36 * np.exp(-np.sqrt((px - 0.28) ** 2 + (py - 0.12) ** 2) * 4.6) \
            + 0.09 * np.sin(px * 10.0 - py * 8.0) * np.cos(py * 9.0) \
            + 0.045 * np.cos(px * 18.0 + py * 15.0)
    return 0.98 * np.exp(-np.sqrt((px - 0.12) ** 2 + (py + 0.05) ** 2) * 3.4) \
        + 0.56 * np.exp(-np.sqrt((px + 0.24) ** 2 + (py + 0.14) ** 2) * 4.1) \
        + 0.11 * np.sin(px * 9.0 + py * 7.0) * np.cos(px * 5.0 - py * 11.0)


def render_plate(width, height, region=0, progress=0.82):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect
    py = (uv_y - 0.50)
    feather = 1.6 / max(180.0, height)
    eps = 0.004

    h0 = height_field(px, py, region)
    hx = height_field(px + eps, py, region)
    hy = height_field(px, py + eps, region)

    gx, gy = (hx - h0) / eps, (hy - h0) / eps
    nx, ny, nz = -gx * 0.42, -gy * 0.42, np.ones_like(h0)
    nlen = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / nlen, ny / nlen, nz / nlen

    sun_angle = -2.15
    L = np.array([np.cos(sun_angle) * 0.78, np.sin(sun_angle) * 0.78, 0.62], dtype=np.float32)
    L /= np.linalg.norm(L)
    shade = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0.0, 1.0)

    valley_col = np.array([0.76, 0.82, 0.83], dtype=np.float32) if region == 2 else np.array([0.81, 0.84, 0.78], dtype=np.float32)
    rock_col = np.array([0.86, 0.84, 0.79], dtype=np.float32)
    snow_col = np.array([0.96, 0.97, 0.98], dtype=np.float32)

    t1 = smoothstep(0.22, 0.55, h0)[..., None]
    t2 = smoothstep(0.62, 0.86, h0)[..., None]
    terrain = valley_col * (1.0 - t1) + rock_col * t1
    terrain = terrain * (1.0 - t2) + snow_col * t2
    hill_tint = np.array([0.68, 0.74, 0.78], dtype=np.float32) * (1.0 - shade[..., None]) \
        + np.array([1.04, 1.01, 0.95], dtype=np.float32) * shade[..., None]
    col = terrain * hill_tint

    slope_mag = np.maximum(np.sqrt(gx * gx + gy * gy), 0.35)
    minor_p = np.abs(np.mod(h0 * 18.0 + 0.5, 1.0) - 0.5) / (slope_mag * 0.045)
    major_p = np.abs(np.mod(h0 * 3.6 + 0.5, 1.0) - 0.5) / (slope_mag * 0.011)
    minor_l = 1.0 - smoothstep(0.18, 0.48, minor_p)
    major_l = 1.0 - smoothstep(0.16, 0.44, major_p)
    ct = smoothstep(0.66, 0.82, h0)[..., None]
    contour_col = np.array([0.45, 0.38, 0.30], dtype=np.float32) * (1.0 - ct) + np.array([0.26, 0.44, 0.58], dtype=np.float32) * ct
    cmask = np.clip(minor_l * 0.32 + major_l * 0.62, 0.0, 0.78)[..., None]
    col = col * (1.0 - cmask) + contour_col * cmask

    ux = 1.0 - smoothstep(0.0, 0.0022, np.abs(np.mod(px * 3.5 + 0.5, 1.0) - 0.5))
    uy = 1.0 - smoothstep(0.0, 0.0022, np.abs(np.mod(py * 3.5 + 0.5, 1.0) - 0.5))
    utm = np.maximum(ux, uy)[..., None] * 0.14
    col = col * (1.0 - utm) + np.array([0.22, 0.28, 0.25], dtype=np.float32) * utm

    if region == 0:
        start_x, start_y, end_x, end_y = -0.44, 0.24, 0.08, -0.06
        arc_amp, wiggle_amp, wiggle_freq = -0.085, 0.024, 9.42
    elif region == 1:
        start_x, start_y, end_x, end_y = -0.46, -0.20, 0.36, 0.15
        arc_amp, wiggle_amp, wiggle_freq = 0.055, 0.028, 12.56
    else:
        start_x, start_y, end_x, end_y = 0.48, 0.26, 0.12, -0.05
        arc_amp, wiggle_amp, wiggle_freq = 0.11, 0.020, 6.28

    tp = np.clip((px - start_x) / (end_x - start_x), 0.0, 1.0)
    path_y = (start_y * (1.0 - tp) + end_y * tp) + arc_amp * np.sin(tp * np.pi) + wiggle_amp * np.sin(tp * wiggle_freq)
    path_dist = np.abs(py - path_y)
    in_span = ((px >= min(start_x, end_x)) & (px <= max(start_x, end_x))).astype(np.float32)
    revealed = 1.0 - smoothstep(progress - 0.02, progress + 0.02, tp)
    dash = smoothstep(0.2, 0.5, np.sin(tp * 52.0))

    orange = np.array([0.84, 0.31, 0.11], dtype=np.float32)
    fl = (1.0 - smoothstep(0.003, 0.0055, path_dist)) * in_span * dash * (1.0 - revealed)
    col = col * (1.0 - (fl * 0.45)[..., None]) + np.array([0.22, 0.25, 0.22], dtype=np.float32) * (fl * 0.45)[..., None]

    al = ((1.0 - smoothstep(0.0045, 0.0085, path_dist)) * in_span * revealed)[..., None]
    col = col * (1.0 - al) + orange * al

    base_d = np.sqrt((px - start_x) ** 2 + (py - start_y) ** 2)
    base_ring = ((1.0 - smoothstep(0.015, 0.019, base_d)) * smoothstep(0.007, 0.010, base_d))[..., None]
    col = col * (1.0 - base_ring) + np.array([0.11, 0.17, 0.15], dtype=np.float32) * base_ring

    sx, sy = px - end_x, py - end_y
    tri_d = np.maximum(np.abs(sx) * 0.866 + sy * 0.5, -sy) - 0.016
    smark = (1.0 - smoothstep(-feather, feather, tri_d))[..., None]
    col = col * (1.0 - smark) + orange * smark

    tip_x = start_x + (end_x - start_x) * progress
    tip_y = (start_y * (1.0 - progress) + end_y * progress) + arc_amp * np.sin(progress * np.pi) + wiggle_amp * np.sin(progress * wiggle_freq)
    tip_d = np.sqrt((px - tip_x) ** 2 + (py - tip_y) ** 2)
    col += orange * (np.exp(-tip_d * 34.0) * 0.45)[..., None]
    tdot = (1.0 - smoothstep(0.010, 0.014, tip_d))[..., None]
    col = col * (1.0 - tdot) + np.array([1.0, 0.98, 0.95], dtype=np.float32) * tdot

    return Image.fromarray((np.clip(col, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("montblanc", "alps", "patagonia")):
        render_plate(1200, 800, region=idx, progress=0.82).save(media / f"{name}.webp", quality=90, method=6)
    render_plate(1200, 800, region=0, progress=0.82).save(media / "cover.webp", quality=90, method=6)
    render_plate(128, 128, region=0, progress=0.82).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked contour-expedition posters and icon.")
