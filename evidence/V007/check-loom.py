
"""Verify the authored still assets and loom model without a browser."""

from pathlib import Path
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src/works/selvedge"))
sys.dont_write_bytecode = True
from importlib import import_module

loom = import_module("render-posters")
POSTERS = ROOT / "public/media/selvedge"


def sample(image, loom_col, loom_row):
    # Invert the live projection to sample the center of an intersection.
    u, v = np.linalg.solve(
        [[18.7, 1.15], [2.4, 12.3]],
        [loom_col + 1.275, loom_row + 1.98],
    )
    return image.getpixel((int(u * image.width), int(v * image.height)))


def is_copper(pixel):
    r, g, b = pixel
    return r > 1.9 * g and g > 1.8 * b


def is_warp(pattern, pixel):
    r, g, b = pixel
    if pattern == "plain":
        return g < 0.55 * r
    if pattern == "twill":
        return b > 1.03 * r
    return b > r


def check_drafts():
    expected = {
        "plain": ("01010101", "10101010", "01010101", "10101010", "01010101", "10101010"),
        "twill": ("01100110", "00110011", "10011001", "11001100", "01100110", "00110011"),
        "satin": ("11101111", "01111011", "11011110", "11110111", "10111101", "11101111"),
    }
    for pattern, rows in expected.items():
        with Image.open(POSTERS / (pattern + "-macro.webp")) as image:
            assert image.size == (640, 440)
            for y, row in enumerate(rows):
                for x, on_top in enumerate(row):
                    pixel = image.getpixel((40 + 80 * x, int(image.height * (y + 0.5) / 6)))
                    assert is_warp(pattern, pixel) == (on_top == "1"), (pattern, x, y, pixel)

    for path in ("plain.webp", "cover.webp", "satin.webp", "shuttle-start.webp"):
        with Image.open(POSTERS / path) as image:
            assert image.size == (1200, 800), path


def check_shuttle():
    # Pixel dimensions match the mobile canvas recorded in the M04 probe.
    # Track copper in the open shed and then in its finished row.
    with Image.open(POSTERS / "shuttle-start.webp") as start:
        assert is_copper(sample(start, 1, 6.84))
        assert not is_copper(sample(start, 8, 6.84))
    middle = loom.paint(351, 234, "twill", seconds=0.9)
    end = loom.paint(351, 234, "twill", seconds=2.25)
    pressed = loom.paint(351, 234, "twill", seconds=3.1)
    assert is_copper(sample(middle, 8, 6.84))
    assert not is_copper(sample(middle, 16, 6.84))
    assert is_copper(sample(end, 16, 6.84))
    assert is_copper(sample(pressed, 16, 6.00))
    assert not is_copper(sample(pressed, 16, 6.84))
    assert is_warp("twill", sample(pressed, 11, 6.00))
    rim = [6.84 - 0.48, 6.84 + 0.48]
    assert all(is_copper(sample(end, 12, y)) for y in rim)
    assert not is_copper(sample(pressed, 12, 6.48))

    _, _, start_head = loom.pick_position(0)
    _, _, middle_head = loom.pick_position(0.9)
    _, _, end_head = loom.pick_position(2.25)
    assert 3 < start_head < 5 and middle_head > start_head + 6
    assert end_head - start_head > 0.75 * 18.7

    # Around take-up the pick counter and projected row offset cancel each
    # other in the woven bed. The same upper crossing stays visually the same.
    prior = loom.paint(720, 480, "twill", seconds=4.589)
    following = loom.paint(720, 480, "twill", seconds=4.591)
    for col in range(2, 16):
        for row in range(0, 4):
            delta = np.abs(np.array(sample(prior, col, row)) - sample(following, col, row))
            assert np.max(delta) <= 2, (col, row, delta)


if __name__ == "__main__":
    check_drafts()
    check_shuttle()
    print("PASS 144 poster intersections, completed swatches, shuttle advancement and take-up continuity (CPU)")
