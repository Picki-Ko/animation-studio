import type { Project, Frame, Quality } from "../types";
import { clamp, phaseAt, radians, TAU } from "./timing";
import { gradientSampler } from "./gradient";
import { lightSampler } from "./lighting";
export interface SurfacePoint {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  twist: number;
}
export function surfaceSampler(p: Project, time: number) {
  const s = p.surface,
    m = p.motion;
  const phase = phaseAt(p, time);
  const seed = p.seed * 0.01031;
  const speed = m.speed;
  const k = Math.floor(speed),
    f = speed - k;
  const wave = (a: number, harmonic = 1) =>
    !m.loop
      ? Math.sin(a - phase * speed * harmonic)
      : (1 - f) * Math.sin(a - phase * k * harmonic) +
        f * Math.sin(a - phase * (k + 1) * harmonic);
  const motion = wave(seed) * m.amplitude;
  const dir = radians(m.direction);
  const fx = (TAU * s.frequency) / Math.max(0.25, s.size),
    fy = fx * 0.65;
  return (x: number, y: number): SurfacePoint => {
    const warp = Math.sin(y * 3.4 + x * 1.7 + seed) * s.turbulence * 1.1;
    const a = x * fx + y * 2.1 + seed + warp + motion * 0.55;
    const b = y * fy - x * 2.3 + seed * 1.7 - motion * 0.35;
    const detail = s.detail * 0.22;
    const c = x * fx * 2.7 + y * fy * 1.9 + seed * 0.45 + motion;
    const w = (x * Math.cos(dir) + y * Math.sin(dir)) * s.waveFrequency * TAU;
    const traveling =
      Math.sin(w + seed) * (1 - m.amplitude) +
      wave(w + seed, Math.max(1, Math.round(m.frequency))) * m.amplitude;
    const ripple =
      wave(w * 2.3 + Math.sin(y * 3 + seed), 2) * m.ripple * 0.2 * m.amplitude;
    const z =
      (Math.sin(a) * 0.6 + Math.sin(b) * 0.35 + Math.sin(c) * detail) *
        s.wrinkle +
      traveling * s.waveAmplitude * (0.6 + m.amplitude * 0.4) +
      ripple;
    const dx =
      s.wrinkle *
      (Math.cos(a) * fx * 0.6 -
        Math.cos(b) * 2.3 * 0.35 +
        Math.cos(c) * fx * 2.7 * detail) *
      0.16;
    const dy =
      s.wrinkle *
      (Math.cos(a) * 2.1 * 0.6 +
        Math.cos(b) * fy * 0.35 +
        Math.cos(c) * fy * 1.9 * detail) *
      0.16;
    const flow =
      wave(x * 3 + y * 4 + seed, 2) *
      m.turbulence *
      m.amplitude *
      (1 - m.smoothness * 0.6);
    return {
      x:
        x +
        Math.sin(a) * s.wrinkle * 0.035 * (0.3 + s.compression) +
        z * s.curvature * 0.045 +
        flow * 0.025,
      y:
        y +
        Math.sin(b) * s.wrinkle * 0.035 * (0.3 + s.compression) +
        traveling * s.waveAmplitude * 0.035 +
        flow * 0.018,
      z,
      dx,
      dy,
      twist:
        Math.atan(dx) * 0.45 +
        Math.sin(b) * s.curvature * 0.48 +
        traveling * s.waveAmplitude * 0.23,
    };
  };
}
export function generateFrame(
  p: Project,
  time: number,
  width = p.composition.width,
  height = p.composition.height,
  quality: Quality = "high",
  unclipped = false,
): Frame {
  const a = p.arrows,
    c = p.composition;
  const q = quality === "draft" ? 0.66 : quality === "balanced" ? 0.85 : 1;
  const step = Math.min(width, height) / 65 / Math.max(0.3, a.density * q);
  const stepX = step * Math.max(0.5, a.spacingX),
    stepY = step * Math.max(0.4, a.spacingY);
  const cols = Math.ceil(width / stepX) + 24,
    rows = Math.ceil(height / stepY) + 24;
  const sample = surfaceSampler(p, time),
    gradient = gradientSampler(p, time),
    light = lightSampler(p, time);
  const instances: Frame["instances"] = [];
  for (let row = -12; row < rows - 12; row++)
    for (let col = -12; col < cols - 12; col++) {
      const u = ((col + 0.5 * (row % 2)) * stepX) / width,
        v = (row * stepY) / height;
      const point = sample(u, v);
      const perspective = 1 + point.z * p.surface.depth * 0.12;
      const x = ((point.x - 0.5) * c.scale + c.x + 0.5) * width;
      const y = ((point.y - 0.5) * c.scale + c.y + 0.5) * height;
      const size = step * 0.98 * a.scale * c.scale * perspective;
      if (
        !unclipped &&
        (Math.abs(x / width - 0.5 - c.x) > c.coverage * 0.5 + size / width ||
          Math.abs(y / height - 0.5 - c.y) > c.coverage * 0.5 + size / height)
      )
        continue;
      if (
        !unclipped &&
        (x < -size || x > width + size || y < -size || y > height + size)
      )
        continue;
      const color = gradient(x / width, y / height),
        brightness = light(point.dx, point.dy, point.z);
      const haze = p.lighting.enabled ? p.lighting.haze * 0.15 : 0;
      const glow = p.lighting.enabled ? p.lighting.glow * 0.08 : 0;
      instances.push({
        x,
        y,
        size,
        angle: radians(a.rotation) + (a.followSurface ? point.twist : 0),
        color: color.map((n) => clamp(n * (brightness + glow) + haze)) as [
          number,
          number,
          number,
        ],
        alpha: a.opacity,
        depth: point.z,
      });
    }
  return { instances, width, height, time };
}
