# Board-first interaction stabilization

Status: doing
Codememory: `epic_49` / audit `task_5468` / implementation `task_5469`
Runtime session: `ses_05761cc04ffejP8v4Be5IVzikQ`

## Why this slice

Sudoku Sakura already has rich challenge, progression, and learning systems. The highest-impact next step is to make that existing depth easier to enter on phones and more accurate for assistive technology—not add another mode.

Evidence collected on 2026-07-28:

- 390 x 844 browser captures show the bottom-sticky number pad pulled above its normal position, covering board-heading and setup/status content in both games.
- Mobile flex ordering puts the inline help action and Sudoku feedback before the board heading.
- Suguru can expand a 390 px document to 433 px because controls retain intrinsic minimum widths.
- Lighthouse accessibility is 90 for Sudoku and 91 for Suguru. Both ARIA grids directly contain `gridcell` elements instead of required `row` elements, and brand/keypad labels fail label-in-name checks.
- Core editing, arrow movement, undo, pause/inert, resume, URL state, and malformed-JSON fallbacks work in browser smoke checks.
- Lighthouse performance is strong on desktop; mobile font/network delay and Suguru CLS are real but secondary to play-shell correctness.

Local evidence is under `/tmp/ai-sudoku-visual-audit`, `/tmp/ai-sudoku-lighthouse`, and `/tmp/ai-sudoku-browser-flow`.

## Experience principles

1. Play before explain.
2. Keep source, visual, focus, and accessibility-tree order aligned.
3. Use one clear action to enter the active board.
4. Preserve progressive disclosure for modes, mastery, and challenges.
5. Ship Sudoku and Suguru behavior in parity.

## Decisions from plan review

- Mobile uses natural source order; no CSS `order` reordering remains. The keypad is static at widths up to 720 px.
- ARIA rows are real nested grids, not `display: contents`: the board has one column and equal rows; each `.board-row` has equal columns and zero intrinsic minimums.
- A normal fresh or restored load does not move focus. A restored paused run is the exception and focuses Resume inside the modal.
- Board rerenders restore cell focus only when focus originated in the board. Keypad rerenders preserve the activated digit button instead of dropping focus.
- Setup help stays closed for default, restored, and URL-driven Symbol Play loads. A user-initiated Symbol Play toggle may open help/tutorial; an invisible tutorial never captures digit keys.
- Both games get a state-preserving primary hero action for the current board. The secondary hero action explicitly starts/replays today’s board, then enters it. Challenge progression remains in existing next-step/featured/weekly surfaces.
- Static validation checks only static markup contracts. A committed Chrome/CDP browser validator owns dynamic geometry, focus, state-preservation, and interaction assertions.
- Broader modal-background isolation is tracked separately; this slice must not weaken existing pause/victory inert behavior.

## In scope

1. **Mobile flow**
   - Remove mobile-only flex/order rules that put unassigned children first.
   - Make the number pad normal-flow at widths up to 720 px so it never covers prior content.
   - Constrain control children, labels, selects, and buttons to their grid tracks; use one column if needed at the narrowest breakpoint.
   - Keep setup help collapsed until an explicit help or Symbol Play action opens it.

2. **Board accessibility and focus**
   - Render 9 Sudoku and 5 Suguru `role="row"` wrappers with cells as row children.
   - Preserve square geometry, box/cage borders, descendant selectors, arrows, selected state, pause/inert behavior, and Symbol Play.
   - Avoid initial focus theft; preserve focus according to board/keypad/modal origin.

3. **Names and hero handoff**
   - Use the brand link’s visible content as its accessible name.
   - Let keypad visible digit/helper content lead its accessible name; append only necessary hidden Symbol Play context.
   - Add `tabindex="-1"` to `#game-title`. The primary hero action focuses that heading without changing puzzle ID, board, timer, starts, or abandons. The daily action changes only the advertised daily state and then focuses the heading.

4. **Validation and documentation**
   - Add a dependency-free Chrome/CDP validator for responsive geometry, grid structure, focus provenance, hero state preservation, core input, pause/resume, URL/storage, and Symbol Play.
   - Extend static page validation only for static naming/markup contracts.
   - Document responsive behavior, local-only state, and exact validation commands in the README.

## Acceptance criteria

- At 320 x 568, 390 x 844, 500 x 900, 720 x 900, and 1440 x 1000, root `scrollWidth <= clientWidth`; mobile keypad computed position is `static`; heading/status/setup and keypad rectangles never intersect.
- Within `.game-panel`, DOM, visual, and keyboard order agree; no CSS `order` reordering remains.
- Sudoku exposes 9 rows x 9 gridcells and Suguru 5 x 5. Board width/height differ by at most 1 px; rows span the board; box and cage boundaries remain correct.
- Non-paused fresh/restored loads leave focus on the document body. A restored paused run focuses Resume. Board-originated and keypad-originated rerenders retain useful focus.
- Setup help is closed after default, restored, and `symbols=on` URL loads. No hidden tutorial intercepts digits. Explicit help and newly enabled Symbol Play can open it.
- The state-preserving hero action focuses `#game-title` and leaves puzzle ID/board/timer/start/abandon state unchanged. Daily actions select daily content and then focus the same heading.
- Brand names come from visible content. Keypad names begin with normalized rendered text in tips-on/off, disabled/complete, and Symbol Play visible/faded/hidden states.
- Browser checks cover digit entry with fresh-node requery, arrows, undo/redo, pause/resume and paused restore, URL overrides, malformed and wrong-shaped storage, daily actions, and Symbol Play.
- Lighthouse has zero nodes for `aria-required-children`, `aria-required-parent`, and `label-content-name-mismatch` on both games/form factors. Pinned Lighthouse 13.4.1 accessibility target is at least 98.
- Desktop board/rail composition, themes, challenge features, and local progress remain intact.
- `npm run validate`, `npm run validate:browser`, `git diff --check`, browser screenshots, and pinned mobile/desktop Lighthouse checks pass.

## Implementation sequence

1. Land the browser assertions against baseline and confirm they fail for the evidenced defects.
2. Fix mobile natural flow, static keypad, and intrinsic sizing.
3. Fix focus provenance, paused restore, explicit help/Symbol behavior, and hero handoff.
4. Add nested row grids and natural accessible names one game at a time.
5. Run the full browser/Lighthouse matrix, then update README claims and move this plan to `docs/plan/done/`.

## Explicitly deferred

- New modes, rewards, leaderboards, social mechanics, or progress cards.
- Reintroducing a conditional sticky keypad.
- Broad palette, typography, hero, or sidebar redesign.
- Font self-hosting, remaining CLS optimization, and AudioContext warning cleanup.
- Monolith/module extraction unless required by a concrete defect.
- Full-page modal isolation beyond preserving current board-overlay behavior.

## Rollback

The implementation is isolated to board rendering/interaction structure, responsive CSS, accessible naming, focused validation, and docs. Revert the implementation commits if post-merge live smoke detects board geometry, focus, or input regressions; the pre-cleanup repository bundle remains retained separately for 30 days.
