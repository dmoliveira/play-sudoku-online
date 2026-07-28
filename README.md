# Sudoku Sakura

A calm, Japanese-inspired home for Sudoku and Suguru, built with plain HTML, CSS, and JavaScript for GitHub Pages.

**Play:** https://dmoliveira.github.io/play-sudoku-online/

## What makes it fun

- Sudoku from easy through expert, plus Suguru cage logic
- Daily boards, focused challenge modes, featured recommendations, and weekly paths
- Notes, undo/redo, technique-aware hints, checks, pause/resume, and local game recovery
- Streaks, best times, ranks, achievements, recent solves, and shareable finish summaries
- Optional Symbol Play with Petal and Moon mappings, memory tiers, tutorials, and limited Bloom assists
- Garden, Ink, Sakura Night, high-contrast, reduced-motion, keyboard, touch, and screen-reader support

The experience is **board first**: core play stays prominent, while setup, learning, mastery, and extra challenges use progressive disclosure. Progress is local to the browser—there is no account, ad tracker, or server-side leaderboard.

## Run locally

No build step is required. Serve the repository so URL state and browser checks behave like GitHub Pages:

```bash
python3 -m http.server 4173
```

Then open http://127.0.0.1:4173/.

## Validate changes

Requirements:

- Node.js 22 or newer
- Chrome or Chromium for browser validation

Run the fast data, wiring, accessibility-contract, and syntax checks:

```bash
npm run validate
```

Run the dependency-free Chrome DevTools Protocol suite:

```bash
npm run validate:browser
```

The browser suite starts an isolated local server and browser profile, then checks both games across phone, tablet, and desktop widths. It covers responsive geometry, ARIA rows, focus provenance, digit entry, undo, arrows, pause/resume, matching-query recovery, hero handoff, malformed state, and Symbol Play. Set `CHROME_PATH=/path/to/chrome` when Chrome is not in a standard location.

See [docs/validation.md](docs/validation.md) for the full matrix and pinned Lighthouse accessibility gate.

## Project map

- `index.html`, `app.js` — Sudoku experience and progression
- `suguru.html`, `suguru-app.js` — Suguru experience and progression
- `sudoku.js`, `suguru.js` — puzzle rules and solving helpers
- `puzzles.js`, `suguru-puzzles.js` — curated puzzle data
- `games.js`, `game-switcher.js` — shared game metadata and URL-preserving navigation
- `styles.css` — responsive visual system, themes, board geometry, and accessibility states
- `scripts/` — data, page-contract, syntax, and real-browser validation
- `docs/plan/` — reviewed delivery plans and outcomes

## Local data and privacy

Settings, active games, daily/weekly progress, history, and achievements use `localStorage`. Clearing site data resets them. Shared links contain game settings in the URL, not personal progress.

Sound is generated locally with the Web Audio API. Google Fonts are the only third-party page request.

## Publish on GitHub Pages

The production site deploys from the repository root on `main`.

1. Push a reviewed branch and open a pull request.
2. Run both validation commands and the release checks in `docs/validation.md`.
3. Merge only after checks and review pass.
4. Verify the deployed commit on both `/` and `/suguru.html`.

If the repository name changes, update canonical URLs in the HTML pages, `robots.txt`, `sitemap.xml`, and Open Graph metadata.
