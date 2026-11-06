import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

export async function buildStandalone(distDirectory) {
  const root = resolve(distDirectory);
  const asset = (url) => {
    const path = resolve(root, url);
    if (!path.startsWith(root + sep))
      throw new Error(`Expected a local build asset: ${url}`);
    return path;
  };
  const arrow = await readFile(resolve(root, "arrow.svg"), "utf8");
  const arrowUri = `data:image/svg+xml;base64,${Buffer.from(arrow).toString("base64")}`;
  let html = await readFile(resolve(root, "index.html"), "utf8");
  const scripts = [
    ...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/g),
  ];
  if (scripts.length !== 1)
    throw new Error(
      "Expected one bundled JavaScript entry for the offline studio.",
    );
  for (const [tag, url] of scripts) {
    let code = await readFile(asset(url), "utf8");
    if (/\bimport\s*(?:\(|["'{*])/.test(code))
      throw new Error(
        "The offline entry must have no remaining module imports.",
      );
    code = code
      .replaceAll("./arrow.svg", arrowUri)
      .replace(/<\/script/gi, "<\\/script");
    html = html.replace(
      tag,
      () => `<script type="module">\n${code}\n</script>`,
    );
  }
  const styles = [
    ...html.matchAll(
      /<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="([^"]+)"[^>]*>/g,
    ),
  ];
  if (!styles.length) throw new Error("Expected bundled studio styles.");
  for (const [tag, url] of styles) {
    const css = await readFile(asset(url), "utf8");
    html = html.replace(tag, () => `<style>\n${css}\n</style>`);
  }
  html = html
    .replaceAll("./arrow.svg", arrowUri)
    .replace(
      "</head>",
      '<meta name="arrowfield-standalone" content="true" />\n</head>',
    );
  if (/<(?:script|link)\b[^>]*(?:src|href)="(?!data:)[^"]+"/i.test(html)) {
    throw new Error(
      "The offline HTML still references an external script or stylesheet.",
    );
  }
  const filename = "arrowfield-studio.html";
  await writeFile(resolve(root, filename), html);
  const size = Math.round(Buffer.byteLength(html) / 1024);
  const landing = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#191b1e"><title>Download Arrowfield Studio</title><link rel="icon" href="${arrowUri}"><style>
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:28px;background:#141719;color:#d4d9d7;font:15px/1.7 system-ui,sans-serif}main{width:100%;max-width:520px;padding:34px;border:1px solid #353e40;border-radius:12px;background:#1c2225}.brand{display:flex;align-items:center;gap:12px;font-size:22px;font-weight:650;letter-spacing:-.8px}.brand img{width:30px}h1{font-size:30px;line-height:1.2;letter-spacing:-1px;font-weight:500;margin:30px 0 16px}p{color:#99a9ae;font-size:13px}a{color:#d6efa5}a:focus-visible{outline:2px solid #d6efa5;outline-offset:5px}.download{display:block;text-align:center;margin:26px 0 12px;padding:12px 20px;border-radius:6px;background:#d6efa5;color:#25311a;text-decoration:none;font-size:14px;font-weight:600}.size{text-align:center;font-size:11px;color:#798e94}.note{padding-top:20px;border-top:1px solid #354247;margin-top:28px;font-size:12px}.back{display:inline-block;font-size:12px;margin-top:12px;text-decoration:none}
</style></head><body><main><div class="brand"><img src="${arrowUri}" alt="">arrowfield®</div><h1>Your studio, in one file.</h1><p>Download the complete Arrowfield editor as a single HTML file. Open the saved file in your browser to create and animate textures offline.</p><a class="download" href="./${filename}" download="Arrowfield-Studio.html">Download HTML file ↓</a><div class="size">${size} KB · code, styles and original arrow included</div><p class="note">To bring a composition with you, export its project JSON from the studio, then import it into your downloaded copy. MP4 export requires a browser with a supported H.264 encoder.</p><a class="back" href="./">← Back to the studio</a></main></body></html>`;
  await writeFile(resolve(root, "download.html"), landing);
  return { path: resolve(root, filename), bytes: Buffer.byteLength(html) };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
  const result = await buildStandalone(directory);
  console.log(
    `Standalone HTML created: ${result.path} (${Math.round(result.bytes / 1024)} KB)`,
  );
}
