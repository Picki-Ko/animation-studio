import type { Project } from "../types";
import { clamp, radians } from "./timing";

export const ARROW_ANGLE_LIMIT = 30;

export function rightFacingTilt(degrees: number): number {
  // Older projects stored directions from 0–360°. Keep small clockwise and
  // counterclockwise tilts when migrating to the right-facing angle range.
  const signed = ((((degrees + 180) % 360) + 360) % 360) - 180;
  return clamp(signed, -ARROW_ANGLE_LIMIT, ARROW_ANGLE_LIMIT);
}

export function arrowAngle(
  arrows: Project["arrows"],
  surfaceTwist: number,
): number {
  const base = rightFacingTilt(arrows.rotation);
  if (!arrows.followSurface) return radians(base);
  const variation = Math.min(
    clamp(arrows.angleVariation, 0, ARROW_ANGLE_LIMIT),
    ARROW_ANGLE_LIMIT - Math.abs(base),
  );
  // A smooth bound keeps temporal motion continuous, even in extreme folds.
  return radians(base + variation * Math.tanh(surfaceTwist / 0.45));
}
