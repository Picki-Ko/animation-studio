import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
export function NumericInput({
  value,
  onValue,
  min,
  max,
  step = 1,
  ariaLabel,
  id,
}: {
  value: number;
  onValue: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState(String(Number(value.toFixed(3))));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(Number(value.toFixed(3))));
  }, [value]);
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = e.target.valueAsNumber;
        if (Number.isFinite(n) && n >= min && n <= max) onValue(n);
      }}
      onBlur={() => {
        focused.current = false;
        const raw = Number(draft),
          n =
            draft.trim() && Number.isFinite(raw)
              ? Math.max(min, Math.min(max, raw))
              : value;
        onValue(n);
        setDraft(String(Number(n.toFixed(3))));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
    />
  );
}
export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="control">
      <div className="control-label">
        <label htmlFor={id}>{label}</label>
        <span className="number-wrap">
          <NumericInput
            ariaLabel={`${label} value`}
            value={value}
            min={min}
            max={max}
            step={step}
            onValue={onChange}
          />
          {unit && <span>{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--fill": `${percent}%` } as React.CSSProperties}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  );
}
export function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input
        className="toggle-input"
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
export function Group({
  title,
  icon,
  children,
  initial = false,
  badge,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  initial?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(initial);
  const id = useId();
  return (
    <section className={"property-group " + (open ? "is-open" : "")}>
      <button
        className="group-heading"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
      >
        <span>
          {icon}
          {title}
        </span>
        <span>
          {badge && <small>{badge}</small>}
          <ChevronDown size={14} className={open ? "rotated" : ""} />
        </span>
      </button>
      {open && (
        <div className="group-content" id={id}>
          {children}
        </div>
      )}
    </section>
  );
}
export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="color-input">
      <span className="swatch" style={{ background: value }}>
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      <input
        key={value}
        aria-label={`${label} HEX`}
        defaultValue={value.toUpperCase()}
        maxLength={7}
        onBlur={(e) => {
          const draft = e.currentTarget.value;
          if (/^#[a-f\d]{6}$/i.test(draft)) onChange(draft);
          else e.currentTarget.value = value.toUpperCase();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
