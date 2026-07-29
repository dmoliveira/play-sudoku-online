# Suguru Cage Garden journey

Status: done
Codememory: `epic_54` / audit `task_5492` / product `task_5493` / hardening `task_5494` / release `task_5495`
Runtime session: `ses_05761cc04ffejP8v4Be5IVzikQ`

## Why this slice

The previous release made both boards mobile-safe, accessible, and recoverable. The next highest-value move is not another collection of loosely related cards: it is one finite Suguru learning journey whose entry, progress, and completion actions always say what they will do.

Evidence collected on 2026-07-28 and 2026-07-29:

- Suguru exposes 19 clue variants over four actual cage layouts (`garden`, `lantern`, `brook`, and `cascade`), so product copy must not imply 19 structurally unique boards.
- Suguru has local totals, best times, a streak, and active-game recovery, but no bounded progression record or completion ledger.
- Its hero calls an already-running untouched board “Start current board,” while several rail and victory recommendations are generic enough to obscure whether an action preserves or replaces that board.
- First-time guidance primarily sends players to an external tutorial even though the app can teach the three rules and a practical deduction order itself.
- Suguru startup previously measured cumulative layout shift around `0.186`; initially hidden hero, puzzle, and board fact rows are revealed after script execution, and initialization renders an incomplete state before restoration.
- The current baseline is green: `npm run validate`, `npm run validate:browser` (171 assertions), and `git diff --check` passed on 2026-07-29.

## Risk and validation budget

- Depth: large — the slice spans runtime state, recovery, completion, UI, tests, docs, and release.
- Risk: high — active-game persistence and victory routing change at runtime.
- Review budget: three review/fix passes, stopping early only after all required checks are green and the latest review has no blocker.

## Experience principles

1. **Earn the next move.** Progress unlocks one named step at a time; there is no fictional endless ladder.
2. **Preserve before replace.** A state-preserving action says Enter, Go to, or Continue. An action that changes the puzzle says Start, Replay, Daily, or Another clue variant.
3. **Teach inside the product.** The core rules and deduction order are available without leaving the game.
4. **Describe inventory truthfully.** The product offers four layouts and 19 curated clue variants.
5. **Keep progress local and recoverable.** Journey metadata may be discarded independently; it must never invalidate an otherwise valid active board.

## Product contract

### Four-step Cage Garden

The journey is fixed, finite, and deliberately uses every underlying layout once:

| Step | Puzzle | Level / mode | Learning focus |
| --- | --- | --- | --- |
| Garden Gate | `suguru-size5-garden-path` | Easy / Classic | Use each cage's `1–N` range |
| Lantern Walk | `suguru-size5-morning-rhythm` | Easy / Classic | Include diagonal touching neighbors |
| Brook Crossing | `suguru-size5-brook-bridge` | Bridge / Classic | Cross-check cage candidates against neighbors |
| Cascade Finale | `suguru-size5-cascade-midnight-path` | Challenge / Classic | Combine range and touching-neighbor deductions |

- Among incomplete steps, the first incomplete step is the only unlocked and startable next step. Completed steps remain replayable.
- The current step is deterministic; random and Daily selection remain separate.
- A step receives credit only when that exact puzzle was launched with valid Cage Garden context and solved in the expected level and mode.
- Replaying a completed step is allowed but idempotent.
- Completing Cascade Finale produces a real `4/4` terminal state. The earned next action becomes today's clue variant; replaying Garden Gate remains available as a secondary action.

### Entry and completion truthfulness

Boot provenance is derived once before the app writes a new resume record:

- `preloaded-journey`: a fresh visitor gets Garden Gate preloaded and sees `Enter Garden Gate`; the action only moves focus to the board. A returning visitor without an active run gets the first incomplete step preloaded and sees `Enter <step name>`.
- `restored-resume`: a visitor with a valid active run sees `Continue <puzzle label>` and focuses that exact restored board, even when it has zero elapsed seconds.
- `ordinary-untouched`: an ordinary board with no edits uses `Go to current board`.
- `active-progress`: an edited or elapsed board uses `Continue current board` when no more specific restored label applies.
- An untouched ordinary Sudoku or Suguru board uses `Go to current board`, never `Start current board`, because its timer and recovery state already exist.
- Daily actions say `Start today's clue variant` or `Replay today's clue variant` and replace the current board only when activated.
- Non-journey completion says `Another <level> clue variant`, not “another unique board.”
- Journey victories focus the earned next-step action. Ordinary victories focus the explicit play-another action. Pause and victory inert/focus trapping remain intact.

### Internal guide

The collapsed setup/help area contains a permanent internal guide with:

1. cage range: an N-cell cage contains `1–N` once each;
2. touch rule: equal values cannot touch in any of eight directions;
3. deduction order: cage range, touching neighbors, cross-check, then notes;
4. mode differences and local-only progress behavior;
5. truthful inventory: four layouts, 19 curated clue variants.

For first-time players, the hero's secondary action opens the help panel and focuses `#cage-garden-guide-title`, honoring reduced motion. The external walkthrough remains optional further reading, not the primary prerequisite.

## State and recovery model

### Journey progress

Key: `sudoku-sakura-suguru-cage-garden`

```json
{
  "version": 1,
  "journeyId": "cage-garden-v1",
  "completedSteps": {
    "garden-gate": {
      "puzzleId": "suguru-size5-garden-path",
      "level": "size5-easy",
      "mode": "classic",
      "seconds": 123,
      "mistakes": 0,
      "completedAt": "2026-07-29T12:00:00.000Z"
    }
  }
}
```

- Accept only known step IDs whose puzzle, level, and mode match the definition; times and mistakes must be non-negative integers and completion dates valid strings.
- Normalize to the longest contiguous completed prefix. Ignore orphan later steps.
- Missing, malformed, array-shaped, wrong-journey, or unsupported-version data becomes empty journey progress without changing stats or resume.
- Derive unlock state from completed steps; do not persist a separate unlocked index.
- Ignore storage write failures without interrupting play.

### Resume migration

- Save Suguru resume records as version 2 with optional `journeyId` and `journeyStepId` fields.
- An absent version is a legacy core snapshot and has no journey context. Version 2 validates both journey fields atomically. Any other version may restore a valid core snapshot as ordinary play but loses journey context.
- Journey context is valid only when journey ID, step ID, puzzle ID, level, mode, and contiguous unlock state all agree. Strip invalid journey metadata while retaining a valid core board snapshot.
- Restarting the same puzzle preserves valid journey context. Every level, mode, Daily, random, hero replacement, or another-variant launch clears it unless it explicitly starts a Cage Garden step.
- Keep the existing clear-and-safe-start fallback for invalid puzzle, board, notes, level, or mode data. Invalid core resume clears only resume data; journey progress and stats remain intact.
- Progress remains out of shared URLs. Existing `game`, `level`, `mode`, `notes`, and `mistakes` parameters remain the public contract.

Startup precedence is explicit:

| Route/storage state | Result |
| --- | --- |
| Bare route + valid core resume | Restore any saved level/mode and its valid journey context, if present |
| Explicit gameplay settings + matching valid core resume | Restore that resume |
| Explicit gameplay settings + no matching valid core resume (missing, invalid, or mismatched) | Clear invalid resume if present, start the requested ordinary/Daily clue variant, and clear active journey context |
| Bare route + invalid core resume | Clear only resume; then follow the bare-route no-resume journey path |
| Bare route + no resume + incomplete journey | Preload the first incomplete step |
| Bare route + no resume + `4/4` journey | Start an ordinary Easy Classic clue variant |

## Implementation sequence

1. **Contract tests first**
   - Confirm the 171-assertion baseline is green.
   - Add browser assertions for state-preserving labels, newcomer/returning readiness, the exact four-step journey, persistence/idempotency, resume migration, malformed storage, victory routing/focus, and startup CLS. Seed documented localStorage records, derive near-solved boards from `window.SUGURU_PUZZLES`, and act through DOM controls.
   - Install a pre-document buffered `PerformanceObserver`, exclude entries with `hadRecentInput`, settle for two animation frames plus a fixed delay, and measure both empty storage and a valid long-label restored run at all five viewports.
   - Add static assertions only for stable IDs, ARIA relationships, and guide/inventory copy; do not parse JavaScript implementation details. Isolate browser scenarios so one evaluation failure is reported without hiding later scenarios.
   - Record the expected red result before runtime implementation. Red-phase exit criterion: the original 171 assertions and harness stay green; only newly added contract checks fail.
2. **Product experience (`task_5493`)**
   - Add local Cage Garden definitions, normalization, deterministic launch context, resume v2 metadata, and completion recording in `suguru-app.js`.
   - Repurpose the generic featured card into the four-step Cage Garden ledger and make the next-step rail context precise.
   - Make hero and victory actions truthful and add the permanent internal guide.
   - Apply the narrow untouched-board wording parity fix to Sudoku.
3. **Hardening (`task_5494`)**
   - Remove Suguru's incomplete pre-restore render pass.
   - Replace initially hidden summary/fact rows with reserved truthful placeholders and scoped sizing.
   - Exercise malformed/legacy storage, manual-board non-credit, Daily replacement, game switching, themes, contrast, and reduced motion.
   - Update README and validation documentation, including a pinned Lighthouse invocation that records the performance category separately from hard accessibility/best-practices/SEO gates.
4. **Release (`task_5495`)**
   - Run all local gates and three risk-budget review/fix passes.
   - Capture focused 390 px and 1440 px newcomer, returning, intermediate-victory, final-victory, Night, and high-contrast screenshots outside the repo.
   - Run pinned Lighthouse 13.4.1 mobile/desktop audits, open one PR, review/fix, compare against current `origin/main`, merge, verify the exact Pages SHA, and clean up the branch/worktree.

## Acceptance criteria

### Journey and persistence

- The journey launches the four named puzzle IDs in order and uses all four layouts exactly once.
- The ledger renders every step as Complete, Ready, Active, or Locked. Completed steps are replayable; among incomplete steps, only the first is startable.
- Reload during an active step restores its exact board and credit context. Reload after completion retains the contiguous ledger.
- A matching puzzle launched from level/mode controls, Daily, or another-clue-variant actions does not receive journey credit.
- A replay cannot duplicate or regress progress, and final completion remains `4/4`.
- Legacy resume restores; malformed journey metadata cannot erase a valid board; malformed core resume safely falls back.

### Truthful interaction and accessibility

- State-preserving board-entry hero actions do not change puzzle ID, board, timer, stats, journey progress, or URL and focus `#game-title`. The first-time guide action instead opens help and focuses `#cage-garden-guide-title`.
- Every board-replacing action names the replacement. Newcomer and returning labels match the boot disposition, including a zero-second restored run.
- `#victory-new-game-button` is the focused primary action for an intermediate next step, final Daily, and an ordinary another-variant action. On final completion, `#victory-secondary-button` replays Garden Gate. The existing trap order and modal inert behavior remain unchanged.
- ARIA grid structure, keyboard/touch input, board/keypad focus provenance, pause/victory inert state, focus cycling, reduced motion, and current URL/recovery behavior remain green for both games.
- The internal guide is reachable by anchor and keyboard, covers all three rules/deduction order, and identifies four layouts / 19 clue variants.

### Layout, performance, and release

- At 320, 390, 500, 720, and 1440 CSS pixels, both games retain square boards, natural flow, no horizontal overflow, and no keypad overlap.
- Deterministic local Chrome startup CLS for Suguru is at most `0.02` at every browser-suite viewport with remote fonts blocked.
- Pinned Lighthouse 13.4.1 mobile/desktop accessibility is at least 98; best-practices and SEO are 100; target ARIA audit nodes remain zero. Lighthouse performance, CLS, FCP, and LCP are recorded for review but are observational; deterministic browser CLS is the hard performance gate.
- `npm run validate`, `npm run validate:browser`, `git diff --check`, focused screenshots, and the pinned Lighthouse matrix pass on the final diff.
- The exact deployed SHA passes `/`, `/suguru.html`, active/paused recovery, journey persistence, Daily handoff, game switching, console, internal links, `robots.txt`, and `sitemap.xml` smoke checks.

## Hardening evidence

Evidence collected on 2026-07-29:

- Test-first development moved from the 171-assertion baseline through expected contract-red runs (`21/216`, `10/227`, and `2/245` failures) to 245 passing Chrome/CDP assertions.
- The final browser matrix covers malformed and noncontiguous journey records, legacy/unsupported resume versions, explicit URL precedence and aid persistence, restart context, ordinary non-credit solves, all four completions, replay idempotency, pending setup, sticky-safe destinations, and full pause/victory inertness for both games.
- Eleven exact 390 × 844 and 1440 × 1000 state captures passed visual review under `/tmp/ai-sudoku-round2/final-screenshots`, including newcomer, zero-second returner, guide, intermediate/final victory, Night, and high-contrast states.
- Lighthouse 13.4.1 scored accessibility, best practices, and SEO at 100 for both routes and form factors. Suguru performance was 88 mobile / 98 desktop, with CLS `0` / `0.044`; reports are under `/tmp/ai-sudoku-round2/lighthouse`.
- Review fixes also made level/mode selection non-destructive until an explicit launch, moved victory-action focus into the next board, removed every background control from modal focus navigation, and raised text-bearing gradient endpoints above 4.5:1 contrast.

## Explicitly deferred

- New Suguru layouts, procedural generation, or claims of 19 unique boards.
- A rotating Suguru weekly path, session history, ranks, achievements, or generalized cross-game progression engine.
- Journey deep links, accounts, cloud sync, leaderboards, analytics, or social profiles.
- Broad extraction of `app.js` or `suguru-app.js` into modules.
- Font self-hosting, a broad visual redesign, or unrelated modal/background work.
- Changes to Sudoku's established weekly storage or puzzle data.
- Any runtime file outside `suguru-app.js`, `suguru.html`, and `styles.css`, except the one localized untouched-board label change in `app.js`; `suguru-puzzles.js` remains read-only data.

## Outcome

Delivered in core commit `9af553a`:

- added the deterministic Garden Gate → Lantern Walk → Brook Crossing → Cascade Finale journey across all four Suguru layouts
- added versioned, independently validated local progress and resume migration without changing the existing stats schema
- made newcomer, returner, setup, Daily, victory, and replay actions name whether they preserve or replace the active board
- added an internal three-rule guide, pending level/mode setup, concise responsive controls, sticky-safe focus destinations, and contrast-safe journey states
- closed pause/victory background focus leaks in both games and moved both games' victory actions into the newly launched board
- expanded deterministic Chrome/CDP validation from 171 to 245 assertions, with all fast/browser checks green
- achieved Lighthouse 13.4.1 accessibility, best-practices, and SEO scores of 100 on both routes and form factors; Suguru performance measured 88 mobile / 98 desktop with CLS `0` / `0.044`
- approved 11 exact final visual states under `/tmp/ai-sudoku-round2/final-screenshots`

## Rollback

The journey is isolated behind one new storage key and optional resume metadata. If post-merge smoke finds a recovery or completion regression, revert the release commit: legacy stats and valid pre-release resume fields remain readable, and the new journey record can safely remain unused in local storage.
