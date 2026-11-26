"""Bake mathematically matched Swiss Imhof topographic relief plates & icon for V017 contour-expedition."""
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
    ra = np.sin(px * 6.8 + 1.15 * np.sin(py * 5.2)) * np.cos(py * 7.2 - 0.95 * np.cos(px * 4.8))
    rb = np.sin(px * 14.5 - py * 11.5 + 0.8 * np.cos(px * 9.0)) * np.cos(py * 13.0 + px * 8.5)
    if region == 0:
        d1x, d1y = (px - 0.08) * 1.55, (py + 0.06) * 2.05
        d2x, d2y = (px + 0.28) * 2.05, (py - 0.10) * 2.15
        m = 0.88 * np.exp(-(d1x * d1x + d1y * d1y)) + 0.60 * np.exp(-(d2x * d2x + d2y * d2y))
        return m + (0.095 * ra + 0.036 * rb) * (0.40 + 0.60 * m)
    if region == 1:
        s = py - 0.42 * px
        m = 0.86 * np.exp(-s * s * 14.5) * np.exp(-px * px * 1.9) \
            + 0.38 * np.exp(-np.sqrt((px - 0.32) ** 2 + (py - 0.14) ** 2) * 4.5)
        return m + (0.092 * ra + 0.038 * rb) * (0.35 + 0.65 * m)
    m = 0.95 * np.exp(-np.sqrt((px - 0.12) ** 2 + (py + 0.05) ** 2) * 3.3) \
        + 0.56 * np.exp(-np.sqrt((px + 0.24) ** 2 + (py + 0.14) ** 2) * 4.0)
    return m + (0.098 * ra + 0.038 * rb) * (0.35 + 0.65 * m)


def render_plate(width, height, region=0, progress=0.76):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect
    py = (uv_y - 0.50)
    feather = 1.6 / max(180.0, height)
    eps = 0.0038

    h0 = height_field(px, py, region)
    hx = height_field(px + eps, py, region)
    hy = height_field(px, py + eps, region)

    gx, gy = (hx - h0) / eps, (hy - h0) / eps
    nx, ny, nz = -gx * 0.55, -gy * 0.55, np.ones_like(h0)
    nlen = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / nlen, ny / nlen, nz / nlen

    sun_angle = -2.25
    L = np.array([np.cos(sun_angle) * 0.82, np.sin(sun_angle) * 0.82, 0.58], dtype=np.float32)
    L /= np.linalg.norm(L)
    shade = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0.0, 1.0)

    valley_col = np.array([0.72, 0.79, 0.81], dtype=np.float32) if region == 2 else np.array([0.76, 0.80, 0.75], dtype=np.float32)
    rock_col = np.array([0.84, 0.82, 0.77], dtype=np.float32)
    snow_col = np.array([0.965, 0.975, 0.985], dtype=np.float32)

    t1 = smoothstep(0.24, 0.56, h0)[..., None]
    t2 = smoothstep(0.64, 0.86, h0)[..., None]
    terrain = valley_col * (1.0 - t1) + rock_col * t1
    terrain = terrain * (1.0 - t2) + snow_col * t2
    sh_s = smoothstep(0.08, 0.92, shade)[..., None]
    hill_tint = np.array([0.58, 0.66, 0.74], dtype=np.float32) * (1.0 - sh_s) \
        + np.array([1.06, 1.02, 0.94], dtype=np.float32) * sh_s
    col = terrain * hill_tint

    slope_mag = np.maximum(np.sqrt(gx * gx + gy * gy), 0.38)
    minor_p = np.abs(np.mod(h0 * 19.0 + 0.5, 1.0) - 0.5) / (slope_mag * 0.042)
    major_p = np.abs(np.mod(h0 * 3.8 + 0.5, 1.0) - 0.5) / (slope_mag * 0.011)
    minor_l = 1.0 - smoothstep(0.16, 0.44, minor_p)
    major_l = 1.0 - smoothstep(0.14, 0.40, major_p)
    ct = smoothstep(0.66, 0.84, h0)[..., None]
    contour_col = np.array([0.42, 0.35, 0.28], dtype=np.float32) * (1.0 - ct) + np.array([0.22, 0.43, 0.58], dtype=np.float32) * ct
    cmask = np.clip(minor_l * 0.28 + major_l * 0.58, 0.0, 0.74)[..., None]
    col = col * (1.0 - cmask) + contour_col * cmask

    ux = 1.0 - smoothstep(0.0, 0.002, np.abs(np.mod(px * 3.5 + 0.5, 1.0) - 0.5))
    uy = 1.0 - smoothstep(0.0, 0.002, np.abs(np.mod(py * 3.5 + 0.5, 1.0) - 0.5))
    utm = np.maximum(ux, uy)[..., None] * 0.13
    col = col * (1.0 - utm) + np.array([0.16, 0.22, 0.20], dtype=np.float32) * utm
    border_d = np.maximum(np.abs(px) - aspect * 0.475, np.abs(py) - 0.455)
    neat = ((1.0 - smoothstep(0.001, 0.003, np.abs(border_d))) * 0.42)[..., None]
    col = col * (1.0 - neat) + np.array([0.15, 0.20, 0.18], dtype=np.float32) * neat

    if region == 0:
        start_x, start_y, end_x, end_y = -0.44, 0.24, 0.08, -0.06
        arc_amp, wiggle_amp, wiggle_freq = -0.085, 0.012, 6.283185
    elif region == 1:
        start_x, start_y, end_x, end_y = -0.46, -0.20, 0.36, 0.15
        arc_amp, wiggle_amp, wiggle_freq = 0.055, 0.012, 6.283185
    else:
        start_x, start_y, end_x, end_y = 0.48, 0.26, 0.12, -0.05
        arc_amp, wiggle_amp, wiggle_freq = 0.105, 0.010, 6.283185

    span_x = end_x - start_x
    tp = np.clip((px - start_x) / span_x, 0.0, 1.0)
    path_y = (start_y * (1.0 - tp) + end_y * tp) + arc_amp * np.sin(tp * np.pi) + wiggle_amp * np.sin(tp * wiggle_freq)
    path_dist = np.abs(py - path_y)
    in_span = ((px >= min(start_x, end_x)) & (px <= max(start_x, end_x))).astype(np.float32)
    revealed = 1.0 - smoothstep(progress - 0.018, progress + 0.018, tp)
    dash = smoothstep(0.25, 0.55, np.sin(tp * 54.0))

    vermilion = np.array([0.79, 0.24, 0.09], dtype=np.float32)
    ink_dark = np.array([0.09, 0.13, 0.12], dtype=np.float32)
    ivory = np.array([0.98, 0.97, 0.94], dtype=np.float32)

    casing = ((1.0 - smoothstep(0.007, 0.011, path_dist)) * in_span * revealed * 0.55)[..., None]
    col = col * (1.0 - casing) + ivory * casing

    fl = ((1.0 - smoothstep(0.0025, 0.0048, path_dist)) * in_span * dash * (1.0 - revealed) * 0.42)[..., None]
    col = col * (1.0 - fl) + ink_dark * fl

    al = ((1.0 - smoothstep(0.0038, 0.0072, path_dist)) * in_span * revealed)[..., None]
    col = col * (1.0 - al) + vermilion * al

    base_d = np.sqrt((px - start_x) ** 2 + (py - start_y) ** 2)
    base_fill = ((1.0 - smoothstep(0.007, 0.010, base_d)) * 0.92)[..., None]
    base_ring = ((1.0 - smoothstep(0.015, 0.019, base_d)) * smoothstep(0.009, 0.012, base_d))[..., None]
    col = col * (1.0 - base_fill) + ivory * base_fill
    col = col * (1.0 - base_ring) + ink_dark * base_ring

    # Route-aligned directional summit chevron pointing along arrival tangent (t = 1).
    dtx = span_x
    dty = (end_y - start_y) - arc_amp * np.pi + wiggle_amp * wiggle_freq * np.cos(wiggle_freq)
    flen = np.hypot(dtx, dty)
    fx, fy = dtx / flen, dty / flen
    rx, ry = -fy, fx
    sx, sy = px - end_x, py - end_y
    lu = sx * fx + sy * fy
    lv = sx * rx + sy * ry
    tip_u = lu - 0.014
    arrow_d = np.maximum(np.maximum(np.abs(lv) + tip_u * 0.62, -(lu + 0.018)), -((lu + 0.012) - np.abs(lv) * 0.38))
    arrow_halo = ((1.0 - smoothstep(0.002, 0.007, arrow_d)) * 0.85)[..., None]
    arrow_fill = (1.0 - smoothstep(-feather, feather, arrow_d))[..., None]
    col = col * (1.0 - arrow_halo) + ivory * arrow_halo
    col = col * (1.0 - arrow_fill) + vermilion * arrow_fill

    tip_fade = float(smoothstep(0.0, 0.05, progress) * (1.0 - smoothstep(0.84, 0.96, progress)))
    if tip_fade > 0.001:
        tip_x = start_x + span_x * progress
        tip_y = (start_y * (1.0 - progress) + end_y * progress) + arc_amp * np.sin(progress * np.pi) + wiggle_amp * np.sin(progress * wiggle_freq)
        tip_d = np.sqrt((px - tip_x) ** 2 + (py - tip_y) ** 2)
        tring = ((1.0 - smoothstep(0.012, 0.016, tip_d)) * tip_fade * 0.88)[..., None]
        tdot = ((1.0 - smoothstep(0.006, 0.009, tip_d)) * tip_fade)[..., None]
        col = col * (1.0 - tring) + vermilion * tring
        col = col * (1.0 - tdot) + np.array([0.99, 0.98, 0.96], dtype=np.float32) * tdot

    return Image.fromarray((np.clip(col, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("montblanc", "alps", "patagonia")):
        render_plate(1200, 800, region=idx, progress=0.76).save(media / f"{name}.webp", quality=90, method=6)
    render_plate(1200, 800, region=0, progress=0.76).save(media / "cover.webp", quality=90, method=6)
    render_plate(128, 128, region=0, progress=0.76).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked contour-expedition posters and icon.")
