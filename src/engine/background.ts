import type { Project } from "../types";
const images = new Map<string, HTMLImageElement>();
export async function prepareImage(dataUrl: string) {
  if (!dataUrl || images.has(dataUrl)) return;
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  images.set(dataUrl, img);
  if (images.size > 8) images.delete(images.keys().next().value!);
}
export function backgroundImage(p: Project) {
  return images.get(p.background.dataUrl);
}
export function imageBounds(
  p: Project,
  iw: number,
  ih: number,
  width: number,
  height: number,
) {
  const b = p.background;
  let w = width,
    h = height;
  if (b.fit !== "fill") {
    const ratio =
      b.fit === "fit"
        ? Math.min(width / iw, height / ih)
        : Math.max(width / iw, height / ih);
    w = iw * ratio;
    h = ih * ratio;
  }
  w *= b.scale;
  h *= b.scale;
  return {
    x: (width - w) / 2 + b.x * width,
    y: (height - h) / 2 + b.y * height,
    width: w,
    height: h,
  };
}
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  p: Project,
  width: number,
  height: number,
  include = true,
  transparent = false,
  solidColor?: string,
) {
  ctx.clearRect(0, 0, width, height);
  if (!transparent) {
    ctx.fillStyle = solidColor || p.composition.background;
    ctx.fillRect(0, 0, width, height);
  }
  const img = backgroundImage(p);
  const b = p.background;
  if (include && b.enabled && img) {
    const box = imageBounds(
      p,
      img.naturalWidth,
      img.naturalHeight,
      width,
      height,
    );
    ctx.save();
    ctx.globalAlpha = b.opacity;
    ctx.filter = `blur(${(b.blur * width) / 1920}px) brightness(${b.brightness})`;
    ctx.drawImage(img, box.x, box.y, box.width, box.height);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = b.opacity * b.tint;
    ctx.fillStyle = p.composition.background;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
