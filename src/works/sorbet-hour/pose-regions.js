import positions from "./scoop-positions.json" with { type: "json" };

const tile = 8;
const projectY = (y, z) => y * 0.83516465 - z * 0.55;
const clamp = (value, limit) => Math.max(0, Math.min(limit, value));
const ramp = (start, end, time) => {
  const t = clamp((time - start) / (end - start), 1);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// These are conservative bounds of the same projected shapes in jelly.wgsl.
// Include the neighboring subpixel taps before rounding out to tile boundaries.
export function poseRegions(width, height, time, cutX, cutZ, retained = 0) {
  const boxes = [];
  function cover(left, bottom, right, top) {
    const x0 = clamp(Math.floor((((left + 0.25) / 1.77 + 0.5) * width - 2) / tile) * tile, width);
    const x1 = clamp(Math.ceil((((right + 0.25) / 1.77 + 0.5) * width + 2) / tile) * tile, width);
    const y0 = clamp(Math.floor(((0.56 - (top - 0.192) / 1.18) * height - 2) / tile) * tile, height);
    const y1 = clamp(Math.ceil(((0.56 - (bottom - 0.192) / 1.18) * height + 2) / tile) * tile, height);
    if (x0 < x1 && y0 < y1) boxes.push([x0, y0, x1, y1]);
  }

  const contactX = -0.142 + cutX;
  const contactY = 0.392;
  const contactZ = 0.026 + cutZ;
  const opening = projectY(contactY, contactZ);
  const arrive = ramp(0.22, 1.33, time);
  const insert = ramp(1.32, 1.91, time);
  const travel = ramp(1.94, 3.56, time);
  const dx = (0.28 - contactX) * travel;
  const dy = 0.128 * travel + 0.061 * Math.sin(travel * Math.PI);
  const dz = (-0.112 - contactZ) * travel;
  const rise = projectY(dy, dz);

  for (const [index, cut] of positions.entries()) {
    if (!(retained & (1 << index))) continue;
    const x = -0.142 + cut.x;
    const y = projectY(contactY, 0.026 + cut.z);
    cover(x - 0.211, y - 0.278, x + 0.211, Math.min(0.536, y + 0.278));
  }
  if (time > 1.23 && time < 2.77) {
    // The pressure and recoil only reach this strip of the main mold.
    cover(Math.max(contactX - 0.320, -0.617), -0.290,
      Math.min(contactX + 0.320, 0.333), 0.580);
  }
  if (time >= 1.94) {
    cover(contactX - 0.211, Math.max(-0.262, opening - 0.278),
      contactX + 0.211, Math.min(0.536, opening + 0.278));
    cover(contactX + dx - 0.203, opening + rise - 0.214,
      contactX + dx + 0.203, opening + rise + 0.214);
  }

  if (time > 0.22) {
    const bowlX = contactX + 0.035 + mix(0.57, 0.048, arrive) - 0.048 * insert + dx - cutX * 0.26 * travel;
    const bowlZ = contactZ + 0.006 + mix(-0.21, -0.009, arrive) + 0.009 * insert + dz;
    const bowlY = projectY(contactY - 0.145 + mix(0.33, 0.152, arrive) - 0.152 * insert + dy, bowlZ);
    const shadowY = projectY(0.018, bowlZ + 0.09);
    cover(bowlX + 0.045 - 0.303, shadowY - 0.125,
      bowlX + 0.045 + 0.303, shadowY + 0.125);
    const tilt = mix(0.26, 0.06, insert) + 0.10 * travel;
    const heading = Math.hypot(0.794, 0.608);
    const hx = 0.794 / heading;
    const hz = -0.608 / heading;
    const horizontal = Math.sqrt(1 - tilt * tilt);
    const tx = hx * horizontal;
    const ty = projectY(tilt, hz * horizontal);
    const ux = -hx * tilt;
    const uy = projectY(horizontal, -hz * tilt);
    const sx = -hz;
    const sy = projectY(0, hx);
    const reach = Math.sqrt(Math.max(1.06, 1 + 8 * Math.max(1.77 / width, 1.18 / height)));
    const bowlHalfX = reach * Math.hypot(tx * 0.222, sx * 0.150) + 0.085 * Math.abs(ux);
    const bowlHalfY = reach * Math.hypot(ty * 0.222, sy * 0.150) + 0.085 * Math.abs(uy);
    cover(bowlX - bowlHalfX, bowlY - bowlHalfY, bowlX + bowlHalfX, bowlY + bowlHalfY);

    // The stem climbs diagonally. Bound successive sections independently to
    // avoid shading the empty corners of a single rectangle around the handle.
    const stemWidth = x => mix(0.025, 0.054, ramp(0.28, 0.68, x))
      + 0.024 * (1 - ramp(0.16, 0.29, x));
    for (const [start, end] of [[0.101, 0.29], [0.29, 0.47], [0.47, 0.63], [0.63, 0.765]]) {
      const halfWidth = 1.11 * Math.max(stemWidth(start), stemWidth(end), 0.049);
      const x0 = bowlX + start * tx + 0.105 * (start - 0.185) * ux;
      const x1 = bowlX + end * tx + 0.105 * (end - 0.185) * ux;
      const y0 = bowlY + start * ty + 0.105 * (start - 0.185) * uy;
      const y1 = bowlY + end * ty + 0.105 * (end - 0.185) * uy;
      cover(Math.min(x0, x1) - halfWidth * Math.abs(sx), Math.min(y0, y1) - halfWidth * Math.abs(sy),
        Math.max(x0, x1) + halfWidth * Math.abs(sx), Math.max(y0, y1) + halfWidth * Math.abs(sy));
    }
  }

  // Union projected boxes into disjoint rows so each affected pixel is shaded once.
  const edges = [...new Set(boxes.flatMap(box => [box[1], box[3]]))].sort((a, b) => a - b);
  const regions = [];
  for (let row = 1; row < edges.length; row++) {
    const y0 = edges[row - 1];
    const y1 = edges[row];
    const spans = boxes.filter(box => box[1] <= y0 && box[3] >= y1).sort((a, b) => a[0] - b[0]);
    let current;
    for (const [left, , right] of spans) {
      if (current && left <= current[2]) {
        current[2] = Math.max(current[2], right);
      } else {
        current = [left, y0, right, y1];
        regions.push(current);
      }
    }
  }
  return regions;
}
