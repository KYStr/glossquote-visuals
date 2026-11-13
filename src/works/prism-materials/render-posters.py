import ast
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = Path.cwd()
source = (root / "src/works/prism-materials/shader.js").read_text()
planes = ast.literal_eval(re.search(r"const planes = (\[.*?\n\]);", source, re.S)[1])
normals = np.array([row[0] for row in planes], dtype=np.float32)
offsets = np.array([row[1] for row in planes], dtype=np.float32)
media = root / "public/media"

def v(*values):
    return np.array(values, dtype=np.float32)

def unit(a):
    return a / np.maximum(1e-7, np.linalg.norm(a, axis=-1, keepdims=True))

def dot(a, b):
    return np.sum(a * b, axis=-1)

def expand(a):
    return np.expand_dims(a, -1)

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def mix(a, b, t):
    return a * (1 - expand(t)) + b * expand(t)

def refract(ray, normal, eta):
    cosine = dot(ray, normal)
    disc = 1.0 - eta * eta * (1.0 - cosine * cosine)
    result = ray * eta - expand(eta * cosine + np.sqrt(np.maximum(disc, 0))) * normal
    return np.where(expand(disc >= 0), result, 0)

def reflect(ray, normal):
    return ray - 2 * expand(dot(ray, normal)) * normal

def field(p):
    grid_at = p + v(.38, -.08)
    minor = np.min(np.abs((grid_at * 3 + .5) % 1 - .5) / 3, axis=-1)
    major = np.min(np.abs((grid_at * .75 + .5) % 1 - .5) / .75, axis=-1)
    x, y = p.T
    paper = mix(v(.74, .8, .9), v(.98, .985, 1), np.clip(.78 + y * .13 - x * .08, 0, 1))
    track = x - .26 * y
    stripe = 1 - smooth(.27, .28, np.abs(track + .46))
    inset = 1 - smooth(.018, .024, np.abs(track - .06))
    spectrum = 1 - smooth(.04, .045, np.abs(track - .13))
    result = mix(paper, v(.01, .052, .94), stripe)
    result = mix(result, v(.02, .18, .74), inset)
    result = mix(result, v(.41, .66, .99), spectrum * .5)
    return result * expand(1 - (1 - smooth(.003, .013, minor)) * .13 - (1 - smooth(.005, .015, major)) * .1)

def intersections(ro, rd):
    div = rd @ normals.T
    factor = (offsets - ro @ normals.T) / np.where(np.abs(div) < 1e-5, 1e-5, div)
    before = np.where(div < -1e-5, factor, -100)
    after = np.where(div > 1e-5, factor, 100)
    entry = before.argmax(axis=-1)
    exit = after.argmin(axis=-1)
    return before.max(axis=-1), after.min(axis=-1), normals[entry], normals[exit]

def render_strip(u, y, aspect, finish, phase=0.0):
    u, w = np.meshgrid(u, y)
    uv = np.stack([u.flatten(), w.flatten()], axis=-1)
    screen = (uv - v(.52, .475)) * v(aspect, -1) * max(3.18, 3.0 / aspect)
    eye = v(0, 0, 5.25)
    rays = unit(np.column_stack([screen, np.full(len(screen), -5.25, dtype=np.float32)]))
    y_turn = -.49 + np.sin(phase) * .135
    x_turn = .22 + np.cos(phase) * .058
    z_turn = -.23 + np.sin(phase + .7) * .027
    cy, sy = np.cos(y_turn), np.sin(y_turn)
    cx, sx = np.cos(x_turn), np.sin(x_turn)
    cz, sz = np.cos(z_turn), np.sin(z_turn)
    turn = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    pitch = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    roll = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    rotation = (roll @ turn @ pitch).astype(np.float32)
    origin = eye @ rotation
    direction = rays @ rotation
    entry, end, face, _ = intersections(origin, direction)
    shape = (entry < end) & (end > 0)
    back = field((eye + rays * expand((-2.05 - eye[2]) / rays[:,2]))[:, :2])
    delta = (screen - v(.13, -1.14)) * v(1, 5.7)
    back *= expand(1 - .20 * np.exp(-3 * dot(delta, delta)))
    if not shape.any():
        return back.reshape(len(w), len(u[0]), 3)

    heading = direction[shape]
    hit = origin + expand(entry[shape]) * heading
    geometric = unit(face[shape])
    facing = np.abs(geometric[:,2])
    flutes = np.sin(hit[:,0] * 39)
    normal = geometric
    if finish == "satin":
        x, y_pos = hit[:,:2].T
        etched = np.stack([np.sin(x*121+y_pos*174)*np.cos(y_pos*215), np.cos(x*181-y_pos*211)*np.sin(x*177), np.zeros_like(x)], axis=-1)
        normal = unit(normal + etched * expand(.072 * facing))
    if finish == "ribbed":
        normal = unit(normal + expand(flutes * facing * .24) * v(1, 0, 0))

    transmitted = np.zeros_like(hit)
    for channel in range(3):
        ior = 1.504 + channel * .023
        inside = refract(heading, normal, 1 / ior)
        inside_origin = hit + inside * .0002
        ray_length = np.zeros(len(hit))
        active = np.ones(len(hit), dtype=bool)
        outside = np.zeros_like(inside)
        exit_at = inside_origin.copy()
        for _ in range(2):
            _, exit_dist, _, exit_normal = intersections(inside_origin, inside)
            ray_length[active] += exit_dist[active]
            exit_at[active] = inside_origin[active] + inside[active] * expand(exit_dist[active])
            exit_normal = unit(exit_normal)
            outside[active] = refract(inside[active], -exit_normal[active], ior)
            active &= np.linalg.norm(outside, axis=-1) < .0001
            inside[active] = reflect(inside[active], exit_normal[active])
            inside_origin[active] = exit_at[active] + inside[active] * .0002

        world_exit, world_ray = exit_at @ rotation.T, outside @ rotation.T
        backdrop = world_ray[:,2] < -.06
        receiver = world_exit[backdrop] + world_ray[backdrop] * expand((-2.05 - world_exit[backdrop,2]) / world_ray[backdrop,2])
        scene = field(receiver[:,:2])
        if finish == "satin":
            stripe = 1 - smooth(.08, .64, np.abs(receiver[:,0] - .26 * receiver[:,1] + .46))
            scene = mix(scene, mix(v(.81,.88,.96), v(.07,.28,.84), stripe), .72 * facing[backdrop])
        absorb = np.exp(-v(.16, .052, .026)[channel] * ray_length[backdrop])
        transmitted[backdrop,channel] = scene[:,channel] * absorb
        transmitted[~backdrop,channel] = v(.29,.54,.94)[channel] * (.35 + .48 * np.abs(inside[~backdrop,1]))

    reflected = reflect(heading, normal) @ rotation.T
    light_strip = np.maximum(0, reflected @ unit(v(-.67,.76,.68))) ** 15
    fill_strip = np.maximum(0, reflected @ unit(v(.71,.35,.64))) ** 22
    fresnel = .045 + .91 * (1 - np.clip(dot(-heading,normal),0,1)) ** 4.2
    reflective_field = v(.39,.54,.86) + expand(light_strip*.56 + fill_strip*.35)
    film = .5 + .5 * np.cos(v(0,2.094,4.189) + expand(hit @ v(4.7,6.9,3.1) + 6 * fresnel))
    edge = 1 - smooth(0, .05, end[shape] - entry[shape])
    color = mix(transmitted, reflective_field, fresnel) + film * expand(fresnel*.21 + edge*.16)
    color += expand(light_strip*.30 + fill_strip*.16)
    if finish == "ribbed":
        color *= expand(.95 + .05 * flutes)
    back[shape] = color
    return np.clip(back.reshape(len(w), len(u[0]), 3), 0, 1)

def render(w, h, finish):
    pieces = []
    us = (np.arange(w, dtype=np.float32) + .5) / w
    for start in range(0, h, 32):
        vs = (np.arange(start, min(start + 32, h), dtype=np.float32) + .5) / h
        pieces.append(render_strip(us, vs, w / h, finish))
    linear = np.vstack(pieces)
    srgb = np.where(linear <= .0031308, linear * 12.92, 1.055 * linear ** (1 / 2.4) - .055)
    return Image.fromarray((np.clip(srgb,0,1) * 255 + .5).astype("uint8"))

for finish in ("clear", "satin", "ribbed"):
    image = render(1056, 852, finish)
    image.save(media / f"prism-{finish}-hero.webp", quality=88, method=6)
    crop = image.crop((138, 69, 918, 797)).resize((600, 560), Image.Resampling.LANCZOS)
    crop.save(media / f"prism-{finish}.webp", quality=88, method=6)

share = Image.new("RGB", (1200,630), "#f6f7fa")
art = Image.open(media / "prism-clear-hero.webp")
art = art.resize((700,565), Image.Resampling.LANCZOS)
share.paste(art, (475,33))
draw = ImageDraw.Draw(share)
font = str(root / "public/fonts/prism-archivo-black.ttf")
mono = str(root / "public/fonts/prism-plex-mono.ttf")
draw.text((43,53), "PRISM MATERIALS", font=ImageFont.truetype(mono,22), fill="#1734b9")
draw.text((37,165), "Light in", font=ImageFont.truetype(font,98), fill="#11162a")
draw.text((36,267), "section.", font=ImageFont.truetype(font,98), fill="#2548e8")
draw.text((42,537), "ARCHITECTURAL GLASS SAMPLES", font=ImageFont.truetype(mono,20), fill="#1734b9")
share.save(media / "prism-share.jpg", quality=93, optimize=True)
