  let screen = (uv - vec2f(0.50, 0.56)) * vec2f(1.77, -1.18);
  let ray = vec3f(0.0, -0.55, -0.83516465);
  let origin = vec3f(screen.x, screen.y * 0.83516465, -screen.y * 0.55) - ray * 3.0;
  let floorPos = (origin + ray * ((0.018 - origin.y) / ray.y)).xz;
  let gelOrigin = vec3f(-0.142, 0.0, 0.026);
  let j = u32(clamp(flavor, 0.0, 2.0));

  let hasBite = scooped > 0.5;
  let hasCut = hasBite && biteTime >= 1.94;
  let cut = vec3f(cutX, 0.424, cutZ);
  let anchor = gelOrigin + vec3f(0.0, 0.018, 0.0);
  let contact = gelOrigin + cut;
  let arrive = smoothstep(0.22, 1.33, biteTime);
  let insert = smoothstep(1.32, 1.91, biteTime);
  let travel = smoothstep(1.94, 3.56, biteTime);
  let press = smoothstep(1.23, 1.66, biteTime) * (1.0 - smoothstep(1.82, 2.42, biteTime));
  let dent = select(0.0, press * (1.0 - smoothstep(0.050, 0.315, abs(screen.x - contact.x))), hasBite);
  let recoil = select(0.0, 0.068 * smoothstep(2.16, 2.43, biteTime)
    * (1.0 - smoothstep(2.44, 2.77, biteTime)) * (1.0 - smoothstep(0.05, 0.32, abs(screen.x - contact.x))), hasBite);
  let squash = -0.222 * dent + recoil;
  let scale = vec3f(1.0, 1.0 + squash, 1.0 + 0.10 * dent);
  let lift = 0.0;
  var gelRay = ray;
  var gelEye = origin - anchor + vec3f(0.0, 0.022, 0.0);
  if (dent > 0.0 || recoil > 0.0) {
    gelRay = ray / scale;
    gelEye = (origin - anchor) / scale + vec3f(0.0, 0.022, 0.0);
  }

  // While the bowl withdraws, the piece and bowl are translated together.
  let pieceDestination = vec3f(0.494, contact.y + 0.128, -0.112);
  let pieceShift = (pieceDestination - contact) * travel + vec3f(0.0, 0.061 * sin(travel * 3.14159265), 0.0);
  let bowlContact = contact + vec3f(0.035, -0.145, 0.006);
  let bowlStart = bowlContact + vec3f(0.57, 0.33, -0.21);
  let bowlAbove = bowlContact + vec3f(0.048, 0.152, -0.009);
  let bowlCenter = mix(bowlStart, bowlAbove, arrive) - (bowlAbove - bowlContact) * insert + pieceShift;
  let foot = (0.018 + lift) * 0.83516465 - gelOrigin.z * 0.55;
  let mainBounds = abs(screen.x - gelOrigin.x) < 0.475 * scale.x
    && screen.y > foot - 0.262 * scale.z
    && screen.y < foot + 0.314 * scale.y + 0.219 * scale.z;
  let pieceCenter = gelOrigin + cut + pieceShift;
  let pieceY = pieceCenter.y * 0.83516465 - pieceCenter.z * 0.55;
  let pieceBounds = hasCut && abs(screen.x - pieceCenter.x) < 0.203
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
    if (hasCut) {
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
      let radial = normalize(localPosition.xz);
      let tangential = vec2f(radial.y, -radial.x);
      // sin(18a) via double and triple angles, without inverse or forward trig.
      let sin2 = 2.0 * radial.x * radial.y;
      let sin6 = sin2 * (3.0 - 4.0 * sin2 * sin2);
      let sin18 = sin6 * (3.0 - 4.0 * sin6 * sin6);
      let flute = 0.094 * sin18 * smoothstep(0.022, 0.095, localPosition.y)
        * (1.0 - smoothstep(0.32, 0.397, localPosition.y));
      let direction = radial + tangential * flute;
      let bevel = mix(0.28, 0.82, smoothstep(0.31, 0.397, localPosition.y))
        - 0.76 * (1.0 - smoothstep(0.022, 0.085, localPosition.y));
      surface = vec3f(direction.x, bevel, direction.y);
    }
    normal = normalize(surface / select(scale, vec3f(1.0), isPiece));
  }

  var silverAt = 1e4;
  var silver = vec3f(0.0);
  var metalCoverage = 0.0;
  let spoonVisible = hasBite && biteTime > 0.22;
  if (spoonVisible) {
    // Tool-local orthonormal frame. The bowl and stem share the same plane,
    // then the handle climbs toward its grip along the frame's long axis.
    let tilt = mix(0.26, 0.06, insert) + 0.10 * travel;
    let heading = normalize(vec3f(0.794, 0.0, -0.608));
    let spoonSide = vec3f(-heading.z, 0.0, heading.x);
    let tangent = heading * sqrt(1.0 - tilt * tilt) + vec3f(0.0, tilt, 0.0);
    let up = cross(spoonSide, tangent);
    let center2d = vec2f(bowlCenter.x, bowlCenter.y * 0.83516465 - bowlCenter.z * 0.55);
    let fromBowl = screen - center2d;
    if (fromBowl.x > -0.238 && fromBowl.x < 0.65 && fromBowl.y > -0.218 && fromBowl.y < 0.48) {
      let o0 = origin - bowlCenter;
      let o = vec3f(dot(o0, tangent), dot(o0, up), dot(o0, spoonSide));
      let d = vec3f(dot(ray, tangent), dot(ray, up), dot(ray, spoonSide));
      let bowlSize = vec2f(0.222, 0.150);
      let b0 = o.xz / bowlSize;
      let bd = d.xz / bowlSize;
      let bowlDepth = 0.058;
      let a = bowlDepth * dot(bd, bd);
      let b = bowlDepth * dot(b0, bd) - 0.5 * d.y;
      let c = bowlDepth * dot(b0, b0) - o.y - bowlDepth;
      let det = b * b - a * c;
      var ln = vec3f(0.0, 1.0, 0.0);
      var polishedEdge = 0.0;
      var bowlShade = 0.0;
      var steelEdge = 0.0;
      var toolPoint = vec3f(0.0);
      if (det >= 0.0) {
        let entry = (-b - sqrt(det)) / a;
        let entryPoint = (o.xz + d.xz * entry) / bowlSize;
        let bowlAt = select(-c / (b + sqrt(det)), entry, dot(entryPoint, entryPoint) < 1.045);
        let pt = o + d * bowlAt;
        let q = dot(pt.xz / bowlSize, pt.xz / bowlSize);
        if (q < 1.045) {
          silverAt = bowlAt;
          toolPoint = pt;
          ln = normalize(vec3f(-2.0 * bowlDepth * pt.x / (bowlSize.x * bowlSize.x),
            1.0, -2.0 * bowlDepth * pt.z / (bowlSize.y * bowlSize.y)));
          polishedEdge = smoothstep(0.82, 0.974, q);
          bowlShade = (1.0 - smoothstep(0.0, 0.97, q)) * 0.22;
          metalCoverage = 1.0 - smoothstep(0.971, 1.043, q);
        }
      }
      // A lower silver shell is visible below the loaded bowl, independently
      // of the rim glint. Keep the upper concavity and fruit contact in place.
      if (metalCoverage < 0.94) {
        let shellC = c + 0.032;
        let shellDet = b * b - a * shellC;
        if (shellDet >= 0.0) {
          let root = sqrt(shellDet);
          let shellEntry = (-b - root) / a;
          let shellEntryPt = (o.xz + d.xz * shellEntry) / bowlSize;
          let shellAt = select(-shellC / (b + root), shellEntry, dot(shellEntryPt, shellEntryPt) < 1.03);
          let pt = o + d * shellAt;
          let q = dot(pt.xz / bowlSize, pt.xz / bowlSize);
          let coverage = 1.0 - smoothstep(0.94, 1.04, q);
          if (coverage > metalCoverage) {
            silverAt = shellAt;
            toolPoint = pt;
            ln = normalize(vec3f(pt.x * 2.4, 0.54, pt.z * 4.3));
            polishedEdge = smoothstep(0.68, 1.0, q) * 0.38;
            bowlShade = 0.23;
            steelEdge = 0.76;
            metalCoverage = coverage;
          }
        }
      }
      let stemSlope = 0.105;
      let stemAt = -(o.y - stemSlope * (o.x - 0.185)) / (d.y - stemSlope * d.x);
      let hp = o + d * stemAt;
      let mainWidth = mix(0.025, 0.054, smoothstep(0.28, 0.68, hp.x));
      let neck = 0.024 * (1.0 - smoothstep(0.16, 0.29, hp.x));
      let capCenter = clamp(hp.x, 0.168, 0.695);
      let gripEdge = length(vec2f((hp.x - capCenter) * 0.9, hp.z)) / (mainWidth + neck);
      if (gripEdge < 1.11 && (stemAt < silverAt || metalCoverage < 0.05)) {
        silverAt = stemAt;
        toolPoint = hp;
        ln = normalize(vec3f(-stemSlope, 1.0, hp.z * 8.0));
        polishedEdge = smoothstep(0.71, 0.98, gripEdge) * 0.76;
        bowlShade = 0.0;
        steelEdge = smoothstep(0.68, 0.99, gripEdge) * 0.70;
        metalCoverage = 1.0 - smoothstep(0.88, 1.11, gripEdge);
      }
      if (metalCoverage > 0.0) {
        let worldNormal = tangent * ln.x + up * ln.y + spoonSide * ln.z;
        let reflected = reflect(ray, worldNormal);
        let cream = vec3f(0.876, 0.889, 0.883);
        let steel = vec3f(0.144, 0.180, 0.211);
        let key = smoothstep(-0.73, -0.32, reflected.x) * (1.0 - smoothstep(0.17, 0.45, reflected.x))
          * smoothstep(0.21, 0.58, reflected.y);
        let stripe = (1.0 - smoothstep(0.045, 0.22, abs(reflected.x + reflected.z * 0.43 + 0.18)))
          * smoothstep(0.14, 0.62, reflected.y);
        let shadowBand = smoothstep(0.04, 0.38, reflected.x) * 0.40;
        let metal = mix(steel, cream, clamp(0.16 + key * 0.63 + stripe * 0.42 - shadowBand - bowlShade, 0.0, 1.0));
        let edgeFlash = smoothstep(-0.36, 0.38, toolPoint.z - toolPoint.x * 0.33) * 0.38 + 0.47;
        let polished = mix(metal, cream * edgeFlash, polishedEdge * 0.83);
        silver = mix(polished, vec3f(0.118, 0.160, 0.194), steelEdge);
      }
    }
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
  let toPlateShadow = xz - vec2f(0.052, 0.065);
  // Outside the plate, all contact shadows and the caustic, only the table is visible.
  if (!hitsGel && metalCoverage == 0.0 && any(abs(toPlateShadow) >= vec2f(0.91, 0.92))) {
    return vec4f(table, 1.0);
  }
  let shadowDist = length(toPlateShadow / vec2f(0.797, 0.806));
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
    if (spoonVisible) {
      let shadowPos = (floorPos - bowlCenter.xz - vec2f(0.045, 0.09)) / vec2f(0.265, 0.199);
      let toolShadow = 1.0 - smoothstep(0.17, 1.14, length(shadowPos));
      color *= 1.0 - toolShadow * (0.19 - 0.10 * travel);
    }
    color = mix(color, silver, metalCoverage);

    return vec4f(color, 1.0);
  }

  if (silverAt < visibleAt && metalCoverage >= 0.999) {
    return vec4f(silver, 1.0);
  }
  let foregroundMetal = select(0.0, metalCoverage, silverAt < visibleAt);
  let shift = 0.055 * sin(time * 0.45);
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
    return vec4f(mix(base * wallShade + juice * (0.047 + 0.064 * depth) + sky * edgeGlint * 0.23,
      silver, foregroundMetal), 1.0);
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
  return vec4f(mix(base + sky * (0.49 * softbox + 0.31 * rimLight + topGlint + fill),
    silver, foregroundMetal), 1.0);
