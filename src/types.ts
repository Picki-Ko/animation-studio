export interface Stop {
  id: string;
  position: number;
  color: string;
}
export interface Project {
  version: 1;
  name: string;
  seed: number;
  arrows: {
    rotation: number;
    scale: number;
    spacingX: number;
    spacingY: number;
    density: number;
    followSurface: boolean;
    opacity: number;
  };
  surface: {
    wrinkle: number;
    frequency: number;
    size: number;
    detail: number;
    curvature: number;
    waveAmplitude: number;
    waveFrequency: number;
    turbulence: number;
    compression: number;
    depth: number;
  };
  gradient: {
    stops: Stop[];
    type: "linear" | "radial";
    angle: number;
    x: number;
    y: number;
    scale: number;
    spread: number;
    transition: number;
    motion: number;
  };
  motion: {
    speed: number;
    amplitude: number;
    frequency: number;
    direction: number;
    ripple: number;
    turbulence: number;
    smoothness: number;
    duration: number;
    loop: boolean;
    light: boolean;
  };
  lighting: {
    enabled: boolean;
    intensity: number;
    angle: number;
    elevation: number;
    softness: number;
    shadow: number;
    ambient: number;
    specular: number;
    glow: number;
    haze: number;
    depth: number;
  };
  background: {
    enabled: boolean;
    dataUrl: string;
    name: string;
    fit: "fill" | "fit" | "crop";
    scale: number;
    x: number;
    y: number;
    opacity: number;
    blur: number;
    brightness: number;
    tint: number;
  };
  composition: {
    width: number;
    height: number;
    scale: number;
    x: number;
    y: number;
    coverage: number;
    background: string;
    transparent: boolean;
  };
  export: {
    format: "svg" | "animated-svg" | "mp4" | "png" | "sequence";
    resolution: "1080p" | "4k" | "canvas";
    fps: 24 | 30 | 60;
    includeBackground: boolean;
    transparent: boolean;
    solidColor: string;
    svgFrames: number;
  };
}
export type Section =
  | "arrows"
  | "surface"
  | "gradient"
  | "motion"
  | "lighting"
  | "background"
  | "composition"
  | "export";
export type Quality = "draft" | "balanced" | "high";
export interface Instance {
  x: number;
  y: number;
  size: number;
  angle: number;
  color: [number, number, number];
  alpha: number;
  depth: number;
}
export interface Frame {
  instances: Instance[];
  width: number;
  height: number;
  time: number;
}
