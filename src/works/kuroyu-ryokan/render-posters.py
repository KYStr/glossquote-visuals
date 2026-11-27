"""Bake O(1) Japanese architectural onsen & mountain mist stills for V019 kuroyu-ryokan."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/kuroyu-ryokan"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def render_still(width, height, season=0, t_sec=2.6):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    wx = (uv_x - 0.5) * aspect
    ndc_y = -(uv_y - 0.5)
    wy = ndc_y - (-0.06)

    if season == 0:
        sky_top = np.array([0.055, 0.085, 0.16], dtype=np.float32)
        sky_mist = np.array([0.32, 0.38, 0.48], dtype=np.float32)
        m_far = np.array([0.18, 0.23, 0.32], dtype=np.float32)
        m_mid = np.array([0.10, 0.14, 0.21], dtype=np.float32)
        m_near = np.array([0.055, 0.075, 0.11], dtype=np.float32)
        accent = np.array([0.68, 0.75, 0.84], dtype=np.float32)
        lantern = np.array([2.2, 1.18, 0.42], dtype=np.float32)
        steam_c = np.array([0.76, 0.80, 0.86], dtype=np.float32)
    elif season == 1:
        sky_top = np.array([0.16, 0.14, 0.22], dtype=np.float32)
        sky_mist = np.array([0.72, 0.56, 0.44], dtype=np.float32)
        m_far = np.array([0.36, 0.25, 0.24], dtype=np.float32)
        m_mid = np.array([0.26, 0.12, 0.11], dtype=np.float32)
        m_near = np.array([0.12, 0.065, 0.06], dtype=np.float32)
        accent = np.array([0.76, 0.24, 0.11], dtype=np.float32)
        lantern = np.array([2.1, 1.15, 0.45], dtype=np.float32)
        steam_c = np.array([0.88, 0.80, 0.72], dtype=np.float32)
    else:
        sky_top = np.array([0.055, 0.12, 0.13], dtype=np.float32)
        sky_mist = np.array([0.38, 0.48, 0.45], dtype=np.float32)
        m_far = np.array([0.16, 0.25, 0.24], dtype=np.float32)
        m_mid = np.array([0.085, 0.16, 0.14], dtype=np.float32)
        m_near = np.array([0.04, 0.085, 0.075], dtype=np.float32)
        accent = np.array([0.16, 0.34, 0.24], dtype=np.float32)
        lantern = np.array([2.05, 1.22, 0.52], dtype=np.float32)
        steam_c = np.array([0.74, 0.82, 0.78], dtype=np.float32)

    st = smoothstep(0.0, 0.92, np.clip(np.maximum(wy, 0.0) / 0.58, 0.0, 1.0))[..., None]
    col = sky_mist * (1.0 - st) + sky_top * st

    gdist = np.sqrt((wx + 0.28) ** 2 + (np.maximum(wy, 0.0) - 0.28) ** 2)
    col += (sky_mist * 0.45 + np.array([1.0, 0.92, 0.82], dtype=np.float32) * 0.55) * (np.exp(-gdist * 3.4) * 0.42)[..., None]

    # 3-layer ink-wash cedar mountains
    above = wy >= -0.002
    shift = np.sin(t_sec * 0.05) * 0.012
    x1 = (wx + shift * 0.3) * 2.2 + 0.6
    h1 = 0.22 + 0.095 * np.sin(x1 * 1.4) + 0.048 * np.cos(x1 * 3.1 - 0.5) + 0.020 * np.sin(x1 * 6.7)
    m1 = (1.0 - smoothstep(-0.002, 0.002, wy - h1)) * above
    mist1 = (np.exp(-np.maximum(wy, 0.0) * 6.5) * 0.65)[..., None]
    col = col * (1.0 - m1[..., None]) + (m_far * (1.0 - mist1) + sky_mist * mist1) * m1[..., None]

    x2 = (wx - 0.18 + shift * 0.6) * 2.7
    h2 = 0.145 + 0.072 * np.cos(x2 * 1.6 + 0.9) + 0.032 * np.sin(x2 * 4.2) + 0.014 * np.cos(x2 * 9.5)
    m2 = (1.0 - smoothstep(-0.0018, 0.0018, wy - h2)) * above
    crest2 = (smoothstep(h2 - 0.038, h2 - 0.004, wy) * (0.55 + 0.45 * np.sin(x2 * 22.0)) * 0.48)[..., None]
    mid_c = m_mid * (1.0 - crest2) + accent * crest2
    mist2 = (np.exp(-np.maximum(wy, 0.0) * 9.5) * 0.52)[..., None]
    col = col * (1.0 - m2[..., None]) + (mid_c * (1.0 - mist2) + sky_mist * mist2) * m2[..., None]

    x3 = (wx + 0.12 + shift) * 3.1
    h3 = 0.068 + 0.052 * np.power(np.abs(wx), 1.4) + 0.022 * np.sin(x3 * 2.4) + 0.011 * np.cos(x3 * 7.8) + 0.005 * np.sin(x3 * 19.0)
    m3 = (1.0 - smoothstep(-0.0015, 0.0015, wy - h3)) * above
    nc = (smoothstep(h3 - 0.022, h3, wy) * 0.35)[..., None]
    near_c = m_near * (1.0 - nc) + (accent * 0.55) * nc
    col = col * (1.0 - m3[..., None]) + near_c * m3[..., None]

    # Andon paper lantern on right edge
    lpx, lpy = wx - 0.42, wy - 0.028
    lamp_box = np.maximum(np.abs(lpx) - 0.015, np.abs(lpy) - 0.024)
    lamp_m = (1.0 - smoothstep(-0.002, 0.002, lamp_box))[..., None]
    l_dist = np.sqrt(lpx * lpx + lpy * lpy)
    l_halo = (np.exp(-l_dist * 7.5) * 0.52 + np.exp(-l_dist * 24.0) * 0.85) * smoothstep(-0.04, 0.01, wy)
    col += lantern * l_halo[..., None]
    col = col * (1.0 - lamp_m) + np.array([1.5, 1.25, 0.82], dtype=np.float32) * lamp_m

    # Black-basalt infinity onsen water plane (wy < 0)
    is_pool = wy < 0.0
    dz = 1.0 / np.maximum(-wy, 0.004)
    world_x = wx * dz * 0.72
    world_z = dz * 0.85
    atten = 1.0 / (1.0 + dz * 0.06)
    w1 = np.sin(world_z * 2.4 + world_x * 0.45 - t_sec * 0.65)
    w2 = np.cos(world_z * 5.2 - world_x * 0.92 + t_sec * 0.85 + 0.9 * w1)
    w3 = np.sin(world_z * 11.5 + world_x * 2.1 - t_sec * 1.15)
    wnx = (w1 * 0.010 + w2 * 0.012 + w3 * 0.008) * atten
    wnz = (w1 * 0.022 + w2 * 0.020 + w3 * 0.014) * atten
    wny = np.ones_like(wnx)
    wlen = np.sqrt(wnx * wnx + wny * wny + wnz * wnz)
    wnx, wny, wnz = wnx / wlen, wny / wlen, wnz / wlen

    vx, vy, vz = wx * 0.75, wy, np.full_like(wx, -1.0)
    vlen = np.sqrt(vx * vx + vy * vy + vz * vz)
    vx, vy, vz = vx / vlen, vy / vlen, vz / vlen
    d_vn = vx * wnx + vy * wny + vz * wnz
    fresnel = (0.08 + 0.92 * np.power(1.0 - np.maximum(-d_vn, 0.0), 3.6))[..., None]

    refl_y = np.clip(-wy + wnz * 0.35, 0.0, 0.55)
    rt = smoothstep(0.0, 0.45, refl_y)[..., None]
    refl_sky = (sky_mist * 0.68) * (1.0 - rt) + (sky_top * 0.75) * rt
    pool_c = np.array([0.022, 0.026, 0.032], dtype=np.float32) * (1.0 - fresnel * 0.72) + refl_sky * (fresnel * 0.72)

    lrx = (wx - 0.42) + wnx * 0.85
    ltrack = np.exp(-((lrx * 14.0) ** 2)) * np.exp(-np.maximum(-wy, 0.0) * 3.8) * (0.48 + 0.52 * smoothstep(-0.3, 0.85, w2 + w3 * 0.6))
    lspark = np.exp(-((lrx * 36.0) ** 2)) * np.exp(-np.maximum(-wy, 0.0) * 6.5) * np.power(0.5 + 0.5 * w3, 4.0)
    pool_c += lantern * (ltrack * 0.58 + lspark * 1.35)[..., None]
    pool_c += np.array([0.18, 0.19, 0.21], dtype=np.float32) * (np.exp(-np.abs(wy) * 180.0) * 0.35)[..., None]
    col = np.where(is_pool[..., None], pool_c, col)

    # Volumetric thermal steam plumes
    st_x = wx * 2.2 + 0.35 * np.sin(wy * 4.5 - t_sec * 0.32)
    st_y = wy * 2.8 - t_sec * 0.28
    s1 = np.sin(st_x * 2.1 + 1.1 * np.cos(st_y * 1.8 + t_sec * 0.15)) * np.cos(st_y * 2.4 - st_x * 1.2)
    s2 = np.sin(st_x * 4.6 - st_y * 3.9 + t_sec * 0.22) * 0.48
    sband = smoothstep(-0.38, 0.02, wy) * (1.0 - smoothstep(0.06, 0.36, wy))
    sdens = (smoothstep(0.18, 1.05, s1 + s2) * sband * 0.44)[..., None]
    swarm = np.clip(np.exp(-np.sqrt((wx - 0.42) ** 2 + wy ** 2) * 2.8) * 0.75, 0.0, 0.85)[..., None]
    lit_steam = steam_c * (1.0 - swarm) + (lantern * 0.65) * swarm
    col = col * (1.0 - sdens) + lit_steam * sdens

    # Hinoki timber eave top silhouette
    eave = (smoothstep(0.41, 0.48, ndc_y) * 0.85)[..., None]
    col = col * (1.0 - eave) + np.array([0.03, 0.025, 0.022], dtype=np.float32) * eave

    rng = np.random.default_rng(77 + season)
    col += rng.uniform(-0.0065, 0.0065, size=col.shape).astype(np.float32)

    a, b, c, d, e2 = 2.51, 0.03, 2.43, 0.59, 0.14
    mapped = np.clip((col * (a * col + b)) / (col * (c * col + d) + e2), 0.0, 1.0)
    srgb = np.where(mapped <= 0.0031308, mapped * 12.92, 1.055 * np.power(np.maximum(mapped, 1e-6), 1.0 / 2.4) - 0.055)
    return Image.fromarray((np.clip(srgb, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("winter", "autumn", "summer")):
        render_still(1440, 900, season=idx, t_sec=2.6).save(media / f"{name}.webp", quality=91, method=6)
    render_still(1200, 800, season=0, t_sec=2.6).save(media / "cover.webp", quality=91, method=6)
    render_still(128, 128, season=0, t_sec=2.6).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked kuroyu-ryokan architectural onsen stills and icon.")
