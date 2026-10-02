# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static, no-build, vanilla JS site that teaches AI as a historical narrative (Spanish-language content): a linear learning path (sidebar index + full-screen lesson). The old pan/zoom concept map was removed (2026-10); it is in git history if ever needed. Deployed as-is to Netlify (`netlify.toml`, publish dir `.`). No tests, no linter, no bundler.

## Run locally

```bash
npm run dev                  # live-server (auto-reload)
python -m http.server 8000   # alternative
```

## Architecture

Scripts load as plain globals in order (`index.html`): KaTeX (CDN, deferred) → `marked` (CDN, pinned) → `data.js` → `app.js`. No modules; `app.js` reads the globals `chapters` and `conceptMap` directly.

- **`data.js`** — all content. `chapters` (id, name, `rgb: "r, g, b"`) and `conceptMap` (array of nodes). Two node kinds:
  - **Lesson node**: `id`, `title` (`"N. Title"`; the next button shows the text after `". "`), `chapter`, `connectsTo` (ids: the first lesson id is the next lesson; satellite ids attach satellites), `transitionFromPrevious`, `levels.basic` and `levels.technical`, each `{title, content}` (there is no intermediate level any more). The lesson reads top to bottom, all visible: `basic` ("Concepto base") → demo + satellite figures → `technical` ("Perspectiva computacional", its own `title` shown beside the label unless it repeats it) → next button (`renderLessonContent`).
  - **Satellite node**: `type: "satellite-image"` (opens lightbox with `imageUrl` + `caption`) or `"satellite-logo"`; both render `logoUrl` as the node icon. Excluded from the numbered sequence.
  - **`demo`** (optional, set via `lessonDemos` at the end of `data.js`): name of an ES module `demos/<name>.js` exporting `mount(el)`, loaded lazily with `import()` into the lesson's "Pruébalo" section (after the concept base). Demos use plain JS/SVG, native `<input type="range">`, the chapter color (`--chapter-neon`), and respect `prefers-reduced-motion`.
- **`app.js`** — one view, the path: `openLesson`, `renderPathIndex` sidebar with per-chapter progress rings and search, side arrows (prev/next, navigate only) and "Completar y seguir" via `getNextLesson`. URL hash: `#<lesson-id>`, `#<satellite-id>`; no or unknown hash opens `getResumeNodeId()`. Satellites render inside their parent lesson (`lessonSatellites`): images as figures that open the lightbox, logos as collapsible `<details>`. Completing the last lesson of a chapter shows `showChapterDone`. `localStorage`: `ai-map-progress`, `ai-map-tutorial-seen`.
- **`formatMarkdown`** in `app.js`: dedents the template-literal text (otherwise marked treats 4+ space indent as code), pulls `$$…$$` / `$…$` out into placeholders, runs `marked.parse(…, { breaks: true })`, then renders the math with KaTeX. In JS strings, LaTeX backslashes must be doubled (`\\text`, `\\land`). Nested list items must be indented to the parent item's text column (3 spaces under `1. `), and a line directly after a list needs a blank line or it joins the last item. Content headings: `### Title` = collapsible section (`<details class="content-section">`, closed by default) spanning up to the next `###`, a `---` line (consumed, not drawn) or the end of the level, a paragraph that is only `**bold**` = subsection (thin chapter-color bar; lines containing `→` are left as-is). A ```` ```timeline ```` fenced block with one `date | title | text` line per milestone renders as a vertical timeline (`.timeline`); title and text accept inline markdown. The same `a | b | c` syntax drives the static visual blocks: ```` ```flow ```` (`icon | title | text`, steps joined by arrows), ```` ```cards ```` (`icon | title | text`, grid of cards) and ```` ```bars ```` (`label | width % | note`, horizontal bars); a leading `!` on a line highlights that item (`VIZ_ITEMS`). Markdown tables are for comparisons. Custom diagrams are raw `<figure class="viz-figure"><svg viewBox=…>…</svg><figcaption>…</figcaption></figure>` with no blank lines inside; inside it use the classes `line`, `box` and `hi` (chapter color), `font-size` attributes on `<text>`, and `style="max-width: …"` on small SVGs. Never put `$` inside an HTML block (it is read as math). Raw `<details class="predict"><summary>🤔 question</summary>` + blank line + markdown answer + blank line + `</details>` renders a "predict before reading" box (use `<strong>`, not `**`, inside `<summary>`).

## Gotchas when editing content

- Demos are ES modules loaded with `import()`, so the site must be served over HTTP (not `file://`).
- Chapter colors live only in `chapters[].rgb` (`data.js`); `app.js` exposes them via `chapterColor(id)` / `chapterRgb(id)` as the CSS vars `--chapter-neon`/`--chapter-neon-rgb` (lesson, index, lightbox). The `--neon-*` vars in `styles.css` are UI accents, not chapter colors.
- The narrative rule lives in `data.js` itself: each lesson's `transitionFromPrevious` states the previous topic's limitation that motivates it. It is shown at the top of its lesson, in a box without a title; there is no teaser at the end of the previous lesson, so each lesson must tell its own story. Keep lesson order, `connectsTo` chain and the "N." title numbers in sync; cross-references in text use "tema N".
- **Writing a lesson** (lesson 1 is the model): `basic` opens with a concrete scene (a person, a date, an anecdote), then short noun subheadings (`**Bold paragraph**`), lists whose items are a definition plus an italic example, and at least one static visual (`flow`, `cards`, `bars`, a table or a `viz-figure`). No "see the demo below" and no teaser of the next lesson. `technical` keeps the formulas and adds a worked numeric example or a visual where it helps. Mark invented or rounded numbers as illustrative.
- `REDISENO.md` is the plan behind the path + demos redesign (implemented; quizzes were dropped). Read it before changing navigation, lesson layout, or adding demos.
- `prompts/` holds Spanish prompt templates for generating the illustrations in `public/img/` (EdTech cartoon style, 16:9, all text in Spanish) and educational videos.
