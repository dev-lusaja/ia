# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static, no-build, vanilla JS site that teaches AI as a historical narrative (Spanish-language content): a linear learning path (sidebar index + full-screen lesson) with an interactive pan/zoom "concept map" as the overview view. Deployed as-is to Netlify (`netlify.toml`, publish dir `.`). No tests, no linter, no bundler.

## Run locally

```bash
npm run dev                  # live-server (auto-reload)
python -m http.server 8000   # alternative
```

## Architecture

Scripts load as plain globals in order (`index.html`): KaTeX (CDN, deferred) → `marked` (CDN, pinned) → `data.js` → `app.js`. No modules; `app.js` reads the globals `chapters` and `conceptMap` directly.

- **`data.js`** — all content. `chapters` (id, name, `rgb: "r, g, b"`) and `conceptMap` (array of nodes). Two node kinds:
  - **Lesson node**: `id`, `title` (`"N. Title"` — text after `". "` is shown on the map), `chapter`, `coords {x,y}` (absolute px on the canvas), `connectsTo` (ids → SVG lines), `transitionFromPrevious`, `levels.{basic,intermediate,technical}.{title,content}`. Clicking opens the drawer with 3 level tabs.
  - **Satellite node**: `type: "satellite-image"` (opens lightbox with `imageUrl` + `caption`) or `"satellite-logo"`; both render `logoUrl` as the node icon. Excluded from the numbered sequence and drawn with different connection styling.
  - **`demo`** (optional, set via `lessonDemos` at the end of `data.js`): name of an ES module `demos/<name>.js` exporting `mount(el)`, loaded lazily with `import()` into the lesson's "Pruébalo" section. Demos use plain JS/SVG, native `<input type="range">`, the chapter color (`--chapter-neon`), and respect `prefers-reduced-motion`.
- **`app.js`** — two views switched by `body[data-view]`: `lesson` (the path: `openLesson`, `renderPathIndex` sidebar with per-chapter progress rings, "Siguiente →" via `getNextLesson`) and `map` (`showMap`; `renderNodes`/`renderConnections` SVG, pan/zoom + pinch via `setupPanAndZoom`, `clampPan`). URL hash: `#<lesson-id>`, `#<satellite-id>`, `#mapa`; no hash opens `getResumeNodeId()`. Satellites render inside their parent lesson (`lessonSatellites`): images as figures that open the lightbox, logos as collapsible `<details>`. Completing the last lesson of a chapter shows `showChapterDone`. `localStorage`: `ai-map-progress`, `ai-map-level` (last chosen level tab), `ai-map-tutorial-seen`.
- **`formatMarkdown`** in `app.js`: dedents the template-literal text (otherwise marked treats 4+ space indent as code), pulls `$$…$$` / `$…$` out into placeholders, runs `marked.parse(…, { breaks: true })`, then renders the math with KaTeX. In JS strings, LaTeX backslashes must be doubled (`\\text`, `\\land`). Nested list items must be indented to the parent item's text column (3 spaces under `1. `), and a line directly after a list needs a blank line or it joins the last item. Content headings: `### Title` = collapsible section (`<details class="content-section">`, closed by default) spanning up to the next `###`, a `---` line (consumed, not drawn) or the end of the level, a paragraph that is only `**bold**` = subsection (thin chapter-color bar; lines containing `→` are left as-is). A ```` ```timeline ```` fenced block with one `date | title | text` line per milestone renders as a vertical timeline (`.timeline`); title and text accept inline markdown.

## Gotchas when editing content

- Canvas size is fixed in `VIEWPORT_CONFIG` (`app.js`, 1400×7400). Nodes placed outside it get clipped by pan clamping — enlarge it if adding content further down.
- Demos are ES modules loaded with `import()`, so the site must be served over HTTP (not `file://`).
- Chapter colors live only in `chapters[].rgb` (`data.js`); `app.js` exposes them via `chapterColor(id)` / `chapterRgb(id)` as the CSS vars `--neon-color`/`--neon-rgb` (nodes) and `--chapter-neon`/`--chapter-neon-rgb` (drawer, lightbox). The `--neon-*` vars in `styles.css` are UI accents, not chapter colors.
- The narrative rule lives in `data.js` itself: each lesson's `transitionFromPrevious` states the previous topic's limitation that motivates it. Keep lesson order, `connectsTo` chain and the "N." title numbers in sync; cross-references in text use "tema N".
- `REDISENO.md` is the plan behind the path + demos redesign (implemented; quizzes were dropped). Read it before changing navigation, lesson layout, or adding demos.
- `prompts/` holds Spanish prompt templates for generating the illustrations in `public/img/` (EdTech cartoon style, 16:9, all text in Spanish) and educational videos.
