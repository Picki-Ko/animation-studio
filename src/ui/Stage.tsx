import { memo, useEffect, useRef, useState } from "react";
import { Minus, Plus, Maximize, Hand, Scan, ChevronDown } from "lucide-react";
import type { Project, Quality } from "../types";
import { Renderer } from "../engine/renderer";
export const Stage = memo(function Stage({
  project,
  playing,
  seek,
  onTime,
  onEnd,
  onStats,
  quality,
  setQuality,
}: {
  project: Project;
  playing: boolean;
  seek: { time: number; id: number };
  onTime: (t: number) => void;
  onEnd: () => void;
  onStats: (n: number, mode: string) => void;
  quality: Quality;
  setQuality: (v: Quality) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    renderer = useRef<Renderer | null>(null);
  const pRef = useRef(project),
    playRef = useRef(playing),
    timeRef = useRef(seek.time),
    qRef = useRef(quality);
  const callbacks = useRef({ onTime, onEnd, onStats });
  callbacks.current = { onTime, onEnd, onStats };
  pRef.current = project;
  playRef.current = playing;
  qRef.current = quality;
  const [bounds, setBounds] = useState({ width: 800, height: 500 }),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [hand, setHand] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
      null,
    ),
    dirty = useRef(true);
  const aspect = project.composition.width / project.composition.height;
  const fitW = Math.max(
    80,
    Math.min(bounds.width - 72, (bounds.height - 114) * aspect),
  );
  const fitH = fitW / aspect;
  const sizeRef = useRef({ w: 960, h: 540 });
  sizeRef.current = {
    w: Math.round(fitW * Math.min(devicePixelRatio || 1, 1.5)),
    h: Math.round(fitH * Math.min(devicePixelRatio || 1, 1.5)),
  };
  useEffect(() => {
    timeRef.current = seek.time;
    dirty.current = true;
  }, [seek]);
  useEffect(() => {
    dirty.current = true;
    renderer.current
      ?.prepare(project)
      .then(() => {
        dirty.current = true;
      })
      .catch(() => {});
  }, [project, quality, bounds]);
  useEffect(() => {
    const el = viewport.current!;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBounds({ width: r.width, height: r.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const r = new Renderer(canvas.current!);
    renderer.current = r;
    r.prepare(pRef.current).then(() => {
      dirty.current = true;
    });
    let raf = 0,
      last = performance.now(),
      report = 0,
      lastDraw = 0;
    const loop = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      const p = pRef.current;
      if (playRef.current) {
        timeRef.current += delta;
        if (timeRef.current >= p.motion.duration) {
          if (p.motion.loop) timeRef.current %= p.motion.duration;
          else {
            timeRef.current = p.motion.duration;
            callbacks.current.onEnd();
          }
        }
        dirty.current = true;
      }
      if (dirty.current && now - lastDraw > 1000 / 30) {
        const s = sizeRef.current;
        const frame = r.render(p, timeRef.current, s.w, s.h, {
          quality: qRef.current,
        });
        lastDraw = now;
        dirty.current = false;
        if (now - report > 100) {
          callbacks.current.onTime(timeRef.current);
          report = now;
          callbacks.current.onStats(frame.instances.length, r.mode);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      r.dispose();
      renderer.current = null;
    };
  }, []);
  return (
    <section className="preview-area">
      <div className="preview-heading">
        <div>
          <span className="tiny-label">COMPOSITION 01</span>
          <span className="composition-name">{project.name}</span>
        </div>
        <div className="preview-heading-right">
          <span className="live-tag">
            <span className="status-dot" />
            {playing ? "LIVE" : "PAUSED"}
          </span>
          <span>
            {project.composition.width} × {project.composition.height}
          </span>
        </div>
      </div>
      <div
        className={"viewport " + (hand ? "hand-tool" : "")}
        ref={viewport}
        onPointerDown={(e) => {
          if (hand || e.button === 1) {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          }
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d)
            setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey)
            setZoom((z) => Math.max(0.25, Math.min(3, z - e.deltaY * 0.002)));
        }}
      >
        <div
          className={
            "artboard " +
            (project.composition.transparent ? "checkerboard" : "")
          }
          style={{
            width: fitW,
            height: fitH,
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          }}
        >
          <canvas
            ref={canvas}
            aria-label="Live procedural arrow texture preview"
          />
          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />
        </div>
        <div className="viewport-tools">
          <button
            className={"icon-button " + (hand ? "active" : "")}
            aria-label="Pan canvas"
            title="Pan canvas"
            onClick={() => setHand(!hand)}
          >
            <Hand size={15} />
          </button>
          <i />
          <button
            className="icon-button"
            aria-label="Zoom out"
            onClick={() => setZoom((v) => Math.max(0.25, v - 0.1))}
          >
            <Minus size={14} />
          </button>
          <button
            className="zoom-label"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset view"
          >
            {Math.round(zoom * 100)}% <ChevronDown size={10} />
          </button>
          <button
            className="icon-button"
            aria-label="Zoom in"
            onClick={() => setZoom((v) => Math.min(3, v + 0.1))}
          >
            <Plus size={14} />
          </button>
          <i />
          <button
            className="icon-button"
            aria-label="Fit canvas"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Scan size={15} />
          </button>
          <button
            className="icon-button"
            aria-label="Toggle fullscreen preview"
            disabled={!document.documentElement.requestFullscreen}
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              else viewport.current?.requestFullscreen?.();
            }}
          >
            <Maximize size={14} />
          </button>
        </div>
        <label className="quality-select">
          <span className="status-dot" />
          <select
            aria-label="Preview quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as Quality)}
          >
            <option value="draft">Draft preview</option>
            <option value="balanced">Balanced preview</option>
            <option value="high">High quality</option>
          </select>
        </label>
      </div>
    </section>
  );
});
