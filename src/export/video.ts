import { createMp4Container, finalizeMp4 } from "./mp4-container";
import type { Project } from "../types";
import { Renderer } from "../engine/renderer";
import { tick } from "./files";
export function exportSize(p: Project): [number, number] {
  const { width, height } = p.composition;
  if (p.export.resolution === "canvas")
    return [
      Math.max(2, Math.round(width / 2) * 2),
      Math.max(2, Math.round(height / 2) * 2),
    ];
  const short = p.export.resolution === "4k" ? 2160 : 1080;
  return width >= height
    ? [Math.round((short * width) / height / 2) * 2, short]
    : [short, Math.round((short * height) / width / 2) * 2];
}
export async function mp4Capability(
  p: Project,
): Promise<{
  supported: boolean;
  reason: string;
  config?: VideoEncoderConfig;
}> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined")
    return {
      supported: false,
      reason:
        "MP4 needs WebCodecs with H.264 encoding. Use a current Chrome or Edge browser, or export a PNG sequence.",
    };
  const [width, height] = exportSize(p);
  const is4k = Math.max(width, height) > 2048;
  const candidates = is4k
    ? ["avc1.640034", "avc1.420034"]
    : ["avc1.64002A", "avc1.42002A"];
  for (const codec of candidates) {
    const config: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate: is4k ? 35_000_000 : 12_000_000,
      framerate: p.export.fps,
      latencyMode: "quality",
      avc: { format: "avc" },
    };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported)
        return {
          supported: true,
          reason: `H.264 · ${width} × ${height} · ${p.export.fps} fps`,
          config,
        };
    } catch {
      /* Try next profile. */
    }
  }
  return {
    supported: false,
    reason: `This device cannot encode H.264 at ${width} × ${height}, ${p.export.fps} fps. Choose 1080p / 24 fps or a PNG sequence.`,
  };
}
export async function encodeMp4(
  p: Project,
  progress: (n: number) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const support = await mp4Capability(p);
  if (!support.supported || !support.config) throw new Error(support.reason);
  const [width, height] = exportSize(p);
  const fps = p.export.fps,
    total = Math.round(p.motion.duration * fps);
  const container = createMp4Container(width, height),
    { muxer } = container;
  const canvas = document.createElement("canvas");
  const renderer = new Renderer(canvas);
  await renderer.prepare(p);
  let failure: Error | undefined;
  const encoder = new VideoEncoder({
    output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
    error: (e) => {
      failure = e;
    },
  });
  try {
    encoder.configure(support.config);
    for (let i = 0; i < total; i++) {
      if (signal.aborted)
        throw new DOMException("Export cancelled", "AbortError");
      if (failure) throw failure;
      renderer.render(p, i / fps, width, height, {
        quality: "high",
        includeBackground: p.export.includeBackground,
        transparent: false,
        solidColor: p.export.solidColor,
      });
      const timestamp = Math.round((i * 1_000_000) / fps),
        next = Math.round(((i + 1) * 1_000_000) / fps);
      const frame = new VideoFrame(canvas, {
        timestamp,
        duration: next - timestamp,
        alpha: "discard",
      });
      try {
        encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      } finally {
        frame.close();
      }
      if (encoder.encodeQueueSize > 8) await encoder.flush();
      progress(((i + 1) / total) * 0.97);
      await tick();
    }
    await encoder.flush();
    if (failure) throw failure;
    const buffer = finalizeMp4(container);
    progress(1);
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    if (encoder.state !== "closed") encoder.close();
    renderer.dispose();
  }
}
