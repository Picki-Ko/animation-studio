import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createMp4Container, finalizeMp4 } from "../src/export/mp4-container";
test("MP4 muxer writes a decodable H.264 stream, frame timestamps and actual ftyp container", (t) => {
  if (
    spawnSync("ffmpeg", ["-version"]).status !== 0 ||
    spawnSync("ffprobe", ["-version"]).status !== 0
  ) {
    t.skip("FFmpeg / ffprobe are optional native validation dependencies");
    return;
  }
  const encoded = spawnSync("ffmpeg", [
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=teal:s=64x64:r=24",
    "-frames:v",
    "1",
    "-c:v",
    "libx264",
    "-profile:v",
    "baseline",
    "-pix_fmt",
    "yuv420p",
    "-f",
    "h264",
    "pipe:1",
  ]);
  assert.equal(encoded.status, 0, encoded.stderr.toString());
  const raw = encoded.stdout,
    nals: Uint8Array[] = [];
  let start = -1;
  for (let i = 0; i < raw.length - 2;) {
    let length = 0;
    if (raw[i] === 0 && raw[i + 1] === 0) {
      if (raw[i + 2] === 1) length = 3;
      else if (raw[i + 2] === 0 && raw[i + 3] === 1) length = 4;
    }
    if (length) {
      if (start >= 0) nals.push(raw.subarray(start, i));
      start = i + length;
      i += length;
    } else i++;
  }
  if (start >= 0) nals.push(raw.subarray(start));
  const sps = nals.find((n) => (n[0] & 31) === 7)!,
    pps = nals.find((n) => (n[0] & 31) === 8)!;
  assert.ok(sps && pps);
  const description = new Uint8Array([
    1,
    sps[1],
    sps[2],
    sps[3],
    255,
    225,
    sps.length >> 8,
    sps.length & 255,
    ...sps,
    1,
    pps.length >> 8,
    pps.length & 255,
    ...pps,
  ]);
  const packet = new Uint8Array(
    nals
      .filter((n) => ![7, 8].includes(n[0] & 31))
      .flatMap((n) => [
        n.length >>> 24,
        (n.length >>> 16) & 255,
        (n.length >>> 8) & 255,
        n.length & 255,
        ...n,
      ]),
  );
  const container = createMp4Container(64, 64);
  for (let i = 0; i < 3; i++)
    container.muxer.addVideoChunkRaw(
      packet,
      "key",
      Math.round((i * 1_000_000) / 24),
      Math.round(((i + 1) * 1_000_000) / 24) - Math.round((i * 1_000_000) / 24),
      {
        decoderConfig: {
          codec: "avc1.42001e",
          codedWidth: 64,
          codedHeight: 64,
          description,
        },
      },
    );
  const buffer = finalizeMp4(container);
  mkdirSync("work/validation", { recursive: true });
  const path = "work/validation/container.mp4";
  writeFileSync(path, new Uint8Array(buffer));
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", path],
    { encoding: "utf8" },
  );
  assert.equal(probe.status, 0, probe.stderr);
  const metadata = JSON.parse(probe.stdout),
    video = metadata.streams[0];
  assert.equal(video.codec_name, "h264");
  assert.equal(video.width, 64);
  assert.equal(video.height, 64);
  assert.equal(video.nb_frames, "3");
  assert.ok(metadata.format.format_name.includes("mp4"));
  assert.ok(Math.abs(+metadata.format.duration - 0.125) < 0.002);
  const decode = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", path, "-f", "null", "-"],
    { encoding: "utf8" },
  );
  assert.equal(decode.status, 0, decode.stderr);
});
