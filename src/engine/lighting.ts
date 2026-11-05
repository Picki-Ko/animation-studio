import type { Project } from "../types";
import { clamp, phaseAt, radians } from "./timing";
export function lightSampler(project: Project, time: number) {
  const l = project.lighting;
  const angle =
    radians(l.angle) + (project.motion.light ? phaseAt(project, time) : 0);
  const el = radians(l.elevation);
  const lx = Math.cos(angle) * Math.cos(el),
    ly = Math.sin(angle) * Math.cos(el),
    lz = Math.sin(el);
  return (dx: number, dy: number, z: number) => {
    if (!l.enabled) return 1;
    const norm = Math.hypot(dx, dy, 1),
      diffuse = clamp((-dx * lx - dy * ly + lz) / norm);
    const shade =
      l.ambient + (1 - l.ambient) * Math.pow(diffuse, 1.7 - l.softness);
    const shadow = 1 - l.shadow * (1 - shade);
    const spec = Math.pow(diffuse, 4 + (1 - l.softness) * 24) * l.specular;
    return clamp(
      (0.6 + shade * l.intensity * 0.7) * shadow + spec + z * 0.15 * l.depth,
      0.06,
      1.5,
    );
  };
}
