"""Render the shipping stills without a browser (wgpu 0.31.0, Pillow 12.0.0)."""
from argparse import ArgumentParser
from pathlib import Path
from struct import pack

from PIL import Image
import wgpu

ROOT = Path(__file__).resolve().parents[3]
MEDIA = ROOT / "public/media/sorbet-hour"
PAINT = Path(__file__).with_name("sorbet.wgsl").read_text(encoding="utf-8")
WIDTH, HEIGHT = 1200, 800
STRIDE = (WIDTH * 4 + 255) // 256 * 256
FORMAT = "rgba8unorm-srgb"

parser = ArgumentParser(description=__doc__)
parser.add_argument("--samples", type=Path, help="Also render five native inspection frames here")
args = parser.parse_args()
adapter = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
device = adapter.request_device_sync()
module = device.create_shader_module(code=f"""
@group(0) @binding(0) var<uniform> params: vec4f;
@vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {{
    let vertices = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
    return vec4f(vertices[i], 0, 1);
}}
@fragment fn fragment(@builtin(position) at: vec4f) -> @location(0) vec4f {{
    let uv = at.xy / params.xy;
    let flavor = params.z;
    let time = params.w;
{PAINT}
}}
""")
pipeline = device.create_render_pipeline(
    layout="auto", vertex={"module": module, "entry_point": "vertex"},
    fragment={"module": module, "entry_point": "fragment", "targets": [{"format": FORMAT}]},
)
params = device.create_buffer(size=16, usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST)
bind = device.create_bind_group(
    layout=pipeline.get_bind_group_layout(0),
    entries=[{"binding": 0, "resource": {"buffer": params, "offset": 0, "size": 16}}],
)
texture = device.create_texture(
    size=(WIDTH, HEIGHT, 1), format=FORMAT,
    usage=wgpu.TextureUsage.RENDER_ATTACHMENT | wgpu.TextureUsage.COPY_SRC,
)

def render(flavor, time):
    device.queue.write_buffer(params, 0, pack("<4f", WIDTH, HEIGHT, flavor, time))
    encoder = device.create_command_encoder()
    drawing = encoder.begin_render_pass(color_attachments=[{
        "view": texture.create_view(), "clear_value": (0, 0, 0, 1),
        "load_op": "clear", "store_op": "store",
    }])
    drawing.set_pipeline(pipeline)
    drawing.set_bind_group(0, bind)
    drawing.draw(3)
    drawing.end()
    device.queue.submit([encoder.finish()])
    pixels = device.queue.read_texture(
        {"texture": texture}, {"bytes_per_row": STRIDE, "rows_per_image": HEIGHT}, (WIDTH, HEIGHT, 1),
    )
    return Image.frombytes("RGBA", (WIDTH, HEIGHT), bytes(pixels), "raw", "RGBA", STRIDE, 1).convert("RGB")

for flavor, name in enumerate(("cover", "berry", "guava")):
    render(flavor, 0).save(MEDIA / f"{name}.webp", quality=88, method=6)

if args.samples:
    args.samples.mkdir(parents=True, exist_ok=True)
    for seconds in (0, 2, 4, 6, 8):
        render(0, seconds / 8).save(args.samples / f"{seconds:02d}s.png")
print(dict(adapter.info))
