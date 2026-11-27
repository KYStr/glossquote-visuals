"""Bake O(1) analytic perspective Mediterranean & Okinawa ocean stills for V016 archipelago-log."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/archipelago-log"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def render_still(width, height, sea=0, t_sec=2.4):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    wx = (uv_x - 0.5) * aspect
    wy = -(uv_y - 0.5) - (-0.04)

    if sea == 0:
        sun_pos = (-0.22, 0.145)
        sky_z = np.array([0.06, 0.14, 0.30], dtype=np.float32)
        sky_m = np.array([0.28, 0.36, 0.48], dtype=np.float32)
        sky_h = np.array([1.02, 0.62, 0.34], dtype=np.float32)
        sun_col = np.array([2.1, 1.25, 0.62], dtype=np.float32)
        deep_w = np.array([0.015, 0.08, 0.18], dtype=np.float32)
        scat_w = np.array([0.05, 0.32, 0.42], dtype=np.float32)
        haze = np.array([0.76, 0.55, 0.42], dtype=np.float32)
    elif sea == 1:
        sun_pos = (0.26, 0.28)
        sky_z = np.array([0.07, 0.30, 0.64], dtype=np.float32)
        sky_m = np.array([0.26, 0.56, 0.82], dtype=np.float32)
        sky_h = np.array([0.76, 0.90, 0.94], dtype=np.float32)
        sun_col = np.array([1.9, 1.82, 1.58], dtype=np.float32)
        deep_w = np.array([0.015, 0.19, 0.32], dtype=np.float32)
        scat_w = np.array([0.06, 0.66, 0.68], dtype=np.float32)
        haze = np.array([0.68, 0.85, 0.90], dtype=np.float32)
    else:
        sun_pos = (0.08, 0.095)
        sky_z = np.array([0.07, 0.09, 0.22], dtype=np.float32)
        sky_m = np.array([0.34, 0.23, 0.38], dtype=np.float32)
        sky_h = np.array([1.04, 0.50, 0.42], dtype=np.float32)
        sun_col = np.array([2.05, 0.95, 0.64], dtype=np.float32)
        deep_w = np.array([0.025, 0.055, 0.14], dtype=np.float32)
        scat_w = np.array([0.18, 0.18, 0.28], dtype=np.float32)
        haze = np.array([0.72, 0.44, 0.44], dtype=np.float32)

    sky_t = np.clip(np.maximum(wy, 0.0) / 0.56, 0.0, 1.0)
    s1 = smoothstep(0.0, 0.38, sky_t)[..., None]
    s2 = smoothstep(0.26, 1.0, sky_t)[..., None]
    sky = sky_h * (1.0 - s1) + sky_m * s1
    sky = sky * (1.0 - s2) + sky_z * s2

    sdist = np.sqrt((wx - sun_pos[0]) ** 2 + (np.maximum(wy, -0.05) - sun_pos[1]) ** 2)
    sun_halo = np.exp(-sdist * 4.2) * 0.45 + np.exp(-sdist * 16.0) * 0.85
    sun_disc = 1.0 - smoothstep(0.024, 0.030, sdist)
    sky += sun_col * sun_halo[..., None] + np.array([1.2, 1.15, 1.0], dtype=np.float32) * (sun_disc * 1.6)[..., None]

    # Trade-wind clouds
    above = wy > 0.004
    cz = 1.0 / (np.maximum(wy, 0.004) + 0.11)
    cux = wx * cz * 0.42 + t_sec * 0.018
    cuy = cz * 0.36 - t_sec * 0.010
    n1 = np.sin(cux * 1.8 + 0.9 * np.cos(cuy * 1.5)) * np.cos(cuy * 2.1 - cux * 0.8)
    n2 = np.sin(cux * 4.1 - cuy * 3.7 + 0.8 * np.sin(cux * 1.9)) * 0.45
    n3 = np.cos(cux * 8.5 + cuy * 7.2) * 0.20
    cdens = smoothstep(0.15, 0.95, n1 + n2 + n3) * smoothstep(0.008, 0.14, wy) * (1.0 - smoothstep(0.32, 0.54, wy)) * above
    rim = np.clip(0.35 + 0.65 * np.exp(-sdist * 2.8), 0.0, 1.0)[..., None]
    ccol = (sky_m * 0.92 + 0.18) * (1.0 - rim) + (sun_col * 0.88) * rim
    sky = sky * (1.0 - (cdens * 0.56)[..., None]) + ccol * (cdens * 0.56)[..., None]

    col = sky.copy()

    # Layered coastal islands above horizon
    drift = np.sin(t_sec * 0.08) * 0.015
    sea_off = 0.0 if sea == 0 else (1.4 if sea == 1 else 2.8)
    fx = (wx + drift * 0.4) * 2.6 + sea_off
    far_h = np.maximum(0.0, 0.042 * np.sin(fx * 1.3 + 0.4) + 0.028 * np.cos(fx * 3.1 - 0.8) + 0.012 * np.sin(fx * 6.8) - 0.008)
    far_m = (1.0 - smoothstep(-0.002, 0.002, wy - far_h)) * (far_h > 0.001) * (wy >= -0.002)
    far_c = haze * 0.72 * 0.55 + sky_h * 0.68 * 0.45
    col = col * (1.0 - (far_m * 0.78)[..., None]) + far_c * (far_m * 0.78)[..., None]

    mx = wx - 0.36 + drift * 0.8
    mid_h = np.exp(-mx * mx * 4.8) * (0.145 + 0.032 * np.sin(mx * 14.0 + 1.1) + 0.016 * np.cos(mx * 29.0) + 0.008 * np.sin(mx * 58.0))
    mid_m = (1.0 - smoothstep(-0.0018, 0.0018, wy - mid_h)) * (mid_h > 0.002) * (wy >= -0.002)
    strata = 0.5 + 0.5 * np.sin(wy * 165.0 + 1.6 * np.sin(mx * 18.0))
    lit_f = ((1.0 - smoothstep(-0.18, 0.14, mx - sun_pos[0] * 0.35)) * 0.65)[..., None]
    cliff_sh = (deep_w * 1.35 + np.array([0.06, 0.06, 0.09], dtype=np.float32)) * 0.58 + haze * 0.52 * 0.42
    cliff_su = (np.array([0.74, 0.64, 0.52], dtype=np.float32) * 0.65 + sky_h * 0.85 * 0.35) * (0.88 + 0.14 * strata)[..., None]
    mid_c = (cliff_sh * (1.0 - lit_f) + cliff_su * lit_f) * 0.76 + haze * 0.24
    col = col * (1.0 - mid_m[..., None]) + mid_c * mid_m[..., None]

    nx_p = wx + 0.62 + drift
    near_h = np.exp(-nx_p * nx_p * 6.5) * (0.11 + 0.025 * np.sin(nx_p * 18.0) + 0.011 * np.cos(nx_p * 37.0))
    near_m = (1.0 - smoothstep(-0.0015, 0.0015, wy - near_h)) * (near_h > 0.002) * (wy >= -0.002)
    near_c = deep_w * 0.9 + np.array([0.04, 0.04, 0.055], dtype=np.float32)
    col = col * (1.0 - near_m[..., None]) + near_c * near_m[..., None]

    # Analytic 3D Perspective Ocean Plane (wy < 0)
    is_sea = wy < 0.0
    dz = 1.0 / np.maximum(-wy, 0.0035)
    world_x = wx * dz * 0.85
    world_z = dz * 0.95
    atten = 1.0 / (1.0 + dz * 0.048)
    warp_x = world_x * 0.55 + 0.65 * np.sin(world_z * 0.95 - t_sec * 0.55)
    warp_z = world_z * 1.45 + 0.45 * np.cos(world_x * 0.48 + t_sec * 0.42)
    w1 = np.sin(warp_z * 1.9 + warp_x * 0.42 - t_sec * 1.15)
    w2 = np.sin(warp_z * 3.7 - warp_x * 0.85 - t_sec * 1.48 + 1.3 * w1)
    w3 = np.sin(warp_z * 7.8 + warp_x * 1.65 - t_sec * 1.92 + 0.7 * w2)
    w4 = np.cos(warp_z * 15.2 - warp_x * 3.1 + t_sec * 2.4)
    w5 = np.sin(warp_z * 29.5 + warp_x * 5.8 - t_sec * 2.8)
    wnx = (w1 * 0.018 + w2 * 0.022 + w3 * 0.019 + w4 * 0.013 + w5 * 0.008) * atten
    wnz = (w1 * 0.046 + w2 * 0.042 + w3 * 0.032 + w4 * 0.020 + w5 * 0.012) * atten
    wny = np.ones_like(wnx)
    wlen = np.sqrt(wnx * wnx + wny * wny + wnz * wnz)
    wnx, wny, wnz = wnx / wlen, wny / wlen, wnz / wlen

    vx, vy, vz = wx * 0.85, wy, np.full_like(wx, -1.0)
    vlen = np.sqrt(vx * vx + vy * vy + vz * vz)
    vx, vy, vz = vx / vlen, vy / vlen, vz / vlen

    d_vn = vx * wnx + vy * wny + vz * wnz
    rx, ry, rz = vx - 2.0 * d_vn * wnx, vy - 2.0 * d_vn * wny, vz - 2.0 * d_vn * wnz
    fresnel = (0.04 + 0.96 * np.power(1.0 - np.maximum(-d_vn, 0.0), 4.2))[..., None]

    rt = np.clip(np.maximum(ry, 0.0) / 0.56, 0.0, 1.0)
    rs1 = smoothstep(0.0, 0.42, rt)[..., None]
    rs2 = smoothstep(0.32, 1.0, rt)[..., None]
    rcol = (sky_h * 0.92) * (1.0 - rs1) + (sky_m * 0.88) * rs1
    rcol = rcol * (1.0 - rs2) + (sky_z * 0.85) * rs2

    sv = np.array([sun_pos[0] * 0.85, sun_pos[1], -1.0], dtype=np.float32)
    sv /= np.linalg.norm(sv)
    sdot = np.maximum(rx * sv[0] + ry * sv[1] + rz * sv[2], 0.0)
    glitter = np.power(sdot, 24.0) * 0.72 + np.power(sdot, 220.0) * 2.8 + np.power(sdot, 900.0) * 5.2
    rcol += sun_col * glitter[..., None]

    crest = smoothstep(0.15, 0.95, 0.5 + 0.5 * w1) * (1.0 - smoothstep(0.0, 0.35, -wy * 0.8 + 0.05))
    wt = np.clip(0.32 + 0.52 * crest + 0.18 * smoothstep(-0.48, -0.04, wy), 0.0, 1.0)[..., None]
    wbody = deep_w * (1.0 - wt) + scat_w * wt

    cr_m = (np.exp(-mx * mx * 4.8) * smoothstep(-0.18, -0.005, wy + wnx * 0.3) * 0.55)[..., None]
    rcol = rcol * (1.0 - cr_m) + (deep_w * 1.1 + np.array([0.04, 0.04, 0.06], dtype=np.float32)) * cr_m

    sea_c = wbody * (1.0 - fresnel) + rcol * fresnel
    hmist = (np.exp(-np.maximum(-wy, 0.0) * 26.0) * 0.72)[..., None]
    sea_c = sea_c * (1.0 - hmist) + (sky_h * 0.92) * hmist
    col = np.where(is_sea[..., None], sea_c, col)

    # Subtle film grain
    rng = np.random.default_rng(42 + sea)
    col += rng.uniform(-0.007, 0.007, size=col.shape).astype(np.float32)

    a, b, c, d, e2 = 2.51, 0.03, 2.43, 0.59, 0.14
    mapped = np.clip((col * (a * col + b)) / (col * (c * col + d) + e2), 0.0, 1.0)
    srgb = np.where(mapped <= 0.0031308, mapped * 12.92, 1.055 * np.power(np.maximum(mapped, 1e-6), 1.0 / 2.4) - 0.055)
    return Image.fromarray((np.clip(srgb, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("cyclades", "miyako", "amalfi")):
        render_still(1440, 900, sea=idx, t_sec=2.4).save(media / f"{name}.webp", quality=91, method=6)
    render_still(1200, 800, sea=0, t_sec=2.4).save(media / "cover.webp", quality=91, method=6)
    render_still(128, 128, sea=0, t_sec=2.4).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked upgraded archipelago-log luxury ocean stills and icon.")
