# Logic-Certified Challenge Compass

Status: doing
Codememory: `epic_72` / audit `task_5585` / session `session_1200`
Runtime session: `ses_05761cc04ffejP8v4Be5IVzikQ`

## Objective

Deliver a fifth improvement round that gives both games one genuinely technique-focused challenge, replaces opaque rotating recommendations with a deterministic Challenge Compass, and prevents accidental loss of meaningful board progress. Keep the feature evidence-based, local-only, dependency-free, and compatible with every frozen Daily, Weekly, Cage Garden, resume, and practice-rotation contract.

## Baseline and evidence

- Baseline commit `a0fca8dc32f9f06053f8a220348e3d6187c1bbf1`: `npm run validate`, 550 browser assertions, and `git diff --check` pass.
- Inventory is 189 Sudoku IDs across 21 source families and 25 Suguru entries across six named layouts/four structural families.
- Daily v1 explicitly freezes 162 Sudoku and 19 Suguru IDs. Weekly v1 explicitly freezes the same 162 Sudoku IDs. Cage Garden explicitly freezes `garden-gate`, `lantern-walk`, `brook-crossing`, and `cascade-finale`.
- The Sudoku featured challenge is chosen by a date/stat hash even though the copy presents it as a best next action. Suguru's rail is source-aware but cannot offer a certified technique challenge.
- Replacement CTAs warn only through accessible labels; activating them immediately discards a progressed board and writes abandon/resume/practice state.
- Existing pair-labelled content is not a reliable teaching contract: the prior Sudoku pair trace is terminal and no ordinary Suguru entry reaches a cage pair.
- A bounded deterministic search found independently unique, logically completed candidates:
  - Sudoku `480000020005000700000035080000080309861003000070504108008160200702000010610000040`, from the Sunlit Maple solution with seed `1364197376`, 30 clues, and sample attempt 1494. LogicCoach v1 emits 52 steps, reaches `naked-pair` at zero-based trace index 10, removes three candidates, and then emits 41 placements. All nine shipped transforms retain the same classification and focus evidence.
  - Suguru Mist `0000000000005300000020034`, with seed `1511472606`, five clues, and sample attempt 541. LogicCoach v1 emits 29 steps, reaches `cage-naked-pair` at zero-based trace index 8, removes four candidates, and then emits 17 placements.

## Product principles

1. Describe a versioned deterministic solver trace, never universal human difficulty, necessity, mastery, or the only valid path.
2. A focus technique is publishable only when its step has a positive elimination and the same trace contains a later placement.
3. Prefer the current board and active source journey before proposing replacement content.
4. The same normalized context must always produce the same recommendation; no date hash, randomness, hidden scoring, or write-on-read behavior.
5. Confirmation happens before every side effect of an action that replaces or restarts progress, including preference, rotation, abandon, URL, resume, or provenance writes.
6. New focus entries are ordinary-only. A direct focus launch never consumes or commits the structural practice bag.

## A. Versioned focus-content generation

Bump the first-party generator schema to version 2 while keeping LogicCoach `profileVersion: 1`. Extend construction specs with explicit `generationStrategy`, `maxAttempts`, `requiredTechnique`, `minTechniqueEliminations`, and `minDownstreamPlacements` validation. Existing Sudoku specs retain uniqueness-preserving greedy carving; focus specs use bounded deterministic clue-set sampling. Suguru retains deterministic clue-set sampling. Missing/non-positive workload or focus floors, unknown strategies, invalid caps, and incomplete focus contracts fail before search. The `--check` path also runs malformed-spec and cap-exhaustion self-tests.

For an accepted focus entry, generate immutable `logicFocus` metadata:

```json
{
  "profileVersion": 1,
  "technique": "naked-pair",
  "traceIndex": 10,
  "candidateEliminations": 3,
  "downstreamPlacements": 41
}
```

`traceIndex` is internal evidence, not user-facing ordinal copy. The focus match is the first trace step with the requested technique. Candidate eliminations are the total values removed by that effective step; downstream placements are placement steps strictly after it in the same deterministic trace. Generation fails closed if the step is absent, has zero effect, has no later placement, is not unique, misses workload/status gates, exceeds its explicit attempt cap, or drifts from the reviewed attempt/puzzle.

Append:

- Sudoku Hard source family `hard-pair-current`, label `Pair current`, target 30 clues, seed `1364197376`, `maxAttempts: 1500`, minimum 52 trace steps/51 placements, `solved-logically`, required `naked-pair`, at least one elimination and one downstream placement, expected attempt 1494, and the reviewed puzzle above. It expands through the existing nine transforms.
- Suguru Challenge entry `suguru-size5-mist-pair-current`, label `Mist pair current`, on the existing Mist layout, seed `1511472606`, `clueTargets: [5]`, `maxAttempts: 1000`, minimum 29 trace steps/20 placements, `solved-logically`, required `cage-naked-pair`, at least one elimination and one downstream placement, expected attempt 541, and the reviewed puzzle above.

Suguru focus specs live in a separate append-only `SUGURU_FOCUS_SPECS` queue processed only after every existing layout/level entry. Validators pin the complete pre-existing per-level ID vectors before checking the appended focus entry, so Cedar and every other shipped entry keep their exact order.

Target inventory becomes 198 Sudoku IDs/22 families and 26 Suguru entries/six named layouts/four structural families. Existing IDs, puzzle strings, solutions, cages, order, and selectability stay unchanged. Independent validators replay every trace, prove exhaustive uniqueness, verify exact focus metadata, and derive the first focus step for each final transformed Sudoku puzzle. Every transformed variant must exactly match its shipped `logicFocus` counts; generation/validation fails rather than publishing source-only evidence on a divergent transform.

## B. Stateless Challenge Compass

Add dependency-free `challenge-compass.js` exposing a pure, deep-frozen `window.ChallengeCompass` API. It accepts normalized data descriptors only—never callbacks or DOM—and chooses the first available descriptor in this fixed order:

1. `current`: continue a meaningful-progress or special-source board;
2. `continuation`: continue an already-started Weekly or Cage Garden path;
3. `focus`: open the certified pair challenge only when the player qualifies and that exact focus has not been completed;
4. `daily`: open an unsolved verified Daily edition;
5. `fallback`: open ordinary practice at the current/appropriate band.

Completed boards never qualify as `current`. Invalid descriptors fail closed. Selection does not read time, randomness, locale, URL, or storage; mutate inputs; or persist anything. Equal normalized inputs produce byte-equivalent output. Fixed-table tests prove every branch is reachable and a completed focus falls through to Daily/fallback instead of recurring.

Each game adapter owns action execution by stable descriptor ID. A focus action directly resolves a selectable `logicFocus` entry, launches it as ordinary Classic content with `launchKind: "technique-focus"`, and leaves the practice-rotation store byte-identical. If focus content is missing/disabled, the adapter omits that candidate and the pure selector falls through safely. A focus board, any meaningful-progress board, active Daily, active Weekly, or active Cage Garden board recommends entering the current board instead of replacing it.

Add one additive local `challenge-focus-results-v1` ledger, normalized by pure helpers in `challenge-compass.js` and keyed by `gameId|focusPuzzleId`. A valid focus completion writes only `true`; it stores no time, score, rank, recommendation history, or mastery claim. Missing/malformed entries normalize independently and storage failure degrades to session memory. Sudoku focus eligibility requires at least one validated Advanced, Hard, or Expert completion. Suguru eligibility requires a completed Bridge or Challenge best-time bucket, or completion of the Bridge/Challenge Cage Garden steps `brook-crossing` or `cascade-finale`; Easy `garden-gate`/`lantern-walk` completion does not qualify. Easy-only solves, starts, abandons, unfinished resumes, and malformed counters do not qualify.

Replace Sudoku's hash-selected featured challenge and Suguru's one-purpose next-step rail with Compass output. Every surface currently framed as “next,” “best,” or “featured” mirrors the same descriptor; journey panels remain clearly labelled optional paths rather than competing recommendations. Copy states why the descriptor won. Focus copy leads with the pattern goal and then qualifies generated evidence: “Two cells in one unit share the same two candidates; remove those values from the unit’s other cells. LogicCoach v1 removes 3 candidates here; the same trace later records 41 placements.” Suguru uses equivalent cage wording. Counts come from the active entry metadata, and the complete explanation remains visible outside mobile-hidden fact chips. Chips say `LogicCoach v1 pair · 3 eliminations`; no surface says required, mastery, human-rated, causal for every later step, or guaranteed for every solve path.

First-session onboarding remains easier than Pair Focus through the bridge-level eligibility gates above. Existing hero, Daily, Weekly, Cage Garden, and result actions retain their named provenance semantics.

## C. Pre-side-effect progress-discard guard

Add shared dependency-free `board-replacement.js` and the same native confirmation dialog to both pages. The guard listens in the capture phase for explicitly marked replace/restart controls, before their existing handlers. Meaningful progress means any changed value, note, or mistake, or a monotonic ephemeral `hasDiscardableInteraction` fact set by a successfully delivered Hint/Nudge stage or Check. Elapsed time and unsuccessful aid requests do not trigger confirmation. Completed boards bypass confirmation. The fact resets only with a committed new board/restart and is not undoable; existing persisted hint/nudge counts still protect restored assisted runs without changing resume schemas.

Every runtime action descriptor declares `discardKind: "replace" | "restart" | null`. Renderers add or remove the marker dynamically, so “Continue current board,” onboarding/help, Share, Review, navigation, locked steps, and other preserving actions never prompt. Setup launch, Daily replay/open, Weekly step/replay, Cage Garden step/replay, Pair Focus, ordinary practice, result replacements, and all other board-replacing CTAs use `replace`; both Restart controls use `restart`. Dynamic Cage Garden step controls mark only available replacement actions. Restart copy is action-specific: `Restart this board?` / `Restart board`.

On interception:

- preserve board, notes, timer value, URL, focus source, resume bytes, result ledgers, provenance, stats, focus ledger, and practice rotation;
- silently suspend only the running interval through app adapter callbacks—never call existing Pause—and suppress visibility auto-pause while `decisionActive`;
- capture timer-running state and board identity, then open the action-specific accessible modal with `Keep current board` focused by default;
- Escape or Keep closes it and restores focus to the invoking control, with no storage writes;
- Replace/Restart closes it and replays that exact control once through an element-specific one-shot bypass, so existing source-specific logic runs exactly once;
- cancel restores the prior timer-running state; after confirmation, the adapter restarts the old timer only if the board identity did not change (including failed/unavailable launches);
- tab hide/restore cannot open or layer the pause modal while the decision is active; an already-paused board cannot open a background decision;
- dialog text is assigned with `textContent`, and repeated open/cancel/confirm cycles clear pending action, board identity, and invoker references.

The dialog remains usable at 320 px, traps focus through native modal semantics, exposes title/description relationships, does not collide with pause/result dialogs, and causes no horizontal overflow or first-paint shift.

## D. Compatibility invariants

- Daily v1 remains exactly 162 Sudoku/19 Suguru IDs with exact vectors, fingerprints, order, canonical routes, and local-result semantics.
- Weekly v1 remains exactly 162 ordered Sudoku IDs with exact fingerprints/vectors/fail-closed behavior and unfinished-resume identity.
- Cage Garden remains exactly four fixed steps with idempotent credit.
- Existing IDs/grids/solutions/cages/order stay byte-identical; only new ordinary selectable content is appended.
- Sudoku resume v2, Suguru resume v3, Daily result v1, Weekly, Cage Garden, stats, and practice rotation schemas do not change; the additive focus-results v1 ledger is independently fail-closed.
- Pair Focus uses existing ordinary resume semantics and receives no Daily, Weekly, or Cage Garden credit. A disabled focus remains resolvable for resume but is excluded from Compass and practice.
- Direct focus launch and every canceled replacement leave practice rotation byte-identical.
- No dependency, account, API, cloud state, telemetry, runtime puzzle generation, or third-party puzzle asset.

## Delivery sequence

1. Generator v2 focus constraints, checked-in content, and independent validation.
2. Pure Challenge Compass, focus-results normalization, game adapters, and truthful focus presentation.
3. Shared pre-side-effect progress-discard guard, silent timer adapters, dynamic action markers, accessible dialogs, and both-game parity.
4. Full compatibility/browser/Lighthouse review, rollback drill, docs, PR, exact-SHA deployment, and production smoke.

Each implementation slice gets a focused validated commit. The active audit task closes after plan approval; child Codememory tasks mirror these slices and remain under `epic_72` with sequential dependencies.

## Named validation matrix

- Full local gates: `npm run validate`, `npm run validate:browser`, `git diff --check`, and all configured syntax checks.
- Generation/content: exact `--check` regeneration, reviewed seed/attempt/puzzle vectors, bounded failure fixtures, unique solutions, clue consistency, all nine Sudoku transforms, focus elimination/downstream floors, independent replay, and inventory totals 198/22 plus 26/6/4.
- Compass: fixed priority table with every branch reachable, missing/disabled/completed focus fallback, Advanced+/Bridge+ qualification, fresh/Easy-only/early-Cage-Garden/abandoned/unfinished/corrupt exclusion, current special/progress precedence, equal-input determinism, deep immutability, no input mutation, and zero storage/random/time access. Every recommended surface must expose the same descriptor.
- Focus launch/results: exact ordinary provenance, Classic target band, selectable resolution, completion/reload fall-through, focus-ledger normalization/storage failure, resume recovery, no special-source credit, and practice-rotation bytes unchanged. A preseeded disabled-focus resume restores exactly while Compass falls through and practice excludes it.
- Progress-discard guard on both games: value/note/successful-aid/check/mistake progress; timer-only/unsuccessful-aid/completed bypass; setup, hero, ritual, Compass rail/mirror, Daily, Weekly/Cage Garden, generated journey steps, result replacements, replay, and Restart entry points; exact marker presence/absence; zero storage/URL writes before decision; cancel/Escape focus restoration and byte parity; successful and failed confirm exactly once; tab-hide/restore and already-paused behavior; no stale action; modal collision/focus/inertness at 320/390/1440 and 200% text.
- Frozen contracts: exact Daily/Weekly vectors and counts, Cage Garden 4/4, legacy/resume migrations, result idempotency, and existing puzzle identity/order.
- Browser/layout: retain all 550 existing assertions, add scenario-driven Compass and guard coverage, no exceptions/overflow, board-keypad adjacency, 44 px controls, CLS at or below `0.02` in deterministic profiles.
- Lighthouse 13.4.1 on both routes/mobile+desktop: accessibility at least 98, best-practices/SEO 100, zero `aria-required-children`, `aria-required-parent`, and `label-content-name-mismatch` nodes; performance observed.
- Release: latest-main/overlap check, PR-only merge, exact-SHA Pages success, deployed byte parity, canonical Daily routes, and live two-game Pair Focus/guard smoke.

## Risk and review budget

Depth large; risk high because generation, source provenance, storage side effects, and modal interaction all change. Run four review/fix lenses after plan approval: (1) logic/content evidence, (2) provenance/storage compatibility, (3) browser UX/accessibility, and (4) final release sign-off. Stop only when the latest changed batch is green and the latest review has no blocker.

## Deferrals and rollback

Defer claims of pair necessity, counterfactual/minimal-clue proof, broad mastery/rank inference, persisted recommendation impressions/history beyond the boolean focus-completion ledger, Daily v2/re-banding, Weekly/Cage Garden expansion, X-Wing/chains/search hints, account/cloud sync, and broad navigation redesign.

Rollback uses a forward patch: keep focus data resolvable for resume, mark defective focus entries `selectable: false`, omit unavailable Compass focus candidates, preserve the focus-completion ledger, and disable the replacement marker/guard adapter without changing frozen registries or schemas. A named rollback test restores a disabled-focus resume, proves practice/Compass exclusion, and exercises a guard-disabled launch. Never raw-revert expanded data into a runtime that cannot resolve an already-saved focus puzzle.
