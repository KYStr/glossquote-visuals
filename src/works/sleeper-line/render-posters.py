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
        sky_top = np.array([0.035, 0.055, 0.12], dtype=np.float32)
        sky_horiz = np.array([0.14, 0.20, 0.33], dtype=np.float32)
    elif route == 1:
        sky_top = np.array([0.04, 0.075, 0.13], dtype=np.float32)
        sky_horiz = np.array([0.20, 0.25, 0.31], dtype=np.float32)
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

    if route == 2:
        ribbon = np.sin(wx * 5.2 + travel * 0.9 + 1.4 * np.sin(wy * 7.0 - travel * 0.5))
        aband = np.exp(-((wy - 0.20 - 0.05 * ribbon) ** 2) * 52.0) * (0.55 + 0.45 * np.sin(wx * 11.0 + travel * 1.4))
        at = smoothstep(0.16, 0.30, wy)[..., None]
        acol = np.array([0.18, 0.82, 0.56], dtype=np.float32) * (1.0 - at) + np.array([0.45, 0.32, 0.82], dtype=np.float32) * at
        ext += aband[..., None] * acol * 0.72
    else:
        md = np.sqrt((wx - 0.24) ** 2 + (wy - 0.24) ** 2)
        mdisc = (1.0 - smoothstep(0.030, 0.034, md))[..., None]
        mglow = np.exp(-md * 9.5) * 0.28
        ext += mglow[..., None] * np.array([0.88, 0.84, 0.72], dtype=np.float32)
        ext = ext * (1.0 - mdisc) + np.array([0.98, 0.95, 0.86], dtype=np.float32) * mdisc

    far_x = wx * 2.4 + travel * 0.35
    far_h = 0.095 + 0.075 * np.sin(far_x * 1.7 + 0.8) + 0.045 * np.cos(far_x * 3.9 - 0.4) + 0.02 * np.sin(far_x * 8.5)
    far_mask = (1.0 - smoothstep(-feather, feather, wy - far_h)) * (wy >= 0.0)
    if route == 0:
        snow = smoothstep(far_h - 0.045, far_h - 0.005, wy)[..., None]
        far_col = np.array([0.10, 0.14, 0.23], dtype=np.float32) * (1.0 - snow * 0.68) + np.array([0.62, 0.68, 0.78], dtype=np.float32) * (snow * 0.68)
    elif route == 1:
        far_col = np.array([0.11, 0.15, 0.21], dtype=np.float32)
    else:
        snow = smoothstep(far_h - 0.055, far_h - 0.005, wy)[..., None]
        far_col = np.array([0.07, 0.13, 0.18], dtype=np.float32) * (1.0 - snow * 0.58) + np.array([0.48, 0.68, 0.70], dtype=np.float32) * (snow * 0.58)
    ext = ext * (1.0 - far_mask[..., None]) + far_col * far_mask[..., None]

    near_x = wx * 3.6 + travel * 0.95
    near_h = 0.038 + 0.034 * np.sin(near_x * 1.4 - 0.5) + 0.018 * np.cos(near_x * 4.3 + 1.2)
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
    moon_track = np.exp(-(((wx - 0.24) * 6.5) ** 2)) * (0.28 + 0.72 * ripple) * smoothstep(-0.28, -0.01, wy)
    wl_col = np.array([0.24, 0.76, 0.58], dtype=np.float32) if route == 2 else np.array([0.88, 0.82, 0.65], dtype=np.float32)
    water_col += moon_track[..., None] * wl_col * 0.52
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
