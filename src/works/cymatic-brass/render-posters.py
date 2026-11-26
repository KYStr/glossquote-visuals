"""Bake mathematically matched Chladni brass resonance plates & icon for V013 cymatic-brass."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/cymatic-brass"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def render_plate(width, height, mode=0, settle=0.96):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect / 0.37
    py = (uv_y - 0.50) / 0.37
    r = np.sqrt(px * px + py * py)
    a = np.arctan2(py, px)

    bench_grad = 1.0 - 0.25 * r
    col = np.stack([
        0.048 * bench_grad,
        0.056 * bench_grad,
        0.068 * bench_grad,
    ], axis=-1)
    grid_x = 1.0 - smoothstep(0.0, 0.014, np.abs(np.mod(px * 2.5 + 0.5, 1.0) - 0.5))
    grid_y = 1.0 - smoothstep(0.0, 0.014, np.abs(np.mod(py * 2.5 + 0.5, 1.0) - 0.5))
    col += np.maximum(grid_x, grid_y)[..., None] * np.array([0.032, 0.038, 0.045], dtype=np.float32)

    ring1 = 1.0 - smoothstep(0.0, 0.006, np.abs(r - 1.15))
    tick_mask = smoothstep(1.13, 1.14, r) * (1.0 - smoothstep(1.19, 1.20, r))
    ticks = tick_mask * (1.0 - smoothstep(0.0, 0.045, np.abs(np.mod(a / 0.261799 + 0.5, 1.0) - 0.5)))
    col += (ring1 * 0.45 + ticks * 0.55)[..., None] * np.array([0.32, 0.26, 0.16], dtype=np.float32)

    sr = np.sqrt((px - 0.06) ** 2 + (py - 0.08) ** 2)
    drop_shadow = np.exp(-np.maximum(sr - 0.98, 0.0) * 8.0) * smoothstep(1.30, 0.90, sr)
    col *= (1.0 - 0.55 * drop_shadow)[..., None]

    feather = 1.5 / max(180.0, height)
    plate_mask = 1.0 - smoothstep(-feather, feather, r - 1.0)
    bevel = smoothstep(0.94, 0.995, r) * plate_mask

    lathe = 0.5 + 0.5 * np.sin(r * 195.0 + 0.6 * np.sin(a * 3.0)) + 0.25 * np.sin(r * 410.0)
    aniso = np.power(np.abs(np.cos(a * 2.0 + 0.75)), 3.2) * 0.38 + np.power(np.abs(np.cos(a * 2.0 - 0.82)), 5.0) * 0.22
    lx, ly = -0.6 / np.hypot(0.6, 0.7), -0.7 / np.hypot(0.6, 0.7)
    pdotl = np.maximum((px * lx + py * ly) / np.maximum(r, 1e-4), 0.0)
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

    collar_mask = (1.0 - smoothstep(-feather, feather, r - 0.115))[..., None]
    stud_mask = (1.0 - smoothstep(-feather, feather, r - 0.072))[..., None]
    stud_light = (0.55 + 0.45 * pdotl)[..., None]
    brass = brass * (1.0 - collar_mask) + np.array([0.16, 0.17, 0.19], dtype=np.float32) * (0.8 + 0.4 * stud_light) * collar_mask
    brass = brass * (1.0 - stud_mask) + np.array([0.76, 0.65, 0.40], dtype=np.float32) * (0.65 + 0.45 * stud_light) * stud_mask

    out = col * (1.0 - plate_mask[..., None]) + brass * plate_mask[..., None]
    return Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    for idx, name in enumerate(("quad", "hex", "lotus")):
        render_plate(1200, 800, mode=idx, settle=0.96).save(media / f"{name}.webp", quality=90, method=6)
    render_plate(1200, 800, mode=1, settle=0.96).save(media / "cover.webp", quality=90, method=6)
    render_plate(128, 128, mode=1, settle=0.96).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")
    print("Baked cymatic-brass posters and icon.")
