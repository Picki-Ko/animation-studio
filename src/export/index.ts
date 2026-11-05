import { zipSync, strToU8 } from "fflate";
import type { Project } from "../types";
import { Renderer } from "../engine/renderer";
import { staticSvg, animatedSvg } from "./svg";
import { encodeMp4, exportSize } from "./video";
import { download, pngBlob, safeName, tick } from "./files";
export async function exportProject(
  p: Project,
  time: number,
  progress: (n: number) => void,
  signal: AbortSignal,
) {
  const name = safeName(p.name),
    format = p.export.format;
  const canvas = document.createElement("canvas");
  const renderer = new Renderer(canvas);
  try {
    await renderer.prepare(p);
    if (format === "svg") {
      download(staticSvg(p, time), `${name}.svg`, "image/svg+xml");
      progress(1);
    } else if (format === "animated-svg") {
      const svg = await animatedSvg(p, progress, signal);
      download(svg, `${name}-animated.svg`, "image/svg+xml");
      progress(1);
    } else if (format === "mp4") {
      const blob = await encodeMp4(p, progress, signal);
      download(blob, `${name}.mp4`);
    } else {
      const [w, h] = exportSize(p);
      const render = (t: number) =>
        renderer.render(p, t, w, h, {
          includeBackground: p.export.includeBackground,
          transparent: p.export.transparent,
          quality: "high",
        });
      if (format === "png") {
        render(time);
        download(await pngBlob(canvas), `${name}.png`);
        progress(1);
      } else {
        const total = Math.round(p.motion.duration * p.export.fps),
          files: Record<string, Uint8Array> = {};
        let bytes = 0;
        for (let i = 0; i < total; i++) {
          if (signal.aborted)
            throw new DOMException("Export cancelled", "AbortError");
          render(i / p.export.fps);
          const blob = await pngBlob(canvas);
          bytes += blob.size;
          if (bytes > 400_000_000)
            throw new Error(
              "The PNG sequence exceeds 400 MB of browser memory. Use a shorter duration or lower resolution.",
            );
          files[`frame-${String(i).padStart(5, "0")}.png`] = new Uint8Array(
            await blob.arrayBuffer(),
          );
          progress(((i + 1) / total) * 0.95);
          await tick();
        }
        files["project.json"] = strToU8(JSON.stringify(p, null, 2));
        files["README.txt"] = strToU8(
          `Arrowfield PNG sequence\n${w}x${h}, ${p.export.fps} fps, ${total} frames\nStarts at t=0; the endpoint is intentionally omitted for a seamless loop.\n`,
        );
        const zipped = zipSync(files, { level: 0 });
        download(
          new Blob([zipped as Uint8Array<ArrayBuffer>], {
            type: "application/zip",
          }),
          `${name}-frames.zip`,
        );
        progress(1);
      }
    }
  } finally {
    renderer.dispose();
  }
}
