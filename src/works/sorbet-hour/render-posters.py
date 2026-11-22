"""Render the original jelly compositions (wgpu 0.31.0 and Pillow 12.0.0)."""
from argparse import ArgumentParser
from json import loads
from pathlib import Path
from struct import pack

from PIL import Image
import wgpu

SOURCE = Path(__file__).resolve().parent
MEDIA = SOURCE.parents[2] / "public/media/sorbet-hour"
MOTION = (SOURCE / "jelly-motion.wgsl").read_text(encoding="utf-8")
PAINT = (SOURCE / "jelly.wgsl").read_text(encoding="utf-8")
POSITIONS = loads((SOURCE / "scoop-positions.json").read_text(encoding="utf-8"))
FORMAT = "rgba8unorm-srgb"

parser = ArgumentParser(description=__doc__)
parser.add_argument("--samples", type=Path, help="Write original frames for the drop, the scoop and the reset")
parser.add_argument("--software", action="store_true", help="Use a native fallback GPU adapter")
parser.add_argument("--assets", action="store_true", help="Write the shipping WebP files")
parser.add_argument("--backing", type=int, nargs=2, metavar=("WIDTH", "HEIGHT"), help="Render samples at the actual GPU backing size")
parser.add_argument("--display", type=int, nargs=2, metavar=("WIDTH", "HEIGHT"), help="Save additional samples resampled to the CSS stage size")
args = parser.parse_args()
if not args.assets and not args.samples:
    parser.error("Specify --assets or --samples")
if args.assets and args.backing:
    parser.error("Shipping images always use 1200×800")
if args.display and not args.samples:
    parser.error("--display requires --samples")
if any(d <= 0 for d in (args.backing or []) + (args.display or [])):
    parser.error("Dimensions must be positive")
WIDTH, HEIGHT = args.backing or (1200, 800)
STRIDE = (WIDTH * 4 + 255) // 256 * 256

adapter = wgpu.gpu.request_adapter_sync(force_fallback_adapter=args.software)
device = adapter.request_device_sync()
material = Image.open(MEDIA / "morning-material.webp").convert("RGBA")
atlas = device.create_texture(size=(*material.size, 1), format=FORMAT,
    usage=wgpu.TextureUsage.TEXTURE_BINDING | wgpu.TextureUsage.COPY_DST)
device.queue.write_texture({"texture": atlas}, material.tobytes(),
    {"bytes_per_row": material.width * 4, "rows_per_image": material.height}, (*material.size, 1))
shader = device.create_shader_module(code=f"""
@group(0) @binding(0) var<uniform> params: array<vec4f, 3>;
@group(0) @binding(1) var morning: texture_2d<f32>;
fn photoRGBA(origin: vec2f, extent: vec2f, uv: vec2f) -> vec4f {{
    let texel = vec2i(origin + clamp(uv, vec2f(0.0), vec2f(1.0)) * (extent - 1.0));
    return textureLoad(morning, texel, 0);
}}
fn photo(origin: vec2f, extent: vec2f, uv: vec2f) -> vec3f {{
    return photoRGBA(origin, extent, uv).rgb;
}}
{MOTION}
@vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {{
    let box = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
    return vec4f(box[i], 0, 1);
}}
@fragment fn fragment(@builtin(position) at: vec4f) -> @location(0) vec4f {{
    let viewport = params[0].xy;
    let uv = at.xy / viewport;
    let flavor = params[0].z;
    let time = params[0].w;
    let biteTime = params[1].x;
    let scooped = params[1].y;
    let cutX = params[1].z;
    let cutZ = params[2].x;
    let retained = u32(params[2].y);
    let frame = jellyFrame(biteTime, cutX, cutZ);
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
    entries=[{"binding": 0, "resource": {"buffer": params, "offset": 0, "size": 48}},
        {"binding": 1, "resource": atlas.create_view()}],
)
texture = device.create_texture(size=(WIDTH, HEIGHT, 1), format=FORMAT,
    usage=wgpu.TextureUsage.RENDER_ATTACHMENT | wgpu.TextureUsage.COPY_SRC)

def render(flavor, *, cut=None, bite=0.0, retained=0):
    device.queue.write_buffer(params, 0, pack("<12f", WIDTH, HEIGHT, flavor, 0,
        bite, cut is not None, cut["x"] if cut else 0.0, 0.0,
        cut["z"] if cut else 0.0, retained, 0.0, 0.0))
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
        for index, position in enumerate(POSITIONS):
            for retained in range(1 << len(POSITIONS)):
                if retained & (1 << index):
                    continue
                key = f"{retained}-{position['name']}" if retained else position["name"]
                render(flavor, cut=position, bite=3.65, retained=retained).save(
                    MEDIA / f"{name}-{key}.webp", quality=86, method=6)

def save_sample(image, name):
    image.save(args.samples / f"{name}.png")
    if args.display:
        image.resize(args.display, Image.Resampling.BILINEAR).save(args.samples / f"{name}-display.png")

if args.samples:
    args.samples.mkdir(parents=True, exist_ok=True)
    for time in (0, 0.48, 0.90, 1.26, 1.55, 1.78, 1.92, 2.09, 2.35, 2.72, 3.04, 3.65):
        save_sample(render(0, cut=POSITIONS[1], bite=time), f"bite-{time:04.2f}")
    for position in POSITIONS:
        save_sample(render(0, cut=position, bite=3.65), f"scoop-{position['name']}")
    save_sample(render(0, cut=POSITIONS[0], bite=1.70), "left-contact")
    save_sample(render(0, cut=POSITIONS[2], bite=1.70, retained=1), "right-contact-after-left")
    save_sample(render(0, cut=POSITIONS[2], bite=3.65, retained=1), "right-after-left")
    save_sample(render(0), "reset")
print(dict(adapter.info))
