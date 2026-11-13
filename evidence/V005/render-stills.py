"""Create AERIFORM stills by depth-compositing seeded samples of its three volumes."""
from math import cos, pi, sin, sqrt
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MEDIA = ROOT / "public" / "media"
ART_SIZE = 720
COLORS = {
    "identity": ((102, 30, 81), (242, 66, 39), (255, 194, 150)),
    "motion": ((96, 34, 112), (255, 105, 68), (255, 214, 180)),
    "digital": ((112, 71, 142), (249, 154, 144), (255, 226, 204)),
}


def rotate(a, b, degrees):
    angle = degrees * pi / 180
    return a * cos(angle) - b * sin(angle), a * sin(angle) + b * cos(angle)


def sample_volume(form, rng):
    if form == "identity":
        theta, phi = (rng.random() * 2 * pi for _ in range(2))
        tube = (0.3 + 0.7 * sqrt(rng.random())) * 0.112
        radius = 0.295 + tube * cos(phi)
        x, y, z = radius * cos(theta), tube * sin(phi), radius * sin(theta)
        x, y, z = inverse_view(x, y, z, 67, -7, -23)
    elif form == "motion":
        theta = rng.uniform(-3 * pi, 3 * pi)
        phi = rng.random() * 2 * pi
        tube = 0.086 * sqrt(rng.random())
        radius = 0.22 + tube * cos(phi)
        x, y, z = radius * cos(theta), 0.205 * theta / (2 * pi) + tube * sin(phi), radius * sin(theta)
        x, y, z = inverse_view(x, y, z, -10, -15, 31)
    else:
        while True:
            x, y, z = rng.uniform(-0.31, 0.31), rng.uniform(-0.25, 0.25), rng.uniform(-0.17, 0.17)
            if sum(max(abs(axis) - edge, 0) ** 2 for axis, edge in zip((x, y, z), (0.273, 0.213, 0.133))) <= 0.037**2:
                break
        x, y, z = inverse_view(x, y, z, 31, -24, -18)
    return x, y, z


def inverse_view(x, y, z, rx, ry, screen_z):
    y, z = rotate(y, z, -rx)
    x, z = rotate(x, z, ry)
    x, y = rotate(x, y, -screen_z)
    return x, y, z


def mix(a, b, t):
    return tuple(round(left + (right - left) * t) for left, right in zip(a, b))


def render(form):
    rng = Random(115205)
    points = sorted((sample_volume(form, rng) for _ in range(6800)), key=lambda p: p[2])
    size = ART_SIZE * 2
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image, "RGBA")
    shadow, tone, shine = COLORS[form]
    for x, y, z in points:
        scale = 0.99 / (1 - z * 0.35)
        cx = size * (0.5 + x * scale)
        cy = size * (0.5 - y * scale)
        radius = rng.uniform(1.1, 2.75) * scale
        grade = max(0, min(1, 0.52 + 0.9 * z + 0.58 * y + rng.uniform(-0.2, 0.23)))
        color = mix(shadow, tone, grade * 2) if grade < 0.5 else mix(tone, shine, (grade - 0.5) * 2)
        draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), fill=(*color, round(110 + 144 * grade)))
    return image.resize((ART_SIZE, ART_SIZE), Image.Resampling.LANCZOS)


def main():
    for form in COLORS:
        render(form).save(MEDIA / f"aero-{form}.webp", quality=87, method=6)
    art = render("identity").resize((870, 870), Image.Resampling.LANCZOS)
    plate = Image.new("RGB", (1200, 800), "#172bc8")
    pixels = plate.load()
    for y in range(800):
        for x in range(1200):
            light = max(0, 1 - sqrt(((x - 644) / 620)**2 + ((y - 420) / 470)**2)) ** 2
            pixels[x, y] = (round(23 + 26*light), round(43 + 33*light), round(200 + 31*light))
    guide = Image.new("RGBA", (660, 660))
    ring = Image.new("RGBA", (660, 660))
    ImageDraw.Draw(ring).ellipse((52, 130, 608, 530), outline=(208, 210, 255, 160), width=2)
    guide.alpha_composite(ring.rotate(25, resample=Image.Resampling.BICUBIC))
    plate.paste(guide, (270, 70), guide)
    plate.paste(art, (165, -35), art)
    plate.save(MEDIA / "aero-share.jpg", quality=92, optimize=True)
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <title>AERIFORM, a vermilion particle ring on cobalt</title>
  <defs>
    <radialGradient id="field"><stop stop-color="#3447e6"/><stop offset="1" stop-color="#172bc8"/></radialGradient>
  </defs>
  <path fill="url(#field)" d="M0 0h1200v800H0z"/>
  <ellipse cx="600" cy="400" rx="382" ry="226" transform="rotate(-25 600 400)" fill="none" stroke="#c9ccff" stroke-opacity=".48"/>
  <image href="data:image/webp;base64,IMAGE_DATA" x="165" y="-35" width="870" height="870"/>
</svg>
'''
    import base64
    identity = base64.b64encode((MEDIA / "aero-identity.webp").read_bytes()).decode("ascii")
    (MEDIA / "aero-hero.svg").write_text(svg.replace("IMAGE_DATA", identity), encoding="utf-8")


if __name__ == "__main__":
    main()
