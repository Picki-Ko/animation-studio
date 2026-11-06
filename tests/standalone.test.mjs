import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";

const output = resolve("dist/arrowfield-studio.html");

test("standalone artifact embeds its scripts, styles and exact arrow with no file dependencies", async () => {
  const html = await readFile(output, "utf8");
  assert.ok(html.startsWith("<!doctype html>"));
  assert.match(html, /<meta name="arrowfield-standalone" content="true"/);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.match(scripts[0][1], /type="module"/);
  assert.doesNotMatch(scripts[0][1], /\bsrc=/);
  assert.ok(scripts[0][2].length > 300_000);
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  assert.equal(styles.length, 1);
  assert.ok(styles[0][1].includes(".app-shell"));
  assert.doesNotMatch(styles[0][1], /@import|url\(/);
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  assert.doesNotMatch(markup, /(?:src|href)="(?!data:|#)[^"]+"/);
  const uri = markup.match(/href="(data:image\/svg\+xml;base64,[^"]+)"/)[1];
  assert.equal(
    Buffer.from(uri.split(",")[1], "base64").toString(),
    await readFile("public/arrow.svg", "utf8"),
  );
  assert.ok(
    html.split(uri).length >= 5,
    "icon and all three arrow images must be embedded",
  );
  assert.ok(!html.includes('"./arrow.svg"'));
  assert.ok(html.length < 1_000_000, "keep the complete editor under 1 MB");
});

test("embedded JavaScript compiles independently and has no static or dynamic module imports", async () => {
  const html = await readFile(output, "utf8");
  const code = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
  await mkdir("work/validation", { recursive: true });
  const entry = resolve("work/validation/standalone-inline.js");
  await writeFile(entry, code);
  const result = await build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      write: false,
      emptyOutDir: false,
      target: "es2022",
      minify: false,
      lib: { entry, formats: ["es"] },
      // Keep any dependency external so none can be silently bundled by the check.
      rollupOptions: { external: (_id, importer) => Boolean(importer) },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  const chunks = outputs
    .flatMap((r) => r.output)
    .filter((item) => item.type === "chunk");
  assert.equal(chunks.length, 1);
  assert.deepEqual(chunks[0].imports, []);
  assert.deepEqual(chunks[0].dynamicImports, []);
});

test("download page links to the packaged HTML with an explicit download filename", async () => {
  const html = await readFile("dist/download.html", "utf8");
  assert.match(
    html,
    /href="\.\/arrowfield-studio\.html" download="Arrowfield-Studio\.html"/,
  );
  assert.ok(html.includes("Open the saved file in your browser"));
  assert.doesNotMatch(html, /<script\b|<link\b[^>]*rel="stylesheet"/);
});
