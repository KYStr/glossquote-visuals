"""Bake mathematically matched stoneware glaze plates, product silhouettes & social cover for V012 kiln-glaze."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/kiln-glaze"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def wrap_angle(a):
    return (a + np.pi) % (2.0 * np.pi) - np.pi


def render_vessel(width, height, active_glaze=0, melt=0.96, kiln_glow=0.05, form="hero"):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    if form == "chawan":
        cx, cy, scale = 0.50, 0.50, 0.33
    elif form == "plate":
        cx, cy, scale = 0.50, 0.50, 0.43
    elif form == "pitcher":
        cx, cy, scale = 0.44, 0.51, 0.33
    else:
        cx, cy, scale = 0.50, 0.50, 0.36

    px = (uv_x - cx) * aspect / scale
    py = (uv_y - cy) / scale
    r = np.sqrt(px * px + py * py)
    a = np.arctan2(py, px)

    # Kiln shelf stone (fine cordierite grain)
    shelf_tone = 0.95 - 0.11 * np.sqrt((px + 0.26) ** 2 + (py + 0.30) ** 2) \
        + 0.018 * np.sin(px * 7.5 + 1.3 * np.cos(py * 6.0)) * np.cos(py * 8.2)
    grog_fine = np.mod(np.sin(np.floor(px * 240.0) * 127.1 + np.floor(py * 240.0) * 311.7) * 43758.5453, 1.0)
    grog_micro = np.mod(np.sin(np.floor(px * 520.0) * 269.5 + np.floor(py * 520.0) * 183.3) * 43758.5453, 1.0)

    col = np.stack([
        0.905 * shelf_tone,
        0.875 * shelf_tone,
        0.825 * shelf_tone,
    ], axis=-1)
    col -= np.array([0.060, 0.052, 0.045], dtype=np.float32) * smoothstep(0.93, 0.995, grog_fine)[..., None]
    col -= np.array([0.024, 0.021, 0.018], dtype=np.float32) * smoothstep(0.75, 0.98, grog_micro)[..., None]

    rim_wobble = 0.014 * np.sin(a * 3.0 + 0.6) + 0.008 * np.cos(a * 5.0 - 1.1) + 0.005 * np.sin(a * 8.0 + 2.1)

    if form == "chawan":
        outer_r = 0.98 + rim_wobble * 1.15
        inner_rim_r = 0.855 + rim_wobble * 0.95
        well_r = 0.40 + rim_wobble * 0.35
        slope_strength = 0.84
        slope_power = 1.25
        spout_channel = np.zeros_like(r)
    elif form == "plate":
        outer_r = 1.00 + rim_wobble * 0.55
        inner_rim_r = 0.935 + rim_wobble * 0.45
        well_r = 0.72 + rim_wobble * 0.25
        slope_strength = 0.32
        slope_power = 2.6
        spout_channel = np.zeros_like(r)
    elif form == "pitcher":
        # Hand-pinched Katakuchi pouring spout extending cleanly to the upper-right
        da = wrap_angle(a - (-0.16))
        spout_outer = 0.50 * np.exp(-((da / 0.27) ** 2)) - 0.045 * np.exp(-(((np.abs(da) - 0.38) / 0.14) ** 2))
        spout_inner = 0.43 * np.exp(-((da / 0.19) ** 2)) - 0.035 * np.exp(-(((np.abs(da) - 0.36) / 0.14) ** 2))
        outer_r = 0.95 + rim_wobble * 1.05 + spout_outer
        inner_rim_r = 0.85 + rim_wobble * 0.85 + spout_inner
        well_r = 0.44 + rim_wobble * 0.30
        slope_strength = 0.76
        slope_power = 1.35
        spout_channel = np.exp(-((da / 0.15) ** 2)) * smoothstep(0.45, 1.18, r)
    else:
        outer_r = 1.0 + rim_wobble
        inner_rim_r = 0.905 + rim_wobble * 0.85
        well_r = 0.42 + rim_wobble * 0.35
        slope_strength = 0.72
        slope_power = 1.35
        spout_channel = np.zeros_like(r)

    # Cast shadow matching vessel silhouette (including pitcher spout!)
    sx = (px - 0.11) * 0.96
    sy = (py - 0.13) * 1.03
    sd = np.sqrt(sx * sx + sy * sy)
    sa = np.arctan2(sy, sx)
    if form == "pitcher":
        sda = wrap_angle(sa - (-0.16))
        shadow_outer = 0.95 + 0.48 * np.exp(-((sda / 0.27) ** 2))
    elif form == "chawan":
        shadow_outer = 0.96
    elif form == "plate":
        shadow_outer = 0.99
    else:
        shadow_outer = 0.96
    shadow_strength = 0.26 if form == "plate" else 0.36
    cast_shadow = np.exp(-np.maximum(sd - shadow_outer, 0.0) * 6.5) * smoothstep(shadow_outer + 0.42, shadow_outer - 0.08, sd)
    col *= (1.0 - shadow_strength * cast_shadow)[..., None]

    feather = 1.6 / max(180.0, height)
    bowl_mask = 1.0 - smoothstep(-feather, feather, r - outer_r)
    inside_mask = 1.0 - smoothstep(-feather * 1.5, feather * 1.5, r - inner_rim_r)

    rn = np.clip(r / np.maximum(inner_rim_r, 1e-4), 0.0, 1.0)
    slope_mag = slope_strength * np.power(rn, slope_power)
    dir_x = px / np.maximum(r, 1e-4)
    dir_y = py / np.maximum(r, 1e-4)

    nx_in, ny_in, nz_in = -dir_x * slope_mag, -dir_y * slope_mag, np.ones_like(r)
    if form == "pitcher":
        # Sculpt V-trough normal along the pinched pouring spout
        da = wrap_angle(a - (-0.16))
        tang_x, tang_y = -dir_y, dir_x
        trough = np.sin(np.clip(da / 0.18, -1.0, 1.0) * np.pi * 0.5) * spout_channel * 0.55
        nx_in = nx_in - tang_x * trough
        ny_in = ny_in - tang_y * trough
    elif form == "plate":
        # Subtle raised shoulder ridge around the flat dining plane
        ridge = np.exp(-((rn - 0.80) / 0.06) ** 2) * 0.34
        nx_in = nx_in - dir_x * ridge
        ny_in = ny_in - dir_y * ridge

    nlen_in = np.sqrt(nx_in ** 2 + ny_in ** 2 + nz_in ** 2)
    nx_in, ny_in, nz_in = nx_in / nlen_in, ny_in / nlen_in, nz_in / nlen_in

    nx_r, ny_r, nz_r = dir_x * 0.55, dir_y * 0.55, np.full_like(r, 0.84)
    nlen_r = np.sqrt(nx_r ** 2 + ny_r ** 2 + nz_r ** 2)
    nx_r, ny_r, nz_r = nx_r / nlen_r, ny_r / nlen_r, nz_r / nlen_r

    nx = nx_r * (1.0 - inside_mask) + nx_in * inside_mask
    ny = ny_r * (1.0 - inside_mask) + ny_in * inside_mask
    nz = nz_r * (1.0 - inside_mask) + nz_in * inside_mask
    nlen = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    nx, ny, nz = nx / nlen, ny / nlen, nz / nlen

    L = np.array([-0.56, -0.62, 0.78], dtype=np.float32)
    L /= np.linalg.norm(L)
    H = L + np.array([0.0, 0.0, 1.0], dtype=np.float32)
    H /= np.linalg.norm(H)

    ndotl = np.maximum(nx * L[0] + ny * L[1] + nz * L[2], 0.0)
    ndoth = np.maximum(nx * H[0] + ny * H[1] + nz * H[2], 0.0)

    wheel_rings = 0.5 + 0.5 * np.sin(r * 58.0 + 1.8 * np.sin(a * 2.0))
    clay_speck = smoothstep(0.84, 0.98, np.mod(np.sin(np.floor(px * 68.0) * 41.2 + np.floor(py * 68.0) * 289.1) * 43758.5, 1.0))
    clay = np.array([0.42, 0.34, 0.27], dtype=np.float32) * (0.76 + 0.32 * ndotl + 0.04 * wheel_rings)[..., None] \
        - np.array([0.11, 0.09, 0.07], dtype=np.float32) * clay_speck[..., None]
    lip_mid = 0.5 * (outer_r + inner_rim_r)
    lip_band = np.exp(-np.abs(r - lip_mid) * 28.0)
    lip_col = np.array([0.56, 0.42, 0.30], dtype=np.float32) * (0.78 + 0.30 * ndotl)[..., None]
    clay = clay * (1.0 - lip_band[..., None] * 0.65) + lip_col * (lip_band[..., None] * 0.65)

    drip_wave = 0.14 * np.sin(a * 7.0 + 0.4) + 0.09 * np.cos(a * 11.0 - 1.2) + 0.06 * np.sin(a * 17.0 + 0.9)
    flow_reach = 0.95 * (1.0 - melt)
    glaze_front = np.clip(flow_reach + drip_wave * (1.0 - 0.55 * melt), -0.15, 0.96)
    glaze_cov = inside_mask * smoothstep(glaze_front - 0.07, glaze_front + 0.05, r) \
        + inside_mask * smoothstep(0.55, 0.95, melt) * (1.0 - smoothstep(well_r - 0.08, well_r + 0.12, r))
    if form == "pitcher":
        glaze_cov = np.maximum(glaze_cov, inside_mask * spout_channel * 0.95)
    glaze_alpha = np.clip(glaze_cov, 0.0, 1.0)

    pool_depth = 1.0 - smoothstep(0.0, well_r * 1.15, r)
    thickness = np.clip(0.32 + 0.58 * pool_depth + 0.24 * (0.5 + 0.5 * np.sin(a * 7.0 + r * 6.0)), 0.0, 1.0)
    if form == "plate":
        thickness = np.clip(0.42 + 0.22 * (1.0 - smoothstep(0.0, 0.78, rn)) + 0.18 * np.exp(-((rn - 0.78) / 0.08) ** 2), 0.0, 1.0)

    w1 = px * 11.2 + py * 6.4 + 1.35 * np.sin(py * 4.8 + px * 2.1)
    w2 = px * 5.9 - py * 12.6 + 1.45 * np.cos(px * 4.3 - py * 2.7)
    w3 = (px - py) * 8.4 + 1.1 * np.sin((px + py) * 5.2)
    crackle = (1.0 - smoothstep(0.0, 0.036, np.minimum(np.abs(np.sin(w1)), np.minimum(np.abs(np.sin(w2)), np.abs(np.sin(w3)))))) * smoothstep(0.35, 0.85, melt)

    cx_grid = np.floor(px * 18.0)
    cy_grid = np.floor(py * 18.0)
    fx = (px * 18.0) - cx_grid - 0.5
    fy = (py * 18.0) - cy_grid - 0.5
    spot_seed = np.mod(np.sin(cx_grid * 91.7 + cy_grid * 213.3) * 43758.5453, 1.0)
    ox = (np.mod(spot_seed * 17.3, 1.0) - 0.5) * 0.42
    oy = (np.mod(spot_seed * 31.7, 1.0) - 0.5) * 0.42
    spot_r = np.sqrt((fx + ox) ** 2 + (fy + oy) ** 2)
    oil_spot = smoothstep(0.55, 0.92, spot_seed) * (1.0 - smoothstep(0.10, 0.26, spot_r)) * smoothstep(0.25, 0.85, melt)

    ash_streak = np.power(0.5 + 0.5 * np.sin(a * 13.0 + r * 9.0 + 1.4 * np.sin(a * 5.0)), 3.0) * smoothstep(0.2, 0.9, melt)

    if active_glaze == 0:
        glaze_base = np.array([0.54, 0.66, 0.59], dtype=np.float32) * (1.0 - thickness[..., None]) \
            + np.array([0.19, 0.37, 0.34], dtype=np.float32) * thickness[..., None]
        glaze_base = glaze_base * (1.0 - crackle[..., None] * 0.42) + np.array([0.15, 0.20, 0.18], dtype=np.float32) * (crackle[..., None] * 0.42)
        spec_color = np.array([0.96, 0.99, 0.97], dtype=np.float32)
        spec_power = 54.0
    elif active_glaze == 1:
        glaze_base = np.array([0.23, 0.12, 0.08], dtype=np.float32) * (1.0 - thickness[..., None]) \
            + np.array([0.05, 0.045, 0.055], dtype=np.float32) * thickness[..., None]
        glaze_base += oil_spot[..., None] * np.array([0.42, 0.27, 0.16], dtype=np.float32)
        if form == "plate":
            # Highlight the subtle raised lip rim of the rim dining plate
            rim_accent = np.exp(-((rn - 0.82) / 0.055) ** 2)
            glaze_base += rim_accent[..., None] * np.array([0.12, 0.075, 0.045], dtype=np.float32)
        spec_color = np.array([0.95, 0.88, 0.78], dtype=np.float32)
        spec_power = 72.0
    else:
        glaze_base = np.array([0.62, 0.55, 0.38], dtype=np.float32) * (1.0 - thickness[..., None]) \
            + np.array([0.27, 0.33, 0.21], dtype=np.float32) * thickness[..., None]
        glaze_base += ash_streak[..., None] * np.array([0.16, 0.14, 0.06], dtype=np.float32)
        if form == "pitcher":
            # Natural ash glaze streaming brightly into the pinched spout channel
            glaze_base += (spout_channel * 0.22)[..., None] * np.array([0.32, 0.38, 0.22], dtype=np.float32)
        spec_color = np.array([0.98, 0.95, 0.86], dtype=np.float32)
        spec_power = 40.0

    gloss = np.power(ndoth, spec_power) * (0.28 + 0.34 * melt) + np.power(ndoth, 12.0) * 0.14
    fresnel = np.power(1.0 - np.maximum(nz, 0.0), 3.0) * 0.24
    glaze_lit = glaze_base * (0.64 + 0.46 * ndotl)[..., None] + spec_color * (gloss + fresnel)[..., None]

    ember = kiln_glow * np.exp(-np.abs(r - inner_rim_r) * 14.0)[..., None] * np.array([0.95, 0.38, 0.12], dtype=np.float32)
    bowl_col = clay * (1.0 - glaze_alpha[..., None]) + glaze_lit * glaze_alpha[..., None] + ember
    out = col * (1.0 - bowl_mask[..., None]) + bowl_col * bowl_mask[..., None]

    img = Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")
    return img


if __name__ == "__main__":
    # Hero stills (matched to live WebGPU hero shader)
    for idx, name in enumerate(("celadon", "tenmoku", "ash")):
        render_vessel(1200, 800, active_glaze=idx, melt=0.96, kiln_glow=0.05, form="hero").save(
            media / f"{name}.webp", quality=90, method=6
        )
    render_vessel(1200, 800, active_glaze=0, melt=0.78, kiln_glow=0.22, form="hero").save(
        media / "cover.webp", quality=90, method=6
    )
    render_vessel(128, 128, active_glaze=0, melt=0.96, kiln_glow=0.05, form="hero").resize(
        (64, 64), Image.Resampling.LANCZOS
    ).save(media / "icon.png")

    # Distinct product card silhouettes
    render_vessel(1200, 800, active_glaze=0, melt=0.96, kiln_glow=0.04, form="chawan").save(
        media / "product-chawan.webp", quality=90, method=6
    )
    render_vessel(1200, 800, active_glaze=1, melt=0.96, kiln_glow=0.04, form="plate").save(
        media / "product-plate.webp", quality=90, method=6
    )
    render_vessel(1200, 800, active_glaze=2, melt=0.96, kiln_glow=0.04, form="pitcher").save(
        media / "product-pitcher.webp", quality=90, method=6
    )
    print("Baked kiln-glaze hero posters, product silhouettes, and icon.")
