"""Bake the kinetic model's static views using Pillow and NumPy. Run from the repo root."""
from pathlib import Path
import json
import subprocess

import numpy as np
from PIL import Image

OUT = Path("public/media/foldline")

VIEWS = [
    ("cover", 1200, 800, 0, False, False, True, 0),
    ("half-wide", 1440, 643, 0, False, False, True, 0),
    ("half-narrow", 720, 560, 0, False, False, True, 0),
    ("full-wide", 1440, 643, 1, False, False, True, 0),
    ("full-narrow", 720, 560, 1, False, False, True, 0),
    ("pack-wide", 1440, 643, 0, True, False, True, 0),
    ("pack-narrow", 720, 560, 0, True, False, True, 0),
    ("solo", 900, 450, 1, False, False, False, -.09),
    ("tandem", 900, 450, 1, False, True, False, -.09),
    ("carry", 900, 540, 0, True, False, False, -.34),
]


def render(spec, model):
    name, width, height, _, pack, _, water, _ = spec
    y, x = np.ogrid[:height, :width]
    u, v = 2*(x+.5)/width-1, 1-2*(y+.5)/height
    sx, sy, center = model["shadow"]
    q = (u+.13)**2 + (v-center+.09*u)**2
    r = (u/sx)**2 + ((v-center-.14*u*width/height)/sy)**2
    shade = .51*np.exp(-2.1*r) + .18*np.exp(-6*q)
    rng = np.random.default_rng(1010)
    grain = rng.uniform(-.5, .5, (height, width, 1))
    if water:
        light = np.exp(-((u*.83)**2+(v*.66)**2))
        ripple = v*34 + u*9 + 2.5*np.sin(u*4+v*2.9) + .8*np.sin(u*8-v*5)
        cut = (.5+.5*np.sin(ripple))**13
        streak = .5+.5*np.sin(16*u+5*v+np.sin(9*v))
        thread = (.5+.5*np.sin(v*87+u*20+2*np.cos(u*6+v*3)))**14
        color = np.array([.020,.126,.196]) + np.array([.014,.139,.173])*light[..., None]
        color += np.array([.025,.086,.10])*(cut*streak*.9+thread*.33)[..., None]
        color *= (1-shade[..., None])
    else:
        grid = ((x+4) % 45 == 0) | ((y+4) % 45 == 0)
        light = np.exp(-((u*.65)**2+(v*.65)**2))
        color = np.array([.84,.853,.835]) + .045*light[..., None]
        color -= .07*grid[..., None] + .42*shade[..., None]

    pixels = color + grain*.014
    depth = np.ones((height, width))
    for triangle in model["triangles"]:
        a, b, c = [[(u+1)*width/2, (1-v)*height/2, z] for u, v, z in triangle["points"]]
        left = max(0, int(np.floor(min(a[0], b[0], c[0]))))
        right = min(width, int(np.ceil(max(a[0], b[0], c[0]))))
        top = max(0, int(np.floor(min(a[1], b[1], c[1]))))
        bottom = min(height, int(np.ceil(max(a[1], b[1], c[1]))))
        yy, xx = np.ogrid[top:bottom, left:right]
        determinant = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
        if abs(determinant) < 1e-9:
            continue
        f = ((b[1]-c[1])*(xx+.5-c[0]) + (c[0]-b[0])*(yy+.5-c[1]))/determinant
        g = ((c[1]-a[1])*(xx+.5-c[0]) + (a[0]-c[0])*(yy+.5-c[1]))/determinant
        h = 1-f-g
        z = f*a[2] + g*b[2] + h*c[2]
        patch_depth = depth[top:bottom, left:right]
        visible = (f >= 0) & (g >= 0) & (h >= 0) & (z < patch_depth)
        patch_depth[visible] = z[visible]
        pixels[top:bottom, left:right][visible] = np.array(triangle["tint"]) + grain[top:bottom, left:right][visible]*.026
    result = Image.fromarray(np.uint8(np.clip(pixels, 0, 1)*255))
    result.save(OUT/f"{name}.webp", quality=88, method=6)


def main():
    specs = [
        {"aspect": w/h, "opened": opened, "pack": pack, "tandem": duo, "yaw": yaw}
        for _, w, h, opened, pack, duo, _, yaw in VIEWS
    ]
    # Increase the pack detail only in its dedicated illustration. The hero
    # maintains its true scale relative to the full-width hull.
    command = """
import { boatScene } from './src/works/foldline/geometry.mjs';
const views = JSON.parse(process.argv[1]).map(boatScene);
const detail = views.at(-1);
const unique = new Set(detail.triangles.flatMap(triangle => triangle.points));
for (const p of unique) { p[0] *= 2.7; p[1] = (p[1] + .12) * 2.7; }
detail.shadow[0] *= 2.7; detail.shadow[1] *= 2.7;
detail.shadow[2] = (detail.shadow[2] + .12) * 2.7;
console.log(JSON.stringify(views));
"""
    models = json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", command, json.dumps(specs)], text=True))
    for spec, model in zip(VIEWS, models):
        render(spec, model)


if __name__ == "__main__":
    main()
