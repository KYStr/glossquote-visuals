"""Bake mathematically matched sleeper-train window plates & icon for V015 sleeper-line."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/sleeper-line"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def render_plate(width, height, route=0, travel=1.2):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect
    py = (uv_y - 0.50)
    feather = 1.6 / max(180.0, height)

    qx = np.abs(px) - (0.54 - 0.075)
    qy = np.abs(py + 0.01) - (0.34 - 0.075)
    win_dist = np.sqrt(np.maximum(qx, 0.0) ** 2 + np.maximum(qy, 0.0) ** 2) + np.minimum(np.maximum(qx, qy), 0.0) - 0.075

    inside_win = 1.0 - smoothstep(-feather, feather, win_dist)
    brass_frame = (1.0 - smoothstep(-feather, feather, win_dist - 0.028)) * (1.0 - inside_win)
    inner_bevel = np.exp(-np.abs(win_dist) * 120.0) * 0.65

    wood_grain = 0.5 + 0.5 * np.sin(py * 90.0 + 2.4 * np.sin(px * 12.0)) * np.cos(px * 8.0)
    cabin_glow = np.exp(-np.sqrt((px + 0.48) ** 2 + (py + 0.28) ** 2) * 2.2) * 0.32
    wall = np.array([0.11, 0.065, 0.052], dtype=np.float32) * (0.85 + 0.16 * wood_grain)[..., None] \
        + np.array([0.28, 0.17, 0.08], dtype=np.float32) * cabin_glow[..., None]
    sill = 1.0 - smoothstep(0.008, 0.014, np.abs(py - 0.395))
    sill_col = np.array([0.68, 0.52, 0.27], dtype=np.float32) * (0.75 + 0.35 * np.cos(px * 3.0))[..., None]
    wall = wall * (1.0 - sill[..., None] * 0.85) + sill_col * (sill[..., None] * 0.85)

    wy = 0.07 - py
    wx = px

    if route == 0:
        sky_top = np.array([0.032, 0.052, 0.13], dtype=np.float32)
        sky_horiz = np.array([0.14, 0.21, 0.36], dtype=np.float32)
    elif route == 1:
        sky_top = np.array([0.055, 0.075, 0.16], dtype=np.float32)
        sky_horiz = np.array([0.32, 0.23, 0.25], dtype=np.float32)
    else:
        sky_top = np.array([0.025, 0.055, 0.09], dtype=np.float32)
        sky_horiz = np.array([0.07, 0.19, 0.22], dtype=np.float32)

    st = smoothstep(-0.02, 0.38, wy)[..., None]
    ext = sky_horiz * (1.0 - st) + sky_top * st

    sgx = np.floor((wx + travel * 0.04) * 58.0)
    sgy = np.floor(wy * 58.0)
    sseed = np.mod(np.sin(sgx * 127.1 + sgy * 311.7) * 43758.5453, 1.0)
    slx = np.mod((wx + travel * 0.04) * 58.0, 1.0) - 0.5
    sly = np.mod(wy * 58.0, 1.0) - 0.5
    star = smoothstep(0.955, 0.996, sseed) * (1.0 - smoothstep(0.06, 0.22, np.sqrt(slx ** 2 + sly ** 2))) * smoothstep(0.05, 0.24, wy)
    ext += star[..., None] * np.array([0.95, 0.93, 0.85], dtype=np.float32)

    moon_x = 0.26
    if route == 2:
        ribbon = np.sin(wx * 5.2 + travel * 0.9 + 1.4 * np.sin(wy * 7.0 - travel * 0.5))
        aband = np.exp(-((wy - 0.20 - 0.05 * ribbon) ** 2) * 52.0) * (0.55 + 0.45 * np.sin(wx * 11.0 + travel * 1.4))
        at = smoothstep(0.16, 0.30, wy)[..., None]
        acol = np.array([0.18, 0.82, 0.56], dtype=np.float32) * (1.0 - at) + np.array([0.45, 0.32, 0.82], dtype=np.float32) * at
        ext += aband[..., None] * acol * 0.72
    elif route == 1:
        moon_x = -0.28
        md = np.sqrt((wx - moon_x) ** 2 + (wy - 0.22) ** 2)
        cut_d = np.sqrt((wx - (moon_x + 0.015)) ** 2 + (wy - 0.228) ** 2)
        crescent = ((1.0 - smoothstep(0.028, 0.032, md)) * smoothstep(0.023, 0.027, cut_d))[..., None]
        mglow = np.exp(-md * 9.0) * 0.26
        ext += mglow[..., None] * np.array([0.96, 0.76, 0.52], dtype=np.float32)
        ext = ext * (1.0 - crescent) + np.array([1.0, 0.91, 0.74], dtype=np.float32) * crescent
    else:
        md = np.sqrt((wx - moon_x) ** 2 + (wy - 0.25) ** 2)
        mdisc = (1.0 - smoothstep(0.031, 0.035, md))[..., None]
        mglow = np.exp(-md * 9.5) * 0.30
        ext += mglow[..., None] * np.array([0.86, 0.88, 0.96], dtype=np.float32)
        ext = ext * (1.0 - mdisc) + np.array([0.98, 0.98, 0.95], dtype=np.float32) * mdisc

    far_x = wx * 2.4 + travel * 0.35
    if route == 0:
        pa = 1.0 - np.abs(np.sin(far_x * 1.35 + 0.4))
        pb = 1.0 - np.abs(np.sin(far_x * 2.95 - 0.9))
        far_h = 0.095 + 0.115 * pa * pa + 0.048 * pb + 0.016 * np.sin(far_x * 9.0)
        snow = smoothstep(far_h - 0.068, far_h - 0.006, wy)[..., None]
        far_col = np.array([0.09, 0.13, 0.23], dtype=np.float32) * (1.0 - snow * 0.78) + np.array([0.72, 0.78, 0.88], dtype=np.float32) * (snow * 0.78)
    elif route == 1:
        far_h = 0.006 + np.maximum(0.0, np.sin(far_x * 1.15 + 0.5)) * 0.052 + np.maximum(0.0, np.cos(far_x * 2.35 - 0.7)) * 0.024
        far_col = np.array([0.10, 0.12, 0.20], dtype=np.float32)
    else:
        far_h = 0.072 + 0.036 * np.sin(far_x * 1.2 + 0.3) + 0.018 * np.cos(far_x * 2.6 - 0.5)
        snow = smoothstep(far_h - 0.042, far_h - 0.005, wy)[..., None]
        far_col = np.array([0.06, 0.12, 0.17], dtype=np.float32) * (1.0 - snow * 0.62) + np.array([0.46, 0.72, 0.70], dtype=np.float32) * (snow * 0.62)
    far_mask = (1.0 - smoothstep(-feather, feather, wy - far_h)) * (wy >= 0.0)
    ext = ext * (1.0 - far_mask[..., None]) + far_col * far_mask[..., None]

    if route == 1:
        bx = np.mod((wx + travel * 0.16) * 0.68 + 0.5, 1.0) - 0.5
        tower_a = (1.0 - smoothstep(0.006, 0.011, np.abs(bx + 0.22))) * (wy >= 0.0) * (1.0 - smoothstep(0.145, 0.152, wy))
        tower_b = (1.0 - smoothstep(0.006, 0.011, np.abs(bx - 0.22))) * (wy >= 0.0) * (1.0 - smoothstep(0.145, 0.152, wy))
        cross_beam = (1.0 - smoothstep(0.004, 0.007, np.abs(wy - 0.105))) * ((np.abs(bx + 0.22) <= 0.016).astype(np.float32) + (np.abs(bx - 0.22) <= 0.016).astype(np.float32))
        span_t = np.clip(bx / 0.22, -1.0, 1.0)
        main_cable_y = 0.056 + 0.088 * span_t * span_t
        side_cable_y = 0.056 + 0.088 * np.maximum(0.0, 1.0 - np.abs(np.abs(bx) - 0.22) / 0.28) ** 2
        cable_y = np.where(np.abs(bx) <= 0.22, main_cable_y, side_cable_y)
        cable = 1.0 - smoothstep(0.0025, 0.0055, np.abs(wy - cable_y))
        deck = 1.0 - smoothstep(0.004, 0.008, np.abs(wy - 0.044))
        bstruct = np.clip(tower_a + tower_b + cross_beam + cable * 0.7 + deck, 0.0, 1.0)[..., None] * 0.88
        ext = ext * (1.0 - bstruct) + np.array([0.12, 0.14, 0.20], dtype=np.float32) * bstruct
        lamp_local = np.mod((wx + travel * 0.16) * 34.0, 1.0) - 0.5
        blamps = np.exp(-((lamp_local * 5.0) ** 2)) * np.exp(-(((wy - 0.048) * 90.0) ** 2))
        tbeacon = np.exp(-np.sqrt((bx + 0.22) ** 2 + (wy - 0.152) ** 2) * 55.0) + np.exp(-np.sqrt((bx - 0.22) ** 2 + (wy - 0.152) ** 2) * 55.0)
        ext += blamps[..., None] * np.array([1.0, 0.78, 0.40], dtype=np.float32) * 1.15 + tbeacon[..., None] * np.array([1.0, 0.42, 0.28], dtype=np.float32) * 0.9
    else:
        near_x = wx * 3.6 + travel * 0.95
        near_base = 0.048 if route == 0 else 0.036
        near_h = near_base + 0.032 * np.sin(near_x * 1.4 - 0.5) + 0.018 * np.cos(near_x * 4.3 + 1.2)
        near_mask = (1.0 - smoothstep(-feather, feather, wy - near_h)) * (wy >= 0.0)
        ext = ext * (1.0 - near_mask[..., None]) + np.array([0.045, 0.058, 0.095], dtype=np.float32) * near_mask[..., None]

    lit_cell = np.floor((wx + travel * 0.264) * 28.0)
    lit_seed = np.mod(np.sin(lit_cell * 91.7) * 43758.5453, 1.0)
    lit_local = np.mod((wx + travel * 0.264) * 28.0, 1.0) - 0.5
    vglow = smoothstep(0.62, 0.95, lit_seed) * np.exp(-((lit_local * 5.2) ** 2)) * np.exp(-(((wy - 0.012) * 58.0) ** 2))
    ext += vglow[..., None] * np.array([1.0, 0.76, 0.38], dtype=np.float32) * 0.95

    water_mask = (1.0 - smoothstep(-feather, feather, wy))[..., None]
    ripple = np.sin(-wy * 110.0 + wx * 12.0 + travel * 3.2) * 0.5 + 0.5
    wt = smoothstep(0.0, -0.26, wy)[..., None]
    water_col = (sky_horiz * 0.42) * (1.0 - wt) + np.array([0.025, 0.04, 0.075], dtype=np.float32) * wt
    moon_track = np.exp(-(((wx - moon_x) * 6.5) ** 2)) * (0.28 + 0.72 * ripple) * smoothstep(-0.28, -0.01, wy)
    wl_col = np.array([0.24, 0.76, 0.58], dtype=np.float32) if route == 2 else (np.array([0.98, 0.78, 0.50], dtype=np.float32) if route == 1 else np.array([0.86, 0.88, 0.94], dtype=np.float32))
    water_col += moon_track[..., None] * wl_col * 0.54
    if route == 1:
        bref = np.exp(-(((wy + 0.05) * 14.0) ** 2)) * (0.45 + 0.55 * ripple) * 0.26
        water_col += bref[..., None] * np.array([0.98, 0.72, 0.34], dtype=np.float32)
    vref = smoothstep(0.62, 0.95, lit_seed) * np.exp(-((lit_local * 4.5) ** 2)) * np.exp(np.minimum(wy, 0.0) * 9.5) * (0.45 + 0.55 * ripple)
    water_col += vref[..., None] * np.array([0.95, 0.68, 0.30], dtype=np.float32) * 0.55
    ext = ext * (1.0 - water_mask) + water_col * water_mask

    glass_sheen = np.exp(-(((px + py * 0.75 + 0.22) * 3.8) ** 2)) * 0.075
    ext += np.array([0.98, 0.82, 0.52], dtype=np.float32) * glass_sheen[..., None]

    plen = np.maximum(np.sqrt(px * px + py * py), 1e-4)
    fl = 0.55 + 0.45 * np.maximum((px * (-0.6) + py * (-0.7)) / (plen * np.hypot(0.6, 0.7)), 0.0)
    brass_col = np.array([0.72, 0.56, 0.29], dtype=np.float32) * fl[..., None] + np.array([0.28, 0.22, 0.12], dtype=np.float32) * inner_bevel[..., None]

    out = wall * (1.0 - brass_frame[..., None]) + brass_col * brass_frame[..., None]
    out = out * (1.0 - inside_win[..., None]) + ext * inside_win[..., None]
    out += np.array([0.85, 0.70, 0.40], dtype=np.float32) * (inner_bevel * 0.35)[..., None]

    return Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("alpine", "seto", "arctic")):
        render_plate(1200, 800, route=idx, travel=1.2).save(media / f"{name}.webp", quality=90, method=6)
    render_plate(1200, 800, route=0, travel=1.2).save(media / "cover.webp", quality=90, method=6)
    render_plate(128, 128, route=0, travel=1.2).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked sleeper-line posters and icon.")
