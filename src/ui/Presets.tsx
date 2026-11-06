import { memo, useEffect, useRef } from "react";
import { Bookmark, Plus, Shuffle, RotateCcw, Trash2 } from "lucide-react";
import type { Project } from "../types";
import { PRESETS, type Preset } from "../state/project";
import { Renderer } from "../engine/renderer";
import { Slider, Toggle, ColorInput, NumericInput } from "./Controls";
import type { Change } from "./Inspector";
const Thumbnail = memo(function Thumbnail({ project }: { project: Project }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const r = new Renderer(canvas.current!);
    r.render(project, 0, 240, 145, { quality: "high" });
    r.dispose();
  }, [project]);
  return <canvas ref={canvas} aria-hidden="true" />;
});
export const Presets = memo(function Presets({
  project: p,
  active,
  onPreset,
  onRandomize,
  change,
  saved,
  onSave,
  onDelete,
  onReset,
}: {
  project: Project;
  active: string;
  onPreset: (p: Preset) => void;
  onRandomize: () => void;
  change: Change;
  saved: Preset[];
  onSave: () => void;
  onDelete: (id: string) => void;
  onReset: () => void;
}) {
  const ratio = p.composition.width / p.composition.height;
  const ratios = [
    ["16:9", 1920, 1080],
    ["1:1", 1080, 1080],
    ["4:5", 1080, 1350],
    ["9:16", 1080, 1920],
  ] as const;
  return (
    <aside className="left-panel">
      <div className="left-scroll">
        <div className="panel-title">
          <span>Presets</span>
          <span className="count-label">06</span>
        </div>
        <p className="panel-description">
          A starting point for your next flow.
        </p>
        <div className="preset-grid">
          {PRESETS.map((preset, i) => (
            <button
              key={preset.id}
              className={
                "preset-card " + (active === preset.id ? "selected" : "")
              }
              onClick={() => onPreset(preset)}
            >
              <div className="preset-art">
                <Thumbnail project={preset.project} />
                <span className="preset-index">0{i + 1}</span>
                {active === preset.id && (
                  <span className="preset-check">✓</span>
                )}
              </div>
              <span className="preset-name">{preset.name}</span>
              <small>{preset.subtitle}</small>
            </button>
          ))}
        </div>
        <button className="randomize-button" onClick={onRandomize}>
          <Shuffle size={14} /> Randomize texture <span>↗</span>
        </button>
        <div className="seed-row">
          <label htmlFor="seed">RANDOM SEED</label>
          <NumericInput
            id="seed"
            value={p.seed}
            min={0}
            max={999999}
            onValue={(n) => change("seed", "", Math.round(n))}
          />
          <button
            className="icon-button"
            aria-label="Restore default seed"
            onClick={() => change("seed", "", 24086)}
          >
            <RotateCcw size={12} />
          </button>
        </div>
        <div className="left-divider" />
        <div className="subsection-title">
          <span>Composition</span>
          <span className="tiny-label">CANVAS</span>
        </div>
        <div className="aspect-options">
          {ratios.map(([name, w, h]) => (
            <button
              key={name}
              className={Math.abs(ratio - w / h) < 0.01 ? "active" : ""}
              onClick={() => {
                change("composition", "width", w);
                change("composition", "height", h);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="dimensions">
          <label>
            W
            <NumericInput
              ariaLabel="Canvas width"
              min={64}
              max={7680}
              value={p.composition.width}
              onValue={(n) => change("composition", "width", Math.round(n))}
            />
          </label>
          <span>×</span>
          <label>
            H
            <NumericInput
              ariaLabel="Canvas height"
              min={64}
              max={7680}
              value={p.composition.height}
              onValue={(n) => change("composition", "height", Math.round(n))}
            />
          </label>
          <span>px</span>
        </div>
        <Slider
          label="Texture coverage"
          value={p.composition.coverage}
          min={0.1}
          max={1}
          onChange={(v) => change("composition", "coverage", v)}
        />
        <div className="background-color-row">
          <span>Background</span>
          <ColorInput
            label="Background color"
            value={p.composition.background}
            onChange={(v) => change("composition", "background", v)}
          />
        </div>
        <Toggle
          label="Transparent preview"
          value={p.composition.transparent}
          onChange={(v) => change("composition", "transparent", v)}
        />
        <div className="left-divider" />
        <div className="subsection-title">
          <span>
            <Bookmark size={13} /> Saved explorations
          </span>
          <button
            className="icon-button"
            aria-label="Save exploration"
            onClick={onSave}
          >
            <Plus size={14} />
          </button>
        </div>
        {saved.length ? (
          saved.map((s) => (
            <div className="saved-row" key={s.id}>
              <button onClick={() => onPreset(s)}>
                <span
                  style={{ background: s.project.gradient.stops[0].color }}
                />
                {s.name}
              </button>
              <button
                className="icon-button"
                aria-label={`Delete preset ${s.name}`}
                onClick={() => onDelete(s.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        ) : (
          <button className="empty-presets" onClick={onSave}>
            Find a flow you love.
            <br />
            <span>Save it here for later.</span>
          </button>
        )}
        <button className="reset-button" onClick={onReset}>
          <RotateCcw size={12} />
          Reset all controls
        </button>
      </div>
      <div className="brand-foot">
        <img src="./arrow.svg" alt="" />
        <div>
          Your shape, in motion.<small>PROCEDURAL BY NATURE</small>
        </div>
      </div>
    </aside>
  );
});
