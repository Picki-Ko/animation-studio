# Development instructions

Keep the exact arrow coordinates and proportions in `public/arrow.svg` and `src/engine/geometry.ts`. Do not replace this geometry with icons, text, triangles, or approximate chevrons. Rotation and uniform instance scaling are permitted; nonuniform scaling is not.

The editor is React + TypeScript + Vite and must remain deployable as a static site under a GitHub Pages repository subpath. Keep relative asset paths. Do not introduce external rendering services or upload user images.

Keep geometry, surface math, timing, gradient sampling, lighting, background processing, UI / state, and export in their current separate modules. Preview, SVG, and video must use the same deterministic surface model. Looping controls must preserve identical endpoints for fractional motion speeds. Do not base exported frames on requestAnimationFrame delivery times.

Update the versioned configuration schema, defaults, import validation, and documentation when adding a control. Include all new values in saved / exported projects. Imported values must not introduce markup or unbounded render dimensions. Keep clear errors for unsupported browser codecs and memory limits. Never rename WebM data to MP4 or wrap a raster screenshot in SVG.

Run `npm test` and `npm run build` after meaningful changes. Add tests for actual rendering or file behavior, especially geometry fidelity, loop continuity, alpha transparency, and decodable export containers. FFmpeg / ffprobe are optional native validation tools, not application runtime dependencies. Browser QA is separate from these checks; never report it passed if no browser was exercised.

Do not commit `node_modules/`, `dist/`, `work/`, generated validation assets, credentials, or local environment files. Preserve `.openai/hosting.json`'s Site ID. Sites publication and GitHub Pages are independent hosts.
