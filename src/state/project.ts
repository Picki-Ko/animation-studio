import type { Project } from "../types";
import { ARROW_ANGLE_LIMIT, rightFacingTilt } from "../engine/orientation";
export const DEFAULTS: Project = {
  version: 2,
  name: "Untitled exploration",
  seed: 24086,
  arrows: {
    rotation: 0,
    angleVariation: 12,
    scale: 1.04,
    spacingX: 1,
    spacingY: 0.8,
    density: 1,
    followSurface: true,
    opacity: 1,
  },
  surface: {
    wrinkle: 0.62,
    frequency: 2.4,
    size: 1.1,
    detail: 0.35,
    curvature: 0.32,
    waveAmplitude: 0.42,
    waveFrequency: 1.4,
    turbulence: 0.22,
    compression: 0.5,
    depth: 0.5,
  },
  gradient: {
    stops: [
      { id: "teal", position: 0, color: "#2D9BAD" },
      { id: "purple", position: 1, color: "#A460AD" },
    ],
    type: "linear",
    angle: 8,
    x: 0,
    y: 0,
    scale: 1,
    spread: 0.8,
    transition: 1,
    motion: 0,
  },
  motion: {
    speed: 1,
    amplitude: 0.55,
    frequency: 1,
    direction: 25,
    ripple: 0.4,
    turbulence: 0.25,
    smoothness: 0.8,
    duration: 8,
    loop: true,
    light: false,
  },
  lighting: {
    enabled: true,
    intensity: 0.8,
    angle: 310,
    elevation: 50,
    softness: 0.65,
    shadow: 0.55,
    ambient: 0.5,
    specular: 0.2,
    glow: 0.08,
    haze: 0,
    depth: 0.28,
  },
  background: {
    enabled: true,
    dataUrl: "",
    name: "",
    fit: "crop",
    scale: 1,
    x: 0,
    y: 0,
    opacity: 1,
    blur: 0,
    brightness: 1,
    tint: 0.2,
  },
  composition: {
    width: 1920,
    height: 1080,
    scale: 1,
    x: 0,
    y: 0,
    coverage: 1,
    background: "#080B0D",
    transparent: false,
  },
  export: {
    format: "svg",
    resolution: "1080p",
    fps: 30,
    includeBackground: true,
    transparent: false,
    solidColor: "#080B0D",
    svgFrames: 48,
  },
};
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
export interface Preset {
  id: string;
  name: string;
  subtitle: string;
  project: Project;
}
function preset(
  id: string,
  name: string,
  subtitle: string,
  changes: Partial<{ [K in keyof Project]: Partial<Project[K]> }>,
): Preset {
  const project = clone(DEFAULTS);
  for (const [key, value] of Object.entries(changes)) {
    if (value && typeof value === "object")
      Object.assign(project[key as keyof Project] as object, value);
    else (project as unknown as Record<string, unknown>)[key] = value;
  }
  project.name = name;
  return { id, name, subtitle, project };
}
export const PRESETS: Preset[] = [
  preset("gentle", "Gentle folds", "Soft / sculptural", {}),
  preset("deep", "Deep wrinkles", "Dense / dimensional", {
    seed: 7861,
    surface: {
      wrinkle: 1,
      frequency: 3.2,
      depth: 0.9,
      compression: 0.8,
      detail: 0.45,
    },
    lighting: { shadow: 0.8 },
  }),
  preset("rolling", "Rolling waves", "Rhythmic / fluid", {
    seed: 3281,
    surface: {
      wrinkle: 0.18,
      waveAmplitude: 0.9,
      waveFrequency: 2.1,
      curvature: 0.6,
      turbulence: 0.05,
    },
    motion: { amplitude: 0.75, ripple: 0.7 },
  }),
  preset("fabric", "Turbulent fabric", "Organic / expressive", {
    seed: 85182,
    surface: {
      wrinkle: 0.85,
      turbulence: 0.9,
      frequency: 2,
      detail: 0.7,
      depth: 0.7,
    },
    motion: { turbulence: 0.8, speed: 1.4 },
  }),
  preset("ripples", "Compressed ripples", "Fine / topographic", {
    seed: 9302,
    arrows: { density: 1.3, scale: 0.95 / 1.3 },
    surface: {
      frequency: 4.5,
      wrinkle: 0.8,
      compression: 1,
      detail: 0.2,
      waveAmplitude: 0.1,
    },
  }),
  preset("flow", "Smooth flowing field", "Calm / continuous", {
    seed: 4802,
    surface: {
      wrinkle: 0.16,
      frequency: 1.2,
      waveAmplitude: 0.35,
      turbulence: 0,
      detail: 0.05,
      curvature: 0.7,
    },
    motion: { amplitude: 0.35, ripple: 0.15 },
  }),
];
export function parseProject(input: string): Project {
  const raw = JSON.parse(input);
  if (
    !raw ||
    ![1, 2].includes(raw.version) ||
    !raw.arrows ||
    !raw.surface ||
    !raw.composition
  )
    throw new Error("Choose an Arrowfield project JSON (version 1 or 2).");
  const result = clone(DEFAULTS);
  for (const key of Object.keys(result) as (keyof Project)[]) {
    const base = result[key];
    const val = raw[key];
    if (
      typeof base === "object" &&
      val &&
      typeof val === "object" &&
      !Array.isArray(val)
    ) {
      for (const field of Object.keys(base)) {
        if (field === "stops") continue;
        const original = (base as unknown as Record<string, unknown>)[field];
        const incoming = val[field];
        if (
          typeof incoming === typeof original &&
          (typeof incoming !== "number" || Number.isFinite(incoming))
        )
          (base as unknown as Record<string, unknown>)[field] = incoming;
      }
    } else if (
      typeof val === typeof base &&
      (typeof val !== "number" || Number.isFinite(val))
    )
      (result as unknown as Record<string, unknown>)[key] = val;
  }
  const stops = raw.gradient?.stops;
  if (
    Array.isArray(stops) &&
    stops.length >= 2 &&
    stops.length <= 12 &&
    stops.every(
      (s) =>
        typeof s.position === "number" &&
        s.position >= 0 &&
        s.position <= 1 &&
        /^#[a-f\d]{6}$/i.test(s.color),
    )
  ) {
    result.gradient.stops = stops.map((s, i) => ({
      id: `stop-${i}`,
      position: s.position,
      color: s.color,
    }));
  }
  result.seed = Math.round(Math.abs(result.seed)) % 1_000_000;
  result.composition.width = Math.max(
    64,
    Math.min(7680, Math.round(result.composition.width)),
  );
  result.composition.height = Math.max(
    64,
    Math.min(7680, Math.round(result.composition.height)),
  );
  result.motion.duration = Math.max(1, Math.min(60, result.motion.duration));
  result.arrows.density = Math.max(0.3, Math.min(2, result.arrows.density));
  // v1 sized arrows relative to grid spacing. Preserve their physical size
  // while allowing density and size to be edited independently in v2.
  if (raw.version === 1) result.arrows.scale /= result.arrows.density;
  result.version = 2;
  result.arrows.scale = Math.max(0.1, Math.min(8, result.arrows.scale));
  result.arrows.rotation = rightFacingTilt(result.arrows.rotation);
  result.arrows.angleVariation = Math.max(
    0,
    Math.min(ARROW_ANGLE_LIMIT, result.arrows.angleVariation),
  );
  result.arrows.spacingX = Math.max(0.5, Math.min(2, result.arrows.spacingX));
  result.arrows.spacingY = Math.max(0.4, Math.min(2, result.arrows.spacingY));
  if (
    !["svg", "animated-svg", "mp4", "png", "sequence"].includes(
      result.export.format,
    )
  )
    result.export.format = "svg";
  if (!["1080p", "4k", "canvas"].includes(result.export.resolution))
    result.export.resolution = "1080p";
  if (![24, 30, 60].includes(result.export.fps)) result.export.fps = 30;
  if (!["linear", "radial"].includes(result.gradient.type))
    result.gradient.type = "linear";
  if (!["fit", "fill", "crop"].includes(result.background.fit))
    result.background.fit = "crop";
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(result.background.dataUrl))
    result.background.dataUrl = "";
  if (!/^#[a-f\d]{6}$/i.test(result.composition.background))
    result.composition.background = "#080B0D";
  if (!/^#[a-f\d]{6}$/i.test(result.export.solidColor))
    result.export.solidColor = "#080B0D";
  return result;
}
export function loadSaved(): Preset[] {
  try {
    return JSON.parse(localStorage.getItem("arrowfield.presets") || "[]").map(
      (s: Preset) => ({
        ...s,
        project: parseProject(JSON.stringify(s.project)),
      }),
    );
  } catch {
    return [];
  }
}
export function savePresets(presets: Preset[]) {
  localStorage.setItem("arrowfield.presets", JSON.stringify(presets));
}
