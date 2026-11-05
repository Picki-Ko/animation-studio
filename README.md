# Arrowfield Studio

A browser-based procedural arrow texture and animation instrument built with React, TypeScript, and Vite. The supplied Illustrator polygon is preserved verbatim in `public/arrow.svg` and `src/engine/geometry.ts`.

## Run

```sh
npm ci
npm run dev
```

`npm test` checks geometry, triangulation, surface controls, deterministic timing and loop endpoints, gradients, lighting, image placement, project round trips, rendered SVG transparency, declarative animation, export dimensions, and H.264 MP4 muxing. Native SVG validation uses Resvg. The MP4 integration test uses FFmpeg / ffprobe when installed and skips only that test when they are absent.

`npm run build` type-checks and produces a self-contained static site in `dist/`. `npm run preview` serves the production build.

## Using the studio

Choose one of six starting presets or randomize the seed while preserving your controls. The left panel sets the canvas, seed, coverage, and background color. The right inspector has Design, Motion, and Scene tabs, with collapsible controls for geometry, deformation, gradients, lights, and image layers. Background uploads accept JPG, PNG, and WebP up to 12 MB. Use the hand tool to pan, the zoom controls to inspect detail, and Fit to reset the view.

**Arrow controls** opens by default in the Design tab. Arrow size and density are independent: density changes the number and spacing of instances while size changes their dimensions. Angle variation controls gentle, coherent tilt as folds animate. Base tilt sets the overall bias; every arrow remains within 30° of right across preview and all exports. Set angle variation to zero or disable Follow surface direction for uniform orientation.

Project JSON version 2 saves the new angle setting and independent size semantics. Version 1 projects and browser autosaves are upgraded automatically, preserving their previous arrow sizes; legacy directions are constrained to the right-facing range.

Space plays or pauses; Home returns to the first frame. Ctrl / Command Z undoes; Shift adds redo. Scrubbing uses the same deterministic timestamps as export. Preview quality changes density for responsiveness; exports always use full quality.

Explorations and the latest composition are saved locally in the browser. Project → Export project JSON creates a portable configuration, including any embedded background image. Import validates and restores those settings. If image data exceeds browser storage, the status bar asks you to export JSON. Files are processed on the device; no external rendering service is used.

## Architecture

- `src/engine/geometry.ts`: exact source polygon, uniform scaling, triangulated WebGL mesh.
- `src/engine/orientation.ts`: smooth, surface-driven angle variation within a fixed right-facing range.
- `src/engine/surface.ts`: seeded continuous displacement field, local orientation, depth, compression, and instancing.
- `src/engine/timing.ts`: deterministic phase math. Fractional motion speeds blend integer temporal harmonics, preserving seamless boundaries.
- `src/engine/gradient.ts`: whole-canvas multistop linear / radial color sampling, independent position and motion.
- `src/engine/lighting.ts`: directional normals, ambient, specular and valley shading.
- `src/engine/background.ts`: separate image loading, placement, cropping, and tone controls.
- `src/engine/renderer.ts`: instanced WebGL 2 triangles with a Canvas 2D fallback and optional optical bloom.
- `src/ui/`: properties, presets, stage, timeline, accessible dialogs and file controls.
- `src/state/project.ts`: versioned settings, presets, local persistence, import validation.
- `src/export/`: vector SVG / SMIL, H.264 WebCodecs + ISO BMFF muxing, PNG and ZIP sequences.

## Export behavior and practical limits

- **SVG:** true `<polygon>` / `<use>` vectors, clipped to the canvas and coverage area. Original geometry remains intact. Lighting is baked into each arrow's sampled color. Optical bloom is omitted to keep vector output clean. Images are included only when selected and are embedded separately.
- **Animated SVG:** self-contained declarative SMIL with sampled translation, rotation, uniform scale, and color; no raster animation or external scripts. 24 / 48 / 96 samples trade file size for smoothness. The exporter limits total instance samples to 1.5 million. SMIL support varies by viewer; browser playback is recommended.
- **MP4:** actual H.264 video in an MP4 container, encoded from timeline frames with explicit microsecond timestamps. Requires secure-context WebCodecs and an encoder supporting the chosen dimensions and frame rate. Capability detection runs before export; unsupported settings are disabled with an actionable explanation. MP4 uses a chosen solid background. 24 / 30 / 60 fps and 1080p / 4K are available where supported. Encoding speed does not affect animation timing.
- **PNG / PNG sequence:** true alpha support; sequences include numbered PNGs, the project JSON, and timing notes in a ZIP. Sequences stop at 400 MB of accumulated PNG data to avoid exhausting device memory. For longer / denser 4K work, export shorter segments or add a streaming file-system writer in a future iteration.
- Preview bloom uses a composited blur; Canvas 2D fallback preserves the core vector texture and shading but omits optical bloom. Surface scale remains uniform on every arrow, preserving its silhouette and proportions.
- The current MP4 muxer is the established `mp4-muxer` package. A future maintenance pass can migrate it to Mediabunny; the integration test provides a decode-level regression check.

## Static hosting / GitHub Pages

Vite uses relative asset paths (`base: './'`) so `dist/` works under a GitHub Pages repository subpath. The included workflow builds and deploys on pushes to `main`, or manual dispatch. Enable **Settings → Pages → Source: GitHub Actions** in the repository, then merge or run the workflow. It does not require a server or runtime secrets. `.openai/hosting.json` is the separate Sites hosting manifest and is not required by GitHub Pages.

## Verification record

Production build and automated engine / vector / container checks run in the cloud environment. SVGs are parsed and independently rasterized. The MP4 container integration check probes and decodes actual H.264 samples. Browser automation was unavailable in the initial build environment, so interactive browser QA and device-specific WebCodecs encoding are not claimed as verified. Before a release, exercise the editor and exports in current Chrome / Edge and Safari, including an iPad viewport, image upload / removal, save / import, and 1080p / 4K capability messages.
