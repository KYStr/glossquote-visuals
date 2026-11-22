"""Bake static poses from the same model and lake plate as WebGPU. Run from the repo root."""
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


def smoothstep(a, b, x):
    t = np.clip((x-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


def grain(x, y):
    return np.mod(52.9829189 * np.mod(.06711056*x+.00583715*y, 1), 1)-.5


def raster(mesh, width, height, material):
    target = np.zeros((height, width, 4), dtype=np.float32)
    depth = np.ones((height, width))
    for triangle in mesh:
        a, b, c = [[(u+1)*width/2, (1-v)*height/2, z] for u, v, z in triangle["points"]]
        left = max(0, int(np.floor(min(a[0], b[0], c[0]))))
        right = min(width, int(np.ceil(max(a[0], b[0], c[0]))))
        top = max(0, int(np.floor(min(a[1], b[1], c[1]))))
        bottom = min(height, int(np.ceil(max(a[1], b[1], c[1]))))
        if left >= right or top >= bottom:
            continue
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
        if not visible.any():
            continue
        patch_depth[visible] = z[visible]
        colour = np.array(triangle["tint"])
        patch = target[top:bottom, left:right]
        if material:
            tuv = np.array(triangle["uv"])
            us = (f[visible]*tuv[0, 0]+g[visible]*tuv[1, 0]+h[visible]*tuv[2, 0])
            vs = (f[visible]*tuv[0, 1]+g[visible]*tuv[1, 1]+h[visible]*tuv[2, 1])
            tex_x, tex_y = us*352, vs*352
            particulate = .064*grain(np.floor(tex_x), np.floor(tex_y))
            particulate += .029*grain(np.floor(tex_x*.36), np.floor(tex_y*.36))
            weave=.019*np.cos(tex_x*2.8)*np.cos(tex_y*3.1)
            copper=smoothstep(.16,.49,colour[0]-colour[2])
            detail=.014*grain(np.broadcast_to(xx+.5,z.shape)[visible],np.broadcast_to(yy+.5,z.shape)[visible])
            detail+= .014*np.sin(vs*23.5+.27*np.sin(us*13.1))+(1-copper)*weave+copper*particulate
            patch[visible,:3] = colour*(1+.72*detail[:,None])+detail[:,None]
        else:
            patch[visible,:3] = colour
        patch[visible,3] = 1
    return target


def sample(source, u, v):
    height, width = source.shape[:2]
    x = np.clip(u*width-.5, 0, width-1)
    y = np.clip(v*height-.5, 0, height-1)
    lo_x, lo_y = x.astype(int), y.astype(int)
    hi_x, hi_y = np.minimum(lo_x+1, width-1), np.minimum(lo_y+1, height-1)
    tx, ty = (x-lo_x)[...,None], (y-lo_y)[...,None]
    top = source[lo_y,lo_x]*(1-tx)+source[lo_y,hi_x]*tx
    bottom = source[hi_y,lo_x]*(1-tx)+source[hi_y,hi_x]*tx
    return top*(1-ty)+bottom*ty


def render(spec, model, folder, lake):
    name, width, height, seconds, _, water, _ = spec
    y, x = np.ogrid[:height, :width]
    u, v = 2*(x+.5)/width-1, 1-2*(y+.5)/height
    sx, sy, center, shift = model["shadow"]
    dx = u-shift
    dy = v-center-model["slope"]*dx
    pocket = (dx/sx)**2+(dy/sy)**2
    shade = .59*np.exp(-2.4*pocket)
    if water:
        raster_width = min(680, width)
        mirror = raster(model["reflection"], raster_width, round(height*raster_width/width), False)
        ripple = v*28+u*7.5+2.4*np.sin(u*4+v*2.6)
        facets = np.sin(v*121+2.6*np.sin(7*u+3*v))
        rill = np.sin(ripple+.51*facets)
        ux, vy = u*.5+.5, .5-v*.5
        ratio = (width/height)/(lake.shape[1]/lake.shape[0])
        lake_u = (ux-.5+(.0042*rill+.0016*facets)*.37)*min(1,ratio)+.5
        lake_v = (vy-.5+(.0018*np.sin(.69*ripple))*.37)*min(1,1/ratio)+.5
        lake_rgb = sample(lake,lake_u,lake_v)*(.91+.21*(1-shade[...,None]))+[.003,.012,.013]
        reflection = sample(mirror,ux+.019*rill*facets+.007*np.sin(.65*ripple),vy+.0055*facets+.007*abs(rill))
        settled = max(0,(seconds-4.05)/.75)
        fracture = np.sin(29*u+2.7*rill+np.sin(23*u-48*v))
        broken = (.18+.82*smoothstep(-.40,.71,facets+.53*rill+.52*fracture))*(.68+.32*np.sin(.39*ripple))
        fade = 1-smoothstep(.09,.61,-dy)
        intensity = ((.24+.45*settled)*fade*broken)[...,None]
        color = lake_rgb*(1-reflection[...,3:4]*intensity*.68)
        color += reflection[...,:3]*[1.06,.75,.53]*intensity
        light = np.exp(-abs(dy+.012)*73)*(1-smoothstep(.44,1.02,abs(dx/sx)))
        light *= smoothstep(.22,.81,.66*facets+.34*rill)*settled
        color += light[...,None]*[.16,.25,.23]
    else:
        grid = ((x+4) % 45 == 0) | ((y+4) % 45 == 0)
        light = np.exp(-((u*.65)**2+(v*.65)**2))
        color = np.array([.84,.853,.835])+.045*light[...,None]
        color -= .07*grid[...,None]+.42*shade[...,None]

    hull = raster(model["triangles"],width,height,True)
    pixels = hull[...,:3]+color*(1-hull[...,3:4])
    result = Image.fromarray(np.uint8(np.clip(pixels,0,1)*255))
    result.save(folder/f"{name}.webp",quality=88,method=6)


def main():
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT
    views = VIEWS if len(sys.argv) == 1 else [
        (f"{layout}-{second}", w, h, second, False, True, 0)
        for layout, w, h in [("wide", 1080, 482), ("narrow", 540, 420)]
        for second in [0, .62, 1.87, 2.65, 3.43, 4.8]
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
    lake = np.array(Image.open(OUT/"lake.webp").convert("RGB"),dtype=np.float32)/255
    for spec, model in zip(views, models):
        render(spec, model, folder, lake)


if __name__ == "__main__":
    main()
