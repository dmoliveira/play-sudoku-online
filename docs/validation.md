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
- immutable Daily and Weekly corpus fingerprints, hash/golden vectors, strict date handling, and streak normalization
- deterministic generator-v2 first-party content, bounded Pair Focus evidence, logic-profile, structural practice-rotation, and independent LogicCoach proof checks
- pure Challenge Compass priority/immutability and fail-closed boolean focus-result normalization
- static page wiring, duplicate-ID, ARIA-reference, visible-name, board-replacement marker, Daily-card, and script-order checks
- `node --check` for every runtime JavaScript file

### Browser gate

```bash
npm run validate:browser
```

Requirements: Node 22+ and Chrome/Chromium. Override browser discovery with `CHROME_PATH`.

The script uses only Node built-ins and the Chrome DevTools Protocol. It creates an isolated profile, blocks remote fonts for deterministic local geometry, and runs 631 assertions for Sudoku and Suguru at 320, 390, 500, 720, and 1440 CSS pixels. Daily scenarios use fixed instants plus explicit UTC-positive and UTC-negative timezones so rollover behavior is reproducible.

Hard assertions include:

- no horizontal overflow, mobile keypad overlap, or board-to-keypad gap above 160 px
- natural board → entry mode → keypad order, static mobile keypad, and 44 px board controls
- square boards with 9 x 9 or 5 x 5 ARIA row/cell structure
- no focus movement on normal load and correct focus on paused restore
- board and keypad focus preservation after DOM replacement
- digit input, arrows, undo, resume, staged coaching, and full pause/result background inertness
- read-only solved-board review, result reopen/Escape focus, accessible Share outcomes, and byte-identical credit during repeated transitions
- state-preserving, sticky-safe hero/guide destinations and explicit board-replacement labels
- one deterministic Compass descriptor mirrored across recommendation surfaces, qualified Pair Focus launches, explicit-launch completion credit, storage-failure memory fallback, and unchanged practice rotation
- exact disabled-focus resume with practice/Compass exclusion and a guard-disabled forward-rollback launch
- pre-side-effect Replace/Restart decisions for value, note, mistake, Check, and successful-aid progress; timer-only, unsuccessful-aid, completed, and already-paused bypass behavior
- byte-stable Keep/Escape paths, exact-once successful/failed confirmation, native modal focus containment, and 320/390/1440 plus 200%-text dialog geometry
- allowlisted URL precedence, pending setup, Sudoku resume-v2/Suguru resume-v3 migration, and malformed/noncontiguous storage fallback
- canonical Today/Past Daily editions, future/invalid fallback, immutable corpus vectors, exact resume matching, and timezone rollover
- verified local Daily ledgers/streaks, immediate progress status, off-Daily result access, identity-only sharing, and Weekly/Cage Garden credit isolation
- fixed mobile victory geometry/title-first focus, Night Symbol Daily contrast, and compact 320 px result cards
- the deterministic four-step Cage Garden, replay idempotency, and non-journey credit isolation
- startup CLS at or below `0.02` for both empty-storage games and long-label restored Suguru state
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

Record performance separately so network-sensitive metrics stay observational rather than weakening the hard accessibility gate:

```bash
npx --yes --package=lighthouse@13.4.1 lighthouse \
  http://127.0.0.1:4173/suguru.html \
  --chrome-flags='--headless=new --no-first-run --disable-gpu' \
  --only-categories=performance \
  --output=json \
  --output-path=/tmp/suguru-lighthouse-performance.json
```

Repeat with `--preset=desktop`. Keep JSON and screenshots outside the repository.

Release requirements:

- accessibility score at least 98 on both routes and form factors
- zero nodes for `aria-required-children`
- zero nodes for `aria-required-parent`
- zero nodes for `label-content-name-mismatch`
- best-practices and SEO scores of 100

Lighthouse performance is observed, not hard-failed, because network font timing varies. The dependency-free browser suite is the hard local layout gate: with remote fonts blocked, both games must stay at or below `0.02` for empty storage, and the valid long-label Suguru resume must do the same at every tested width. Lighthouse CLS, first contentful paint, and largest contentful paint still require review.

## Manual release smoke

Before merge and again on the exact deployed commit:

1. Start and edit one Sudoku and one Suguru board; exercise arrows, number input, notes, undo/redo, pause/resume, and one aid.
2. Open pairless Daily mode in both games and confirm the URL gains today’s literal `edition` and the correct corpus.
3. Open a supported past canonical URL after a simulated/current date rollover; confirm the same puzzle, **Past Daily** label, exact reload recovery, and cross-game date preservation.
4. Complete a Daily in each game, confirm **Solved locally**, local Daily streak, result availability after switching to Classic, exact-edition replay, and identity-only share URL.
5. Complete a Sudoku Weekly step whose defaults use Daily mode and a Suguru Cage Garden step; confirm neither receives Daily credit and neither shares a pairless Daily URL.
6. Seed/check ambiguous legacy Daily recovery: preserve the board as ordinary Classic, while current versioned Daily resumes restore exact provenance.
7. Check 320/390 px mobile result scrolling and title-first focus, solved-board Review/View result/Escape, 390 px Daily cards, 1440 px hierarchy, Night Symbol Daily contrast, high contrast, and reduced motion.
8. Confirm no horizontal scroll, obscured controls, console errors, broken internal links, or startup CLS regression.
9. Qualify for and open Sudoku `hard-pair-current-a-r0` and Suguru `suguru-size5-mist-pair-current`; confirm the visible LogicCoach v1 evidence is respectively 3 eliminations/41 later placements and 4 eliminations/17 later placements, and that ordinary provenance does not earn Focus credit.
10. In both games, edit a value or note and activate Replace and Restart. Verify Keep/Escape preserves state and focus, confirmation executes once, timer-only boards bypass, and action-specific copy names the discarded data.
11. Verify `/`, `/suguru.html`, one canonical Daily route per game, `generated-content.js`, `challenge-compass.js`, `board-replacement.js`, `daily-editions.js`, `robots.txt`, and `sitemap.xml` return successfully.

## Rollback compatibility

Sudoku resume v2 and Suguru resume v3 add exclusive source, Daily provenance, and optional `focusLaunchId` fields. A release rollback must retain the new provenance reader or first deploy a compatibility patch that refuses newer resumes. Do not raw-revert to a runtime that would interpret a newer Daily save using mode alone.

Round-five rollback is a forward patch: keep Focus data resolvable for saved boards, mark a defective entry `selectable: false`, omit it from Compass and practice, preserve the boolean focus-result ledger, and disable the replacement marker/adapter without changing frozen registries or schemas. The browser gate’s named `forward rollback compatibility` scenario exercises this exact composition for both games.

Store screenshots and audit JSON outside the repository unless they are intentionally curated release artifacts.
