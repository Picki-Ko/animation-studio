import { Muxer, ArrayBufferTarget } from "mp4-muxer";
export function createMp4Container(width: number, height: number) {
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  return { target, muxer };
}
export function finalizeMp4(
  container: ReturnType<typeof createMp4Container>,
): ArrayBuffer {
  container.muxer.finalize();
  const buffer = container.target.buffer;
  if (
    !buffer ||
    new TextDecoder().decode(new Uint8Array(buffer, 4, 4)) !== "ftyp"
  )
    throw new Error("MP4 container validation failed.");
  return buffer;
}
