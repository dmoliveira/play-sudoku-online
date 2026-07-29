# Sudoku Sakura

A calm, Japanese-inspired home for Sudoku and Suguru, built with plain HTML, CSS, and JavaScript for GitHub Pages.

**Play:** https://dmoliveira.github.io/play-sudoku-online/

## What makes it fun

- Sudoku from easy through expert, plus Suguru cage logic
- Reproducible Daily editions, focused challenge modes, Sudoku weekly paths, and Suguru’s finite four-step Cage Garden
- Notes, undo/redo, technique-aware hints, checks, pause/resume, and local game recovery
- Streaks, best times, ranks, achievements, recent solves, local Cage Garden progress, and shareable finish summaries
- Optional Symbol Play with Petal and Moon mappings, memory tiers, tutorials, and limited Bloom assists
- Garden, Ink, Sakura Night, high-contrast, reduced-motion, keyboard, touch, and screen-reader support

The experience is **board first**: core play stays prominent, while setup, learning, mastery, and extra challenges use progressive disclosure. Suguru’s Cage Garden teaches one concept across each of the four underlying cage layouts; its 19 curated puzzles are clue variants over those layouts, not 19 different cage maps. Level and mode choices stay pending until the named launch button replaces the active board.

Progress is local to the browser—there is no account, ad tracker, or server-side leaderboard.

## Verified Daily editions

A Daily URL identifies an exact local-calendar edition and immutable puzzle corpus, so it opens the same board after midnight and on another device:

```text
/index.html?game=sudoku&difficulty=easy&mode=daily&edition=2026-07-29&corpus=sudoku-daily-v1
/suguru.html?game=suguru&level=size5-easy&mode=daily&edition=2026-07-29&corpus=suguru-daily-v1
```

`mode=daily` without an edition is a shortcut for today and canonicalizes automatically. Supported past editions remain playable and are labelled **Past Daily**; future, malformed, partial, or unknown edition links fall back visibly to today. Switching games keeps the date and uses the target game’s corpus. Corpus IDs freeze puzzle identity and selection behavior; changing a v1 puzzle requires a new corpus version rather than silently changing old links.

Only edition identity is public. Completion, time, mistakes, assists, streaks, board state, Weekly/Cage Garden context, and active-game recovery remain in `localStorage`. Each game derives its own **local Daily streak** from validated edition results, and ambiguous legacy Daily saves keep their board as ordinary Classic play without receiving Daily credit.

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

The browser suite starts an isolated local server and browser profile, then runs 550 deterministic assertions across both games at phone, tablet, and desktop widths. It covers responsive geometry and startup CLS, board-first keypad flow, ARIA rows, staged logic coaching, structural practice rotation, solved-board review, digit entry, undo, arrows, pause/result inertness, resume and malformed-state recovery, verified Daily/Weekly/Cage Garden credit isolation, sharing across fixed clocks and timezones, and Symbol Play. Set `CHROME_PATH=/path/to/chrome` when Chrome is not in a standard location.

See [docs/validation.md](docs/validation.md) for the full matrix and pinned Lighthouse accessibility gate.

## Project map

- `index.html`, `app.js` — Sudoku experience and progression
- `suguru.html`, `suguru-app.js` — Suguru experience and progression
- `sudoku.js`, `suguru.js` — puzzle rules and solving helpers
- `puzzles.js`, `suguru-puzzles.js` — curated puzzle data
- `daily-editions.js` — immutable Daily corpora, strict dates, selection, identity validation, and streak helpers
- `games.js`, `game-switcher.js` — shared game metadata and source-aware URL navigation
- `styles.css` — responsive visual system, themes, board geometry, and accessibility states
- `scripts/` — data, page-contract, syntax, and real-browser validation
- `docs/plan/` — reviewed delivery plans and outcomes

## Local data and privacy

Settings, active games, verified Daily/weekly results, Cage Garden progress, history, and achievements use `localStorage`. Clearing site data resets them. Daily share URLs contain only game, band, date, and corpus identity; ordinary links may contain play settings. Neither contains personal progress, result metrics, journey credit, or board contents.

Sound is generated locally with the Web Audio API. Google Fonts are the only third-party page request.

## Publish on GitHub Pages

The production site deploys from the repository root on `main`.

1. Push a reviewed branch and open a pull request.
2. Run both validation commands and the release checks in `docs/validation.md`.
3. Merge only after checks and review pass.
4. Verify the deployed commit on both `/` and `/suguru.html`.

If the repository name changes, update canonical URLs in the HTML pages, `robots.txt`, `sitemap.xml`, and Open Graph metadata.
