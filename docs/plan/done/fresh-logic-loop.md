# Fresh Logic Loop

Status: done
Codememory: `epic_61` / audit `task_5528` / plan `doc_86`
Runtime session: `ses_05761cc04ffejP8v4Be5IVzikQ`

## Objective

Deliver a coherent fourth improvement round: start a structurally fresh, honestly profiled puzzle; request a safe explanation instead of an answer reveal; solve; then review the completed board before choosing the next step. Improve algorithms, challenge quality, first-party content, ergonomics, and post-solve experience without changing frozen Daily v1 identity.

## Evidence and baseline

- Sudoku has 162 IDs but 18 source families expanded through nine transforms; ordinary selection prevents only the previous exact ID.
- Suguru has 19 variants over four layouts; current Bridge entries are Easy boards with one immediately recoverable cage-full-house clue removed.
- Difficulty scores/tags are manual; validators prove uniqueness and shape, not technique or effort.
- Sudoku Hint can coach from a locally legal wrong entry; Suguru has no contextual hint.
- Sudoku setup selects replace an active board immediately; Suguru setup is pending.
- At 320–390 px, secondary actions separate board and keypad by about 300–430 px.
- Victory does not permit solved-board inspection.
- Baseline `bc52fb1151291949e08e1f30319f52e79f2be457`: `npm run validate`, 340 browser assertions, and `git diff --check` pass. Prior Lighthouse accessibility/best-practices/SEO scores are 100 on both routes and form factors.

## Principles

1. Profile a versioned solver capability, not universal human difficulty.
2. Runtime hints and profiles share a proof engine, while an independent test oracle checks soundness.
3. Explain focus → pattern → exact deduction; never place a value.
4. Rotate ordinary play by logical family/layout, not cosmetic ID.
5. Freeze Daily and Weekly v1 membership and identity before adding content.
6. Commit selection only when a named launch replaces the board.
7. Keep board/input together and keep solved grids available for read-only review.

## A. Formal logic-coach contract

Add dependency-free `logic-coach.js` with pure `window.LogicCoach` APIs and `profileVersion: 1`. `createState` is the only state constructor: it validates exact game-specific board/meta sizes before iteration, copies inputs, derives direct legal candidates, and stores candidates as integer bitmasks. It deep-freezes the complete issued graph: top-level state, board, candidate array, applied-key history, normalized Suguru metadata, cage arrays/maps, and every other exposed nested value, then registers the state in an internal `WeakSet`. `applyStep` rejects structurally forged or aliased state objects and reads only this frozen graph; diagnostics expose separately copied/frozen sorted arrays.

`applyStep(state, step)` independently validates proof preconditions and returns another engine-issued state. Candidate masks always equal direct legality minus engine-applied eliminations. After placement, each surviving mask is `previousMask & directMask(nextBoard)`, so prior proof eliminations cannot reappear. Progress is lexicographic: a placement reduces empty-cell count; an elimination keeps empty-cell count and strictly reduces total candidate bits. Repeated canonical keys, zero-effect actions, zero domains, and missing digit support are invalid. This prevents forged-single and elimination-loop failures.

Every step records game, technique/rank, capability band (`local`, `interaction`, `subset`), kind (`placement` or `elimination`), sorted source/focus/target cells, values/actions, and a canonical key built from those normalized fields. Technique discovery returns all valid steps at the first available technique; stable row-major/numeric ordering chooses one. `minAvailableSteps` is the minimum size of that first-technique set during a profile.

Sudoku order: full house; naked single; hidden single; pointing/claiming locked candidates; naked pair. Suguru order: cage full house; cell single; cage hidden single; cross-cage support elimination; cage naked pair. Cross-cage elimination requires a nonempty support set for digit `d` inside source cage `C`, a target outside `C` containing `d`, and every support cell to be an eight-direction peer of the target.

Profile status is one of `solved-logically`, `stalled`, or `invalid`. Residual search separately reports `none`, `unique`, `multiple`, or `capped`; a capped diagnostic never proves uniqueness/non-uniqueness. Search uses MRV, row-major/ascending tie-breaks, a two-solution cap, and a fixed node cap. Exhaustive uniqueness remains a separate validator.

Transform checks require proof validity after mapping and equivalent profile status/hardest capability classification. They do not require identical chosen traces, step counts, or search nodes because tie-breaking is coordinate/value dependent.

Live coaching owns an ephemeral candidate trail derived only from the current board. Disclosure stages share one proof key. After stage 3, an elimination may advance only this private trail; a placement never advances until the player changes the board. Any board, note, undo/redo, restart, resume, or puzzle mutation discards the trail. Player notes are never treated as proof state.

## B. Reproducible first-party content

Add reviewed construction specs under `scripts/content-specs.mjs`, dependency-free `scripts/generate-first-party-content.mjs`, and checked-in `generated-content.js`. Specs provide first-party base solved Sudoku grids and, for each Suguru layout, both a connected cage partition and independently validated solved grid; generation searches only deterministic clue carving and profile targets, not topology or solved-grid construction. A fixed versioned PRNG, attempt/node caps, and explicit failure make runs reproducible. Output uses data-only `JSON.stringify`, excludes timestamps/locales/absolute paths, writes a temporary file then atomically renames after validation, and `--check` compares bytes without writing. No runtime generation occurs.

Preserve every existing entry and append one source family each for Sudoku Easy, Hard, Expert (nine transforms each), plus two 5×5 Suguru layouts with Easy, Bridge, Challenge clues. Target inventory is 189 Sudoku IDs/21 families and 25 Suguru entries/six named layouts. Every existing/generated Sudoku entry has stable `familyId` equal to its source template. Every Suguru entry has stable `layoutFamilyId`; only Suguru layout families use canonical dihedral grouping. Existing Garden, Brook, and Cascade share one structural family because they are dihedral transforms; Lantern is the second baseline family. With two new dihedrally distinct families, ordinary Suguru exposes four structural families across six named layouts. Generated entries omit unsupported target-time claims and record generator/profile version, seed, family/layout-family ID, and transform metadata.

Equivalence gates are explicit:

- Sudoku source puzzle/solution pairs must not equal any existing pair under the exact shipped digit maps and row/column structure maps. This is a project transform-set check, not a universal Sudoku-isomorphism claim.
- Suguru cage partitions are canonicalized by region renumbering under all eight square dihedral transforms; new layouts must have new signatures. Every cage must be orthogonally connected.

Capability gates:

- generated Easy: `solved-logically`, hardest band `local`;
- generated Hard: at least 12 trace steps, four placements, and one `interaction` or `subset` step;
- generated Expert: at least six trace steps and two placements before either `subset` progress or a truthful stall, with exhaustive unique solution;
- generated Suguru Easy: `solved-logically`, hardest `local`;
- generated Bridge: `solved-logically`, includes `interaction`, and is not a one-full-house-clue delta from Easy;
- generated Challenge: at least six trace steps and two placements, then includes `interaction`/`subset` or truthfully stalls.

Each construction spec stores reviewed positive `minTraceSteps` and `minPlacements`; generation and independent validation enforce those exact floors. **Supported opening** means both floors pass, not merely that one trivial step exists.

A reference candidate builder and exhaustive solver in `scripts/validate-logic-coach.mjs` independently replay every emitted placement/elimination. Positive and near-miss fixtures cover each technique, malformed/dead/non-unique/capped states, deep-frozen purity, progress, no repeated proof, and mapped-proof validity. Shared-engine profile results alone never certify soundness.

## C. Frozen special-source registries and selectable registry

Before appending content, add authoritative `weekly-editions.js` and `scripts/validate-weekly-editions.mjs`. The Weekly v1 registry contains an explicit ordered baseline manifest per difficulty with fingerprints over band, ID, puzzle, and solution. Weekly hashing and resume validation resolve exclusively in manifest order and fail closed if a member is missing or altered, without erasing an unfinished resume or Weekly ledger. Metadata flags are not authoritative. Golden week/path vectors, append/reorder/toggle mutations, and an unfinished baseline Weekly resume fixture prove identity stability. Daily remains governed by its existing explicit 162/19 manifests.

Full puzzle arrays remain the resolvable registry for resume/replay. Ordinary selection uses only `selectable !== false` entries. This separation lets a forward rollback patch disable a defective group while retaining its data and resume lookup. Tests restore disabled new-ID resumes while proving ordinary selection excludes them.

## D. Atomic pending setup and fresh rotation

Implement Sudoku pending setup and ordinary rotation in one slice. Add `practice-selection.js` with injectable randomness and schema:

```json
{
  "version": 1,
  "bands": {
    "sudoku|easy": { "inventory": "stable-signature", "remaining": ["family-id"], "last": "family-id" }
  }
}
```

Inventory signatures derive from sorted selectable `familyId`/`layoutFamilyId` values. A mismatch resets only that game/band. Malformed branches normalize independently; storage failure uses an in-memory bag. The selector is pure and returns `{ puzzle, nextBag }`. Only an adapter call with explicit `launchKind: "ordinary-practice"` persists `nextBag`, after pending settings commit; selection never infers eligibility from `runSource`, because a Daily fallback can become ordinary without becoming practice. Select changes, Daily, Weekly, Cage Garden, fallbacks, forced launches, and resume recovery leave storage byte-identical. Every structural group appears before reuse and persisted `last` prevents a boundary repeat; a selectable presentation variant is then chosen within that group.

Sudoku selects update only `pendingDifficulty`, `pendingMode`, launch label, and one status announcement. Board, timer, URL, resume, statistics, provenance, and presentation remain unchanged until the explicit replacement action. Named direct actions stay immediate.

## E. Contextual coach parity and data rules

Replace app-local Sudoku hint search with LogicCoach while preserving three stages and technique counters. Duplicate, dead, or unique-solution-conflicting boards receive correction guidance before any hint count. Unsupported states count zero.

Add Suguru **Nudge ✦** and `H`: rule/focus → candidate/support pattern → exact safe placement/elimination. Both games highlight complete proofs, preserve board/keypad focus, invalidate trails after mutation, and never alter board/notes.

Add runtime `nudgesUsed`, counted once when stage 1 of a new proof key is shown, not per later stage. Corrections/unsupported states count zero. Sudoku `hintsUsed`, Suguru `nudgesUsed`, and assistance markers are monotonic run facts excluded from undo/redo snapshots; undo can never restore a lower assistance count. Missing, negative, non-integer, or unsafe persisted values normalize to zero in:

- Suguru resume v3 additive field;
- Daily result v1 entry normalization/storage;
- Cage Garden step result normalization/storage.

Generic stats schema is unchanged. Daily replacement assigns the complete fastest accepted run, including its nudge count; Cage Garden retains the complete first accepted completion. A rejected replay cannot mix metrics. Forward rollback readers preserve additive fields. Persisted counts render through `textContent`. Victory/share text may disclose count; URLs and identity payloads remain byte-equivalent.

Replace opaque `Logic n/10`/`n/5` chips with profile capability labels and workload. Existing level names stay stable.

## F. Board-first DOM and result state machine

Natural DOM order in both games becomes board/context → Value/Notes → keypad → primary feedback/actions → secondary tools/help. The 160 px phone gap budget represents one 44 px entry-mode row plus label and two 24 px spacing allowances; tests also require no unrelated control between board and keypad. Targets stay ≥44×44, boards square, keypad static, no overflow, and desktop boards use a viewport-aware cap. Generated entries show profile/clue facts, not unvalidated target minutes.

Use `completed: boolean` plus one `resultView: "none" | "dialog" | "review"`; dialog/review booleans are derived, never independently mutable. Transitions are playing → finish once → dialog; dialog → Review/Escape → review; review → View result → dialog; dialog/review → named launch → playing. In review, modal-owned inertness/scroll lock is removed, the grid container is focusable/non-inert with `aria-readonly="true"`, solved values remain screen-reader-readable, and cell controls remain disabled. Reopen restores owned inertness, focus trap, and title-first focus. Proof highlights also update labels/status, never color alone. Repeated cycles leave all credit stores byte-identical.

Also correct zero-progress Weekly wording and update Suguru ordinary inventory/help while keeping Cage Garden at four fixed steps.

## Compatibility invariants

- Daily v1 stays exactly 162 Sudoku/19 Suguru IDs with exact vectors/fingerprints/order.
- Weekly v1 ordered manifest, member fingerprints, vectors, fail-closed behavior, and unfinished-resume identity stay exact.
- Existing IDs/grids/solutions/cages/order remain; new content is ordinary-only.
- Sudoku resume v2, Suguru resume v3, Daily result v1, Weekly, Cage Garden identity semantics remain compatible.
- No dependency, build service, account, API, telemetry, or third-party puzzle asset.

## Delivery sequence

1. Formal logic engine plus independent verifier.
2. Reviewed construction specs, deterministic clue-carving generator, checked-in content/profiles, frozen Daily/Weekly gates; no new runtime selection yet.
3. Pending Sudoku setup and practice selection atomically.
4. Sudoku coach adapter, then Suguru coach/data adapter as separately validated commits.
5. Board/keypad DOM adjacency.
6. Result-review state machine.
7. Rollback drill, docs, full review, PR, exact-SHA deployment, production smoke.

## Named validation matrix

- `npm run validate`, `npm run validate:browser`, `git diff --check`, and syntax checks.
- Engine: every technique positive/near-miss, forged-state and alias rejection, replacement attempts for `state.board`/`state.candidates`/nested cage metadata/history, full-graph immutability, elimination→placement preservation, independent replay, invalid/dead/non-unique/capped, purity, progress/termination, transformed proof validity.
- Content: exact `--check` regeneration, uniqueness, profile gates, Sudoku project-transform signatures, Suguru dihedral signatures/connectivity.
- Compatibility: unchanged Daily counts/vectors/fingerprints plus Weekly ordered IDs/member fingerprints/vectors/fail-closed unfinished resume.
- Selection: full cycles/boundaries/reload/corruption/storage failure/inventory change, canonical Suguru family grouping, selectable filtering, explicit launch kind; pending and every non-practice source leave storage byte-identical.
- Coach: correction, unsupported, placement, elimination, monotonic count/stages across undo, no mutation, trail reset, non-color proof labels, keyboard/focus for both games.
- Review: valid result-state transitions, repeated review/reopen/Escape, exact owned inertness/focus/ARIA restoration, readable solved values, disabled input, byte-identical credit at 320/390/1440.
- The expanded browser suite passes 550 scenario-driven assertions while retaining the original coverage.
- Lighthouse 13.4.1 both routes/form factors: accessibility ≥98, best-practices/SEO 100, zero existing target ARIA nodes; performance observed.
- Exact-SHA production checks cover both pages, shared scripts, canonical Daily routes, `robots.txt`, and `sitemap.xml`.

## Risk and review budget

Depth large; risk high. Run four review/fix passes after plan approval: logic/content; storage/provenance; browser UX/accessibility; final release sign-off. Stop only with green gates and no blocker in the latest review.

## Deferrals and rollback

Defer Daily v2/re-banding, X-Wing/chains/fish/search hints, runtime generation, Cage Garden expansion, broad mastery/rank migration, accounts/cloud/telemetry, archives/timelines, and broad navigation redesign.

Rollback is a forward patch: retain all data/lookup, mark defective groups `selectable: false`, preserve frozen registries, and disable coach/lifecycle adapters independently. Validate this composition before release. Never raw-revert expanded data.

## Outcome · 2026-07-30

- Shipped the deterministic LogicCoach engine, profiled generated content, frozen Weekly v1, structural practice rotation, and staged Sudoku/Suguru coaching as separately validated slices.
- Completed board-first DOM parity and the shared `none`/`dialog`/`review` solved-board lifecycle with accessible Share feedback and byte-stable completion credit.
- Preserved every compatibility invariant, including Daily membership/fingerprints, Weekly ordered membership, existing puzzle identities, and resume/result schemas.
- Passed `npm run validate`, 550 browser assertions, and whitespace checks before release review.
- Lighthouse 13.4.1 scored accessibility, best practices, and SEO at 100 on both routes in mobile and desktop profiles, with zero nodes in all three named ARIA audits.
- Stabilized first-paint geometry after release review: deterministic browser CLS stays at or below `0.02`; three final Sudoku desktop Lighthouse runs reduced CLS from `0.261` to a `0.029` median. Observed desktop performance medians were `0.97` for both games.
- Kept audit JSON outside the repository; PR, exact-SHA Pages deployment, and production smoke evidence remain in the release record.
