import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULTS, PRESETS, clone, parseProject } from "../src/state/project";
import { generateFrame } from "../src/engine/surface";
import { arrowAngle, ARROW_ANGLE_LIMIT } from "../src/engine/orientation";
import { staticSvg } from "../src/export/svg";
import { Inspector } from "../src/ui/Inspector";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9);

test("density changes arrow count independently of size; size preserves grid positions", () => {
  const p = clone(DEFAULTS);
  p.surface.depth = 0;
  p.arrows.density = 0.6;
  const sparse = generateFrame(p, 1.2, 640, 360, "high", true);
  p.arrows.density = 1.6;
  const dense = generateFrame(p, 1.2, 640, 360, "high", true);
  assert.ok(dense.instances.length > sparse.instances.length * 2);
  near(dense.instances[0].size, sparse.instances[0].size);
  const multiplier = 1.5;
  p.arrows.scale *= multiplier;
  const larger = generateFrame(p, 1.2, 640, 360, "high", true);
  assert.equal(larger.instances.length, dense.instances.length);
  for (const index of [
    0,
    Math.floor(dense.instances.length / 2),
    dense.instances.length - 1,
  ]) {
    const before = dense.instances[index],
      after = larger.instances[index];
    near(before.x, after.x);
    near(before.y, after.y);
    near(before.angle, after.angle);
    near(after.size, before.size * multiplier);
  }
  const draft = generateFrame(p, 1.2, 640, 360, "draft", true);
  near(draft.instances[0].size, larger.instances[0].size);
});

test("angle variation responds to folds and stays right-facing at every base tilt", () => {
  const arrows = clone(DEFAULTS.arrows);
  for (const rotation of [-720, -180, -30, -15, 0, 15, 30, 90, 180, 350, 720]) {
    arrows.rotation = rotation;
    for (const angleVariation of [0, 12, 30, 360]) {
      arrows.angleVariation = angleVariation;
      for (const twist of [-1000, -5, -0.1, 0, 0.1, 5, 1000]) {
        const angle = arrowAngle(arrows, twist);
        assert.ok(
          Math.abs(angle) <= (ARROW_ANGLE_LIMIT * Math.PI) / 180 + 1e-12,
        );
        assert.ok(Math.cos(angle) >= Math.cos(Math.PI / 6) - 1e-12);
        assert.ok(Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)));
      }
    }
  }
  arrows.rotation = 0;
  arrows.angleVariation = 12;
  const small = arrowAngle(arrows, 0.3);
  assert.ok(small > 0);
  arrows.angleVariation = 24;
  near(arrowAngle(arrows, 0.3), small * 2);
  arrows.followSurface = false;
  assert.equal(arrowAngle(arrows, 10), 0);
  arrows.followSurface = true;
  arrows.angleVariation = 0;
  assert.equal(arrowAngle(arrows, 10), 0);
});

test("animated frame orientations stay bounded and join smoothly across loop boundaries", () => {
  const p = clone(PRESETS[3].project);
  p.arrows.angleVariation = 30;
  p.motion.speed = 1.75;
  const start = generateFrame(p, 0, 320, 180, "high", true);
  const end = generateFrame(p, p.motion.duration, 320, 180, "high", true);
  const middle = generateFrame(
    p,
    p.motion.duration * 0.37,
    320,
    180,
    "high",
    true,
  );
  assert.equal(start.instances.length, end.instances.length);
  let changed = false;
  for (let i = 0; i < start.instances.length; i++) {
    near(start.instances[i].angle, end.instances[i].angle);
    assert.ok(Math.abs(middle.instances[i].angle) <= Math.PI / 6);
    changed ||=
      Math.abs(start.instances[i].angle - middle.instances[i].angle) > 0.01;
  }
  assert.ok(changed, "angles should shift as the surface animates");
  // Vector export uses the same bounded orientation as the live renderer.
  p.arrows.rotation = 90;
  const rotations = [...staticSvg(p, 2).matchAll(/rotate\(([^)]+)\)/g)];
  assert.ok(rotations.length > 1000);
  assert.ok(rotations.every((match) => Math.abs(Number(match[1])) <= 30));
});

test("older projects preserve arrow size and migrate to bounded angle controls", () => {
  const legacy = {
    ...clone(DEFAULTS),
    version: 1,
    arrows: {
      rotation: 350,
      scale: 0.95,
      density: 1.3,
      spacingX: 1,
      spacingY: 0.8,
      followSurface: true,
      opacity: 1,
    },
  };
  const upgraded = parseProject(JSON.stringify(legacy));
  assert.equal(upgraded.version, 2);
  near(upgraded.arrows.scale, legacy.arrows.scale / legacy.arrows.density);
  assert.equal(upgraded.arrows.rotation, -10);
  assert.equal(upgraded.arrows.angleVariation, 12);
  upgraded.surface.depth = 0;
  const frame = generateFrame(upgraded, 0, 640, 360, "high", true);
  near(
    frame.instances[0].size,
    (360 / 65 / legacy.arrows.density) * 0.98 * legacy.arrows.scale,
  );
  const roundTrip = parseProject(JSON.stringify(upgraded));
  assert.deepEqual(roundTrip.arrows, upgraded.arrows);
  upgraded.arrows.rotation = 180;
  upgraded.arrows.angleVariation = 1000;
  const bounded = parseProject(JSON.stringify(upgraded));
  assert.equal(Math.abs(bounded.arrows.rotation), 30);
  assert.equal(bounded.arrows.angleVariation, 30);
});

test("arrow controls are visible on first load and expose independent size, density and angle inputs", () => {
  const html = renderToStaticMarkup(
    createElement(Inspector, {
      project: DEFAULTS,
      change: () => {},
      onImage: () => {},
      notify: () => {},
    }),
  );
  assert.match(html, /aria-expanded="true"[^>]*>[\s\S]*?Arrow controls/);
  for (const label of [
    "Arrow size",
    "Arrow density",
    "Angle variation",
    "Base tilt",
  ]) {
    assert.ok(html.includes(`aria-label="${label} value"`), label);
  }
  assert.ok(html.includes("stay within 30° of right"));
});
