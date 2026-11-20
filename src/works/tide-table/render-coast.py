"""Render the coast's WGSL offscreen into an sRGB texture.

Requires wgpu==0.29.0 and Pillow. Run from anywhere; opens no window.
"""
from collections import deque
import json
from pathlib import Path
import struct

from PIL import Image, ImageDraw, ImageFont
import wgpu

ROOT = Path(__file__).resolve().parents[3]
WIDTH, HEIGHT = 1200, 800
BODY = Path(__file__).with_name("coast.wgsl").read_text(encoding="utf-8")
HEADER = """
@vertex
fn vertexMain(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let vertices = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
    return vec4f(vertices[i], 0.0, 1.0);
}
@group(0) @binding(0) var<uniform> frame: vec4f;
@fragment
fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
    let viewport = vec2f(1200.0, 800.0);
    let uv = position.xy / viewport;
    let time = frame.x;
    let tide = frame.y;
    let manual = frame.z;
"""
POINTS = {
    "A": (0.513, 0.225), "B": (0.71, 0.72), "C": (0.63, 0.44),
    "isolated_pool": (0.65, 0.245),
}

def pipeline(device, body, format):
    shader = device.create_shader_module(code=HEADER + body + "\n}")
    return device.create_render_pipeline(
        layout="auto", vertex={"module": shader, "entry_point": "vertexMain"},
        fragment={"module": shader, "entry_point": "fragmentMain", "targets": [{"format": format}]},
    )

def render_frame(device, pipeline, target, seconds):
    buffer = device.create_buffer_with_data(
        data=struct.pack("4f", seconds, 0, 0, 0), usage=wgpu.BufferUsage.UNIFORM,
    )
    bind_group = device.create_bind_group(
        layout=pipeline.get_bind_group_layout(0), entries=[{"binding": 0, "resource": {"buffer": buffer}}],
    )
    encoder = device.create_command_encoder()
    render = encoder.begin_render_pass(color_attachments=[{
        "view": target.create_view(), "load_op": "clear", "store_op": "store",
        "clear_value": (0, 0, 0, 1),
    }])
    render.set_pipeline(pipeline)
    render.set_bind_group(0, bind_group)
    render.draw(3)
    render.end()
    device.queue.submit([encoder.finish()])
    # WebGPU copy rows are aligned to 256 bytes.
    stride = (WIDTH * 4 + 255) // 256 * 256
    pixels = bytes(device.queue.read_texture(
        {"texture": target}, {"offset": 0, "bytes_per_row": stride, "rows_per_image": HEIGHT},
        (WIDTH, HEIGHT, 1),
    ))
    return Image.frombytes("RGBA", (WIDTH, HEIGHT), pixels, "raw", "RGBA", stride).convert("RGB")

def survey(mask):
    # Starting in the pool, follow wet pixels to see whether it reaches the sea.
    red, _, _ = mask.split()
    wet = red.tobytes()
    px, py = (int(u * size) for u, size in zip(POINTS["isolated_pool"], (WIDTH, HEIGHT)))
    start = py * WIDTH + px
    assert wet[start]
    queue = deque([start])
    seen = bytearray(len(wet))
    seen[start] = 1
    connected = False
    while queue:
        point = queue.popleft()
        column = point % WIDTH
        if column == 0:
            connected = True
            break
        neighbors = [point - 1, point - WIDTH, point + WIDTH]
        if column + 1 < WIDTH:
            neighbors.append(point + 1)
        for adjacent in neighbors:
            if 0 <= adjacent < len(wet) and wet[adjacent] and not seen[adjacent]:
                seen[adjacent] = 1
                queue.append(adjacent)
    return {
        "wetPixels": sum(wet) // 255,
        "poolConnectedToSea": connected,
        "points": {
            name: bool(red.getpixel((int(x * WIDTH), int(y * HEIGHT))))
            for name, (x, y) in POINTS.items()
        },
    }, wet

def stamp(image):
    drawing = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=15)
    for name in ("A", "B", "C"):
        x, y = POINTS[name]
        x, y = WIDTH * x, HEIGHT * y
        drawing.ellipse((x - 12, y - 12, x + 12, y + 12), fill="#202d40", outline="#fff6dd")
        drawing.text((x, y), name, anchor="mm", font=font, fill="white")

def main():
    device = wgpu.gpu.request_adapter_sync(power_preference="low-power").request_device_sync()
    create_target = lambda format: device.create_texture(
        size=(WIDTH, HEIGHT, 1), format=format,
        usage=wgpu.TextureUsage.RENDER_ATTACHMENT | wgpu.TextureUsage.COPY_SRC,
    )
    target = create_target("rgba8unorm-srgb")
    paint = pipeline(device, BODY, target.format)
    mask_target = create_target("rgba8unorm")
    mask_body = BODY.replace("return vec4f(linear, 1.0);", "return vec4f(f32(depth >= 0.0), 0.0, 0.0, 1.0);")
    mask_paint = pipeline(device, mask_body, mask_target.format)
    output = ROOT / "public/media/tide-table"
    evidence = ROOT / "evidence/V006"
    result = {"adapter": dict(device.adapter.info), "viewport": [WIDTH, HEIGHT], "frames": []}
    masks = []
    for i, (label, seconds) in enumerate([("low", 0.0), ("mid", 2.5), ("high", 5.0), ("low-return", 10.0)]):
        image = render_frame(device, paint, target, seconds)
        if i < 3:
            image.save(output / ("cover.webp" if i == 0 else f"{label}.webp"), quality=88, method=6)
        stamp(image)
        image.save(evidence / f"native-{i + 1}-{label}.png", optimize=True)
        stats, mask = survey(render_frame(device, mask_paint, mask_target, seconds))
        result["frames"].append({"label": label, "seconds": seconds, **stats})
        masks.append(mask)

    assert not result["frames"][0]["poolConnectedToSea"]
    assert result["frames"][1]["poolConnectedToSea"]
    assert all(a <= b <= c and a == d for a, b, c, d in zip(*masks))
    assert [frame["points"]["A"] for frame in result["frames"]] == [False, False, True, False]
    assert not any(frame["points"]["B"] for frame in result["frames"])
    assert all(frame["points"]["C"] for frame in result["frames"])
    (evidence / "native-survey.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=True))

if __name__ == "__main__":
    main()
