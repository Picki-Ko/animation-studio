import type { Project } from "../types";
export const TAU = Math.PI * 2;
export const radians = (deg: number) => (deg * Math.PI) / 180;
export const clamp = (n: number, low = 0, high = 1) =>
  Math.min(high, Math.max(low, n));
export function phaseAt(project: Project, seconds: number) {
  return (TAU * seconds) / project.motion.duration;
}
