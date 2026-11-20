"""Render the original jelly compositions (wgpu 0.31.0 and Pillow 12.0.0)."""
from argparse import ArgumentParser
from json import loads
from pathlib import Path
from struct import pack

from PIL import Image
import wgpu

SOURCE = Path(__file__).resolve().parent
MEDIA = SOURCE.parents[2] / "public/media/sorbet-hour"
PAINT = (SOURCE / "jelly.wgsl").read_text(encoding="utf-8")
POSITIONS = loads((SOURCE / "scoop-positions.json").read_text(encoding="utf-8"))
WIDTH, HEIGHT = 1200, 800
STRIDE = (WIDTH * 4 + 255) // 256 * 256
FORMAT = "rgba8unorm-srgb"

parser = ArgumentParser(description=__doc__)
parser.add_argument("--samples", type=Path, help="Write original frames for the drop, the scoop and the reset")
parser.add_argument("--software", action="store_true", help="Use a native fallback GPU adapter")
parser.add_argument("--assets", action="store_true", help="Write the shipping WebP files")
args = parser.parse_args()
if not args.assets and not args.samples:
    parser.error("Specify --assets or --samples")
adapter = wgpu.gpu.request_adapter_sync(force_fallback_adapter=args.software)
device = adapter.request_device_sync()
shader = device.create_shader_module(code=f"""
@group(0) @binding(0) var<uniform> params: array<vec4f, 3>;
@vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {{
    let box = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
    return vec4f(box[i], 0, 1);
}}
@fragment fn fragment(@builtin(position) at: vec4f) -> @location(0) vec4f {{
    let uv = at.xy / params[0].xy;
    let flavor = params[0].z;
    let time = params[0].w;
    let introOffset = params[1].x;
    let scooped = params[1].y;
    let cutX = params[1].z;
    let scoopProgress = params[1].w;
    let cutZ = params[2].x;
{PAINT}
}}
""")
pipeline = device.create_render_pipeline(
    layout="auto", vertex={"module": shader, "entry_point": "vertex"},
    fragment={"module": shader, "entry_point": "fragment", "targets": [{"format": FORMAT}]},
)
params = device.create_buffer(size=48, usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST)
bind = device.create_bind_group(
    layout=pipeline.get_bind_group_layout(0),
    entries=[{"binding": 0, "resource": {"buffer": params, "offset": 0, "size": 48}}],
)
texture = device.create_texture(size=(WIDTH, HEIGHT, 1), format=FORMAT,
    usage=wgpu.TextureUsage.RENDER_ATTACHMENT | wgpu.TextureUsage.COPY_SRC)

def render(flavor, time=0, *, opening=False, cut=None, progress=1):
    device.queue.write_buffer(params, 0, pack("<12f", WIDTH, HEIGHT, flavor, time,
        0 if opening else 1.23, cut is not None, cut["x"] if cut else 0.0, progress,
        cut["z"] if cut else 0.0, 0.0, 0.0, 0.0))
    encoder = device.create_command_encoder()
    drawing = encoder.begin_render_pass(color_attachments=[{
        "view": texture.create_view(), "clear_value": (0, 0, 0, 0),
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

if args.assets:
    for flavor, name in enumerate(("cover", "berry", "guava")):
        render(flavor).save(MEDIA / f"{name}.webp", quality=89, method=6)
        for position in POSITIONS:
            render(flavor, cut=position).save(MEDIA / f"{name}-{position['name']}.webp", quality=86, method=6)

if args.samples:
    args.samples.mkdir(parents=True, exist_ok=True)
    for time in (0, 0.17, 0.34, 0.57, 0.83, 1.21, 3):
        render(0, time, opening=True).save(args.samples / f"drop-{time:04.2f}.png")
    for position in POSITIONS:
        render(0, cut=position).save(args.samples / f"scoop-{position['name']}.png")
    render(0, cut=POSITIONS[1], progress=0.55).save(args.samples / "scoop-in-flight.png")
    render(0).save(args.samples / "reset.png")
print(dict(adapter.info))
