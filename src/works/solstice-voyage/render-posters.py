"""Bake razor-sharp bisected 3D raymarched film stills & icon for V018 solstice-voyage."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/solstice-voyage"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def terrain_h(qx, qz, scene):
    if scene == 0:
        w = qx * 0.36 + 0.85 * np.sin(qz * 0.22)
        d1 = 1.0 - np.abs(np.sin(w + 0.30 * np.cos(qz * 0.31)))
        d2 = 1.0 - np.abs(np.sin(qz * 0.28 - 0.50 * np.sin(qx * 0.26 + 0.6)))
        rip = 0.007 * np.sin(qx * 16.0 + qz * 9.0 + 1.2 * np.sin(qz * 2.4))
        return 1.22 * np.power(np.maximum(d1, 0.0), 1.35) + 0.58 * np.power(np.maximum(d2, 0.0), 1.55) + rip - 0.52
    if scene == 1:
        ch = smoothstep(1.6, 5.2, np.abs(qx + 0.9 * np.sin(qz * 0.14)))
        r1 = 1.0 - np.abs(np.sin(qx * 0.42 + 0.55 * np.cos(qz * 0.27)))
        r2 = 0.5 + 0.5 * np.cos(qz * 0.34 - 0.45 * np.sin(qx * 0.52))
        crag = 0.16 * (0.5 + 0.5 * np.sin(qx * 1.4 + qz * 1.1))
        return ch * (3.15 * np.power(np.maximum(r1, 0.0), 1.4) * (0.45 + 0.65 * r2) + crag) - 0.14
    ch = smoothstep(0.8, 5.4, np.abs(qx - 0.45 * np.sin(qz * 0.18))) * 0.72 + 0.28
    r1 = 1.0 - np.abs(np.sin(qx * 0.34 + 0.48 * np.sin(qz * 0.23)))
    r2 = 0.5 + 0.5 * np.cos(qz * 0.29 + 0.42 * np.cos(qx * 0.38))
    spire = np.power(np.maximum(1.0 - np.abs(np.sin(qx * 0.62 - qz * 0.48)), 0.0), 2.4) * 0.92
    return ch * (2.65 * np.power(np.maximum(r1, 0.0), 1.3) * (0.42 + 0.68 * r2) + spire) - 0.12


def render_still(width, height, scene=0, t_sec=2.0):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    ndc_x = (uv_x - 0.5) * aspect
    ndc_y = -(uv_y - 0.5)

    drift_x = np.sin(t_sec * 0.14) * 0.42
    drift_z = t_sec * 0.18
    if scene == 0:
        cam = np.array([drift_x, 1.55, -drift_z * 0.65], dtype=np.float32)
        pitch = -0.10
        sun = np.array([-0.46, 0.145, -0.875], dtype=np.float32)
        sky_z = np.array([0.035, 0.065, 0.18], dtype=np.float32)
        sky_m = np.array([0.28, 0.18, 0.24], dtype=np.float32)
        sky_h = np.array([0.98, 0.46, 0.18], dtype=np.float32)
        sun_col = np.array([1.85, 0.95, 0.42], dtype=np.float32)
        fog_col = np.array([0.48, 0.24, 0.18], dtype=np.float32)
    elif scene == 1:
        cam = np.array([drift_x * 0.35, 1.05, -drift_z * 0.40], dtype=np.float32)
        pitch = -0.05
        sun = np.array([0.04, 0.11, -0.99], dtype=np.float32)
        sky_z = np.array([0.025, 0.055, 0.13], dtype=np.float32)
        sky_m = np.array([0.11, 0.19, 0.30], dtype=np.float32)
        sky_h = np.array([0.92, 0.54, 0.30], dtype=np.float32)
        sun_col = np.array([1.90, 1.05, 0.52], dtype=np.float32)
        fog_col = np.array([0.22, 0.25, 0.34], dtype=np.float32)
    else:
        cam = np.array([drift_x * 0.5, 2.35, -drift_z * 0.30], dtype=np.float32)
        pitch = -0.11
        sun = np.array([0.56, 0.16, -0.81], dtype=np.float32)
        sky_z = np.array([0.03, 0.055, 0.16], dtype=np.float32)
        sky_m = np.array([0.19, 0.14, 0.28], dtype=np.float32)
        sky_h = np.array([0.94, 0.44, 0.40], dtype=np.float32)
        sun_col = np.array([1.80, 0.82, 0.62], dtype=np.float32)
        fog_col = np.array([0.38, 0.24, 0.32], dtype=np.float32)

    sun /= np.linalg.norm(sun)
    cp, sp = np.cos(pitch), np.sin(pitch)
    rx = ndc_x * 1.16
    ry = ndc_y * 1.16
    rz = np.full_like(rx, -1.08)
    rlen = np.sqrt(rx * rx + ry * ry + rz * rz)
    rx, ry, rz = rx / rlen, ry / rlen, rz / rlen
    rdx = rx
    rdy = ry * cp - rz * sp
    rdz = ry * sp + rz * cp
    rlen2 = np.sqrt(rdx * rdx + rdy * rdy + rdz * rdz)
    rdx, rdy, rdz = rdx / rlen2, rdy / rlen2, rdz / rlen2

    yc = np.clip(np.maximum(rdy, 0.0), 0.0, 1.0)
    s1 = smoothstep(0.0, 0.22, yc)[..., None]
    s2 = smoothstep(0.16, 0.65, yc)[..., None]
    sky = sky_h * (1.0 - s1) + sky_m * s1
    sky = sky * (1.0 - s2) + sky_z * s2
    sun_dot = np.maximum(rdx * sun[0] + rdy * sun[1] + rdz * sun[2], 0.0)
    sky += sun_col * (np.power(sun_dot, 10.0) * 0.32 + np.power(sun_dot, 140.0) * 1.10)[..., None]
    sky += np.array([1.0, 0.96, 0.86], dtype=np.float32) * (smoothstep(0.9988, 0.9997, sun_dot) * 2.2)[..., None]

    pos_y = rdy > 0.015
    cu_x = np.where(pos_y, rdx / (np.maximum(rdy, 0.015) + 0.20) * 0.52 + t_sec * 0.010, 0.0)
    cu_z = np.where(pos_y, rdz / (np.maximum(rdy, 0.015) + 0.20) * 0.52 - t_sec * 0.006, 0.0)
    cw = np.sin(cu_x * 2.2 + 1.2 * np.cos(cu_z * 1.8)) * np.cos(cu_z * 2.5 - cu_x * 1.0) + 0.42 * np.sin(cu_x * 4.8 - cu_z * 4.3)
    cm = smoothstep(0.32, 0.96, cw) * smoothstep(0.015, 0.20, rdy) * (1.0 - smoothstep(0.34, 0.72, rdy)) * pos_y
    cs = np.power(sun_dot, 2.0)[..., None]
    ccol = (sky_h * 0.85) * (1.0 - cs) + (sun_col * 0.88) * cs
    sky = sky * (1.0 - (cm * 0.38)[..., None]) + ccol * (cm * 0.38)[..., None]

    col = sky.copy()
    max_dist = 42.0
    t = np.full_like(rx, 0.8)
    prev_t = np.full_like(rx, 0.8)
    hit = np.zeros_like(rx, dtype=bool)
    active = np.ones_like(rx, dtype=bool)

    for _ in range(64):
        if not np.any(active):
            break
        qx = cam[0] + rdx * t
        qy = cam[1] + rdy * t
        qz = cam[2] + rdz * t
        h = terrain_h(qx, qz, scene)
        diff = qy - h
        just_hit = active & (diff < 0.0)
        hit |= just_hit
        active &= ~just_hit
        prev_t = np.where(active, t, prev_t)
        t = np.where(active, t + np.clip(diff * 0.34, 0.08, 0.85), t)
        active &= (t <= max_dist)

    if np.any(hit):
        lo = prev_t.copy()
        hi = t.copy()
        for _ in range(5):
            mid = 0.5 * (lo + hi)
            qx = cam[0] + rdx * mid
            qy = cam[1] + rdy * mid
            qz = cam[2] + rdz * mid
            below = qy < terrain_h(qx, qz, scene)
            hi = np.where(hit & below, mid, hi)
            lo = np.where(hit & ~below, mid, lo)
        t = np.where(hit, 0.5 * (lo + hi), t)

    plane_y = 1.02 if scene == 2 else 0.0
    water_t = np.where((scene >= 1) & (rdy < -0.001), (plane_y - cam[1]) / np.minimum(rdy, -1e-4), max_dist + 1.0)
    hit_water = (scene >= 1) & (water_t > 0.2) & (water_t < max_dist) & (~hit | (water_t < t))
    hit_land = hit & ~hit_water

    if np.any(hit_land):
        hx = cam[0] + rdx * t
        hy = cam[1] + rdy * t
        hz = cam[2] + rdz * t
        e = 0.025
        h_x = terrain_h(hx + e, hz, scene)
        h_z = terrain_h(hx, hz + e, scene)
        nx, ny, nz = hy - h_x, np.full_like(hy, e), hy - h_z
        nlen = np.sqrt(nx * nx + ny * ny + nz * nz)
        nx, ny, nz = nx / nlen, ny / nlen, nz / nlen
        ndotl = np.maximum(nx * sun[0] + ny * sun[1] + nz * sun[2], 0.0)
        hemi = 0.5 + 0.5 * ny

        if scene == 0:
            rfx = 2.0 * ndotl * nx - sun[0]
            rfy = 2.0 * ndotl * ny - sun[1]
            rfz = 2.0 * ndotl * nz - sun[2]
            glint = np.power(np.maximum(-(rfx * rdx + rfy * rdy + rfz * rdz), 0.0), 28.0) * 0.35
            albedo = np.array([0.86, 0.45, 0.21], dtype=np.float32) + np.array([0.28, 0.16, 0.06], dtype=np.float32) * glint[..., None]
            shadow = np.array([0.07, 0.06, 0.15], dtype=np.float32)
        elif scene == 1:
            snow = (smoothstep(1.15, 2.0, hy) * smoothstep(0.55, 0.80, ny))[..., None]
            albedo = np.array([0.06, 0.08, 0.11], dtype=np.float32) * (1.0 - snow) + np.array([0.84, 0.86, 0.92], dtype=np.float32) * snow
            shadow = np.array([0.05, 0.09, 0.16], dtype=np.float32)
        else:
            snow = (smoothstep(1.30, 1.95, hy) * smoothstep(0.40, 0.70, ny))[..., None]
            albedo = np.array([0.11, 0.12, 0.17], dtype=np.float32) * (1.0 - snow) + np.array([0.95, 0.88, 0.88], dtype=np.float32) * snow
            shadow = np.array([0.09, 0.11, 0.24], dtype=np.float32)

        lit = albedo * (shadow * (0.60 + 0.55 * hemi)[..., None] + sun_col * (ndotl * 1.25)[..., None])
        fog_amt = ((1.0 - np.exp(-t * (0.032 if scene == 1 else 0.042))) * 0.82)[..., None]
        land_col = lit * (1.0 - fog_amt) + fog_col * fog_amt
        col = np.where(hit_land[..., None], land_col, col)

    if np.any(hit_water):
        wx = cam[0] + rdx * water_t
        wz = cam[2] + rdz * water_t
        if scene == 1:
            r1 = np.sin(wx * 5.8 + wz * 3.6 + t_sec * 1.2) * 0.015
            r2 = np.cos(wx * 11.5 - wz * 8.2 - t_sec * 1.6) * 0.010
            r3 = np.sin(wx * 23.0 + wz * 19.0 + t_sec * 2.1) * 0.005
            wnx, wny, wnz = r1 + r2 * 0.7 + r3, np.ones_like(wx), r2 - r1 * 0.6
            wlen = np.sqrt(wnx * wnx + wny * wny + wnz * wnz)
            wnx, wny, wnz = wnx / wlen, wny / wlen, wnz / wlen
            d_rn = rdx * wnx + rdy * wny + rdz * wnz
            rfx, rfy, rfz = rdx - 2.0 * d_rn * wnx, rdy - 2.0 * d_rn * wny, rdz - 2.0 * d_rn * wnz
            fresnel = (0.06 + 0.94 * np.power(1.0 - np.maximum(-d_rn, 0.0), 4.0))[..., None]
            ryc = smoothstep(0.0, 0.35, np.clip(np.maximum(rfy, 0.0), 0.0, 1.0))[..., None]
            rcol = (sky_h * 0.85) * (1.0 - ryc) + (sky_z * 0.9) * ryc
            rsun = np.maximum(rfx * sun[0] + rfy * sun[1] + rfz * sun[2], 0.0)
            rcol += sun_col * (np.power(rsun, 22.0) * 0.85 + np.power(rsun, 220.0) * 3.2)[..., None]
            surf = np.array([0.015, 0.045, 0.085], dtype=np.float32) * (1.0 - fresnel) + rcol * fresnel
            famt = ((1.0 - np.exp(-water_t * 0.036)) * 0.72)[..., None]
            wcol = surf * (1.0 - famt) + fog_col * famt
        else:
            b1 = np.sin(wx * 0.72 + t_sec * 0.12 + 1.1 * np.cos(wz * 0.58 - t_sec * 0.08)) * np.cos(wz * 0.82 - wx * 0.38)
            b2 = np.sin(wx * 1.9 - wz * 1.6 + t_sec * 0.18) * 0.45
            crest = smoothstep(-0.6, 0.85, b1 + b2)[..., None]
            ctint = np.array([0.16, 0.16, 0.28], dtype=np.float32) * (1.0 - crest) + np.array([0.95, 0.60, 0.54], dtype=np.float32) * crest
            famt = ((1.0 - np.exp(-water_t * 0.032)) * 0.65)[..., None]
            wcol = ctint * (1.0 - famt) + fog_col * famt
        col = np.where(hit_water[..., None], wcol, col)

    vig = (1.0 - 0.26 * ((ndc_x * 0.45) ** 2 + (ndc_y * 0.65) ** 2))[..., None]
    col *= vig

    a, b, c, d, e2 = 2.51, 0.03, 2.43, 0.59, 0.14
    mapped = np.clip((col * (a * col + b)) / (col * (c * col + d) + e2), 0.0, 1.0)
    srgb = np.where(mapped <= 0.0031308, mapped * 12.92, 1.055 * np.power(np.maximum(mapped, 1e-6), 1.0 / 2.4) - 0.055)
    return Image.fromarray((np.clip(srgb, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("sahara", "fjord", "alpenglow")):
        render_still(1440, 900, scene=idx, t_sec=2.0).save(media / f"{name}.webp", quality=91, method=6)
    render_still(1200, 800, scene=0, t_sec=2.0).save(media / "cover.webp", quality=91, method=6)
    render_still(128, 128, scene=0, t_sec=2.0).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked refined solstice-voyage 3D film stills and icon.")
