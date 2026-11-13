// GPU canvas bytes are associated-alpha when alphaMode is premultiplied.
// ImageData/PNG require unassociated-alpha RGB. Keep the original bytes for
// measurement; a transparent PNG round-trip cannot preserve low-alpha RGB.
export function prepareReadbackPixels(raw, alphaMode) {
  if (!["opaque", "premultiplied"].includes(alphaMode)) throw new Error(`Unsupported canvas alphaMode ${alphaMode}`);
  if (raw.length % 4) throw new Error("Incomplete RGBA pixel");
  const display = new Uint8ClampedArray(raw);
  const black = new Uint8ClampedArray(raw);
  for (let offset = 0; offset < raw.length; offset += 4) {
    const alpha = alphaMode === "opaque" ? 255 : raw[offset + 3];
    display[offset + 3] = alpha;
    black[offset + 3] = 255;
    if (alphaMode === "premultiplied") {
      for (let channel = 0; channel < 3; channel++) {
        display[offset + channel] = alpha ? Math.round(raw[offset + channel] * 255 / alpha) : 0;
      }
    }
  }
  return { display, black };
}
