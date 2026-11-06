import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  X,
  Download,
  Check,
  LoaderCircle,
  ArrowUpRight,
  Film,
  FileCode2,
  Image,
  Info,
  Bookmark,
} from "lucide-react";
import type { Project } from "../types";
import type { Change } from "./Inspector";
import { Toggle, ColorInput } from "./Controls";
import { mp4Capability, exportSize } from "../export/video";
import { exportProject } from "../export";
import { clone } from "../state/project";
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    el.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const items = el.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={el}
        className={"dialog " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function SaveDialog({
  name,
  onSave,
  onClose,
}: {
  name: string;
  onSave: (s: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(name);
  return (
    <Dialog title="Save exploration" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSave(value.trim());
        }}
      >
        <p className="dialog-intro">
          Keep this composition, its seed, and every setting in your personal
          collection on this browser.
        </p>
        <label className="field-label">
          Exploration name
          <input
            className="text-field"
            autoFocus
            value={value}
            maxLength={80}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Give your flow a name"
          />
        </label>
        <button
          className="primary-button full"
          type="submit"
          disabled={!value.trim()}
        >
          <Bookmark size={15} />
          Save exploration
        </button>
      </form>
    </Dialog>
  );
}
export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="A shape. A surface. Infinite flow." onClose={onClose}>
      <p className="dialog-intro">
        Arrowfield turns the original Illustrator arrow into a flexible,
        animated surface. Start with a preset, then sculpt its folds, color, and
        light.
      </p>
      <div className="help-rows">
        <p>
          <kbd>SPACE</kbd>
          <span>Play or pause</span>
        </p>
        <p>
          <kbd>HOME</kbd>
          <span>Return to the first frame</span>
        </p>
        <p>
          <kbd>⌘ / CTRL Z</kbd>
          <span>Undo · add Shift to redo</span>
        </p>
        <p>
          <kbd>HAND TOOL</kbd>
          <span>Drag to pan the canvas</span>
        </p>
      </div>
      <p className="control-note">
        Saved explorations stay in this browser. Export project JSON from the
        Project menu to keep a portable copy, including your background image.
      </p>
      <div className="export-note">
        <Info size={15} />
        <span>
          SVG exports preserve the original polygon. Lighting is baked into
          arrow colors; optical bloom is omitted. MP4 requires a supported H.264
          WebCodecs encoder. Use PNG sequences for alpha transparency.
        </span>
      </div>
      <button className="primary-button full" onClick={onClose}>
        Start exploring
        <ArrowUpRight size={15} />
      </button>
    </Dialog>
  );
}
export function ExportDialog({
  project: p,
  time,
  change,
  onClose,
  notify,
}: {
  project: Project;
  time: number;
  change: Change;
  onClose: () => void;
  notify: (s: string) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [capability, setCapability] = useState({
      supported: false,
      reason: "Checking encoder…",
    });
  const abort = useRef<AbortController | null>(null);
  const busy = progress !== null && !done;
  const format = p.export.format;
  useEffect(() => {
    let active = true;
    mp4Capability(p).then((c) => {
      if (active) setCapability(c);
    });
    return () => {
      active = false;
    };
  }, [
    p.composition.width,
    p.composition.height,
    p.export.resolution,
    p.export.fps,
  ]);
  useEffect(() => () => abort.current?.abort(), []);
  const start = async () => {
    setError("");
    setDone(false);
    setProgress(0);
    const controller = new AbortController();
    abort.current = controller;
    try {
      await exportProject(clone(p), time, setProgress, controller.signal);
      setDone(true);
      notify("Export ready — download started");
    } catch (e) {
      setProgress(null);
      if ((e as Error).name !== "AbortError")
        setError((e as Error).message || "Export failed.");
    } finally {
      abort.current = null;
    }
  };
  const labels = {
    svg: "SVG",
    "animated-svg": "animated SVG",
    mp4: "MP4",
    png: "PNG",
    sequence: "PNG sequence",
  };
  const [w, h] = exportSize(p);
  return (
    <Dialog
      title="Export your composition"
      onClose={() => {
        abort.current?.abort();
        onClose();
      }}
      wide
    >
      <p className="dialog-intro">Made to move. Ready to take anywhere.</p>
      <div className="format-options">
        {(["svg", "mp4", "png"] as const).map((f) => (
          <button
            disabled={busy}
            key={f}
            className={
              format === f ||
              (f === "svg" && format === "animated-svg") ||
              (f === "png" && format === "sequence")
                ? "active"
                : ""
            }
            onClick={() => {
              change("export", "format", f);
              setError("");
              setDone(false);
              setProgress(null);
            }}
          >
            {f === "svg" ? (
              <FileCode2 size={19} />
            ) : f === "mp4" ? (
              <Film size={19} />
            ) : (
              <Image size={19} />
            )}
            <strong>{f.toUpperCase()}</strong>
            <small>
              {f === "svg"
                ? "True vector"
                : f === "mp4"
                  ? "H.264 video"
                  : "Image / sequence"}
            </small>
          </button>
        ))}
      </div>
      <fieldset disabled={busy} className="export-fields">
        {format === "svg" || format === "animated-svg" ? (
          <>
            <label className="field-label">
              Vector output
              <select
                value={format}
                onChange={(e) => change("export", "format", e.target.value)}
              >
                <option value="svg">Static SVG · current frame</option>
                <option value="animated-svg">
                  Animated SVG · full timeline
                </option>
              </select>
            </label>
            {format === "animated-svg" && (
              <label className="field-label">
                Animation samples
                <select
                  value={p.export.svgFrames}
                  onChange={(e) =>
                    change("export", "svgFrames", +e.target.value)
                  }
                >
                  <option value={24}>24 samples · smaller file</option>
                  <option value={48}>48 samples · balanced</option>
                  <option value={96}>96 samples · smoother motion</option>
                </select>
              </label>
            )}
          </>
        ) : (
          <>
            <label className="field-label">
              Resolution
              <select
                value={p.export.resolution}
                onChange={(e) => change("export", "resolution", e.target.value)}
              >
                <option value="1080p">
                  1080p ·{" "}
                  {p.composition.width >= p.composition.height
                    ? "Full HD"
                    : "portrait / square"}
                </option>
                <option value="4k">4K · device support required</option>
                <option value="canvas">
                  Canvas size · {p.composition.width} × {p.composition.height}
                </option>
              </select>
            </label>
            {format !== "png" && (
              <div className="export-row">
                <label className="field-label">
                  Frame rate
                  <select
                    value={p.export.fps}
                    onChange={(e) => change("export", "fps", +e.target.value)}
                  >
                    {[24, 30, 60].map((f) => (
                      <option value={f} key={f}>
                        {f} fps
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Duration
                  <div className="input-suffix">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={p.motion.duration}
                      onChange={(e) => {
                        if (e.target.valueAsNumber)
                          change(
                            "motion",
                            "duration",
                            Math.max(1, Math.min(60, e.target.valueAsNumber)),
                          );
                      }}
                    />
                    <span>seconds</span>
                  </div>
                </label>
              </div>
            )}
            {(format === "png" || format === "sequence") && (
              <Toggle
                label="Export full PNG sequence (.zip)"
                value={format === "sequence"}
                onChange={(v) =>
                  change("export", "format", v ? "sequence" : "png")
                }
              />
            )}
          </>
        )}
        <Toggle
          label="Include background image"
          value={p.export.includeBackground}
          onChange={(v) => change("export", "includeBackground", v)}
        />
        {format === "mp4" ? (
          <div className="background-color-row">
            <span>MP4 solid background</span>
            <ColorInput
              label="MP4 background"
              value={p.export.solidColor}
              onChange={(v) => change("export", "solidColor", v)}
            />
          </div>
        ) : (
          <Toggle
            label="Transparent background"
            value={p.export.transparent}
            onChange={(v) => change("export", "transparent", v)}
          />
        )}
      </fieldset>
      <div className="export-note">
        <Info size={15} />
        <span>
          {format === "mp4"
            ? `${capability.reason} Ordinary H.264 uses a solid background; choose PNG sequence for transparency.`
            : format === "svg" || format === "animated-svg"
              ? "Original vector geometry, clipped to canvas. Surface lighting is baked into colors; bloom is omitted. Animated SVG uses declarative SMIL; playback support varies by viewer."
              : "Full-quality timeline rendering. PNG sequences preserve alpha and render each frame at its exact timestamp."}
        </span>
      </div>
      <div className="export-summary">
        <span>
          {format === "svg" || format === "animated-svg"
            ? `${p.composition.width} × ${p.composition.height}`
            : `${w} × ${h}`}
          <i />
          Seed {p.seed}
        </span>
        <span>
          {format === "svg" || format === "png"
            ? `Frame ${time.toFixed(2)}s`
            : `${p.motion.duration}s ${p.motion.loop ? "loop" : ""}`}
        </span>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {progress !== null && (
        <div className="export-progress">
          <div>
            <span>
              {done ? "Ready to use" : `Rendering ${labels[format]}…`}
            </span>
            <strong>{Math.round(progress * 100)}%</strong>
          </div>
          <progress max={1} value={progress} />
        </div>
      )}
      <div className="export-actions">
        {busy ? (
          <button
            className="secondary-button"
            onClick={() => abort.current?.abort()}
          >
            Cancel export
          </button>
        ) : (
          <button className="secondary-button" onClick={onClose}>
            Close
          </button>
        )}
        <button
          className="primary-button"
          disabled={busy || (format === "mp4" && !capability.supported)}
          onClick={start}
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : done ? (
            <Check size={16} />
          ) : (
            <Download size={16} />
          )}{" "}
          {busy
            ? "Rendering…"
            : done
              ? "Export again"
              : `Export ${labels[format]}`}
        </button>
      </div>
    </Dialog>
  );
}
