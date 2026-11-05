import type { Project } from "../types";
import { clamp, radians, phaseAt } from "./timing";
export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export function rgbHex(color: number[]) {
  return (
    "#" +
    color
      .map((n) =>
        Math.round(clamp(n) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function gradientSampler(project: Project, time: number) {
  const g = project.gradient;
  const stops = [...g.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ ...s, rgb: hexRgb(s.color) }));
  const angle = radians(g.angle),
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  const movement = g.motion * Math.sin(phaseAt(project, time));
  return (x: number, y: number): [number, number, number] => {
    const px = (x - 0.5 - g.x) * 2,
      py = (y - 0.5 - g.y) * 2;
    let t =
      g.type === "linear"
        ? 0.5 + (px * cos + py * sin) / 2 / Math.max(0.1, g.scale) + movement
        : Math.hypot(px, py) / Math.max(0.1, g.scale) + movement;
    t = clamp((t - 0.5) / Math.max(0.1, g.spread) + 0.5);
    let a = stops[0],
      b = stops[stops.length - 1];
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i].position) {
        a = stops[i - 1];
        b = stops[i];
        break;
      }
    }
    let mix = clamp(
      (t - a.position) / Math.max(0.00001, b.position - a.position),
    );
    const smooth = mix * mix * (3 - 2 * mix);
    mix = mix + (smooth - mix) * clamp(g.transition - 1, -1, 1);
    return a.rgb.map((v, i) => v + (b.rgb[i] - v) * mix) as [
      number,
      number,
      number,
    ];
  };
}
