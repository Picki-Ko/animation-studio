import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Project, Stop } from "../types";
import { Slider, ColorInput } from "./Controls";
export function GradientEditor({
  gradient: g,
  onChange,
}: {
  gradient: Project["gradient"];
  onChange: (key: keyof Project["gradient"], value: unknown) => void;
}) {
  const [selected, setSelected] = useState(g.stops[0].id);
  const stop = g.stops.find((s) => s.id === selected) || g.stops[0];
  const setStop = (values: Partial<Stop>) =>
    onChange(
      "stops",
      g.stops.map((s) => (s.id === stop.id ? { ...s, ...values } : s)),
    );
  const css = `linear-gradient(90deg,${[...g.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position * 100}%`)
    .join(",")})`;
  return (
    <>
      <div className="segmented">
        <button
          className={g.type === "linear" ? "active" : ""}
          onClick={() => onChange("type", "linear")}
        >
          Linear
        </button>
        <button
          className={g.type === "radial" ? "active" : ""}
          onClick={() => onChange("type", "radial")}
        >
          Radial
        </button>
      </div>
      <div className="gradient-editor">
        <div
          className="gradient-track"
          style={{ background: css }}
          onDoubleClick={(e) => {
            if (g.stops.length >= 12) return;
            const box = e.currentTarget.getBoundingClientRect();
            const id = crypto.randomUUID();
            onChange("stops", [
              ...g.stops,
              {
                id,
                position: (e.clientX - box.left) / box.width,
                color: stop.color,
              },
            ]);
            setSelected(id);
          }}
        />
        {g.stops.map((s) => (
          <button
            key={s.id}
            aria-label={`Select color stop ${s.color} at ${Math.round(s.position * 100)}%`}
            className={"gradient-stop " + (s.id === stop.id ? "selected" : "")}
            style={{ left: `${s.position * 100}%`, background: s.color }}
            onClick={() => setSelected(s.id)}
          />
        ))}
      </div>
      <div className="stop-fields">
        <ColorInput
          label="Gradient stop"
          value={stop.color}
          onChange={(color) => setStop({ color })}
        />
        <button
          className="icon-button"
          aria-label="Add color stop"
          disabled={g.stops.length >= 12}
          onClick={() => {
            const id = crypto.randomUUID();
            onChange("stops", [
              ...g.stops,
              { id, position: 0.5, color: "#6A83B3" },
            ]);
            setSelected(id);
          }}
        >
          <Plus size={14} />
        </button>
        <button
          className="icon-button"
          aria-label="Remove color stop"
          disabled={g.stops.length <= 2}
          onClick={() =>
            onChange(
              "stops",
              g.stops.filter((s) => s.id !== stop.id),
            )
          }
        >
          <Trash2 size={13} />
        </button>
      </div>
      <Slider
        label="Stop position"
        value={stop.position * 100}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => setStop({ position: v / 100 })}
      />
      <Slider
        label="Gradient angle"
        value={g.angle}
        max={360}
        step={1}
        unit="°"
        onChange={(v) => onChange("angle", v)}
      />
      <div className="two-controls">
        <Slider
          label="Position X"
          min={-1}
          max={1}
          value={g.x}
          onChange={(v) => onChange("x", v)}
        />
        <Slider
          label="Position Y"
          min={-1}
          max={1}
          value={g.y}
          onChange={(v) => onChange("y", v)}
        />
      </div>
      <Slider
        label="Gradient scale"
        value={g.scale}
        min={0.1}
        max={3}
        onChange={(v) => onChange("scale", v)}
      />
      <Slider
        label="Spread"
        value={g.spread}
        min={0.1}
        max={2}
        onChange={(v) => onChange("spread", v)}
      />
      <Slider
        label="Transition softness"
        value={g.transition}
        max={2}
        onChange={(v) => onChange("transition", v)}
      />
      <Slider
        label="Gradient motion"
        value={g.motion}
        onChange={(v) => onChange("motion", v)}
      />
    </>
  );
}
