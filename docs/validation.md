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
- deterministic generator-v2/v3 first-party content, bounded construction/search caps, frozen-v2 hashes, Pair Focus evidence, logic-profile, structural practice-rotation, and independent LogicCoach proof checks
- pure Challenge Compass priority/immutability and fail-closed boolean focus-result normalization
- static page wiring, duplicate-ID, ARIA-reference, visible-name, board-replacement marker, Daily-card, and script-order checks
- `node --check` for every runtime JavaScript file

### Browser gate

```bash
npm run validate:browser
```

Requirements: Node 22+ and Chrome/Chromium. Override browser discovery with `CHROME_PATH`.

The script uses only Node built-ins and the Chrome DevTools Protocol. It creates an isolated profile, blocks remote fonts for deterministic local geometry, and runs 863 assertions for Sudoku and Suguru at 320, 390, 500, 720, and 1440 CSS pixels. Daily scenarios use fixed instants plus explicit UTC-positive and UTC-negative timezones so rollover behavior is reproducible.

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
- pure Fresh challenge preview before confirmation, byte-stable Keep/Escape, exact-once commit and launch, Daily-to-Classic normalization, ordinary provenance, duplicate-submit locking, and storage-failure session fallback
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
- solved recovery snapshots are rejected before restore or source credit, including failed-cleanup reloads
- exact per-key storage faults produce deduplicated active warnings and one non-live victory disclosure
- stats, recent solves, Daily, Weekly, Cage Garden, Focus, practice rotation, and resume failures remain isolated
- completion writes follow the fixed domain order, continue after failures, preserve frozen payload fields, and remove resume data last
- Weekly and Cage Garden full-ledger retries preserve first-completion metrics while affected items remain session-only
- healthy, partial, mixed, and cleanup-failed victory copy fits at 320/390/1440 and 200% text
- no uncaught runtime exceptions in exercised flows

## Round-seven pre-merge evidence

The 2026-08-05 release candidate passed the following local evidence gates:

- `npm run validate`, `npm run validate:browser` (863 assertions), and `git diff --check` passed; two complete regenerations were byte-identical.
- The selectable inventories are exactly 288 Sudoku IDs across 32 families and 44 Suguru entries across 12 named layouts/10 structural families.
- `generated-content.js` is 57,461 bytes with SHA-256 `9e701bd561880e202a7212d145373a6239f8265bc361c4eba8e9e09b1b97f12e`. The frozen-v2 payload remains 14,731 bytes with SHA-256 `30fbd84229a02f60d2e52f415e4a2c560163c6f2943723edeaf36cac7893bc0a`.
- Canonical frozen manifests remain Sudoku Daily/Weekly `8e42b94ed1a1c5aa774fd2843e3a430505e7dfa7be71bb4ac819bfa5bd412534`, Suguru Daily `304d1514c4dd5bed64e2f1d3370f07e5e692f42dcd7b5437219c2929c9d3659a`, and Cage Garden ordered descriptors `cd13388e042f53230ef7c8b77f4c00ddf4b6207e91ebcecfbbeea7ff2228fc58`.
- Manual source-artifact review covered all ten new Sudoku source masks plus one deterministic structural transform per source, all six new Suguru cage maps, and all eighteen Easy/Bridge/Challenge clue sets. Clue balance, declared symmetry, unit spread, cage readability, tier differentiation, and honest LogicCoach profiles matched their pinned metadata.
- The real-browser Fresh scenario exercised Keep, Escape, duplicate Confirm, storage denial, completion in both games, and a pending Daily boundary; it preserved special ledgers and launched ordinary provenance only.

Lighthouse 13.4.1 hard categories scored 100 accessibility, 100 best practices, and 100 SEO on both routes in mobile and desktop profiles, with zero `aria-required-children`, `aria-required-parent`, and `label-content-name-mismatch` nodes. Observed performance was:

| Route | Profile | Performance | FCP | LCP | CLS |
|---|---|---:|---:|---:|---:|
| Sudoku | Mobile | 71 | 4,564 ms | 4,564 ms | 0 |
| Sudoku | Desktop | 98 | 860 ms | 860 ms | 0.02413 |
| Suguru | Mobile | 78 | 3,795 ms | 3,795 ms | 0 |
| Suguru | Desktop | 98 | 779 ms | 779 ms | 0.07604 |

Performance remains observational because remote-font timing varies. The dependency-free browser suite retained the hard deterministic CLS limit of `0.02`. Lighthouse JSON remains outside the repository. PR merge, exact-SHA Pages status, deployed byte parity, and production smoke belong in GitHub/Codememory after deployment rather than in this pre-merge evidence.

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
10. In both games, edit a value or note and activate Fresh challenge. Verify Keep/Escape preserves board, URL, storage bytes, and focus; Confirm launches exactly once with ordinary provenance; pending Daily becomes Classic; and completing the board earns no Daily/Weekly/Cage Garden/Focus credit.
11. In both games, edit a value or note and activate Replace and Restart. Verify Keep/Escape preserves state and focus, confirmation executes once, timer-only boards bypass, and action-specific copy names the discarded data.
12. Verify `/`, `/suguru.html`, one canonical Daily route per game, `generated-content.js`, `challenge-compass.js`, `board-replacement.js`, `daily-editions.js`, `robots.txt`, and `sitemap.xml` return successfully.

## Rollback compatibility

Sudoku resume v2 and Suguru resume v3 add exclusive source, Daily provenance, and optional `focusLaunchId` fields. A release rollback must retain the new provenance reader or first deploy a compatibility patch that refuses newer resumes. Do not raw-revert to a runtime that would interpret a newer Daily save using mode alone.

Round-five rollback is a forward patch: keep Focus data resolvable for saved boards, mark a defective entry `selectable: false`, omit it from Compass and practice, preserve the boolean focus-result ledger, and disable the replacement marker/adapter without changing frozen registries or schemas. The browser gate’s named `forward rollback compatibility` scenario exercises this exact composition for both games.

Store screenshots and audit JSON outside the repository unless they are intentionally curated release artifacts.
