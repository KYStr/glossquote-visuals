"""Bake mathematically matched Chladni brass resonance plates, product silhouettes & icon for V013 cymatic-brass."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/cymatic-brass"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def make_bench(px, py):
    r = np.sqrt(px * px + py * py)
    bench_grad = np.clip(1.0 - 0.22 * r, 0.35, 1.0)
    col = np.stack([
        0.048 * bench_grad,
        0.056 * bench_grad,
        0.068 * bench_grad,
    ], axis=-1)
    grid_x = 1.0 - smoothstep(0.0, 0.014, np.abs(np.mod(px * 2.5 + 0.5, 1.0) - 0.5))
    grid_y = 1.0 - smoothstep(0.0, 0.014, np.abs(np.mod(py * 2.5 + 0.5, 1.0) - 0.5))
    col += np.maximum(grid_x, grid_y)[..., None] * np.array([0.032, 0.038, 0.045], dtype=np.float32)
    return col


def composite_circular_plate(col, lx, ly, radius, feather, mode=0, settle=0.96, show_ring=True):
    px = lx / radius
    py = ly / radius
    r = np.sqrt(px * px + py * py)
    a = np.arctan2(py, px)

    if show_ring:
        ring1 = 1.0 - smoothstep(0.0, 0.008, np.abs(r - 1.15))
        tick_mask = smoothstep(1.13, 1.14, r) * (1.0 - smoothstep(1.19, 1.20, r))
        ticks = tick_mask * (1.0 - smoothstep(0.0, 0.045, np.abs(np.mod(a / 0.261799 + 0.5, 1.0) - 0.5)))
        col = col + (ring1 * 0.45 + ticks * 0.55)[..., None] * np.array([0.32, 0.26, 0.16], dtype=np.float32)

    sr = np.sqrt((px - 0.06) ** 2 + (py - 0.08) ** 2)
    drop_shadow = np.exp(-np.maximum(sr - 0.98, 0.0) * 8.0) * smoothstep(1.30, 0.90, sr)
    col = col * (1.0 - 0.55 * drop_shadow)[..., None]

    f_r = feather / radius
    plate_mask = 1.0 - smoothstep(-f_r, f_r, r - 1.0)
    bevel = smoothstep(0.94, 0.995, r) * plate_mask

    lathe = 0.5 + 0.5 * np.sin(r * 195.0 + 0.6 * np.sin(a * 3.0)) + 0.25 * np.sin(r * 410.0)
    aniso = np.power(np.abs(np.cos(a * 2.0 + 0.75)), 3.2) * 0.38 + np.power(np.abs(np.cos(a * 2.0 - 0.82)), 5.0) * 0.22
    dir_lx, dir_ly = -0.6 / np.hypot(0.6, 0.7), -0.7 / np.hypot(0.6, 0.7)
    pdotl = np.maximum((px * dir_lx + py * dir_ly) / np.maximum(r, 1e-4), 0.0)
    rim_light = bevel * (0.35 + 0.55 * pdotl)

    brass = np.array([0.58, 0.46, 0.24], dtype=np.float32) * (0.74 + 0.05 * lathe + 0.26 * (1.0 - 0.28 * r))[..., None] \
        + np.array([0.34, 0.28, 0.16], dtype=np.float32) * aniso[..., None] \
        + np.array([0.45, 0.37, 0.20], dtype=np.float32) * rim_light[..., None]

    pi = np.pi
    if mode == 0:
        z = np.cos(2.0 * a + 0.35) * np.sin(r * pi * 2.15) + 0.32 * np.cos(r * pi * 3.0)
    elif mode == 1:
        z = np.cos(3.0 * a - 0.2) * np.sin(r * pi * 2.85) - 0.42 * np.cos(6.0 * a) * np.sin(r * pi * 1.45)
    else:
        z = np.cos(4.0 * a + 0.15) * np.sin(r * pi * 3.55) + 0.48 * np.sin(r * pi * 4.2)

    grain_rand = np.mod(np.sin(np.floor(px * 135.0) * 127.1 + np.floor(py * 135.0) * 311.7) * 43758.5453, 1.0)
    nodal_dist = np.abs(z)
    bw = 0.14 * (1.0 - settle) + 0.068 * settle
    sand_density = np.exp(-(nodal_dist ** 2) / (bw * bw))
    sand_sparkle = 0.72 + 0.28 * smoothstep(0.25, 0.92, grain_rand)
    sand_mask = sand_density * sand_sparkle * smoothstep(0.12, 0.16, r) * (1.0 - smoothstep(0.93, 0.96, r))

    sand_shadow = np.exp(-((nodal_dist - bw * 0.85) ** 2) / (bw * bw * 0.45)) * 0.20 * smoothstep(0.14, 0.20, r)
    brass *= (1.0 - sand_shadow)[..., None]

    quartz = np.array([0.96, 0.94, 0.89], dtype=np.float32) * (0.88 + 0.14 * grain_rand)[..., None]
    sm = np.clip(sand_mask * 0.95, 0.0, 1.0)[..., None]
    brass = brass * (1.0 - sm) + quartz * sm

    collar_mask = (1.0 - smoothstep(-f_r, f_r, r - 0.115))[..., None]
    stud_mask = (1.0 - smoothstep(-f_r, f_r, r - 0.072))[..., None]
    stud_light = (0.55 + 0.45 * pdotl)[..., None]
    brass = brass * (1.0 - collar_mask) + np.array([0.16, 0.17, 0.19], dtype=np.float32) * (0.8 + 0.4 * stud_light) * collar_mask
    brass = brass * (1.0 - stud_mask) + np.array([0.76, 0.65, 0.40], dtype=np.float32) * (0.65 + 0.45 * stud_light) * stud_mask

    return col * (1.0 - plate_mask[..., None]) + brass * plate_mask[..., None]


def render_plate(width, height, mode=0, settle=0.96):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect / 0.37
    py = (uv_y - 0.50) / 0.37
    feather = 1.5 / max(180.0, height)
    col = make_bench(px, py)
    out = composite_circular_plate(col, px, py, radius=1.0, feather=feather, mode=mode, settle=settle, show_ring=True)
    return Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


def render_wall_diffuser(width, height):
    """CB-02: Square 600x600 mm architectural brass wall diffuser panel with 4 corner standoffs."""
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect / 0.38
    py = (uv_y - 0.50) / 0.38
    feather = 1.6 / max(180.0, height)

    col = make_bench(px, py)

    # Architectural square frame calibration marks around panel
    half = 0.98
    outer_box = np.maximum(np.abs(px) - 1.14, np.abs(py) - 1.14)
    cal_line = (1.0 - smoothstep(0.0, 0.008, np.abs(outer_box))) * (1.0 - smoothstep(0.45, 0.70, np.minimum(np.abs(px), np.abs(py))))
    col += cal_line[..., None] * np.array([0.28, 0.23, 0.14], dtype=np.float32)

    # Rounded-chamfer square SDF
    def sd_box(bx, by, h, cr=0.03):
        qx = np.abs(bx) - (h - cr)
        qy = np.abs(by) - (h - cr)
        return np.sqrt(np.maximum(qx, 0.0) ** 2 + np.maximum(qy, 0.0) ** 2) + np.minimum(np.maximum(qx, qy), 0.0) - cr

    # Floating wall shadow
    sh_d = sd_box(px - 0.08, py - 0.10, half, 0.03)
    drop_shadow = np.exp(-np.maximum(sh_d, 0.0) * 7.0) * smoothstep(0.35, -0.05, sh_d)
    col *= (1.0 - 0.62 * drop_shadow)[..., None]

    d = sd_box(px, py, half, 0.03)
    panel_mask = 1.0 - smoothstep(-feather, feather, d)

    # Chamfered bevel along all 4 straight edges (top & left catch warm studio key light)
    edge_dist = -d
    bevel = (1.0 - smoothstep(0.0, 0.065, edge_dist)) * panel_mask
    top_left_light = smoothstep(-0.2, 0.8, -(px + py) * 0.55)
    rim_light = bevel * (0.28 + 0.62 * top_left_light)

    # Directional brushed architectural brass grain + diagonal sheen
    brush = 0.5 + 0.5 * np.sin(py * 240.0 + 1.2 * np.sin(px * 9.0)) + 0.25 * np.sin(py * 490.0)
    sheen = np.exp(-((px * 0.72 + py * 0.68 + 0.18) ** 2) * 2.2) * 0.34 \
        + np.exp(-((px * 0.72 + py * 0.68 - 0.55) ** 2) * 4.5) * 0.18
    r = np.sqrt(px * px + py * py)
    brass = np.array([0.58, 0.46, 0.24], dtype=np.float32) * (0.74 + 0.055 * brush + 0.20 * (1.0 - 0.22 * r))[..., None] \
        + np.array([0.34, 0.28, 0.16], dtype=np.float32) * sheen[..., None] \
        + np.array([0.46, 0.38, 0.21], dtype=np.float32) * rim_light[..., None]

    # Subtle recessed acoustic perimeter groove
    groove = np.exp(-((edge_dist - 0.11) / 0.010) ** 2) * panel_mask
    brass *= (1.0 - 0.32 * groove)[..., None]

    # Square-plate Chladni 512 Hz standing-wave eigenmode (m=3, n=2) on [-1, 1]^2
    pi = np.pi
    nx_p = px / half
    ny_p = py / half
    z = np.cos(3.0 * pi * nx_p * 0.5) * np.cos(2.0 * pi * ny_p * 0.5) \
        - np.cos(2.0 * pi * nx_p * 0.5) * np.cos(3.0 * pi * ny_p * 0.5)
    grain_rand = np.mod(np.sin(np.floor(px * 135.0) * 127.1 + np.floor(py * 135.0) * 311.7) * 43758.5453, 1.0)
    nodal_dist = np.abs(z)
    bw = 0.085
    inner_margin = smoothstep(0.14, 0.19, edge_dist)
    sand_density = np.exp(-(nodal_dist ** 2) / (bw * bw)) * inner_margin
    sand_sparkle = 0.72 + 0.28 * smoothstep(0.25, 0.92, grain_rand)
    sand_mask = sand_density * sand_sparkle

    sand_shadow = np.exp(-((nodal_dist - bw * 0.85) ** 2) / (bw * bw * 0.45)) * 0.22 * inner_margin
    brass *= (1.0 - sand_shadow)[..., None]

    quartz = np.array([0.96, 0.94, 0.89], dtype=np.float32) * (0.88 + 0.14 * grain_rand)[..., None]
    sm = np.clip(sand_mask * 0.92, 0.0, 1.0)[..., None]
    brass = brass * (1.0 - sm) + quartz * sm

    # 4 corner architectural wall-mount standoffs
    for cx_s in (-0.80, 0.80):
        for cy_s in (-0.80, 0.80):
            dx = px - cx_s
            dy = py - cy_s
            sr = np.sqrt(dx * dx + dy * dy)
            recess = (1.0 - smoothstep(-feather, feather, sr - 0.072))[..., None]
            cap = (1.0 - smoothstep(-feather, feather, sr - 0.050))[..., None]
            slot = (1.0 - smoothstep(-feather, feather, sr - 0.022))[..., None]
            s_light = (0.55 + 0.45 * np.clip((-dx * 0.65 - dy * 0.75) / np.maximum(sr, 1e-4), 0.0, 1.0))[..., None]
            brass = brass * (1.0 - recess) + np.array([0.13, 0.14, 0.16], dtype=np.float32) * recess
            brass = brass * (1.0 - cap) + np.array([0.74, 0.63, 0.39], dtype=np.float32) * (0.68 + 0.42 * s_light) * cap
            brass = brass * (1.0 - slot) + np.array([0.20, 0.18, 0.14], dtype=np.float32) * slot

    out = col * (1.0 - panel_mask[..., None]) + brass * panel_mask[..., None]
    return Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


def render_spatial_array(width, height):
    """CB-03: 2x2 Spatial Acoustic Array of four phase-locked circular brass resonator plates."""
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect / 0.42
    py = (uv_y - 0.50) / 0.42
    feather = 1.6 / max(180.0, height)

    col = make_bench(px, py)

    # Phase-sync brass bus rails linking the 2x2 matrix
    ox, oy = 0.66, 0.51
    bus_h = (1.0 - smoothstep(0.0, 0.010, np.abs(np.abs(py) - oy))) * smoothstep(ox + 0.02, ox - 0.02, np.abs(px))
    bus_v = (1.0 - smoothstep(0.0, 0.010, np.abs(np.abs(px) - ox))) * smoothstep(oy + 0.02, oy - 0.02, np.abs(py))
    cross_h = (1.0 - smoothstep(0.0, 0.008, np.abs(py))) * smoothstep(ox, ox - 0.04, np.abs(px))
    cross_v = (1.0 - smoothstep(0.0, 0.008, np.abs(px))) * smoothstep(oy, oy - 0.04, np.abs(py))
    rails = np.maximum(np.maximum(bus_h, bus_v) * 0.65, np.maximum(cross_h, cross_v) * 0.50)
    col += rails[..., None] * np.array([0.42, 0.34, 0.19], dtype=np.float32)

    # Central phase-sync controller hub
    hub_r = np.sqrt(px * px + py * py)
    hub_outer = (1.0 - smoothstep(-feather, feather, hub_r - 0.095))[..., None]
    hub_inner = (1.0 - smoothstep(-feather, feather, hub_r - 0.055))[..., None]
    col = col * (1.0 - hub_outer) + np.array([0.14, 0.16, 0.19], dtype=np.float32) * hub_outer
    col = col * (1.0 - hub_inner) + np.array([0.74, 0.61, 0.34], dtype=np.float32) * hub_inner

    # Four synchronized circular brass plates (2x2 matrix)
    centers = [
        (-ox, -oy, 2),
        (ox, -oy, 2),
        (-ox, oy, 2),
        (ox, oy, 2),
    ]
    plate_radius = 0.42
    for cx_p, cy_p, m_idx in centers:
        col = composite_circular_plate(
            col,
            px - cx_p,
            py - cy_p,
            radius=plate_radius,
            feather=feather,
            mode=m_idx,
            settle=0.96,
            show_ring=True,
        )

    return Image.fromarray((np.clip(col, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    # Hero stills (matched to live WebGPU hero shader)
    for idx, name in enumerate(("quad", "hex", "lotus")):
        render_plate(1200, 800, mode=idx, settle=0.96).save(media / f"{name}.webp", quality=90, method=6)
    render_plate(1200, 800, mode=1, settle=0.96).save(media / "cover.webp", quality=90, method=6)
    render_plate(128, 128, mode=1, settle=0.96).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")

    # Distinct product card silhouettes
    render_plate(1200, 800, mode=0, settle=0.96).save(media / "product-desk.webp", quality=90, method=6)
    render_wall_diffuser(1200, 800).save(media / "product-wall.webp", quality=90, method=6)
    render_spatial_array(1200, 800).save(media / "product-array.webp", quality=90, method=6)
    print("Baked cymatic-brass hero posters, product silhouettes, and icon.")
