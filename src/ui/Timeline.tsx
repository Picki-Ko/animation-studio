import {
  Pause,
  Play,
  RotateCcw,
  Repeat2,
  SkipBack,
  Download,
} from "lucide-react";
import type { Project } from "../types";
export function timecode(time: number, fps = 30) {
  const seconds = Math.floor(time);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}:${String(Math.min(fps - 1, Math.floor((time - seconds) * fps))).padStart(2, "0")}`;
}
export function Timeline({
  project: p,
  time,
  playing,
  onPlay,
  onSeek,
  onLoop,
  onDuration,
  onExport,
}: {
  project: Project;
  time: number;
  playing: boolean;
  onPlay: () => void;
  onSeek: (v: number) => void;
  onLoop: () => void;
  onDuration: (n: number) => void;
  onExport: () => void;
}) {
  const percent = (time / p.motion.duration) * 100;
  return (
    <section className="timeline">
      <div className="transport">
        <div className="transport-left">
          <button
            className="icon-button"
            aria-label="Restart animation"
            title="Restart (Home)"
            onClick={() => onSeek(0)}
          >
            <SkipBack size={15} />
          </button>
          <button
            className="play-button"
            onClick={onPlay}
            aria-label={playing ? "Pause animation" : "Play animation"}
            title="Play / pause (Space)"
          >
            {playing ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
          </button>
          <button
            className={
              "icon-button loop-button " + (p.motion.loop ? "active" : "")
            }
            aria-label="Toggle seamless looping"
            aria-pressed={p.motion.loop}
            onClick={onLoop}
          >
            <Repeat2 size={16} />
          </button>
          <span className="timecode">
            {timecode(time, p.export.fps)}
            <span> / {timecode(p.motion.duration, p.export.fps)}</span>
          </span>
        </div>
        <div className="transport-right">
          <label>
            Duration{" "}
            <input
              type="number"
              aria-label="Animation duration"
              min={1}
              max={60}
              step={1}
              value={p.motion.duration}
              onChange={(e) => {
                if (e.target.valueAsNumber)
                  onDuration(Math.max(1, Math.min(60, e.target.valueAsNumber)));
              }}
            />
            <span>s</span>
          </label>
          <span className="transport-divider" />
          <span className="fps-label">{p.export.fps} FPS</span>
          <button className="timeline-export" onClick={onExport}>
            <Download size={13} />
            Export
          </button>
        </div>
      </div>
      <div className="timeline-body">
        <div className="track-labels">
          <span>TIMELINE</span>
          <span>
            <i className="track-dot teal" />
            Surface motion
          </span>
          <span>
            <i className="track-dot purple" />
            Color field
          </span>
        </div>
        <div className="tracks">
          <div className="time-ruler">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} style={{ left: `${(i / 8) * 100}%` }}>
                {((p.motion.duration * i) / 8).toFixed(
                  p.motion.duration % 8 === 0 ? 0 : 1,
                )}
                s
              </span>
            ))}
          </div>
          <div className="motion-track">
            <span className="track-clip">
              Organic undulation <span>⌁</span>
            </span>
          </div>
          <div className="color-track">
            <span className="track-clip">
              Teal → purple
              <span>
                {p.gradient.motion > 0 ? "Animated" : "Static gradient"}
              </span>
            </span>
          </div>
          <div
            className="playhead"
            style={{ left: `${Math.min(100, percent)}%` }}
          >
            <span />
          </div>
          <input
            type="range"
            className="timeline-scrubber"
            aria-label="Timeline position in seconds"
            min={0}
            max={p.motion.duration}
            step={0.001}
            value={time}
            onChange={(e) => onSeek(+e.target.value)}
          />
        </div>
      </div>
      <div className="timeline-hint">
        <span>
          <Repeat2 size={10} />
          {p.motion.loop ? "Seamless loop" : "Play once"}
        </span>
        <span>
          <kbd>SPACE</kbd> Play / pause{" "}
          <span className="hint-separator">·</span>Drag timeline to scrub
        </span>
        <button aria-label="Return to first frame" onClick={() => onSeek(0)}>
          <RotateCcw size={10} /> Return to start
        </button>
      </div>
    </section>
  );
}
