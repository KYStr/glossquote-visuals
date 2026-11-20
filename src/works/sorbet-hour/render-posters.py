"""Render or compare the original still and live patch without a browser (wgpu 0.31.0, Pillow 12.0.0)."""
from argparse import ArgumentParser
from json import loads
from pathlib import Path
from struct import pack

from PIL import Image
import wgpu

ROOT = Path(__file__).resolve().parents[3]
MEDIA = ROOT / "public/media/sorbet-hour"
PAINT = Path(__file__).with_name("sorbet.wgsl").read_text(encoding="utf-8")
PATCH = loads(Path(__file__).with_name("patch-bounds.json").read_text(encoding="utf-8"))
WIDTH, HEIGHT = 1200, 800
FORMAT = "rgba8unorm-srgb"

parser = ArgumentParser(description=__doc__)
parser.add_argument("--samples", type=Path, help="Also render five native full-scene inspection frames")
parser.add_argument("--inspect-patch", type=Path, help="Composite just the live patch over the existing posters")
parser.add_argument("--software", action="store_true", help="Request a native fallback adapter")
args = parser.parse_args()
adapter = wgpu.gpu.request_adapter_sync(
    power_preference="high-performance", force_fallback_adapter=args.software,
)
device = adapter.request_device_sync()

def make_renderer(patch):
    origin = (PATCH["x"], PATCH["y"]) if patch else (0.0, 0.0)
    scale = (PATCH["width"], PATCH["height"]) if patch else (1.0, 1.0)
    width, height = round(WIDTH * scale[0]), round(HEIGHT * scale[1])
    stride = (width * 4 + 255) // 256 * 256
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
        const livePatch = {str(patch).lower()};
        const patchOrigin = vec2f({origin[0]}, {origin[1]});
        const patchSize = vec2f({scale[0]}, {scale[1]});
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
        size=(width, height, 1), format=FORMAT,
        usage=wgpu.TextureUsage.RENDER_ATTACHMENT | wgpu.TextureUsage.COPY_SRC,
    )

    def render(flavor, time):
        device.queue.write_buffer(params, 0, pack("<4f", width, height, flavor, time))
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
            {"texture": texture}, {"bytes_per_row": stride, "rows_per_image": height}, (width, height, 1),
        )
        return Image.frombytes("RGBA", (width, height), bytes(pixels), "raw", "RGBA", stride, 1)

    return render

names = ("cover", "berry", "guava")
render = make_renderer(False)
if args.inspect_patch:
    destination = args.inspect_patch
    destination.mkdir(parents=True, exist_ok=True)
    render_patch = make_renderer(True)
    origin = (round(PATCH["x"] * WIDTH), round(PATCH["y"] * HEIGHT))
    for flavor, name in enumerate(names):
        still = Image.open(MEDIA / f"{name}.webp").convert("RGBA")
        for seconds in (0, 1, 2, 3, 4, 6, 8):
            time = seconds / 8
            patch = render_patch(flavor, time)
            composite = still.copy()
            composite.alpha_composite(patch, dest=origin)
            composite.save(destination / f"{name}-{seconds:02d}s.png")
            render(flavor, time).save(destination / f"{name}-{seconds:02d}s-full.png")
else:
    for flavor, name in enumerate(names):
        render(flavor, 0).convert("RGB").save(MEDIA / f"{name}.webp", quality=88, method=6)

if args.samples:
    args.samples.mkdir(parents=True, exist_ok=True)
    for seconds in (0, 2, 4, 6, 8):
        render(0, seconds / 8).save(args.samples / f"{seconds:02d}s.png")
print(dict(adapter.info))
