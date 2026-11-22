"""Bake the kinetic model's static views using Pillow and NumPy. Run from the repo root."""
from pathlib import Path
import json
import subprocess
import sys

import numpy as np
from PIL import Image

OUT = Path("public/media/foldline")

VIEWS = [
    ("cover", 1200, 800, 4.8, False, True, 0),
    ("half-wide", 1440, 643, 2.65, False, True, 0),
    ("half-narrow", 720, 560, 2.65, False, True, 0),
    ("full-wide", 1440, 643, 4.8, False, True, 0),
    ("full-narrow", 720, 560, 4.8, False, True, 0),
    ("pack-wide", 1440, 643, 0, False, True, 0),
    ("pack-narrow", 720, 560, 0, False, True, 0),
    ("solo", 900, 450, 4.8, False, False, .03),
    ("tandem", 900, 450, 4.8, True, False, .03),
    ("carry", 900, 540, 0, False, False, -.04),
]


def render(spec, model, folder):
    name, width, height, seconds, _, water, _ = spec
    y, x = np.ogrid[:height, :width]
    u, v = 2*(x+.5)/width-1, 1-2*(y+.5)/height
    sx, sy, center, shift = model["shadow"]
    q = (u-shift+.13)**2 + (v-center+.09*u)**2
    r = ((u-shift)/sx)**2 + ((v-center-.095*u*width/height)/sy)**2
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
        rim = .042 * np.exp(-3*r) * (1 + np.sin(ripple)) * (v < center)
        reach = (u-shift)/sx
        surface_line = v-center-.160*u*width/height
        contact = np.exp(-1.85*reach**4)*np.exp(-abs(surface_line+.061)*22.0)
        reflected = contact*max(0,(seconds-4.05)/.75)*(.54+.46*np.sin(ripple*1.9))
        color *= (1-shade[..., None])
        color += rim[..., None] * np.array([.28,.67,.76])
        color += reflected[..., None] * np.array([.10,.075,.060])
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
    result.save(folder/f"{name}.webp", quality=90, method=6)


def main():
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT
    views = VIEWS if len(sys.argv) == 1 else [
        (f"{layout}-{second}", w, h, second, False, True, 0)
        for layout, w, h in [("wide", 1080, 482), ("narrow", 540, 420)]
        for second in [0, .8, 1.5, 2.25, 2.65, 3, 3.7, 4.8]
    ]
    folder.mkdir(parents=True, exist_ok=True)
    specs = [
        {"aspect": w/h, "seconds": seconds, "tandem": duo, "yaw": yaw, "plate": not water}
        for _, w, h, seconds, duo, water, yaw in views
    ]
    command = """
import { boatScene } from './src/works/foldline/geometry.mjs';
console.log(JSON.stringify(JSON.parse(process.argv[1]).map(boatScene)));
"""
    models = json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", command, json.dumps(specs)], text=True))
    for spec, model in zip(views, models):
        render(spec, model, folder)


if __name__ == "__main__":
    main()
