// Build/dev utility (run manually, not part of the Astro build): slices the
// source illustration `snail-flowers.svg` into individually placeable inline
// SVG partials, one per top-level artwork group, each with a tight viewBox so
// it can be positioned and animated on its own. Emits an index JSON describing
// every piece (id, viewBox, fills) for reference while composing the page.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { svgPathBbox } = require("svg-path-bbox");

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, "../src/assets/snail-flowers.svg");
const OUT_DIR = path.resolve(here, "out-partials");
fs.mkdirSync(OUT_DIR, { recursive: true });

const svg = fs.readFileSync(SRC, "utf8");

// Walk tags to collect the top-level artwork groups (depth 2: inside the single
// wrapper <g>) plus any loose paths that live directly under the wrapper.
const tagRe = /<(\/?)(svg|g|path)\b([^>]*?)(\/?)>/g;
let m;
let depth = 0;
const groups = [];
const looseSpans = [];
let cur = null;
while ((m = tagRe.exec(svg))) {
  const [, close, tag, attrs, selfClose] = m;
  if (tag === "path") {
    if (depth === 1) looseSpans.push([m.index, tagRe.lastIndex]); // loose under wrapper
    continue;
  }
  if (tag === "svg") continue;
  if (!close) {
    depth++;
    if (depth === 2) {
      cur = { start: m.index, headEnd: tagRe.lastIndex, end: null, attrs };
      if (selfClose) {
        cur.end = tagRe.lastIndex;
        groups.push(cur);
        cur = null;
        depth--;
      }
    } else if (selfClose) {
      depth--;
    }
  } else {
    if (depth === 2 && cur) {
      cur.end = tagRe.lastIndex;
      groups.push(cur);
      cur = null;
    }
    depth--;
  }
}

const idOf = (attrs) => (attrs.match(/id="([^"]*)"/) || [])[1];
const fillsIn = (body) => [
  ...new Set([...body.matchAll(/fill:(#[0-9a-fA-F]{3,6})/g)].map((x) => x[1])),
];
const pathDs = (body) => [...body.matchAll(/\bd="([^"]+)"/g)].map((x) => x[1]);

function bboxOf(body) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of pathDs(body)) {
    try {
      const [bx0, by0, bx1, by1] = svgPathBbox(d);
      x0 = Math.min(x0, bx0);
      y0 = Math.min(y0, by0);
      x1 = Math.max(x1, bx1);
      y1 = Math.max(y1, by1);
    } catch {
      /* skip unparseable path */
    }
  }
  return [x0, y0, x1, y1];
}

const pad = 6;
const index = [];
let flowerN = 0;

for (const g of groups) {
  const body = svg.slice(g.headEnd, g.end - 4); // inner markup (strip closing </g>)
  const rawId = idOf(g.attrs);
  const isSnail = rawId === "Snail";
  const id = isSnail ? "snail" : `flora-${String(++flowerN).padStart(2, "0")}`;
  let [x0, y0, x1, y1] = bboxOf(body);
  if (!isFinite(x0)) continue;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const w = +(x1 - x0).toFixed(2);
  const h = +(y1 - y0).toFixed(2);
  const viewBox = `${x0.toFixed(2)} ${y0.toFixed(2)} ${w} ${h}`;
  const out = `<svg class="art art--${id}" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>\n`;
  fs.writeFileSync(path.join(OUT_DIR, `${id}.svg`), out);
  index.push({ id, viewBox, w, h, ratio: +(w / h).toFixed(3), paths: pathDs(body).length, fills: fillsIn(body) });
}

if (looseSpans.length) {
  const body = looseSpans.map(([s, e]) => svg.slice(s, e)).join("");
  let [x0, y0, x1, y1] = bboxOf(body);
  if (isFinite(x0)) {
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const w = +(x1 - x0).toFixed(2), h = +(y1 - y0).toFixed(2);
    const viewBox = `${x0.toFixed(2)} ${y0.toFixed(2)} ${w} ${h}`;
    fs.writeFileSync(
      path.join(OUT_DIR, "flora-dots.svg"),
      `<svg class="art art--dots" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>\n`
    );
    index.push({ id: "flora-dots", viewBox, w, h, ratio: +(w / h).toFixed(3), paths: pathDs(body).length, fills: fillsIn(body), loose: true });
  }
}

fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));
console.log(`Wrote ${index.length} partials to ${OUT_DIR}`);
console.log(index.map((p) => `${p.id.padEnd(11)} ${String(p.paths).padStart(2)}p ${p.ratio.toFixed(2)} vb=${p.viewBox}  ${p.fills.join(",")}`).join("\n"));
