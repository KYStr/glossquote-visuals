"""Bake the phase plates and social cover from eclipse.wgsl (wgpu 0.31.0, Pillow 12.0.0)."""
from argparse import ArgumentParser
from pathlib import Path
from struct import pack

from PIL import Image
import wgpu

root = Path(__file__).resolve().parents[3]
media = root / "public/media/umbra-dial"
paint = Path(__file__).with_name("eclipse.wgsl").read_text(encoding="utf-8")
width, height = 1200, 800
stride = (width * 4 + 255) // 256 * 256
texture_format = "rgba8unorm-srgb"

def bake(sample_dir):
    adapter = wgpu.gpu.request_adapter_sync(power_preference="low-power")
    device = adapter.request_device_sync()
    print(adapter.info)
    module = device.create_shader_module(code=f"""
        @group(0) @binding(0) var<uniform> params: vec4f;
        @vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {{
            let vertices = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
            return vec4f(vertices[i], 0.0, 1.0);
        }}
        @fragment fn fragment(@builtin(position) position: vec4f) -> @location(0) vec4f {{
            let viewport = params.xy;
            let aspect = viewport.x / viewport.y;
            let uv = position.xy / viewport;
            let preset = params.z;
            let time = params.w;
            {paint}
        }}
    """)
    pipeline = device.create_render_pipeline(
        layout="auto",
        vertex={"module": module, "entry_point": "vertex"},
        fragment={"module": module, "entry_point": "fragment", "targets": [{"format": texture_format}]},
    )
    buffer = device.create_buffer(size=16, usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST)
    uniforms = device.create_bind_group(
        layout=pipeline.get_bind_group_layout(0),
        entries=[{"binding": 0, "resource": {"buffer": buffer}}],
    )
    texture = device.create_texture(
        size=(width, height, 1), format=texture_format,
        usage=wgpu.TextureUsage.RENDER_ATTACHMENT | wgpu.TextureUsage.COPY_SRC,
    )

    def frame(preset, seconds):
        device.queue.write_buffer(buffer, 0, pack("<4f", width, height, preset, seconds))
        encoder = device.create_command_encoder()
        drawing = encoder.begin_render_pass(color_attachments=[{
            "view": texture.create_view(), "clear_value": (0, 0, 0, 1),
            "load_op": "clear", "store_op": "store",
        }])
        drawing.set_pipeline(pipeline)
        drawing.set_bind_group(0, uniforms)
        drawing.draw(3)
        drawing.end()
        device.queue.submit([encoder.finish()])
        pixels = device.queue.read_texture(
            {"texture": texture}, {"bytes_per_row": stride, "rows_per_image": height}, (width, height, 1),
        )
        return Image.frombytes("RGBA", (width, height), bytes(pixels), "raw", "RGBA", stride, 1).convert("RGB")

    for preset, name in enumerate(("ingress", "total", "egress")):
        frame(preset, 0.0).save(media / f"{name}.webp", quality=89, method=6)
    frame(-1, 0.33).save(media / "cover.webp", quality=90, method=6)

    if sample_dir:
        sample_dir.mkdir(parents=True, exist_ok=True)
        for seconds in (0, 0.33, 0.65, 0.83, 1.04, 1.5, 2.25, 3, 4.5, 6.65, 8, 9.99, 10):
            frame(-1, seconds).save(sample_dir / f"eclipse-{seconds:05.2f}s.png")

if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=Path)
    bake(parser.parse_args().samples)
