import { useState, useRef, useEffect, useCallback } from "react";
import {
  Undo2,
  Redo2,
  ChevronDown,
  Download,
  Bookmark,
  Upload,
  FileJson,
  HelpCircle,
  Check,
  X,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import type { Project, Quality } from "./types";
import {
  DEFAULTS,
  PRESETS,
  clone,
  loadSaved,
  savePresets,
  parseProject,
  type Preset,
} from "./state/project";
import { Stage } from "./ui/Stage";
import { Presets } from "./ui/Presets";
import { Inspector, type Change } from "./ui/Inspector";
import { Timeline } from "./ui/Timeline";
import { ExportDialog, SaveDialog, HelpDialog } from "./ui/Dialogs";
import { download, safeName } from "./export/files";
function initialProject() {
  try {
    const raw = localStorage.getItem("arrowfield.autosave");
    return raw ? parseProject(raw) : clone(PRESETS[0].project);
  } catch {
    return clone(PRESETS[0].project);
  }
}
export default function App() {
  const standalone = Boolean(
    document.querySelector('meta[name="arrowfield-standalone"]'),
  );
  const [project, setProject] = useState(initialProject),
    pRef = useRef(project);
  pRef.current = project;
  const [saved, setSaved] = useState(loadSaved),
    [active, setActive] = useState("gentle"),
    [playing, setPlaying] = useState(
      () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [time, setTime] = useState(0),
    [seek, setSeek] = useState({ time: 0, id: 0 }),
    [quality, setQuality] = useState<Quality>("high");
  const [dialog, setDialog] = useState<"export" | "save" | "help" | null>(null),
    [projectMenu, setProjectMenu] = useState(false),
    [toast, setToast] = useState(""),
    [stats, setStats] = useState({ count: 0, mode: "WebGL 2" }),
    [autosave, setAutosave] = useState("All changes saved");
  const history = useRef<{
      past: Project[];
      future: Project[];
      last: number;
      key: string;
    }>({ past: [], future: [], last: 0, key: "" }),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    importInput = useRef<HTMLInputElement>(null),
    menuRef = useRef<HTMLDivElement>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }, []);
  const commit = useCallback(
    (transform: (p: Project) => Project, key = "action") => {
      const old = pRef.current,
        next = transform(old);
      const h = history.current,
        now = Date.now();
      if (now - h.last > 400 || h.key !== key) {
        h.past.push(old);
        if (h.past.length > 40) h.past.shift();
      }
      h.future = [];
      h.last = now;
      h.key = key;
      pRef.current = next;
      setProject(next);
      setAutosave("Saving…");
    },
    [],
  );
  const change = useCallback<Change>(
    (section, key, value) => {
      if (section === "seed")
        commit((p) => ({ ...p, seed: value as number }), "seed");
      else
        commit(
          (p) => ({
            ...p,
            [section]: { ...(p[section] as object), [key]: value },
          }),
          section + "." + key,
        );
    },
    [commit],
  );
  const undo = useCallback(() => {
    const h = history.current;
    if (!h.past.length) return;
    h.future.push(pRef.current);
    const p = h.past.pop()!;
    h.last = 0;
    pRef.current = p;
    setProject(p);
  }, []);
  const redo = useCallback(() => {
    const h = history.current;
    if (!h.future.length) return;
    h.past.push(pRef.current);
    const p = h.future.pop()!;
    h.last = 0;
    pRef.current = p;
    setProject(p);
  }, []);
  const goTo = useCallback((t: number) => {
    setTime(t);
    setSeek((s) => ({ time: t, id: s.id + 1 }));
  }, []);
  const onPreset = useCallback(
    (preset: Preset) => {
      commit(() => clone(preset.project));
      setActive(preset.id);
      goTo(0);
    },
    [commit, goTo],
  );
  const randomize = useCallback(() => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    commit((p) => ({ ...p, seed }));
    notify(`New composition · seed ${seed}`);
  }, [commit, notify]);
  const reset = useCallback(() => {
    commit(() => clone(DEFAULTS));
    setActive("gentle");
    goTo(0);
    notify("Controls reset");
  }, [commit, goTo, notify]);
  const onImage = useCallback(
    async (file: File) => {
      try {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
          throw new Error("Choose a JPG, PNG or WebP image.");
        if (file.size > 12_000_000)
          throw new Error("Choose an image smaller than 12 MB.");
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () =>
            reject(new Error("Could not read this image."));
          reader.readAsDataURL(file);
        });
        const image = new Image();
        image.src = dataUrl;
        await image.decode();
        if (image.naturalWidth > 12000 || image.naturalHeight > 12000)
          throw new Error(
            "Use an image no larger than 12,000 pixels per side.",
          );
        commit((p) => ({
          ...p,
          background: {
            ...p.background,
            dataUrl,
            name: file.name,
            enabled: true,
          },
        }));
        notify("Background added");
      } catch (e) {
        notify((e as Error).message);
      }
    },
    [commit, notify],
  );
  const importFile = async (file: File) => {
    try {
      if (file.size > 20_000_000)
        throw new Error("Project files must be smaller than 20 MB.");
      const parsed = parseProject(await file.text());
      commit(() => parsed);
      setActive("");
      goTo(0);
      notify("Project imported");
    } catch (e) {
      notify((e as Error).message);
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("arrowfield.autosave", JSON.stringify(project));
        setAutosave("All changes saved");
      } catch {
        setAutosave("Export JSON to save this project");
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [project]);
  useEffect(() => {
    if (time > project.motion.duration) goTo(project.motion.duration);
  }, [project.motion.duration, goTo, time]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        dialog ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        ) ||
        (e.target as HTMLElement).isContentEditable
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((v) => !v);
      }
      if (e.code === "Home") {
        e.preventDefault();
        goTo(0);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [dialog, goTo, redo, undo]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setProjectMenu(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const save = (name: string) => {
    const item: Preset = {
      id: crypto.randomUUID(),
      name,
      subtitle: "Saved exploration",
      project: { ...clone(pRef.current), name },
    };
    const next = [item, ...saved];
    try {
      savePresets(next);
      setSaved(next);
      setDialog(null);
      commit((p) => ({ ...p, name }));
      notify("Exploration saved");
    } catch {
      notify("Browser storage is full. Export your project as JSON instead.");
    }
  };
  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          className="wordmark"
          href={standalone ? "#" : "./"}
          aria-label="Arrowfield studio home"
        >
          <img src="./arrow.svg" alt="" />
          <span>
            arrowfield<span className="wordmark-dot">®</span>
          </span>
          <span className="studio-badge">
            {standalone ? "OFFLINE" : "STUDIO"}
          </span>
        </a>
        <div className="project-name">
          <input
            aria-label="Project name"
            value={project.name}
            maxLength={80}
            onChange={(e) =>
              commit((p) => ({ ...p, name: e.target.value }), "name")
            }
          />
          <span className="project-tag">EXPLORATION</span>
        </div>
        <div className="header-actions">
          <div className="history-actions">
            <button
              className="icon-button"
              aria-label="Undo"
              title="Undo (Ctrl / ⌘ Z)"
              disabled={!history.current.past.length}
              onClick={undo}
            >
              <Undo2 size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Redo"
              title="Redo (Ctrl / ⌘ Shift Z)"
              disabled={!history.current.future.length}
              onClick={redo}
            >
              <Redo2 size={16} />
            </button>
          </div>
          <div className="project-menu" ref={menuRef}>
            <button
              className="secondary-button project-menu-button"
              aria-expanded={projectMenu}
              onClick={() => setProjectMenu(!projectMenu)}
            >
              Project
              <ChevronDown size={12} />
            </button>
            {projectMenu && (
              <div className="dropdown-menu">
                {!standalone && (
                  <a
                    href="./arrowfield-studio.html"
                    download="Arrowfield-Studio.html"
                    onClick={() => setProjectMenu(false)}
                  >
                    <Download size={14} />
                    Download tool (.html)
                  </a>
                )}
                <button
                  onClick={() => {
                    download(
                      JSON.stringify(project, null, 2),
                      `${safeName(project.name)}.json`,
                      "application/json",
                    );
                    setProjectMenu(false);
                  }}
                >
                  <FileJson size={14} />
                  Export project JSON
                </button>
                <button
                  onClick={() => {
                    importInput.current?.click();
                    setProjectMenu(false);
                  }}
                >
                  <Upload size={14} />
                  Import project JSON
                </button>
                <button
                  onClick={() => {
                    reset();
                    setProjectMenu(false);
                  }}
                >
                  <RotateCcw size={14} />
                  Reset to defaults
                </button>
              </div>
            )}
          </div>
          <button
            className="secondary-button save-button"
            onClick={() => setDialog("save")}
          >
            <Bookmark size={14} />
            Save preset
          </button>
          <button
            className="primary-button header-export"
            onClick={() => setDialog("export")}
          >
            <Download size={14} />
            Export
            <ArrowUpRight size={13} />
          </button>
        </div>
      </header>
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = "";
        }}
      />
      <main className="studio-layout">
        <Presets
          project={project}
          active={active}
          onPreset={onPreset}
          onRandomize={randomize}
          change={change}
          saved={saved}
          onSave={() => setDialog("save")}
          onDelete={(id) => {
            const next = saved.filter((s) => s.id !== id);
            try {
              savePresets(next);
              setSaved(next);
              notify("Saved exploration deleted");
            } catch {
              notify("Could not update browser storage");
            }
          }}
          onReset={reset}
        />
        <div className="center-panel">
          <Stage
            project={project}
            playing={playing}
            seek={seek}
            onTime={setTime}
            onEnd={() => setPlaying(false)}
            onStats={(count, mode) => setStats({ count, mode })}
            quality={quality}
            setQuality={setQuality}
          />
          <Timeline
            project={project}
            time={time}
            playing={playing}
            onPlay={() => {
              if (!playing && time >= project.motion.duration) goTo(0);
              setPlaying((v) => !v);
            }}
            onSeek={goTo}
            onLoop={() => change("motion", "loop", !project.motion.loop)}
            onDuration={(n) => change("motion", "duration", n)}
            onExport={() => setDialog("export")}
          />
        </div>
        <Inspector
          project={project}
          change={change}
          onImage={onImage}
          notify={notify}
        />
      </main>
      <footer className="app-footer">
        <span>
          <span className="status-dot" />
          {stats.mode}
          <i />
          {stats.count.toLocaleString()} arrows
          <i />
          Original SVG geometry
        </span>
        <span className="footer-save">
          <Check size={11} />
          {autosave}
        </span>
        <button onClick={() => setDialog("help")}>
          <HelpCircle size={13} />
          Help & shortcuts
        </button>
        <span className="version">ARROWFIELD / 1.0</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={14} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={12} />
          </button>
        </div>
      )}
      {dialog === "export" && (
        <ExportDialog
          project={project}
          time={time}
          change={change}
          onClose={() => setDialog(null)}
          notify={notify}
        />
      )}{" "}
      {dialog === "save" && (
        <SaveDialog
          name={project.name}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}{" "}
      {dialog === "help" && <HelpDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
