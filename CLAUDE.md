# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static, no-build, vanilla JS site: an interactive pan/zoom "concept map" that teaches AI as a historical narrative (Spanish-language content). Deployed as-is to Netlify (`netlify.toml`, publish dir `.`). No tests, no linter, no bundler.

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
- **`app.js`** — rendering and interaction: `renderNodes`/`renderConnections` (SVG), pan/zoom + pinch (`setupPanAndZoom`, `clampPan`), search filter, drawer, image lightbox (own zoom/pan), progress + tutorial flags in `localStorage` (`ai-map-progress`, `ai-map-tutorial-seen`).
- **`formatMarkdown`** in `app.js`: dedents the template-literal text (otherwise marked treats 4+ space indent as code), pulls `$$…$$` / `$…$` out into placeholders, runs `marked.parse(…, { breaks: true })`, then renders the math with KaTeX. In JS strings, LaTeX backslashes must be doubled (`\\text`, `\\land`). Nested list items must be indented to the parent item's text column (3 spaces under `1. `), and a line directly after a list needs a blank line or it joins the last item.

## Gotchas when editing content

- Canvas size is fixed in `VIEWPORT_CONFIG` (`app.js`, 1400×6400). Nodes placed outside it get clipped by pan clamping — enlarge it if adding content further down.
- Chapter colors live only in `chapters[].rgb` (`data.js`); `app.js` exposes them via `chapterColor(id)` / `chapterRgb(id)` as the CSS vars `--neon-color`/`--neon-rgb` (nodes) and `--chapter-neon`/`--chapter-neon-rgb` (drawer, lightbox). The `--neon-*` vars in `styles.css` are UI accents, not chapter colors.
- `IDEA.md` is the narrative syllabus the map follows (chapter → topics, each topic motivated by the previous one's limitation).
- `prompts/` holds Spanish prompt templates for generating the illustrations in `public/img/` (EdTech cartoon style, 16:9, all text in Spanish) and educational videos.
