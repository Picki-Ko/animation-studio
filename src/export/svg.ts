import type { Project } from "../types";
import { ARROW_POINTS, VIEWBOX } from "../engine/geometry";
import { generateFrame } from "../engine/surface";
import { rgbHex } from "../engine/gradient";
import { backgroundImage, imageBounds } from "../engine/background";
import { tick } from "./files";
export const xml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
const n = (v: number) => Number(v.toFixed(5));
function background(p: Project, w: number, h: number) {
  let result = p.export.transparent
    ? ""
    : `<rect width="${w}" height="${h}" fill="${p.composition.background}"/>`;
  const img = backgroundImage(p),
    b = p.background;
  if (p.export.includeBackground && b.enabled && img) {
    const box = imageBounds(p, img.naturalWidth, img.naturalHeight, w, h);
    result += `<defs><filter id="image-effect" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${n((b.blur * w) / 1920)}"/><feComponentTransfer><feFuncR type="linear" slope="${b.brightness}"/><feFuncG type="linear" slope="${b.brightness}"/><feFuncB type="linear" slope="${b.brightness}"/></feComponentTransfer></filter></defs><image href="${xml(b.dataUrl)}" x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}" preserveAspectRatio="none" opacity="${b.opacity}" filter="url(#image-effect)"/><rect width="${w}" height="${h}" fill="${p.composition.background}" opacity="${b.opacity * b.tint}"/>`;
  }
  return result;
}
function shell(p: Project, w: number, h: number, body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${xml(p.name)}</title><desc>Arrowfield vector artwork. Seed ${p.seed}. Original Illustrator polygon; lighting baked into per-arrow colors. Bloom is omitted for clean vector output.</desc><defs><polygon id="brand-arrow" points="${ARROW_POINTS}"/><clipPath id="canvas"><rect width="${w}" height="${h}"/></clipPath><clipPath id="coverage"><rect x="${n((0.5 + p.composition.x - p.composition.coverage / 2) * w)}" y="${n((0.5 + p.composition.y - p.composition.coverage / 2) * h)}" width="${n(p.composition.coverage * w)}" height="${n(p.composition.coverage * h)}"/></clipPath></defs><g clip-path="url(#canvas)">${background(p, w, h)}<g clip-path="url(#coverage)" opacity="${p.arrows.opacity}">${body}</g></g></svg>`;
}
export function staticSvg(p: Project, time: number) {
  const w = p.composition.width,
    h = p.composition.height,
    frame = generateFrame(p, time, w, h, "high", true);
  const body = frame.instances
    .map(
      (i) =>
        `<use href="#brand-arrow" fill="${rgbHex(i.color)}" transform="translate(${n(i.x)} ${n(i.y)}) rotate(${n((i.angle * 180) / Math.PI)}) scale(${n(i.size / VIEWBOX.width)}) translate(${-VIEWBOX.width / 2} ${-VIEWBOX.height / 2})"/>`,
    )
    .join("");
  return shell(p, w, h, body);
}
export async function animatedSvg(
  p: Project,
  progress: (n: number) => void,
  signal: AbortSignal,
) {
  const count = Math.max(12, Math.min(96, p.export.svgFrames)),
    w = p.composition.width,
    h = p.composition.height;
  const frames = [];
  for (let f = 0; f <= count; f++) {
    if (signal.aborted)
      throw new DOMException("Export cancelled", "AbortError");
    const frame = generateFrame(
      p,
      (p.motion.duration * f) / count,
      w,
      h,
      "high",
      true,
    );
    if (frame.instances.length * (count + 1) > 1_500_000)
      throw new Error(
        "This animated SVG would exceed 1.5 million samples. Reduce density or animation samples.",
      );
    frames.push(frame.instances);
    progress((f / count) * 0.55);
    await tick();
  }
  const duration = p.motion.duration;
  const repeat = p.motion.loop ? "indefinite" : "1";
  const animation = (type: string, values: string[]) =>
    `<animateTransform attributeName="transform" type="${type}" values="${values.join(";")}" dur="${duration}s" repeatCount="${repeat}" fill="freeze" calcMode="linear"/>`;
  const body: string[] = [];
  for (let i = 0; i < frames[0].length; i++) {
    if (signal.aborted)
      throw new DOMException("Export cancelled", "AbortError");
    const samples = frames.map((f) => f[i]);
    const first = samples[0];
    body.push(
      `<g transform="translate(${n(first.x)} ${n(first.y)})">${animation(
        "translate",
        samples.map((s) => `${n(s.x)} ${n(s.y)}`),
      )}<g transform="rotate(${n((first.angle * 180) / Math.PI)})">${animation(
        "rotate",
        samples.map((s) => `${n((s.angle * 180) / Math.PI)}`),
      )}<g transform="scale(${n(first.size / VIEWBOX.width)})">${animation(
        "scale",
        samples.map((s) => `${n(s.size / VIEWBOX.width)}`),
      )}<use href="#brand-arrow" transform="translate(${-VIEWBOX.width / 2} ${-VIEWBOX.height / 2})" fill="${rgbHex(first.color)}"><animate attributeName="fill" values="${samples.map((s) => rgbHex(s.color)).join(";")}" dur="${duration}s" repeatCount="${repeat}" fill="freeze"/></use></g></g></g>`,
    );
    if (i % 250 === 0) {
      progress(0.55 + (i / frames[0].length) * 0.45);
      await tick();
    }
  }
  return shell(p, w, h, body.join(""));
}
