import { memo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Waves,
  Palette,
  Sun,
  Wind,
  ImagePlus,
  Upload,
  X,
} from "lucide-react";
import type { Project, Section } from "../types";
import { Slider, Toggle, Group } from "./Controls";
import { GradientEditor } from "./GradientEditor";
import { ARROW_ANGLE_LIMIT } from "../engine/orientation";
export type Change = (
  section: Section | "seed",
  key: string,
  value: unknown,
) => void;
export const Inspector = memo(function Inspector({
  project: p,
  change,
  onImage,
  notify,
}: {
  project: Project;
  change: Change;
  onImage: (file: File) => void;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState("design");
  const upload = useRef<HTMLInputElement>(null);
  const slider = (
    section: Section,
    key: string,
    label: string,
    min = 0,
    max = 1,
    step = 0.01,
    unit = "",
  ) => (
    <Slider
      key={key}
      label={label}
      value={(p[section] as unknown as Record<string, number>)[key]}
      min={min}
      max={max}
      step={step}
      unit={unit}
      onChange={(v) => change(section, key, v)}
    />
  );
  return (
    <aside className="inspector">
      <div className="panel-title">
        <span>Properties</span>
        <span className="tiny-label">LIVE EDIT</span>
      </div>
      <div className="inspector-tabs">
        {["design", "motion", "scene"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="inspector-scroll">
        {tab === "design" && (
          <>
            <Group
              title="Arrow controls"
              icon={<ArrowUpRight size={15} />}
              badge="SVG"
              initial
            >
              {slider("arrows", "scale", "Arrow size", 0.1, 8, 0.01, "×")}
              {slider("arrows", "density", "Arrow density", 0.3, 2, 0.01, "×")}
              {slider(
                "arrows",
                "angleVariation",
                "Angle variation",
                0,
                ARROW_ANGLE_LIMIT,
                1,
                "°",
              )}
              <p className="control-note">
                Size and density are independent. Arrows gently follow folds and
                stay within 30° of right.
              </p>
              {slider(
                "arrows",
                "rotation",
                "Base tilt",
                -ARROW_ANGLE_LIMIT,
                ARROW_ANGLE_LIMIT,
                1,
                "°",
              )}
              <Toggle
                label="Follow surface direction"
                value={p.arrows.followSurface}
                onChange={(v) => change("arrows", "followSurface", v)}
              />
              <div className="source-shape">
                <img src="./arrow.svg" alt="Original brand arrow silhouette" />
                <div>
                  Original vector<small>1379.91 × 1080 · preserved</small>
                </div>
                <span className="status-dot" />
              </div>
              <div className="two-controls">
                {slider("arrows", "spacingX", "Spacing X", 0.5, 2)}
                {slider("arrows", "spacingY", "Spacing Y", 0.4, 2)}
              </div>
              {slider("arrows", "opacity", "Texture opacity")}
            </Group>
            <Group
              title="Surface deformation"
              icon={<Waves size={15} />}
              initial
            >
              {slider("surface", "wrinkle", "Wrinkle intensity")}
              {slider("surface", "frequency", "Wrinkle frequency", 0.4, 6)}
              <div className="two-controls">
                {slider("surface", "size", "Fold size", 0.3, 2.5)}
                {slider("surface", "detail", "Detail")}
              </div>
              {slider("surface", "curvature", "Surface curvature")}
              {slider("surface", "waveAmplitude", "Wave amplitude")}
              {slider("surface", "waveFrequency", "Wave frequency", 0.2, 5)}
              {slider("surface", "turbulence", "Turbulence")}
              {slider("surface", "compression", "Compression")}
              {slider("surface", "depth", "Depth & perspective")}
            </Group>
            <Group
              title="Color & gradient"
              icon={<Palette size={15} />}
              initial
            >
              <GradientEditor
                gradient={p.gradient}
                onChange={(k, v) => change("gradient", k, v)}
              />
            </Group>
            <Group title="Light & atmosphere" icon={<Sun size={15} />}>
              <Toggle
                label="Enable lighting"
                value={p.lighting.enabled}
                onChange={(v) => change("lighting", "enabled", v)}
              />
              {slider("lighting", "intensity", "Light intensity", 0, 2)}
              {slider("lighting", "angle", "Light angle", 0, 360, 1, "°")}
              {slider(
                "lighting",
                "elevation",
                "Light elevation",
                5,
                90,
                1,
                "°",
              )}
              {slider("lighting", "softness", "Highlight softness")}
              {slider("lighting", "specular", "Specular highlights")}
              {slider("lighting", "shadow", "Shadow intensity")}
              {slider("lighting", "ambient", "Ambient light")}
              {slider("lighting", "depth", "Depth shading")}
              {slider("lighting", "glow", "Glow & bloom")}
              {slider("lighting", "haze", "Atmospheric haze")}
              <Toggle
                label="Animate light position"
                value={p.motion.light}
                onChange={(v) => change("motion", "light", v)}
              />
            </Group>
          </>
        )}
        {tab === "motion" && (
          <>
            <Group title="Surface motion" icon={<Wind size={15} />} initial>
              {slider("motion", "speed", "Animation speed", 0, 3, 0.05, "×")}
              {slider("motion", "amplitude", "Undulation amplitude")}
              {slider("motion", "frequency", "Wave frequency", 1, 4, 1)}
              {slider(
                "motion",
                "direction",
                "Ripple direction",
                0,
                360,
                1,
                "°",
              )}
              {slider("motion", "ripple", "Ripple strength")}
              {slider("motion", "turbulence", "Temporal turbulence")}
              {slider("motion", "smoothness", "Motion smoothness")}
              {slider("motion", "duration", "Loop duration", 1, 60, 1, "s")}
              <Toggle
                label="Seamless looping"
                value={p.motion.loop}
                onChange={(v) => change("motion", "loop", v)}
              />
              <p className="control-note">
                Every frame is a function of time and seed. Looping motion joins
                exactly at the boundary.
              </p>
            </Group>
            <Group
              title="Moving color & light"
              icon={<Sun size={15} />}
              initial
            >
              {slider("gradient", "motion", "Gradient movement")}
              <Toggle
                label="Animate light position"
                value={p.motion.light}
                onChange={(v) => change("motion", "light", v)}
              />
            </Group>
          </>
        )}
        {tab === "scene" && (
          <>
            <Group
              title="Background image"
              icon={<ImagePlus size={15} />}
              initial
            >
              <input
                ref={upload}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImage(file);
                  e.target.value = "";
                }}
              />
              {p.background.dataUrl ? (
                <div className="uploaded-image">
                  <img src={p.background.dataUrl} alt="Background preview" />
                  <span>{p.background.name}</span>
                  <button
                    className="icon-button"
                    aria-label="Remove background image"
                    onClick={() => {
                      change("background", "dataUrl", "");
                      change("background", "name", "");
                      notify("Background removed");
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  className="upload-zone"
                  onClick={() => upload.current?.click()}
                >
                  <Upload size={20} />
                  <span>Add a background image</span>
                  <small>JPG, PNG or WebP · up to 12 MB</small>
                </button>
              )}
              {p.background.dataUrl && (
                <button
                  className="text-button"
                  onClick={() => upload.current?.click()}
                >
                  Replace image
                </button>
              )}
              <Toggle
                label="Show background image"
                value={p.background.enabled}
                onChange={(v) => change("background", "enabled", v)}
              />
              <div className="segmented">
                {(["fit", "fill", "crop"] as const).map((f) => (
                  <button
                    key={f}
                    className={p.background.fit === f ? "active" : ""}
                    onClick={() => change("background", "fit", f)}
                  >
                    {f[0].toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              {slider("background", "scale", "Image scale", 0.1, 3)}
              <div className="two-controls">
                {slider("background", "x", "Position X", -1, 1)}
                {slider("background", "y", "Position Y", -1, 1)}
              </div>
              {slider("background", "opacity", "Image opacity")}
              {slider("background", "blur", "Image blur", 0, 40, 1, "px")}
              {slider("background", "brightness", "Brightness", 0, 2)}
              {slider("background", "tint", "Darkness / tint")}
            </Group>
            <Group title="Texture layer" icon={<Waves size={15} />} initial>
              {slider("arrows", "opacity", "Texture opacity")}
              {slider("composition", "scale", "Texture scale", 0.3, 2)}
              {slider("composition", "coverage", "Visible coverage", 0.1, 1)}
              <div className="two-controls">
                {slider("composition", "x", "Position X", -0.75, 0.75)}
                {slider("composition", "y", "Position Y", -0.75, 0.75)}
              </div>
            </Group>
          </>
        )}
      </div>
      <div className="inspector-foot">
        <span className="status-dot" /> All changes update in real time
      </div>
    </aside>
  );
});
