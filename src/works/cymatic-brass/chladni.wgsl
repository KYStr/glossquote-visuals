  // Circular brushed brass Chladni resonance plate mounted on a dark acoustic bench.
  // Coordinates are normalized to brass-plate radius units.
  let p = (uv - vec2f(0.50, 0.50)) * vec2f(aspect, 1.0) / 0.37;
  let r = length(p);
  let a = atan2(p.y, p.x);

  // 12-second harmonic sweep through 3 Chladni resonance modes when preset < 0.
  let cyc = fract(time / 12.0) * 12.0;
  var modeMix0 = 1.0;
  var modeMix1 = 0.0;
  var modeMix2 = 0.0;
  var settle = 1.0;

  if (preset < 0.0) {
    // 0-4s: Quad (288 Hz), 4-8s: Hex Star (512 Hz), 8-12s: Lotus (768 Hz)
    let t1 = smoothstep(3.3, 4.3, cyc);
    let t2 = smoothstep(7.3, 8.3, cyc);
    let t3 = smoothstep(11.1, 12.0, cyc);
    modeMix0 = (1.0 - t1) + t3;
    modeMix1 = t1 * (1.0 - t2);
    modeMix2 = t2 * (1.0 - t3);
    // Quartz sand vibrates during transitions and locks crisp on resonant plateaus.
    let trans = smoothstep(0.0, 0.7, abs(fract(cyc / 4.0) - 0.5) * 2.0);
    settle = 0.58 + 0.42 * (1.0 - trans * 0.65);
  } else {
    let idx = i32(clamp(floor(preset + 0.5), 0.0, 2.0));
    modeMix0 = select(0.0, 1.0, idx == 0);
    modeMix1 = select(0.0, 1.0, idx == 1);
    modeMix2 = select(0.0, 1.0, idx == 2);
    settle = 0.90 + 0.10 * sin(time * 1.0472);
  }

  // Dark acoustic bench background with subtle precision millimeter calibration rings.
  let benchGrad = 1.0 - 0.25 * length(p);
  var color = vec3f(0.048, 0.056, 0.068) * benchGrad;
  let benchGrid = max(
    1.0 - smoothstep(0.0, 0.014, abs(fract(p.x * 2.5 + 0.5) - 0.5)),
    1.0 - smoothstep(0.0, 0.014, abs(fract(p.y * 2.5 + 0.5) - 0.5))
  );
  color += benchGrid * vec3f(0.032, 0.038, 0.045);

  // Outer brass calibration ring & radial degree ticks on the acoustic bench.
  let ring1 = 1.0 - smoothstep(0.0, 0.006, abs(r - 1.15));
  let tickMask = smoothstep(1.13, 1.14, r) * (1.0 - smoothstep(1.19, 1.20, r));
  let ticks = tickMask * (1.0 - smoothstep(0.0, 0.045, abs(fract(a / 0.261799 + 0.5) - 0.5)));
  color += (ring1 * 0.45 + ticks * 0.55) * vec3f(0.32, 0.26, 0.16);

  // Drop shadow of the brass plate on the acoustic bench.
  let shadowR = length(p - vec2f(0.06, 0.08));
  let dropShadow = exp(-max(shadowR - 0.98, 0.0) * 8.0) * smoothstep(1.30, 0.90, shadowR);
  color *= 1.0 - 0.55 * dropShadow;

  // Circular brass plate mask & machined chamfer bevel.
  let feather = 1.5 / max(180.0, viewport.y);
  let plateMask = 1.0 - smoothstep(-feather, feather, r - 1.0);
  let bevel = smoothstep(0.94, 0.995, r) * plateMask;

  // Anisotropic radial brushed brass shading (spinning lathe marks).
  let lathe = 0.5 + 0.5 * sin(r * 195.0 + 0.6 * sin(a * 3.0))
    + 0.25 * sin(r * 410.0);
  let anisoHighlight = pow(abs(cos(a * 2.0 + 0.75)), 3.2) * 0.38
    + pow(abs(cos(a * 2.0 - 0.82)), 5.0) * 0.22;
  let rimLight = bevel * (0.35 + 0.55 * max(dot(normalize(p), normalize(vec2f(-0.6, -0.7))), 0.0));
  var brass = vec3f(0.58, 0.46, 0.24) * (0.74 + 0.05 * lathe + 0.26 * (1.0 - 0.28 * r))
    + vec3f(0.34, 0.28, 0.16) * anisoHighlight
    + vec3f(0.45, 0.37, 0.20) * rimLight;

  // Chladni standing-wave eigenfunctions on a circular plate: J_m(k*r) * cos(m*a) approximated smoothly.
  let pi = 3.14159265;
  // Mode 0 (288 Hz): Quadruple cross + inner ring
  let z0 = cos(2.0 * a + 0.35) * sin(r * pi * 2.15) + 0.32 * cos(r * pi * 3.0);
  // Mode 1 (512 Hz): Six-fold star nodal lattice
  let z1 = cos(3.0 * a - 0.2) * sin(r * pi * 2.85) - 0.42 * cos(6.0 * a) * sin(r * pi * 1.45);
  // Mode 2 (768 Hz): Eight-petal lotus + concentric harmonic rings
  let z2 = cos(4.0 * a + 0.15) * sin(r * pi * 3.55) + 0.48 * sin(r * pi * 4.2);

  let z = z0 * modeMix0 + z1 * modeMix1 + z2 * modeMix2;
  // Fine micro-vibration shimmer in quartz sand.
  let grainCell = floor(p * 135.0);
  let grainRand = fract(sin(dot(grainCell, vec2f(127.1, 311.7))) * 43758.5453);
  let vib = 0.018 * (1.0 - settle) * sin(time * 24.0 + grainRand * 6.28318);
  let nodalDist = abs(z + vib);

  // Quartz sand accumulates tightly along nodal lines (where z == 0).
  let bandWidth = mix(0.14, 0.068, settle);
  let sandDensity = exp(-(nodalDist * nodalDist) / (bandWidth * bandWidth));
  let sandSparkle = 0.72 + 0.28 * smoothstep(0.25, 0.92, grainRand);
  let sandMask = sandDensity * sandSparkle * smoothstep(0.12, 0.16, r) * (1.0 - smoothstep(0.93, 0.96, r));

  // Subtle dark contact shadow right beside dense sand ridges.
  let sandShadow = exp(-pow(nodalDist - bandWidth * 0.85, 2.0) / (bandWidth * bandWidth * 0.45)) * 0.20 * smoothstep(0.14, 0.20, r);
  brass *= 1.0 - sandShadow;

  let quartz = vec3f(0.96, 0.94, 0.89) * (0.88 + 0.14 * grainRand);
  brass = mix(brass, quartz, clamp(sandMask * 0.95, 0.0, 1.0));

  // Central machined steel oscillator mounting stud (bolt + knurled collar).
  let collarMask = 1.0 - smoothstep(-feather, feather, r - 0.115);
  let studMask = 1.0 - smoothstep(-feather, feather, r - 0.072);
  let studLight = 0.55 + 0.45 * max(dot(normalize(p + vec2f(0.001)), normalize(vec2f(-0.6, -0.7))), 0.0);
  let collarCol = vec3f(0.16, 0.17, 0.19) * (0.8 + 0.4 * studLight);
  let studCol = vec3f(0.76, 0.65, 0.40) * (0.65 + 0.45 * studLight);
  brass = mix(brass, collarCol, collarMask);
  brass = mix(brass, studCol, studMask);

  color = mix(color, brass, plateMask);

  // Convert display sRGB to linear light for the compositor.
  let rgb = clamp(color, vec3f(0.0), vec3f(1.0));
  let linear = select(rgb / 12.92, pow((rgb + vec3f(0.055)) / 1.055, vec3f(2.4)), rgb > vec3f(0.04045));
  return vec4f(linear, 1.0);
