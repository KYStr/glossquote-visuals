  let screen = (uv - vec2f(0.50, 0.56)) * vec2f(1.77, -1.18);
  let ray = vec3f(0.0, -0.55, -0.83516465);
  let origin = vec3f(screen.x, screen.y * 0.83516465, -screen.y * 0.55) - ray * 3.0;
  let floorPos = (origin + ray * ((0.018 - origin.y) / ray.y)).xz;
  let gelOrigin = vec3f(-0.142, 0.0, 0.026);
  let j = u32(clamp(flavor, 0.0, 2.0));

  // A single fall, compression and damped recovery. Shape coefficients stay
  // exactly at rest after 1.21 seconds, and scoop interaction uses that pose.
  let intro = time + introOffset;
  var lift = 0.0;
  var squash = 0.0;
  if (scooped < 0.5 && intro < 1.21) {
    let fall = clamp(intro / 0.29, 0.0, 1.0);
    lift = 0.143 * (1.0 - fall * fall);
    squash = -0.30 * smoothstep(0.29, 0.36, intro) * (1.0 - smoothstep(0.45, 0.61, intro))
      + 0.16 * smoothstep(0.49, 0.65, intro) * (1.0 - smoothstep(0.69, 0.85, intro))
      - 0.055 * smoothstep(0.76, 0.90, intro) * (1.0 - smoothstep(0.92, 1.21, intro));
  }
  let scale = vec3f(1.0 - squash * 0.54, 1.0 + squash, 1.0 - squash * 0.54);
  let anchor = gelOrigin + vec3f(0.0, 0.018, 0.0);
  let gelRay = ray / scale;
  let gelEye = (origin - anchor - vec3f(0.0, lift, 0.0)) / scale + vec3f(0.0, 0.022, 0.0);
  let cut = vec3f(cutX, 0.424, cutZ);
  let pieceDestination = vec3f(0.534, 0.0, 0.230);
  var travel = 0.0;
  var pieceShift = vec3f(0.0);
  if (scooped > 0.5) {
    travel = smoothstep(0.0, 1.0, scoopProgress);
    let arc = select(sin(3.14159265 * travel) * 0.155, 0.0, travel >= 1.0);
    pieceShift = (pieceDestination - gelOrigin - vec3f(cut.x, 0.204, cut.z)) * travel
      + vec3f(0.0, arc, 0.0);
  }

  let foot = (0.018 + lift) * 0.83516465 - gelOrigin.z * 0.55;
  let mainBounds = abs(screen.x - gelOrigin.x) < 0.475 * scale.x
    && screen.y > foot - 0.262 * scale.z
    && screen.y < foot + 0.314 * scale.y + 0.219 * scale.z;
  let pieceCenter = gelOrigin + cut + pieceShift;
  let pieceY = pieceCenter.y * 0.83516465 - pieceCenter.z * 0.55;
  let pieceBounds = scooped > 0.5 && abs(screen.x - pieceCenter.x) < 0.203
    && abs(screen.y - pieceY) < 0.203;

  var visibleAt = 1e4;
  var endAt = -1e4;
  var localPosition = vec3f(0.0);
  var normal = vec3f(0.0, 1.0, 0.0);
  var cavity = false;
  var concave = false;
  for (var item = 0u; item < 2u; item++) {
    let isPiece = item == 1u;
    if ((!isPiece && !mainBounds) || (isPiece && !pieceBounds)) { continue; }
    let o = select(gelEye, origin - gelOrigin - pieceShift, isPiece);
    let d = select(gelRay, ray, isPiece);

    // Intersect the same solid profile for the jelly and the extracted piece.
    let joins = array<vec2f, 4>(vec2f(0.022, 0.447), vec2f(0.062, 0.474),
      vec2f(0.340, 0.396), vec2f(0.397, 0.351));
    var mold = vec2f(1e4, -1e4);
    for (var segment = 0u; segment < 3u; segment++) {
      let lower = joins[segment];
      let upper = joins[segment + 1u];
      let slope = (upper.y - lower.y) / (upper.x - lower.x);
      let radius = lower.y + (o.y - lower.x) * slope;
      let rate = slope * d.y;
      let a = dot(d.xz, d.xz) - rate * rate;
      let b = dot(o.xz, d.xz) - radius * rate;
      let determinant = b * b - a * (dot(o.xz, o.xz) - radius * radius);
      if (determinant < 0.0) { continue; }
      let root = sqrt(determinant);
      let entry = max((-b - root) / a, (upper.x - o.y) / d.y);
      let exit = min((-b + root) / a, (lower.x - o.y) / d.y);
      if (entry < exit) { mold = vec2f(min(mold.x, entry), max(mold.y, exit)); }
    }
    if (mold.x >= mold.y) { continue; }

    var span = mold;
    var cutSurface = false;
    if (scooped > 0.5) {
      // One spoon volume does double duty: subtract it from the body and
      // intersect it with the original mold for the displaced scoop.
      let offset = o - cut;
      let a = dot(d, d);
      let b = dot(offset, d);
      let determinant = b * b - a * (dot(offset, offset) - 0.202 * 0.202);
      var spoon = vec2f(1e4, -1e4);
      if (determinant >= 0.0) {
        let root = sqrt(determinant);
        spoon = vec2f((-b - root) / a, (-b + root) / a);
      }
      if (isPiece) {
        span = vec2f(max(mold.x, spoon.x), min(mold.y, spoon.y));
        cutSurface = spoon.x > mold.x;
      } else if (spoon.x < mold.x && spoon.y > mold.x) {
        span.x = spoon.y;
        cutSurface = true;
      } else if (spoon.x > mold.x && spoon.x < mold.y) {
        span.y = spoon.x;
      }
    }
    if (span.x >= span.y || span.x >= visibleAt) { continue; }
    visibleAt = span.x;
    endAt = span.y;
    cavity = cutSurface;
    concave = cutSurface && !isPiece;
    localPosition = o + d * span.x;
    var surface = vec3f(0.0, 1.0, 0.0);
    if (cutSurface) {
      surface = normalize((localPosition - cut) * select(-1.0, 1.0, isPiece));
    } else if (localPosition.y <= 0.39695) {
      let azimuth = atan2(localPosition.x, localPosition.z);
      let radial = normalize(localPosition.xz);
      let tangential = vec2f(radial.y, -radial.x);
      let flute = 0.094 * sin(azimuth * 18.0) * smoothstep(0.022, 0.095, localPosition.y)
        * (1.0 - smoothstep(0.32, 0.397, localPosition.y));
      let direction = radial + tangential * flute;
      let bevel = mix(0.28, 0.82, smoothstep(0.31, 0.397, localPosition.y))
        - 0.76 * (1.0 - smoothstep(0.022, 0.085, localPosition.y));
      surface = vec3f(direction.x, bevel, direction.y);
    }
    normal = normalize(surface / select(scale, vec3f(1.0), isPiece));
  }

  let hitsGel = visibleAt < endAt;
  let path = clamp(endAt - visibleAt, 0.06, 0.88);
  var xz = floorPos;
  if (hitsGel) {
    let refracted = refract(ray, normal, 1.0 / 1.36);
    xz += (refracted.xz - ray.xz) * (0.29 + path);
  }
  let p = (xz - vec2f(0.015, -0.018)) / vec2f(0.775, 0.757);
  let r = length(p);
  let table = mix(vec3f(0.93, 0.69, 0.39), vec3f(1.0, 0.89, 0.68),
    clamp(0.55 - 0.32 * xz.x - 0.23 * xz.y, 0.0, 1.0));
  let shadowDist = length((xz - vec2f(0.052, 0.065)) / vec2f(0.797, 0.806));
  let shadow = (1.0 - smoothstep(0.83, 1.13, shadowDist)) * 0.42;
  let porcelain = vec3f(0.970, 0.925, 0.818) * (1.0 - 0.24 * smoothstep(0.69, 1.02, r));
  let rim = smoothstep(0.910, 0.959, r) * (1.0 - smoothstep(0.962, 0.990, r));
  let stripe = smoothstep(0.908, 0.914, r) * (1.0 - smoothstep(0.923, 0.929, r));
  let cream = mix(porcelain + rim * vec3f(0.16, 0.155, 0.145), vec3f(0.62, 0.29, 0.172), stripe * 0.82);
  var color = mix(table * (1.0 - shadow), cream, 1.0 - smoothstep(0.993, 1.006, r));
  if (!hitsGel) {
    let shadowPos = (floorPos - gelOrigin.xz - vec2f(0.021, 0.027)) / (0.53 + lift * 0.46);
    let footprint = dot(shadowPos, shadowPos);
    let glowPoint = (floorPos - gelOrigin.xz - vec2f(0.11, 0.14)) / vec2f(0.42, 0.40);
    let glowDistance = dot(glowPoint, glowPoint);
    var contact = 0.0;
    var caustic = 0.0;
    if (footprint < 1.08 * 1.08) {
      contact = (1.0 - smoothstep(0.65, 1.08, sqrt(footprint))) * (0.55 - 1.5 * lift);
    }
    if (glowDistance < 3.5) {
      caustic = exp(-glowDistance * 3.0) * (0.14 - 0.47 * lift);
    }
    let floorHue = array<vec3f, 3>(vec3f(0.92, 0.48, 0.032), vec3f(0.64, 0.069, 0.135), vec3f(0.46, 0.61, 0.13))[j];
    color = color * (1.0 - contact) + floorHue * caustic;
    if (scooped > 0.5) {
      let center = gelOrigin.xz + cut.xz + pieceShift.xz;
      let smallShadow = 1.0 - smoothstep(0.074, 0.237, length(floorPos - center - vec2f(0.012, 0.025)));
      color = color * (1.0 - smallShadow * 0.36 * travel) + floorHue * smallShadow * travel * 0.074;
    }

    return vec4f(color, 1.0);
  }

  let shift = 0.055 * sin(time * 0.32);
  let absorption = array<vec3f, 3>(vec3f(0.21, 1.43, 5.25), vec3f(0.31, 4.70, 2.55), vec3f(1.63, 0.45, 2.69))[j];
  let juice = array<vec3f, 3>(vec3f(1.0, 0.54, 0.076), vec3f(0.84, 0.115, 0.229), vec3f(0.58, 0.71, 0.224))[j];
  let plateSample = color;
  let light = normalize(vec3f(-0.64, 0.78, 0.57));
  let cosine = max(dot(normal, -ray), 0.0);
  let grazing = (1.0 - cosine) * (1.0 - cosine);
  let fresnel = 0.034 + 0.36 * grazing * grazing;
  let softDiffuse = 0.53 + 0.47 * max(0.0, dot(normal, light));
  let transmitted = plateSample * exp(-absorption * (0.52 + path * 1.23));
  let through = transmitted * (0.80 + 0.18 * softDiffuse);
  let internalGlow = juice * (0.18 + 0.17 * max(0.0, dot(normal, -light)));
  let base = mix(through + internalGlow, vec3f(0.96, 0.79, 0.58), fresnel);
  let sky = vec3f(1.0, 0.960, 0.875);
  if (concave) {
    // Shade the recessed wall before evaluating the reflected softboxes.
    let depth = smoothstep(0.0, 0.155, 0.397 - localPosition.y);
    let wallShade = (0.70 - 0.36 * depth) * (0.81 + 0.19 * softDiffuse);
    let edgeGlint = (1.0 - smoothstep(0.001, 0.018, abs(localPosition.y - 0.397)))
      * max(0.0, dot(normal, light));
    return vec4f(base * wallShade + juice * (0.047 + 0.064 * depth) + sky * edgeGlint * 0.23, 1.0);
  }
  let reflected = reflect(ray, normal);
  // Reflected rectangular softboxes leave a rounded stripe and a small rim glint.
  let softbox = smoothstep(-0.78, -0.53, reflected.x) * (1.0 - smoothstep(-0.31, -0.03, reflected.x))
    * smoothstep(0.34, 0.55, reflected.y) * (1.0 - smoothstep(0.82, 0.98, reflected.y)) * step(-0.4, reflected.z);
  let rimLight = pow(max(dot(reflected, normalize(vec3f(0.54, 0.54, -0.73))), 0.0), 52.0);
  let topGlint = exp(-24.0 * abs(localPosition.x + 0.17 + shift + localPosition.z * 0.28))
    * smoothstep(-0.19, -0.10, localPosition.z) * (1.0 - smoothstep(0.07, 0.18, localPosition.z))
    * smoothstep(0.89, 0.995, normal.y) * 0.065;
  let fill = select(0.0, 0.024, cavity);
  return vec4f(base + sky * (0.49 * softbox + 0.31 * rimLight + topGlint + fill), 1.0);
