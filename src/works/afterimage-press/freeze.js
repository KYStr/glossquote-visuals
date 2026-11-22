// Capture the actual GPU bitmap and the visible artwork at the current blade
// position. All of the resulting pixels are opaque in a single presentation.
export function freezePress({ stage, bed, canvas, inkDetail, tool, plate, coverage }) {
  const view = stage.getBoundingClientRect();
  if (!view.width || !view.height || !canvas.width || !canvas.height) return null;

  const frozen = document.createElement("canvas");
  frozen.className = "frozen-frame";
  frozen.setAttribute("aria-hidden", "true");
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  // Align to the device pixel grid, even if the CSS stage starts or ends
  // between pixels. The opaque bitmap can then present without resampling.
  const left = Math.floor(view.left * scale);
  const top = Math.floor(view.top * scale);
  frozen.width = Math.ceil((view.left + view.width) * scale) - left;
  frozen.height = Math.ceil((view.top + view.height) * scale) - top;
  frozen.style.left = `${left / scale - view.left}px`;
  frozen.style.top = `${top / scale - view.top}px`;
  frozen.style.width = `${frozen.width / scale}px`;
  frozen.style.height = `${frozen.height / scale}px`;
  const context = frozen.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!context) return null;

  function rect(element) {
    const box = element.getBoundingClientRect();
    return [box.left - view.left, box.top - view.top, box.width, box.height];
  }

  function drawImage(image, box) {
    if (image.complete && image.naturalWidth) context.drawImage(image, ...box);
  }

  const sheet = rect(canvas);
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#25252d";
  context.fillRect(0, 0, frozen.width, frozen.height);
  context.setTransform(scale, 0, 0, scale, view.left * scale - left, view.top * scale - top);
  drawImage(bed, [0, 0, view.width, view.height]);
  // Read the canvas image, not a current WebGPU texture. The image is
  // readable after presentation has expired the writable texture.
  context.drawImage(canvas, ...sheet);
  const x0 = Math.floor((view.left + sheet[0] + sheet[2] * .06) * scale) - left;
  const x1 = Math.floor((view.left + sheet[0] + sheet[2] * .45) * scale) - left;
  const y = Math.floor((view.top + sheet[1] + sheet[3] * .5) * scale) - top;
  const sample = context.getImageData(x0, y, x1 - x0 + 1, 1).data;
  // This row contains bare paper and a solid ink area in all three states.
  // Keep the live surface attached if the browser returns a lost/empty frame.
  if (sample[0] < 220 || sample[1] < 210 || sample[2] < 190 || sample.at(-3) > 140) return null;

  function drawInk(index, start, end) {
    if (end <= start) return;
    context.save();
    context.beginPath();
    context.rect(sheet[0], sheet[1] + sheet[3] * start, sheet[2], sheet[3] * (end - start));
    context.clip();
    drawImage(inkDetail.querySelector(`[data-ink="${index}"]`), sheet);
    context.restore();
  }

  if (plate === 0) {
    drawInk(1, coverage, 1);
    drawInk(0, 0, coverage);
  } else {
    drawInk(plate, 0, 1);
  }

  const toolStyle = getComputedStyle(tool);
  if (toolStyle.visibility === "visible") {
    context.filter = toolStyle.filter;
    drawImage(tool, rect(tool));
  }
  // Materialize the full composite before the live GPU canvas is detached.
  const pixels = context.getImageData(0, 0, frozen.width, frozen.height);
  context.putImageData(pixels, 0, 0);
  return frozen;
}
