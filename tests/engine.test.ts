import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import {
  ARROW_POINTS,
  VERTICES,
  TRIANGLES,
  arrowVertices,
  VIEWBOX,
} from "../src/engine/geometry";
import { DEFAULTS, clone, PRESETS, parseProject } from "../src/state/project";
import { surfaceSampler, generateFrame } from "../src/engine/surface";
import { gradientSampler, hexRgb } from "../src/engine/gradient";
import { lightSampler } from "../src/engine/lighting";
import { staticSvg, animatedSvg } from "../src/export/svg";
import { imageBounds } from "../src/engine/background";
import { exportSize } from "../src/export/video";
const near = (a: number, b: number, epsilon = 1e-9) =>
  assert.ok(Math.abs(a - b) < epsilon, `${a} ≠ ${b}`);
test("source polygon and viewBox match Illustrator exactly; triangulation preserves silhouette", () => {
  const source = readFileSync("public/arrow.svg", "utf8");
  assert.equal(source.match(/points="([^"]+)"/)![1], ARROW_POINTS);
  assert.ok(source.includes('viewBox="0 0 1379.91 1080"'));
  const area = Math.abs(
    VERTICES.reduce((sum, p, i) => {
      const q = VERTICES[(i + 1) % VERTICES.length];
      return sum + p[0] * q[1] - p[1] * q[0];
    }, 0) / 2,
  );
  let triangles = 0;
  for (let i = 0; i < TRIANGLES.length; i += 3) {
    const [a, b, c] = TRIANGLES.slice(i, i + 3).map((n) => VERTICES[n]);
    triangles +=
      Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) /
      2;
  }
  near(area, triangles, 1e-6);
  const verts = arrowVertices();
  for (let i = 0; i < TRIANGLES.length; i++) {
    near(
      verts[i * 2] * VIEWBOX.width + VIEWBOX.width / 2,
      VERTICES[TRIANGLES[i]][0],
      0.0001,
    );
    near(
      verts[i * 2 + 1] * VIEWBOX.width + VIEWBOX.height / 2,
      VERTICES[TRIANGLES[i]][1],
      0.0001,
    );
  }
});
test("thousands of instances are deterministic and seed changes remain spatially coherent", () => {
  const p = clone(DEFAULTS),
    a = generateFrame(p, 1.7, 480, 270);
  assert.ok(a.instances.length > 5000);
  assert.deepEqual(a, generateFrame(p, 1.7, 480, 270));
  p.seed++;
  assert.notDeepEqual(a, generateFrame(p, 1.7, 480, 270));
  const sample = surfaceSampler(p, 1.7),
    b = sample(0.4, 0.4),
    c = sample(0.401, 0.4);
  assert.ok(Math.abs(b.x - c.x) < 0.01 && Math.abs(b.z - c.z) < 0.1);
});
test("all surface controls affect a coherent surface", () => {
  for (const key of Object.keys(
    DEFAULTS.surface,
  ) as (keyof typeof DEFAULTS.surface)[]) {
    const p = clone(DEFAULTS);
    p.surface[key] += 0.2;
    assert.notDeepEqual(
      generateFrame(p, 1.43, 320, 180),
      generateFrame(DEFAULTS, 1.43, 320, 180),
      key,
    );
  }
});
test("arrow geometry, density, orientation, spacing, opacity and composition controls change output", () => {
  const base = generateFrame(DEFAULTS, 0.9, 320, 180);
  for (const key of [
    "rotation",
    "scale",
    "spacingX",
    "spacingY",
    "density",
    "opacity",
  ] as const) {
    const p = clone(DEFAULTS);
    p.arrows[key] += 0.2;
    assert.notDeepEqual(generateFrame(p, 0.9, 320, 180), base, key);
  }
  const p = clone(DEFAULTS);
  p.arrows.followSurface = false;
  assert.ok(
    generateFrame(p, 0.9, 320, 180).instances.every((i) => i.angle === 0),
  );
  p.composition.coverage = 0.5;
  assert.ok(
    generateFrame(p, 0.9, 320, 180).instances.length <
      base.instances.length * 0.4,
  );
});
test("motion controls affect time-varying deformation; zero amplitude and speed can freeze the surface", () => {
  const sample = surfaceSampler(DEFAULTS, 2)(0.34, 0.63);
  for (const key of [
    "speed",
    "amplitude",
    "frequency",
    "direction",
    "ripple",
    "turbulence",
    "smoothness",
  ] as const) {
    const p = clone(DEFAULTS);
    p.motion[key] += key === "frequency" ? 1 : 0.3;
    assert.notDeepEqual(surfaceSampler(p, 2)(0.34, 0.63), sample, key);
  }
  const p = clone(DEFAULTS);
  p.motion.amplitude = 0;
  assert.deepEqual(
    surfaceSampler(p, 0)(0.34, 0.63),
    surfaceSampler(p, 3)(0.34, 0.63),
  );
  p.motion.amplitude = 0.7;
  p.motion.speed = 0;
  assert.deepEqual(
    surfaceSampler(p, 0)(0.34, 0.63),
    surfaceSampler(p, 3)(0.34, 0.63),
  );
});
test("loop endpoints match for fractional speeds, gradients, lights and all presets", () => {
  for (const preset of PRESETS)
    for (const speed of [0, 0.5, 1, 1.75, 3]) {
      const p = clone(preset.project);
      p.motion.speed = speed;
      p.motion.light = true;
      p.gradient.motion = 0.8;
      for (const [x, y] of [
        [0.1, 0.2],
        [0.5, 0.6],
        [0.9, 0.8],
      ]) {
        const a = surfaceSampler(p, 0)(x, y),
          b = surfaceSampler(p, p.motion.duration)(x, y);
        for (const key of Object.keys(a) as (keyof typeof a)[])
          near(a[key], b[key]);
        const c = gradientSampler(p, 0)(x, y),
          d = gradientSampler(p, p.motion.duration)(x, y);
        c.forEach((n, i) => near(n, d[i]));
        near(
          lightSampler(p, 0)(a.dx, a.dy, a.z),
          lightSampler(p, p.motion.duration)(b.dx, b.dy, b.z),
        );
      }
    }
});
test("gradient is continuous over the canvas; colors and positions respond independently", () => {
  const p = clone(DEFAULTS);
  p.gradient.angle = 0;
  p.gradient.spread = 1;
  assert.deepEqual(gradientSampler(p, 0)(0, 0.5), hexRgb("#2D9BAD"));
  assert.deepEqual(gradientSampler(p, 0)(1, 0.5), hexRgb("#A460AD"));
  for (const key of [
    "angle",
    "x",
    "y",
    "scale",
    "spread",
    "transition",
    "motion",
  ] as const) {
    const q = clone(DEFAULTS);
    q.gradient[key] += 0.35;
    assert.notDeepEqual(
      gradientSampler(q, 1)(0.26, 0.38),
      gradientSampler(DEFAULTS, 1)(0.26, 0.38),
      key,
    );
  }
  p.gradient.type = "radial";
  assert.notDeepEqual(
    gradientSampler(p, 0)(0.4, 0.2),
    gradientSampler(DEFAULTS, 0)(0.4, 0.2),
  );
});
test("lighting has directional response and a complete off state", () => {
  const p = clone(DEFAULTS);
  const a = lightSampler(p, 0)(1, 1, 0.2);
  p.lighting.angle += 180;
  assert.notEqual(a, lightSampler(p, 0)(1, 1, 0.2));
  for (const key of [
    "intensity",
    "elevation",
    "softness",
    "shadow",
    "ambient",
    "specular",
    "depth",
  ] as const) {
    const q = clone(DEFAULTS);
    q.lighting[key] += 0.3;
    assert.notEqual(
      lightSampler(q, 0)(0.3, 0.5, 0.2),
      lightSampler(DEFAULTS, 0)(0.3, 0.5, 0.2),
      key,
    );
  }
  p.lighting.enabled = false;
  assert.equal(lightSampler(p, 0)(9, 3, -0.8), 1);
});
test("background bounds preserve aspect with fit/crop and keep image separate from texture", () => {
  const p = clone(DEFAULTS);
  p.background.fit = "fit";
  assert.deepEqual(imageBounds(p, 100, 100, 1920, 1080), {
    x: 420,
    y: 0,
    width: 1080,
    height: 1080,
  });
  p.background.fit = "crop";
  assert.deepEqual(imageBounds(p, 100, 100, 1920, 1080), {
    x: 0,
    y: -420,
    width: 1920,
    height: 1920,
  });
  p.background.fit = "fill";
  assert.deepEqual(imageBounds(p, 100, 100, 1920, 1080), {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  });
});
test("SVG rasterization validates actual vectors, transparency, colors and canvas clipping", () => {
  const p = clone(DEFAULTS);
  p.composition.width = 640;
  p.composition.height = 360;
  const svg = staticSvg(p, 0);
  assert.ok(svg.includes(`points="${ARROW_POINTS}"`));
  assert.ok(!svg.includes("<image"));
  assert.ok(svg.includes('clip-path="url(#canvas)"'));
  const solid = new Resvg(svg).render();
  assert.equal(solid.width, 640);
  assert.equal(solid.height, 360);
  assert.equal(solid.pixels[3], 255);
  p.export.transparent = true;
  const transparentSvg = staticSvg(p, 0),
    alpha = new Resvg(transparentSvg).render();
  const pixels = alpha.pixels;
  let clear = 0,
    filled = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] === 0) clear++;
    if (pixels[i] > 128) filled++;
  }
  assert.ok(clear > 1000 && filled > 1000);
  mkdirSync("work/validation", { recursive: true });
  writeFileSync("work/validation/default.svg", svg);
  writeFileSync("work/validation/transparent.svg", transparentSvg);
  writeFileSync("work/validation/default.png", solid.asPng());
});
test("animated SVG preserves stable instances, true vector animation, and cancellation", async () => {
  const p = clone(DEFAULTS);
  p.arrows.density = 0.3;
  p.export.svgFrames = 12;
  p.name = "Test <&>";
  let progress = 0;
  const svg = await animatedSvg(
    p,
    (n) => (progress = n),
    new AbortController().signal,
  );
  assert.ok(svg.includes("Test &lt;&amp;"));
  assert.ok(svg.includes("<animateTransform"));
  assert.ok(svg.includes('repeatCount="indefinite"'));
  assert.ok(!svg.includes("data:image"));
  const values = svg.match(/type="translate" values="([^"]+)"/)![1].split(";");
  assert.equal(values.length, 13);
  assert.equal(values[0], values[12]);
  assert.ok(progress > 0.9);
  writeFileSync("work/validation/animated.svg", svg);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    animatedSvg(p, () => {}, controller.signal),
    { name: "AbortError" },
  );
});
test("project import round-trips all sections and rejects invalid projects", () => {
  const p = clone(PRESETS[3].project);
  p.background.dataUrl = "data:image/png;base64,AA==";
  p.export.transparent = true;
  const actual = parseProject(JSON.stringify(p));
  assert.deepEqual(
    {
      ...actual.gradient,
      stops: actual.gradient.stops.map(({ id, ...s }) => s),
    },
    { ...p.gradient, stops: p.gradient.stops.map(({ id, ...s }) => s) },
  );
  actual.gradient.stops = p.gradient.stops;
  assert.deepEqual(actual, p);
  assert.throws(() => parseProject('{"name":"no"}'));
  p.arrows.density = 1e20;
  p.composition.width = -1;
  const bounded = parseProject(JSON.stringify(p));
  assert.equal(bounded.arrows.density, 2);
  assert.equal(bounded.composition.width, 64);
});
test("export dimensions are even and preserve all aspect ratios", () => {
  for (const preset of [
    [1920, 1080],
    [1080, 1080],
    [1080, 1350],
    [1080, 1920],
  ]) {
    const p = clone(DEFAULTS);
    [p.composition.width, p.composition.height] = preset;
    for (const resolution of ["1080p", "4k", "canvas"] as const) {
      p.export.resolution = resolution;
      const [w, h] = exportSize(p);
      assert.equal(w % 2, 0);
      assert.equal(h % 2, 0);
      near(w / h, preset[0] / preset[1], 0.001);
    }
  }
});
