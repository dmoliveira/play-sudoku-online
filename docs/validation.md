# Validation guide

Sudoku Sakura has no build step, so validation focuses on puzzle integrity, page contracts, JavaScript syntax, real browser behavior, accessibility, and the deployed GitHub Pages result.

## Required local gates

### Fast gate

```bash
npm run validate
```

This runs:

- Sudoku puzzle shape, clue consistency, solution, and uniqueness checks
- Suguru cage, clue, solution, and uniqueness checks
- static page wiring, duplicate-ID, ARIA-reference, visible-name, and play-shell order checks
- `node --check` for every runtime JavaScript file

### Browser gate

```bash
npm run validate:browser
```

Requirements: Node 22+ and Chrome/Chromium. Override browser discovery with `CHROME_PATH`.

The script uses only Node built-ins and the Chrome DevTools Protocol. It creates an isolated profile, blocks remote fonts for deterministic local geometry, and validates Sudoku and Suguru at 320, 390, 500, 720, and 1440 CSS pixels.

Hard assertions include:

- no horizontal overflow or mobile keypad overlap
- natural play-shell order and static mobile keypad
- square boards with 9 x 9 or 5 x 5 ARIA row/cell structure
- no focus movement on normal load and correct focus on paused restore
- board and keypad focus preservation after DOM replacement
- digit input, arrows, undo, pause/inert, and resume
- state-preserving current-board hero action and explicit daily handoff
- matching URL/resume recovery and wrong-shaped storage fallback
- passive versus explicitly enabled Symbol Play help behavior
- no uncaught runtime exceptions in exercised flows

## Lighthouse accessibility gate

Use the pinned audit version so results are comparable:

```bash
python3 -m http.server 4173
npx --yes --package=lighthouse@13.4.1 lighthouse \
  http://127.0.0.1:4173/index.html \
  --chrome-flags='--headless=new --no-first-run --disable-gpu' \
  --only-categories=accessibility,best-practices,seo
```

Repeat for `suguru.html` and with `--preset=desktop`.

Release requirements:

- accessibility score at least 98 on both routes and form factors
- zero nodes for `aria-required-children`
- zero nodes for `aria-required-parent`
- zero nodes for `label-content-name-mismatch`
- best-practices and SEO scores of 100

Performance is observed, not hard-failed by this static-site gate, because network font timing varies. Regressions in layout shift, first contentful paint, or largest contentful paint still require review.

## Manual release smoke

Before merge and again on the exact deployed commit:

1. Start and edit one Sudoku and one Suguru board.
2. Exercise keyboard arrows, number input, notes, undo/redo, pause/resume, and one aid.
3. Reload an active and a paused game; confirm state and focus recovery.
4. Open a daily link and switch between games without losing advertised settings.
5. Check 390 px mobile, desktop, Night, high contrast, and reduced motion.
6. Confirm no horizontal scroll, obscured controls, console errors, or broken internal links.
7. Verify `/`, `/suguru.html`, `robots.txt`, and `sitemap.xml` return successfully.

Store screenshots and audit JSON outside the repository unless they are intentionally curated release artifacts.
