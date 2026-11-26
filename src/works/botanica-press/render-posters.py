"""Bake mathematically matched cyanotype botanical plates, product compositions & icon for V014 botanica-press."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[3]
media = root / "public/media/botanica-press"
media.mkdir(parents=True, exist_ok=True)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / np.maximum(e1 - e0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def make_desk(px, py):
    wood_grain = 0.5 + 0.5 * np.sin(py * 110.0 + 2.4 * np.sin(px * 9.0) + 0.8 * np.cos(py * 28.0))
    bench_light = np.clip(1.08 - 0.34 * np.sqrt((px + 0.22) ** 2 + (py + 0.18) ** 2), 0.58, 1.15)
    return np.array([0.145, 0.125, 0.112], dtype=np.float32) * ((0.86 + 0.12 * wood_grain) * bench_light)[..., None]


def specimen_masks(px, py, specimen, feather):
    if specimen == 0:
        gx, gy = px, py - 0.15
        gr = np.sqrt(gx * gx + gy * gy)
        ga = np.arctan2(-gy, gx) - np.pi * 0.5
        fan_span = 0.98 - 0.06 * smoothstep(0.0, 0.35, gr)
        side_dist = (np.abs(ga) - fan_span) * np.maximum(gr, 0.02)
        in_angle = 1.0 - smoothstep(-feather, feather, side_dist)
        cleft = 0.145 * np.exp(-ga * ga * 44.0)
        wave = 0.012 * np.sin(ga * 13.0 + 0.3) + 0.006 * np.cos(ga * 29.0 - 0.5)
        outer = 0.445 - cleft + wave
        blade = in_angle * (1.0 - smoothstep(-feather, feather, gr - outer)) * smoothstep(0.0, 0.012, -gy + 0.008)
        stem_curve = 0.036 * np.sin((py - 0.15) * 6.5)
        stem_w = 0.007 + 0.002 * smoothstep(0.14, 0.32, py)
        stem = (1.0 - smoothstep(stem_w - 0.002, stem_w + 0.002, np.abs(px - stem_curve))) * smoothstep(0.11, 0.14, py) * (1.0 - smoothstep(0.325, 0.34, py))
        leaf_mask = np.maximum(blade, stem)
        p_veins = np.power(0.5 + 0.5 * np.cos(ga * 44.0), 10.0) * smoothstep(0.04, 0.38, gr)
        f_veins = np.power(0.5 + 0.5 * np.cos(ga * 88.0 + 0.4), 12.0) * smoothstep(0.18, 0.41, gr)
        vein_mask = blade * np.clip(p_veins * 0.85 + f_veins * 0.5, 0.0, 1.0)
    elif specimen == 1:
        curve_x = 0.075 * np.sin(py * 4.2 + 0.45)
        fx, fy = px - curve_x, py
        stem = (1.0 - smoothstep(0.0032, 0.0062, np.abs(fx))) * smoothstep(-0.315, -0.295, fy) * (1.0 - smoothstep(0.31, 0.33, fy))
        env = np.clip(1.0 - np.abs(fy + 0.03) * 2.2, 0.24, 1.0) * smoothstep(-0.31, -0.22, fy) * (1.0 - smoothstep(0.24, 0.31, fy))
        row = fy * 13.5 + np.where(fx >= 0.0, 0.45, 0.0)
        cell_y = np.mod(row, 1.0) - 0.5
        arm_len = 0.24 * env
        lx = (np.abs(fx) - 0.012) / np.maximum(arm_len, 0.02)
        ly = (cell_y + lx * 0.28) * 1.95
        fan_r = np.sqrt(((lx - 0.44) * 1.65) ** 2 + (ly * 0.92) ** 2)
        fan_ang = np.arctan2(ly, np.maximum(lx, 0.001))
        pinna_dist = fan_r - (0.76 + 0.065 * np.sin(fan_ang * 9.0))
        pinnae = (1.0 - smoothstep(-0.07, 0.07, pinna_dist)) * smoothstep(0.0, 0.06, lx) * smoothstep(-0.30, -0.26, fy) * (1.0 - smoothstep(0.27, 0.305, fy))
        twig = (1.0 - smoothstep(0.0025, 0.005, np.abs(cell_y + lx * 0.28) / 13.5)) * smoothstep(0.0, 0.02, np.abs(fx)) * (1.0 - smoothstep(0.18, 0.35, lx)) * smoothstep(-0.29, -0.25, fy) * (1.0 - smoothstep(0.26, 0.29, fy))
        leaf_mask = np.maximum(np.maximum(stem, pinnae), twig)
        vein_mask = pinnae * (np.power(0.5 + 0.5 * np.cos(fan_ang * 18.0), 8.0) * 0.7 + (1.0 - smoothstep(0.0, 0.14, np.abs(ly))) * 0.5)
    else:
        curve_x = 0.048 * np.sin(py * 5.0 - 0.25)
        ex, ey = px - curve_x, py
        stem = (1.0 - smoothstep(0.0042, 0.0074, np.abs(ex))) * smoothstep(-0.31, -0.29, ey) * (1.0 - smoothstep(0.31, 0.33, ey))
        leaves = np.zeros_like(px)
        midribs = np.zeros_like(px)
        nodes = (
            (-0.23, -1.0, 0.115), (-0.15, 1.0, 0.138), (-0.07, -1.0, 0.155),
            (0.01, 1.0, 0.162), (0.09, -1.0, 0.152), (0.17, 1.0, 0.136), (0.24, -1.0, 0.110),
        )
        for cy_l, s, length in nodes:
            ang = s * 0.62
            ca, sa = np.cos(ang), np.sin(ang)
            dx, dy = ex - s * 0.008, ey - cy_l
            u = (dx * s) * ca - dy * sa
            v = (dx * s) * sa + dy * ca
            un = u / length
            half_w = 0.36 * length * np.sin(np.clip(un, 0.0, 1.0) * np.pi) * (1.0 - 0.22 * un)
            in_u = smoothstep(0.0, 0.06, un) * (1.0 - smoothstep(0.94, 1.02, un))
            blade_m = (1.0 - smoothstep(-feather, feather, np.abs(v) - half_w)) * in_u
            rib_m = blade_m * (1.0 - smoothstep(0.002, 0.006, np.abs(v)))
            lateral = blade_m * np.power(0.5 + 0.5 * np.cos(u * 48.0 - np.abs(v) * 65.0), 10.0) * 0.55
            leaves = np.maximum(leaves, blade_m)
            midribs = np.maximum(midribs, np.maximum(rib_m, lateral))
        tip_u = -(ey + 0.235) / 0.072
        tip_w = 0.025 * np.sin(np.clip(tip_u, 0.0, 1.0) * np.pi)
        tip_leaf = (1.0 - smoothstep(-feather, feather, np.abs(ex) - tip_w)) * smoothstep(0.0, 0.08, tip_u) * (1.0 - smoothstep(0.92, 1.02, tip_u))
        leaf_mask = np.maximum(np.maximum(stem, leaves), tip_leaf)
        vein_mask = midribs
    return leaf_mask, vein_mask


def cyanotype_sheet_color(lx, ly, hw, hh, specimen, feather, exposure=0.96, sun_pos=0.18, brush_pad=0.085):
    fiber_fine = np.mod(np.sin(np.floor(lx * 240.0) * 127.1 + np.floor(ly * 240.0) * 311.7) * 43758.5453, 1.0)
    fiber_tooth = np.mod(np.sin(np.floor(lx * 95.0) * 269.5 + np.floor(ly * 95.0) * 183.3) * 43758.5453, 1.0)
    paper_base = np.array([0.962, 0.948, 0.916], dtype=np.float32) \
        - np.array([0.020, 0.018, 0.016], dtype=np.float32) * fiber_fine[..., None] \
        - np.array([0.014, 0.013, 0.011], dtype=np.float32) * fiber_tooth[..., None]

    stroke_x = 0.014 * np.sin(ly * 19.0 + 0.4) + 0.006 * np.sin(ly * 68.0) + 0.003 * np.cos(ly * 145.0)
    stroke_y = 0.009 * np.cos(lx * 16.0 - 0.5) + 0.004 * np.sin(lx * 54.0)
    coat_dist = np.maximum(np.abs(lx) - (hw - brush_pad + stroke_x), np.abs(ly) - (hh - brush_pad + stroke_y))
    brush_hair = 0.5 + 0.5 * np.sin(ly * 190.0 + 1.8 * np.sin(lx * 14.0))
    coat_mask = (1.0 - smoothstep(-0.014, 0.016, coat_dist)) * (1.0 - 0.16 * brush_hair * smoothstep(-0.045, 0.012, coat_dist))

    fit_scale = min(hw / 0.38, hh / 0.42)
    if specimen == 1:
        sx = lx / max(fit_scale * 1.14, 1e-4)
        sy = ly / max(fit_scale * 1.02, 1e-4)
    else:
        sx = lx / max(fit_scale, 1e-4)
        sy = ly / max(fit_scale, 1e-4)
    leaf_mask, vein_mask = specimen_masks(sx, sy, specimen, feather / max(fit_scale, 1e-4))

    diag = lx * 0.72 + ly * 0.52
    local_uv = np.clip(exposure * 1.28 - (diag - sun_pos) * 0.42, 0.0, 1.0)
    gran = (0.92 + 0.10 * np.sin(lx * 24.0 + ly * 19.0) * np.cos(lx * 13.0 - ly * 27.0) + 0.04 * fiber_tooth)[..., None]
    unexposed = np.array([0.83, 0.84, 0.61], dtype=np.float32)
    mid_tone = np.array([0.14, 0.41, 0.49], dtype=np.float32)
    prussian = np.array([0.045, 0.155, 0.315], dtype=np.float32) * gran

    t1 = smoothstep(0.0, 0.46, local_uv)[..., None]
    t2 = smoothstep(0.32, 1.0, local_uv)[..., None]
    emulsion = unexposed * (1.0 - t1) + mid_tone * t1
    emulsion = emulsion * (1.0 - t2) + prussian * t2

    lm = (leaf_mask * 0.94)[..., None]
    print_tone = emulsion * (1.0 - lm) + (paper_base + np.array([0.012, 0.012, 0.014], dtype=np.float32)) * lm
    vm = (vein_mask * 0.52)[..., None]
    veined = print_tone * (1.0 - vm) + (paper_base * 0.64 + mid_tone * 0.36) * vm

    return paper_base * (1.0 - coat_mask[..., None]) + veined * coat_mask[..., None]


def composite_framed_print(col, px, py, cx, cy, fw, fh, specimen, feather, frame_thick=0.036, mat_pad=0.048):
    lx = px - cx
    ly = py - cy

    # Cast drop shadow of the ash wood frame
    sh_d = np.maximum(np.abs(lx - 0.022) - fw, np.abs(ly - 0.026) - fh)
    drop_shadow = np.exp(-np.maximum(sh_d, 0.0) * 26.0) * smoothstep(0.11, -0.02, sh_d)
    col = col * (1.0 - 0.34 * drop_shadow)[..., None]

    outer_d = np.maximum(np.abs(lx) - fw, np.abs(ly) - fh)
    inner_frame_d = np.maximum(np.abs(lx) - (fw - frame_thick), np.abs(ly) - (fh - frame_thick))
    mat_d = np.maximum(np.abs(lx) - (fw - frame_thick - mat_pad), np.abs(ly) - (fh - frame_thick - mat_pad))

    frame_mask = 1.0 - smoothstep(-feather, feather, outer_d)
    window_mask = 1.0 - smoothstep(-feather, feather, inner_frame_d)
    art_mask = 1.0 - smoothstep(-feather, feather, mat_d)

    # Natural ash wood frame with subtle grain & directional light
    wood_grain = 0.5 + 0.5 * np.sin((lx + ly * 0.3) * 110.0 + 1.5 * np.sin(ly * 14.0))
    wood_lit = 0.88 + 0.14 * smoothstep(-0.3, 0.3, -(lx + ly))
    ash_wood = np.array([0.78, 0.69, 0.56], dtype=np.float32) * (wood_lit + 0.05 * wood_grain)[..., None]
    # Inner bevel shadow under frame lip
    inner_lip_shadow = smoothstep(0.0, 0.028, -inner_frame_d)
    mat_col = np.array([0.965, 0.955, 0.930], dtype=np.float32) * (0.86 + 0.14 * inner_lip_shadow)[..., None]

    # Archival cyanotype print inside mat window
    art_w = fw - frame_thick - mat_pad
    art_h = fh - frame_thick - mat_pad
    print_col = cyanotype_sheet_color(lx, ly, art_w, art_h, specimen, feather, exposure=0.96, sun_pos=0.14, brush_pad=0.022)

    # Subtle bevel border on mat opening
    mat_bevel = np.exp(-np.abs(mat_d) * 180.0) * 0.18
    mat_col = mat_col * (1.0 - mat_bevel[..., None])

    # Assemble: wood frame -> mat -> print -> glass highlight
    framed = ash_wood * (1.0 - window_mask[..., None]) + mat_col * window_mask[..., None]
    framed = framed * (1.0 - art_mask[..., None]) + print_col * art_mask[..., None]

    # Soft diagonal glass reflection across the framed glazing
    glare = np.exp(-(((lx * 0.72 + ly * 0.58) + 0.08) ** 2) * 28.0) * 0.085 * window_mask
    framed = framed + np.array([1.0, 0.98, 0.92], dtype=np.float32) * glare[..., None]

    return col * (1.0 - frame_mask[..., None]) + framed * frame_mask[..., None]


def render_plate(width, height, specimen=0, exposure=0.96, sun_pos=0.18):
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect
    py = (uv_y - 0.50)
    feather = 1.6 / max(180.0, height)

    col = make_desk(px, py)
    paper_dist = np.maximum(np.abs(px) - 0.60, np.abs(py) - 0.42)
    paper_mask = 1.0 - smoothstep(-feather, feather, paper_dist)

    shadow_dist = np.maximum(np.abs(px - 0.018) - 0.60, np.abs(py - 0.022) - 0.42)
    sheet_shadow = np.exp(-np.maximum(shadow_dist, 0.0) * 32.0) * smoothstep(0.08, -0.01, shadow_dist)
    col *= (1.0 - 0.24 * sheet_shadow)[..., None]

    sheet_col = cyanotype_sheet_color(px, py, 0.60, 0.42, specimen, feather, exposure=exposure, sun_pos=sun_pos, brush_pad=0.08)
    diag = px * 0.72 + py * 0.52
    sun_band = np.exp(-((diag - sun_pos) ** 2) * 14.0) * 0.14
    glass_bevel = np.exp(-np.abs(paper_dist + 0.016) * 140.0) * 0.28 * paper_mask
    sheet_col += np.array([1.0, 0.96, 0.84], dtype=np.float32) * (sun_band + glass_bevel)[..., None]

    out = col * (1.0 - paper_mask[..., None]) + sheet_col * paper_mask[..., None]
    return Image.fromarray((np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


def render_product_single(width, height):
    """BP-01: Single portrait ash-framed Ginkgo Biloba cyanotype print."""
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect
    py = (uv_y - 0.50)
    feather = 1.6 / max(180.0, height)

    col = make_desk(px, py)
    col = composite_framed_print(col, px, py, cx=0.0, cy=0.0, fw=0.31, fh=0.41, specimen=0, feather=feather)
    return Image.fromarray((np.clip(col, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


def render_product_diptych(width, height):
    """BP-02: Two matching side-by-side framed prints (Ginkgo + Fern) with taxonomy index card."""
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect
    py = (uv_y - 0.50)
    feather = 1.6 / max(180.0, height)

    col = make_desk(px, py)
    # Left & right paired ash frames
    col = composite_framed_print(col, px, py, cx=-0.33, cy=-0.03, fw=0.275, fh=0.365, specimen=0, feather=feather, frame_thick=0.030, mat_pad=0.038)
    col = composite_framed_print(col, px, py, cx=0.33, cy=-0.03, fw=0.275, fh=0.365, specimen=1, feather=feather, frame_thick=0.030, mat_pad=0.038)

    # Small cream botanical taxonomy index card centered below the pair
    cx_c, cy_c, cw, ch = 0.0, 0.405, 0.16, 0.052
    cd = np.maximum(np.abs(px - cx_c) - cw, np.abs(py - cy_c) - ch)
    cs = np.maximum(np.abs(px - cx_c - 0.008) - cw, np.abs(py - cy_c - 0.010) - ch)
    card_shadow = np.exp(-np.maximum(cs, 0.0) * 55.0) * smoothstep(0.05, -0.01, cs)
    col *= (1.0 - 0.22 * card_shadow)[..., None]

    card_mask = 1.0 - smoothstep(-feather, feather, cd)
    card_col = np.array([0.96, 0.945, 0.905], dtype=np.float32)
    # Ruled Prussian-blue header bar & taxonomy lines on index card
    rule1 = (1.0 - smoothstep(0.0, 0.0045, np.abs(py - (cy_c - 0.020)))) * (1.0 - smoothstep(cw - 0.028, cw - 0.020, np.abs(px - cx_c)))
    rule2 = (1.0 - smoothstep(0.0, 0.0030, np.abs(py - (cy_c + 0.005)))) * (1.0 - smoothstep(cw - 0.048, cw - 0.040, np.abs(px - cx_c)))
    rule3 = (1.0 - smoothstep(0.0, 0.0030, np.abs(py - (cy_c + 0.022)))) * (1.0 - smoothstep(cw - 0.068, cw - 0.060, np.abs(px - cx_c)))
    ink = np.clip(rule1 * 0.85 + rule2 * 0.48 + rule3 * 0.48, 0.0, 1.0)[..., None]
    card_final = card_col * (1.0 - ink) + np.array([0.08, 0.22, 0.40], dtype=np.float32) * ink
    col = col * (1.0 - card_mask[..., None]) + card_final * card_mask[..., None]

    return Image.fromarray((np.clip(col, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


def render_product_kit(width, height):
    """BP-03: Overhead flat-lay of Home Cyanotype Kit (light-tight sleeve + fanned pre-coated sheets + clipped UV contact glass + guide card)."""
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    uv_x = (x + 0.5) / width
    uv_y = (y + 0.5) / height
    aspect = width / height

    px = (uv_x - 0.50) * aspect
    py = (uv_y - 0.50)
    feather = 1.6 / max(180.0, height)

    col = make_desk(px, py)

    def draw_rot_rect(base, cx_r, cy_r, hw, hh, angle, fill_fn, shadow_alpha=0.26):
        c, s = np.cos(angle), np.sin(angle)
        dx, dy = px - cx_r, py - cy_r
        lx = dx * c + dy * s
        ly = -dx * s + dy * c
        sdx, sdy = px - cx_r - 0.015, py - cy_r - 0.018
        slx = sdx * c + sdy * s
        sly = -sdx * s + sdy * c
        sh_d = np.maximum(np.abs(slx) - hw, np.abs(sly) - hh)
        sh = np.exp(-np.maximum(sh_d, 0.0) * 34.0) * smoothstep(0.08, -0.01, sh_d)
        base = base * (1.0 - shadow_alpha * sh)[..., None]
        d = np.maximum(np.abs(lx) - hw, np.abs(ly) - hh)
        mask = (1.0 - smoothstep(-feather, feather, d))[..., None]
        fill = fill_fn(lx, ly, d)
        return base * (1.0 - mask) + fill * mask

    # 1) Fanned stack of pale yellow-green pre-coated unexposed cotton sheets peeking out on the left
    def precoated_sheet_fill(tint):
        def _fill(lx, ly, d):
            fiber = np.mod(np.sin(np.floor(lx * 240.0) * 127.1 + np.floor(ly * 240.0) * 311.7) * 43758.5453, 1.0)
            paper = np.array([0.96, 0.945, 0.91], dtype=np.float32) - 0.02 * fiber[..., None]
            coat_d = np.maximum(np.abs(lx) - 0.165, np.abs(ly) - 0.215)
            coat_m = (1.0 - smoothstep(-0.006, 0.006, coat_d))[..., None]
            sensitized = np.array(tint, dtype=np.float32) - 0.02 * fiber[..., None]
            return paper * (1.0 - coat_m) + sensitized * coat_m
        return _fill

    col = draw_rot_rect(col, -0.34, -0.10, 0.20, 0.25, -0.14, precoated_sheet_fill([0.82, 0.84, 0.58]), 0.20)
    col = draw_rot_rect(col, -0.37, -0.06, 0.20, 0.25, -0.06, precoated_sheet_fill([0.85, 0.86, 0.62]), 0.20)
    col = draw_rot_rect(col, -0.40, -0.02, 0.20, 0.25, 0.02, precoated_sheet_fill([0.80, 0.83, 0.56]), 0.22)

    # 2) Dark charcoal light-tight storage sleeve holding the bottom half of the paper stack
    def sleeve_fill(lx, ly, d):
        kraft = np.array([0.13, 0.16, 0.20], dtype=np.float32)
        border = np.exp(-np.abs(d + 0.015) * 140.0) * 0.12
        # Minimalist pale cream studio label band on the dark light-tight pouch
        lbl_d = np.maximum(np.abs(lx) - 0.14, np.abs(ly - 0.01) - 0.048)
        lbl_m = (1.0 - smoothstep(-feather, feather, lbl_d))[..., None]
        lbl_col = np.array([0.94, 0.91, 0.84], dtype=np.float32)
        rule = (1.0 - smoothstep(0.0, 0.004, np.abs(ly - 0.01))) * (1.0 - smoothstep(0.095, 0.105, np.abs(lx)))
        lbl_col = lbl_col * (1.0 - rule[..., None] * 0.70) + np.array([0.08, 0.22, 0.40], dtype=np.float32) * (rule[..., None] * 0.70)
        base = kraft + border[..., None]
        return base * (1.0 - lbl_m) + lbl_col * lbl_m

    col = draw_rot_rect(col, -0.44, 0.11, 0.22, 0.17, 0.02, sleeve_fill, 0.30)

    # 3) Folded cream water-rinse guide card at bottom-center
    def guide_fill(lx, ly, d):
        card = np.array([0.96, 0.945, 0.905], dtype=np.float32)
        bar = smoothstep(-0.072, -0.068, ly) * (1.0 - smoothstep(-0.044, -0.040, ly)) * (1.0 - smoothstep(0.105, 0.115, np.abs(lx)))
        l1 = (1.0 - smoothstep(0.0, 0.0035, np.abs(ly + 0.01))) * (1.0 - smoothstep(0.095, 0.105, np.abs(lx)))
        l2 = (1.0 - smoothstep(0.0, 0.0035, np.abs(ly - 0.02))) * (1.0 - smoothstep(0.078, 0.088, np.abs(lx)))
        l3 = (1.0 - smoothstep(0.0, 0.0035, np.abs(ly - 0.05))) * (1.0 - smoothstep(0.060, 0.070, np.abs(lx)))
        blue = np.array([0.09, 0.24, 0.43], dtype=np.float32)
        ink = np.clip(bar * 0.88 + (l1 + l2 + l3) * 0.50, 0.0, 1.0)[..., None]
        return card * (1.0 - ink) + blue * ink

    col = draw_rot_rect(col, -0.15, 0.34, 0.135, 0.092, -0.04, guide_fill, 0.24)

    # 4) Bevelled UV contact printing glass frame on the right holding an exposing eucalyptus sheet
    gx_c, gy_c, gw, gh = 0.30, -0.02, 0.30, 0.35
    def contact_frame_fill(lx, ly, d):
        sheet = cyanotype_sheet_color(lx, ly, gw - 0.025, gh - 0.025, specimen=2, feather=feather, exposure=0.86, sun_pos=0.05, brush_pad=0.04)
        # Bevelled thick glass edge + diagonal skylight sheen
        bevel = np.exp(-np.abs(d + 0.018) * 145.0) * 0.42
        glare = np.exp(-(((lx * 0.7 + ly * 0.6) - 0.04) ** 2) * 22.0) * 0.15
        return sheet + np.array([1.0, 0.98, 0.92], dtype=np.float32) * (bevel + glare)[..., None]

    col = draw_rot_rect(col, gx_c, gy_c, gw, gh, 0.025, contact_frame_fill, 0.28)

    # 5) Two metallic brass & dark-steel binder clips clamped visibly on the top and right edges of the contact glass
    def clip_fill(lx, ly, d):
        body = np.array([0.16, 0.18, 0.21], dtype=np.float32)
        brass_wire = np.exp(-np.abs(np.abs(lx) - 0.020) * 140.0) * smoothstep(-0.04, 0.0, ly)
        return body * (1.0 - brass_wire[..., None] * 0.8) + np.array([0.78, 0.64, 0.34], dtype=np.float32) * (brass_wire[..., None] * 0.8)

    # Top clip
    col = draw_rot_rect(col, gx_c - 0.09, gy_c - gh + 0.008, 0.042, 0.028, 0.025, clip_fill, 0.30)
    # Right-side clip
    col = draw_rot_rect(col, gx_c + gw - 0.008, gy_c + 0.08, 0.028, 0.042, 0.025, clip_fill, 0.30)

    # 6) Small amber emulsion bottle + foam brush resting at lower-left
    bx, by = -0.05, -0.26
    br = np.sqrt((px - bx) ** 2 + (py - by) ** 2)
    bsh = np.sqrt((px - bx - 0.014) ** 2 + (py - by - 0.018) ** 2)
    col *= (1.0 - 0.30 * np.exp(-np.maximum(bsh - 0.068, 0.0) * 35.0) * smoothstep(0.14, 0.05, bsh))[..., None]
    bottle_outer = (1.0 - smoothstep(-feather, feather, br - 0.072))[..., None]
    bottle_cap = (1.0 - smoothstep(-feather, feather, br - 0.036))[..., None]
    amber_hl = np.exp(-(((px - bx + 0.024) ** 2 + (py - by + 0.024) ** 2) / 0.0012))[..., None]
    amber_col = np.array([0.38, 0.19, 0.07], dtype=np.float32) + np.array([0.45, 0.35, 0.20], dtype=np.float32) * amber_hl
    cap_col = np.array([0.14, 0.15, 0.17], dtype=np.float32)
    col = col * (1.0 - bottle_outer) + amber_col * bottle_outer
    col = col * (1.0 - bottle_cap) + cap_col * bottle_cap

    return Image.fromarray((np.clip(col, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), mode="RGB")


if __name__ == "__main__":
    # Hero stills (matched to live WebGPU hero shader)
    for idx, name in enumerate(("ginkgo", "fern", "eucalyptus")):
        render_plate(1200, 800, specimen=idx, exposure=0.96, sun_pos=0.18).save(media / f"{name}.webp", quality=90, method=6)
    render_plate(1200, 800, specimen=0, exposure=0.88, sun_pos=-0.05).save(media / "cover.webp", quality=90, method=6)
    render_plate(128, 128, specimen=0, exposure=0.96, sun_pos=0.15).resize((64, 64), Image.Resampling.LANCZOS).save(media / "icon.png")

    # Distinct product card compositions
    render_product_single(1200, 800).save(media / "product-single.webp", quality=90, method=6)
    render_product_diptych(1200, 800).save(media / "product-diptych.webp", quality=90, method=6)
    render_product_kit(1200, 800).save(media / "product-kit.webp", quality=90, method=6)
    print("Baked botanica-press hero posters, product compositions, and icon.")
