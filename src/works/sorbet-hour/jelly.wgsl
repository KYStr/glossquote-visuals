  // Use the true backing dimensions for coverage, independent of page zoom.
  let pixelStep = 1.0 / max(viewport, vec2f(1.0));
  let worldPixel = max(pixelStep.x * 1.77, pixelStep.y * 1.18);
  let ray = vec3f(0.0, -0.55, -0.83516465);
  let gelOrigin = vec3f(-0.142, 0.0, 0.026);
  let j = u32(clamp(flavor, 0.0, 2.0));

  let hasBite = scooped > 0.5;
  let hasCut = hasBite && biteTime >= 1.94;
  let cut = vec3f(cutX, 0.392, cutZ);
  let anchor = gelOrigin + vec3f(0.0, 0.018, 0.0);
  let contact = gelOrigin + cut;
  let arrive = smoothstep(0.22, 1.33, biteTime);
  let insert = smoothstep(1.32, 1.91, biteTime);
  let travel = smoothstep(1.94, 3.56, biteTime);
  let press = smoothstep(1.23, 1.66, biteTime) * (1.0 - smoothstep(1.82, 2.42, biteTime));
  // While the bowl withdraws, the piece and bowl are translated together.
  let pieceDestination = vec3f(0.33, contact.y + 0.215, -0.112);
  let pieceShift = (pieceDestination - contact) * travel + vec3f(0.0, 0.061 * sin(travel * 3.14159265), 0.0);
  let bowlContact = contact + vec3f(0.035, -0.145, 0.006);
  let bowlStart = bowlContact + vec3f(0.57, 0.33, -0.21);
  let bowlAbove = bowlContact + vec3f(0.048, 0.152, -0.009);
  let bowlCenter = mix(bowlStart, bowlAbove, arrive) - (bowlAbove - bowlContact) * insert
    + pieceShift - vec3f(cutX * 0.26 * travel, 0.0, 0.0);
  let foot = 0.018 * 0.83516465 - gelOrigin.z * 0.55;
  let pieceCenter = gelOrigin + cut + pieceShift;
  let turn = 0.68 * travel;
  let turnSin = sin(turn);
  let turnCos = cos(turn);
  let pieceY = pieceCenter.y * 0.83516465 - pieceCenter.z * 0.55;
  let spoonVisible = hasBite && biteTime > 0.22;
  let retainedCenters = array<vec3f, 3>(vec3f(-0.36, 0.392, -0.12),
    vec3f(0.0, 0.392, -0.309), vec3f(0.36, 0.392, -0.12));
  let offsets = array<vec2f, 4>(vec2f(0.0), vec2f(-0.35, -0.20),
    vec2f(0.34, -0.26), vec2f(0.01, 0.46));
  // Most pixels shade once. Only a center ray near an edge asks for the
  // three subpixel rays, including where the moving cut meets the spoon.
  var accumulated = vec4f(0.0);
  for (var tap = 0u; tap < 4u; tap++) {
    let sampleUv = uv + offsets[tap] * pixelStep;
    var edge = false;
    var shaded = vec4f(0.0);
    loop {
      let screen = (sampleUv - vec2f(0.50, 0.56)) * vec2f(1.77, -1.18) - vec2f(0.25, -0.192);
      let origin = vec3f(screen.x, screen.y * 0.83516465, -screen.y * 0.55) - ray * 3.0;
      let floorPos = (origin + ray * ((0.018 - origin.y) / ray.y)).xz;
      let dent = select(0.0, press * (1.0 - smoothstep(0.050, 0.315, abs(screen.x - contact.x))), hasBite);
      let recoil = select(0.0, 0.068 * smoothstep(2.16, 2.43, biteTime)
        * (1.0 - smoothstep(2.44, 2.77, biteTime)) * (1.0 - smoothstep(0.05, 0.32, abs(screen.x - contact.x))), hasBite);
      let squash = -0.222 * dent + recoil;
      let scale = vec3f(1.0, 1.0 + squash, 1.0 + 0.10 * dent);
      var gelRay = ray;
      var gelEye = origin - anchor + vec3f(0.0, 0.022, 0.0);
      if (dent > 0.0 || recoil > 0.0) {
        gelRay = ray / scale;
        gelEye = (origin - anchor) / scale + vec3f(0.0, 0.022, 0.0);
      }

      let mainBounds = abs(screen.x - gelOrigin.x) < 0.475 * scale.x
        && screen.y > foot - 0.262 * scale.z
        && screen.y < foot + 0.314 * scale.y + 0.219 * scale.z;
      let pieceBounds = hasCut && abs(screen.x - pieceCenter.x) < 0.203
        && abs(screen.y - pieceY) < 0.203;

      var visibleAt = 1e4;
      var endAt = -1e4;
      var localPosition = vec3f(0.0);
      var normal = vec3f(0.0, 1.0, 0.0);
      var cavity = false;
      var concave = false;
      var cavityCenter = cut;
      var detached = false;
      let objectCount = select(1u, 2u, pieceBounds);
      for (var item = 0u; item < objectCount; item++) {
        let isPiece = item == 1u;
        if (!isPiece && !mainBounds) { continue; }
        var o = gelEye;
        var d = gelRay;
        if (isPiece) {
          let centerRay = origin - gelOrigin - pieceShift - cut;
          o = cut + centerRay * turnCos + cross(ray, centerRay) * turnSin
            + ray * dot(ray, centerRay) * (1.0 - turnCos);
          d = ray;
        }
        // A shallow sculpted crown varies across the scalloped mold. The
        // same anchored profile is used for the translated match.
        let crownFold = 0.962 + 0.045 * cos(o.x * 24.0 + 0.42) + 0.014 * sin(o.x * 41.0 - 0.33);
        o.y = (o.y - 0.022) / crownFold + 0.022;
        d.y /= crownFold;
        let invY = 1.0 / d.y;

        // Intersect the same solid profile for the jelly and the extracted piece.
        let joins = array<vec2f, 4>(vec2f(0.022, 0.447), vec2f(0.062, 0.474),
          vec2f(0.340, 0.396), vec2f(0.397, 0.351));
        var mold = vec2f(1e4, -1e4);
        var profileEdge = false;
        for (var segment = 0u; segment < 3u; segment++) {
          let lower = joins[segment];
          let upper = joins[segment + 1u];
          let slope = (upper.y - lower.y) / (upper.x - lower.x);
          let radius = lower.y + (o.y - lower.x) * slope;
          let rate = slope * d.y;
          let a = dot(d.xz, d.xz) - rate * rate;
          let b = dot(o.xz, d.xz) - radius * rate;
          let c = dot(o.xz, o.xz) - radius * radius;
          let determinant = b * b - a * c;
          let slabEntry = (upper.x - o.y) * invY;
          let slabExit = (lower.x - o.y) * invY;
          if (tap == 0u) {
            // Signed miss at the closest point in the capped profile catches
            // both grazing hits and rays just outside the actual silhouette.
            let closest = clamp(-b / a, slabEntry, slabExit);
            let miss = (a * closest + 2.0 * b) * closest + c;
            profileEdge = profileEdge || abs(miss) < worldPixel * 1.55;
          }
          if (determinant < 0.0) { continue; }
          let root = sqrt(determinant);
          let entry = max((-b - root) / a, slabEntry);
          let exit = min((-b + root) / a, slabExit);
          if (entry < exit) { mold = vec2f(min(mold.x, entry), max(mold.y, exit)); }
        }
        if (tap == 0u && profileEdge && (mold.y - mold.x) < sqrt(worldPixel) * 3.0) {
          edge = true;
        }
        if (mold.x >= mold.y) { continue; }

        var span = mold;
        var cutSurface = false;
        var localCutCenter = cut;
        // The moving bite intersects the current cutter. The remaining body
        // subtracts that cutter plus any previously committed openings.
        let cutCount = select(select(1u, 4u, retained != 0u), 1u, isPiece);
        for (var slot = 0u; slot < cutCount; slot++) {
          var cutter = cut;
          if (slot == 0u) {
            if (!hasCut) { continue; }
          } else {
            if ((retained & (1u << (slot - 1u))) == 0u) { continue; }
            cutter = retainedCenters[slot - 1u];
          }
          let worldCut = gelOrigin + cutter;
          let height = worldCut.y * 0.83516465 - worldCut.z * 0.55;
          if (!isPiece && (abs(screen.x - worldCut.x) >= 0.211 || abs(screen.y - height) >= 0.278)) {
            continue;
          }
          let offset = o - cutter;
          let a = dot(d, d);
          let b = dot(offset, d);
          let center = offset - d * (b / a);
          let radius = 0.194 + 0.008 * sin(center.x * 51.0 + center.y * 29.0)
            + 0.006 * sin(center.z * 43.0 - center.x * 33.0);
          let determinant = b * b - a * (dot(offset, offset) - radius * radius);
          var spoon = vec2f(1e4, -1e4);
          if (determinant >= 0.0) {
            let root = sqrt(determinant);
            spoon = vec2f((-b - root) / a, (-b + root) / a);
          }
          if (tap == 0u) {
            let nearCutter = determinant > -worldPixel * 0.56;
            let meetsBody = min(abs(spoon.x - mold.x), min(abs(spoon.y - mold.x), abs(spoon.y - mold.y)));
            edge = edge || (nearCutter && (determinant < worldPixel * 0.56 || meetsBody < worldPixel * 4.5));
          }
          if (isPiece) {
            span = vec2f(max(mold.x, spoon.x), min(mold.y, spoon.y));
            cutSurface = spoon.x > mold.x;
          } else if (spoon.x < span.x && spoon.y > span.x) {
            span.x = spoon.y;
            cutSurface = true;
            localCutCenter = cutter;
          } else if (spoon.x > span.x && spoon.x < span.y) {
            span.y = spoon.x;
          }
        }
        if (span.x >= span.y || span.x >= visibleAt) { continue; }
        visibleAt = span.x;
        endAt = span.y;
        cavity = cutSurface;
        concave = cutSurface && !isPiece;
        cavityCenter = localCutCenter;
        detached = isPiece;
        localPosition = o + d * span.x;
        var surface = vec3f(0.0, 1.0, 0.0);
        if (cutSurface) {
          surface = normalize((localPosition - cavityCenter) * select(-1.0, 1.0, isPiece));
        } else if (localPosition.y > 0.39695) {
          let crown = localPosition.xz;
          surface = vec3f(crown.x * 1.28, 1.0, crown.y * 1.28);
        } else {
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
          let lip = smoothstep(0.349, 0.397, localPosition.y);
          surface = mix(vec3f(direction.x, bevel, direction.y),
            vec3f(localPosition.x * 1.28, 1.0, localPosition.z * 1.28), lip);
        }
        surface.y /= crownFold;
        if (isPiece) {
          surface = surface * turnCos - cross(ray, surface) * turnSin
            + ray * dot(ray, surface) * (1.0 - turnCos);
        }
        normal = normalize(surface / select(scale, vec3f(1.0), isPiece));
      }

      var silverAt = 1e4;
      var silver = vec3f(0.0);
      var metalCoverage = 0.0;
      if (spoonVisible) {
        let tilt = mix(0.26, 0.06, insert) + 0.10 * travel;
        let heading = normalize(vec3f(0.794, 0.0, -0.608));
        let tangent = heading * sqrt(1.0 - tilt * tilt) + vec3f(0.0, tilt, 0.0);
        let side = vec3f(-heading.z, 0.0, heading.x);
        let up = cross(side, tangent);
        let projectedTilt = tangent.y * 0.83516465 - tangent.z * 0.55;
        let axis = normalize(vec2f(tangent.x, projectedTilt * 1.52));
        let across = vec2f(-axis.y, axis.x);
        let bowlScreen = vec2f(bowlCenter.x, bowlCenter.y * 0.83516465 - bowlCenter.z * 0.55);
        let tool = screen - bowlScreen;
        let along = dot(tool, axis);
        let vertical = dot(tool, across);
        let materialUv = vec2f((along + 0.228) / 1.185, 0.50 - vertical / 0.276);
        if (all(materialUv > vec2f(0.0)) && all(materialUv < vec2f(1.0))) {
          let steel = photoRGBA(vec2f(0.0, 1440.0), vec2f(1200.0, 256.0), materialUv);
          let ellipse = length(vec2f(along / 0.225, vertical / 0.134));
          let bowlFloor = -0.069 * (1.0 - smoothstep(0.09, 1.03, ellipse));
          let stem = 0.104 * max(0.0, along - 0.19);
          let surfaceHeight = bowlFloor + stem;
          if (steel.a > 0.0) {
            silverAt = (surfaceHeight - dot(origin - bowlCenter, up)) / dot(ray, up);
          }
          metalCoverage = steel.a;
          silver = steel.rgb * (0.92 + 0.08 * arrive + 0.09 * travel);
          if (tap == 0u && ((steel.a > 0.01 && steel.a < 0.995)
            || (along < 0.238 && abs(ellipse - 1.0) < 0.055))) {
            edge = true;
          }
        }
      }

      let hitsGel = visibleAt < endAt;
      if (tap == 0u && hitsGel && metalCoverage > 0.0 && abs(silverAt - visibleAt) < worldPixel * 6.0) {
        edge = true;
      }
      if (silverAt < visibleAt && metalCoverage >= 0.999) {
        shaded = vec4f(silver, 0.0);
        break;
      }
      let path = clamp(endAt - visibleAt, 0.06, 0.88);
      var xz = floorPos;
      if (hitsGel) {
        let refracted = refract(ray, normal, 1.0 / 1.36);
        xz += (refracted.xz - ray.xz) * (0.29 + path);
      }
      // The plate and plaster are fixed photography. Transmission shifts
      // the sampled image along the bent ray, and shadows remain scene geometry.
      var color = photo(vec2f(0.0), vec2f(1200.0, 800.0),
        sampleUv + (xz - floorPos) * vec2f(0.16, -0.10));
      if (!hitsGel) {
        let underGel = (floorPos - gelOrigin.xz - vec2f(0.05, 0.03)) / vec2f(0.52, 0.49);
        let footprint = length(underGel);
        let contact = (1.0 - smoothstep(0.74, 1.12, footprint)) * 0.73;
        let castDistance = length((floorPos - gelOrigin.xz - vec2f(0.20, 0.115)) / vec2f(0.63, 0.48));
        let bodyShadow = (1.0 - smoothstep(0.60, 1.18, castDistance)) * 0.46;
        let glowPoint = (floorPos - gelOrigin.xz - vec2f(0.22, 0.15)) / vec2f(0.43, 0.36);
        let glowDistance = dot(glowPoint, glowPoint);
        let reflectedLight = (1.0 - smoothstep(0.10, 1.02, glowDistance))
          * (0.35 + 0.65 * abs(sin(36.0 * glowPoint.x + 12.0 * glowPoint.y))) * 0.19;
        let floorHue = array<vec3f, 3>(vec3f(1.0, 0.411, 0.018), vec3f(0.64, 0.069, 0.135), vec3f(0.46, 0.61, 0.13))[j];
        color = color * (1.0 - max(contact, bodyShadow)) + floorHue * reflectedLight;
        if (spoonVisible) {
          let shadowPos = (floorPos - bowlCenter.xz - vec2f(0.045, 0.09)) / vec2f(0.265, 0.199);
          let toolShadow = 1.0 - smoothstep(0.17, 1.14, length(shadowPos));
          color *= 1.0 - toolShadow * (0.19 - 0.10 * travel);
        }
        color = mix(color, silver, metalCoverage);

        shaded = vec4f(color, 0.0);
        break;
      }

      let foregroundMetal = select(0.0, metalCoverage, silverAt < visibleAt);
      let absorption = array<vec3f, 3>(vec3f(0.11, 1.23, 4.65), vec3f(0.31, 4.70, 2.55), vec3f(1.63, 0.45, 2.69))[j];
      let juice = array<vec3f, 3>(vec3f(1.0, 0.54, 0.076), vec3f(0.84, 0.115, 0.229), vec3f(0.58, 0.71, 0.224))[j];
      let plateSample = color;
      let light = normalize(vec3f(-0.64, 0.78, 0.57));
      let cosine = max(dot(normal, -ray), 0.0);
      let grazing = (1.0 - cosine) * (1.0 - cosine);
      let fresnel = 0.034 + 0.36 * grazing * grazing;
      let softDiffuse = 0.53 + 0.47 * max(0.0, dot(normal, light));
      // UVs follow the undeformed mold. The submitted volume may compress
      // or travel with the spoon; the photographed flesh travels with it.
      let worldHeight = (localPosition.y - 0.004) * 0.83516465
        - (localPosition.z + 0.026) * 0.55;
      let projected = vec2f(0.50 + (localPosition.x + 0.119) / 1.77,
        0.56 - (worldHeight - 0.192) / 1.18);
      let reference = vec2f(projected.x * 1536.0,
        (0.321 + (projected.y - 0.285) * 0.915) * 1024.0);
      let bodyUv = (reference - vec2f(440.0, 315.0)) / vec2f(840.0, 625.0);
      var fruitPhoto = photo(vec2f(0.0, 800.0), vec2f(840.0, 625.0), bodyUv);
      if (detached || cavity) {
        let inside = localPosition - cavityCenter;
        let fruitUv = vec2f(0.56 + inside.x * 2.55 + inside.z * 1.28,
          0.43 - inside.y * 1.38 + inside.z * 1.82);
        let segment = photoRGBA(vec2f(864.0, 800.0), vec2f(336.0, 256.0), fruitUv);
        fruitPhoto = mix(fruitPhoto, segment.rgb, segment.a * 0.94);
      }
      if (j != 0u) {
        let value = dot(fruitPhoto, vec3f(0.68, 0.29, 0.03));
        let selectedTint = array<vec3f, 3>(vec3f(1.0), vec3f(0.83, 0.095, 0.20),
          vec3f(0.67, 0.82, 0.24))[j];
        fruitPhoto = mix(fruitPhoto, value * selectedTint, 0.87);
      }
      let transmitted = plateSample * exp(-absorption * (0.46 + path * 1.35));
      let scattering = transmitted * (0.76 + softDiffuse * 0.22) + juice * 0.044;
      let thicknessLight = mix(1.06, 0.85, smoothstep(0.11, 0.87, path));
      let fleshColor = fruitPhoto * thicknessLight * (0.87 + softDiffuse * 0.13);
      let base = mix(mix(fleshColor, scattering, 0.075), vec3f(0.72, 0.43, 0.28), fresnel * 0.34);
      let heel = smoothstep(0.026, 0.115, localPosition.y);
      let footTint = mix(vec3f(0.59, 0.45, 0.31), vec3f(1.0), heel);
      let footGlaze = (1.0 - smoothstep(0.03, 0.082, localPosition.y)) * fresnel * 0.40;
      let sky = vec3f(1.0, 0.91, 0.79);
      if (concave) {
        let depth = smoothstep(0.0, 0.17, 0.397 - localPosition.y);
        let wallShade = (0.85 - 0.39 * depth) * (0.74 + 0.26 * softDiffuse);
        let wallReflection = reflect(ray, normal);
        let wetRim = pow(max(0.0, dot(wallReflection, normalize(vec3f(-0.43, 0.77, -0.44)))), 65.0)
          * (1.0 - 0.62 * depth);
        let lip = 1.0 - smoothstep(0.002, 0.028, abs(localPosition.y - 0.397));
        shaded = vec4f(mix(base * wallShade + juice * (0.09 + 0.065 * depth) + sky * (wetRim * 0.68 + lip * 0.22),
          silver, foregroundMetal), 0.0);
        break;
      }
      let reflected = reflect(ray, normal);
      // Reflected rectangular softboxes leave a rounded stripe and a small rim glint.
      let softbox = smoothstep(-0.78, -0.53, reflected.x) * (1.0 - smoothstep(-0.31, -0.03, reflected.x))
        * smoothstep(0.34, 0.55, reflected.y) * (1.0 - smoothstep(0.82, 0.98, reflected.y)) * step(-0.4, reflected.z);
      let sideWindow = pow(max(dot(reflected, normalize(vec3f(-0.71, 0.22, 0.67))), 0.0), 39.0);
      let windowLight = pow(max(dot(reflected, normalize(vec3f(-0.45, 0.82, -0.35))), 0.0), 40.0);
      let rimLight = pow(max(dot(reflected, normalize(vec3f(0.54, 0.54, -0.73))), 0.0), 52.0);
      let softFilm = smoothstep(0.0, 0.20, normal.y) * smoothstep(0.22, 0.38, localPosition.y);
      let glossy = smoothstep(-0.19, -0.10, localPosition.z)
        * (1.0 - smoothstep(0.07, 0.18, localPosition.z)) * smoothstep(0.89, 0.995, normal.y);
      let topGlint = exp(-24.0 * abs(localPosition.x + 0.17 + localPosition.z * 0.28))
        * glossy * 0.065;
      let fill = select(0.0, 0.024, cavity);
      shaded = vec4f(mix(base * select(footTint, vec3f(1.0), detached)
        + sky * (0.10 * softbox + 0.17 * rimLight + 0.27 * windowLight + 0.19 * sideWindow + topGlint + fill + footGlaze)
        + sky * softFilm * 0.027,
        silver, foregroundMetal), glossy * (1.0 - foregroundMetal));
      break;
    }
    if (tap == 0u) {
      if (!edge) { return shaded; }
    } else {
      accumulated += shaded;
    }
  }
  return accumulated / 3.0;
