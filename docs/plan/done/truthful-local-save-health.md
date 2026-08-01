# Truthful Local-Save Health

Status: done
Codememory: `epic_79` / plan `doc_103` / release `task_5627` / session `session_1263`
Runtime session: `ses_05761cc04ffejP8v4Be5IVzikQ`

## Objective

Deliver a sixth improvement round that makes every progress-saved claim reflect an actual browser-storage outcome and prevents a completed recovery snapshot from reopening as an unfinished game. Keep play available when storage fails, identify affected progress as session-only, preserve independent successful writes, and retain every existing puzzle, provenance, timer, source, URL, and serialized-schema contract.

## Baseline and evidence

- Baseline commit `7ed69d4834aa952efe5c55ee778a7a2c79e4bbe0`: `npm run validate`, 631 browser assertions, `git diff --check`, Lighthouse hard gates, exact-SHA Pages deployment, and live two-game smoke pass.
- Sudoku and Suguru save the final solved board before win detection, then silently ignore resume-removal failure. Their inspectors validate shape/clues but not exact solution equality, and restoration forces `completed = false`; a stale solved snapshot can therefore reopen and receive generic completion credit again.
- Daily, Weekly/Cage Garden, stats, recent-history, Focus, and resume writers generally mutate in-memory state before or independently of a swallowed storage exception. Visible cards can still say `Solved locally` or `Complete` after the corresponding durable write failed.
- Sudoku's generic stats writer emits solve-specific failure copy even when called for a start or abandon, while completion immediately overwrites that warning. Suguru suppresses the same failure entirely.
- `PracticeSelection.commitSelection()` already returns a truthful `persisted` outcome and maintains an in-memory structural bag; both app adapters currently ignore that outcome.
- Preference-only writes, timer cadence, and same-game multi-tab ownership are separate concerns and remain out of scope.

## Product principles

1. Claim durability only after the exact key operation succeeds; a capability probe is not evidence that a later write succeeded.
2. Fail one storage domain independently. Never roll back or relabel successful writes to unrelated keys.
3. Continue in-memory play and progression, but call unwritten data **session-only** and define session as the current tab/document lifetime.
4. Never treat a solved recovery snapshot as proof of a new completion. Reject it before restore, timer start, or source-credit logic.
5. Keep all existing storage keys, versions, and payload shapes byte-compatible; health state is ephemeral only.
6. Do not change the current gameplay lifecycle. Ready→Active timer handoff is explicitly deferred.

## A. Exact solved-resume containment

After resolving puzzle metadata and validating the saved board's shape, range, and clues, compare the board with the exact resolved solution through each game's core `isSolved` helper. An exact match returns an invalid descriptor with reason `completed-snapshot` before Daily, Weekly, Cage Garden, or Focus restoration.

Startup then attempts to remove only that game's resume key and follows the existing route/no-resume startup precedence. It never calls restore or completion logic and announces once: `A completed recovery snapshot was ignored; a fresh board was opened and no solve was counted again.` Route fallback copy is composed rather than overwritten.

Boundaries are explicit:

- one-empty solution snapshots still restore;
- fully filled but incorrect snapshots retain existing validity behavior and are not classified as solved;
- failed cleanup cannot make an exact solved snapshot restorable on a later load;
- if both the final solved-board write and cleanup fail, an older near-solved snapshot may remain and legitimately restore; this round cannot claim stronger containment without another durable marker;
- no solved, best-time, streak, recent-history, Daily, Weekly, Cage Garden, or Focus credit is synthesized; opening the fresh fallback may still perform the normal new-board `started` increment;
- matching, mismatching, bare, explicit, and invalid-Daily routes compose the recovery notice once without changing URL precedence;
- Sudoku resume remains v2 and Suguru resume remains v3.

## B. Per-key ephemeral persistence health

Each app adds private, in-memory health state keyed by progress domain. It is never serialized:

```text
any prior state + successful setItem         → saved
any prior state + failed setItem             → session-only
any prior state + verified successful remove → cleared
any prior state + failed/uncertain remove    → cleanup-failed
skipped or intentionally preserved operation → no health transition
```

Every attempted operation replaces the prior state, including `saved → session-only` after a later failure. Aggregate unresolved failures are domains currently in `session-only` or `cleanup-failed`. `Local saving restored` appears only when that set transitions from nonempty to empty; partial recovery renders the remaining failures rather than a global recovery claim. Mixed write and cleanup failures compose one fixed-order message.

Tracked domains use a fixed display order to prevent message churn:

1. board recovery;
2. stats;
3. recent solves (Sudoku only);
4. Daily result;
5. Weekly path or Cage Garden;
6. Pair Focus completion;
7. practice rotation.

App-local helpers return explicit outcomes:

```text
persistJson(domain, key, value) -> saved | failed
removeStored(domain, key) -> cleared | failed
saveResume*() -> saved | skipped | preserved | failed
clearResume*() -> cleared | preserved | failed
```

Sudoku's deliberate `resumeWriteBlocked` Weekly compatibility path maps to `preserved`, never to a storage error. Preference writes stay best-effort and untracked. A later complete write for the same key may recover that domain.

Normal gameplay behavior remains unchanged: boards start immediately, timers write every second, hero entry only scrolls/focuses, pause/visibility semantics remain intact, and Sudoku replacement still records exactly one abandon.

## C. Accessible save-health presentation

Add `#local-save-status` as a direct game-panel child immediately after `.game-header` and before `.controls-row`, and add non-focusable `#victory-save-status` immediately after `#victory-summary` in both victory cards. The active surface is one polite, atomic **save-health** live region; existing gameplay, share, and summary live regions remain unchanged. The victory surface has no live role and is appended to the victory dialog's `aria-describedby` before the dialog opens.

Announcement ownership is exclusive:

| Transition | Owner |
|---|---|
| active save degradation/domain-set change/recovery | `#local-save-status` only |
| solved-snapshot startup notice | `#game-message` only |
| victory save outcome | non-live `#victory-save-status` through dialog description only |
| victory Share result | existing `#victory-share-status` only |
| changes while pause/result makes play inert | queue and announce the final active state once after return to play |

Routine healthy writes keep the active region empty. Deduplicate by rendered severity plus fixed-order failed-domain signature: first failure mutates once, repeated identical failures mutate zero times, a changed domain set mutates once, and full recovery mutates once. Coalesce every synchronous write batch, not only completion. Never mirror save-health text through `setMessage()`.

Core copy:

- active failure: `Session-only: {domain list} could not be saved in this browser. Keep this tab open.`;
- full recovery: `Local saving restored.`;
- cleanup failure clause: `Old board recovery data could not be cleared; completed snapshots will still be ignored.`;
- healthy ordinary victory: `Progress saved in this browser.`;
- healthy Daily victory after its ledger succeeds: `Daily result and progress saved in this browser.`;
- partial victory: singular/plural grammar names only failed domains, states that other successful saves are unchanged, and composes cleanup failure once.

The active surface remains synchronized while modal-muted but does not announce there; the populated victory description owns completion disclosure. Do not enable a global healthy/partial victory claim until every tracked completion writer is outcome-aware.

Use existing feedback styles with a decorative `aria-hidden` icon plus visible state words, `min-width: 0`, full-width wrapping, and safe overflow wrapping. Preserve at least 4.5:1 text contrast in Garden, Ink, Night, Night+High Contrast, and forced-colors where supported. Longest active/victory copy must fit 320/390/1440 and 200% text without overlap; title-first victory focus, background inertness, board/input order, and result-card scrolling remain unchanged. Static FAQ/Daily helper claims become conditional: `When browser storage is available...`.

## D. Domain semantics

### Resume

Play continues after write failure. Persisted bytes may be stale or absent and the active status says to keep the tab open. Successful later timer/input writes recover the domain. Removal verifies that the key is absent; uncertainty is reported as cleanup failure.

### Stats and recent solves

Memory continues to accumulate. A stats-only or history-only failure names only that domain; successful unrelated writes keep their durable claim. The next existing full write retries accumulated memory. Remove the current solve-specific `setMessage` side effect from Sudoku's generic stats writer.

### Practice rotation

Consume the existing `persisted` result. A failed write keeps the in-memory no-repeat bag and marks rotation session-only; the next successful ordinary-practice launch clears that warning. Selection and fallback algorithms do not change.

### Focus

Keep the existing boolean memory fallback and same-document Compass fall-through. A failed write is disclosed as session-only; reload may reoffer the Focus board. No Focus schema or credit rule changes.

### Weekly and Cage Garden

Keep an ephemeral unsaved-step identity set in addition to the in-memory ledger so previously durable steps remain distinguishable from newly session-only steps. In-memory completion/unlock remains usable in the current tab; only affected items render `Complete this session`. Every source-valid launch/completion or replay retries the complete existing-schema ledger when pending identities exist, without replacing first-completion metrics. A successful full-ledger write clears only included unsaved identities. Cage Garden's next unlocked step remains `Ready`, never `Active`, until `startCageGardenStep()` opens its board.

## E. Transactional Daily results

Keep `state.dailyResults` as the last-known durable v1 ledger and add an ephemeral pending-result map keyed by the existing Daily key.

For every source-valid Daily completion:

1. Compute the effective prior record as `pending[key] ?? durable.entries[key]`.
2. Apply the current complete-record rule: a lower time replaces the effective prior result; equal/slower replay never mixes time, mistake, assist, medal, or completion fields.
3. Clone the durable ledger and overlay every pending accepted result, including unrelated Daily keys.
4. Attempt one full-ledger write whenever pending is nonempty, even when the current replay is equal/slower and rejected.
5. On success, replace `state.dailyResults` with the exact candidate, clear only included pending entries, render `Solved locally`, and derive streak from the durable ledger.
6. On failure, leave `state.dailyResults` byte-identical, retain the best pending records, render `Solved this session — not saved`, and leave durable streak unchanged.

Card identity, result display, same-document Compass eligibility, and both Daily/victory Share paths read the effective overlay. Streak and durability claims read only `state.dailyResults`. Session-only helper copy is `This result is available only in this tab and is not saved. Sharing sends only the edition and result.` Shared text includes `Session-only — not saved in this browser` and either omits streak or labels it `Saved Daily streak: N days`. No pending marker or health field enters Daily result v1.

## F. Completion operation order

For each completion, perform all valid in-memory domain mutations first. Attempt every applicable key write independently without fail-fast so one injected failure cannot suppress later writes. Commit a durable in-memory ledger snapshot only after its corresponding write succeeds. Attempt resume removal last. After all outcomes are known, render save health once and then open the victory dialog. Browser validation records the operation log and proves exact key order, later-attempt execution after failure, key isolation, and one final presentation update.

## Compatibility invariants

- Daily v1 remains exactly 162 Sudoku/19 Suguru IDs with unchanged vectors, fingerprints, order, routes, keys, and payload shape.
- Weekly v1 remains 162 ordered Sudoku IDs; unavailable-registry recovery still preserves the original unfinished resume bytes.
- Cage Garden remains four fixed, contiguous, idempotent steps with unchanged keys and shape.
- Sudoku resume v2 and Suguru resume v3 remain version-compatible; solved snapshots are discarded, not migrated or credited.
- Stats, recent history, Focus v1, and practice-rotation versions/shapes do not change.
- Daily/Weekly/Cage Garden/Focus credit still requires exact source provenance.
- Timers, start/abandon counts, pause, visibility, URL, hero, board-replacement, and exact-once confirmation semantics do not change.
- No account, API, cloud state, telemetry, new dependency, new storage key, or runtime puzzle generation.

## Delivery sequence and Codememory graph

Execution is sequential because both monolithic runtimes and the browser harness overlap:

1. **R6-01 — solved-resume containment and fault harness.** Add exact terminal rejection plus key/operation-specific storage injection and no-credit tests.
2. **R6-02 — per-key health reducer and dormant status surfaces.** Track full transition/mixed-failure semantics and resume outcomes; add static ARIA markup. Enable only board-recovery-specific active warnings. Keep global victory claims empty.
3. **R6-03 — stats/history/practice health.** Route critical generic progression writes through explicit outcomes and consume practice persistence results.
4. **R6-04 — transactional Daily overlay.** Implement effective-overlay accessors, rejected-replay retries, durable-only streaks, and session-only sharing.
5. **R6-05 — Weekly/Cage Garden/Focus parity and UI activation.** Add pending step identities/full-ledger retries, provenance/idempotency coverage, unchanged Ready state, then enable coalesced active/victory presentation after every tracked writer is outcome-aware.
6. **R6-06 — hardening, docs, review, and release.** Full gates, Lighthouse, rollback drill, PR-only merge, exact-SHA Pages verification, and production smoke.

Each implementation slice gets a focused validated commit and a child Codememory task under `epic_79`; each child depends on the previous one.

## Named validation matrix

- Baseline/full gates: retain all 631 browser assertions, `npm run validate`, `npm run validate:browser`, `git diff --check`, and configured syntax checks.
- Fault harness: independently toggle `setItem` or `removeItem` for one exact key without affecting test seeding or unrelated storage; cover silent remove no-op and post-remove `getItem` uncertainty.
- Health reducer: full transition table including saved→failed, mixed write/cleanup failures, partial recovery, full recovery, skipped/preserved no-op, and deterministic fixed-order signatures.
- `exact solved resume containment`: both games across ordinary, Daily, Weekly, Cage Garden, and Focus provenance; bare/explicit/mismatching/invalid-Daily routes; exact solution rejected, near-solved restored, wrong-full boundary preserved, cleanup failure remains fail-closed, URL precedence is unchanged, normal fallback start count is allowed, and no solve/source/history credit is duplicated.
- `key-specific active save health`: resume write failure is visible/non-fatal, unrelated bytes remain durable, recovery is detected, and timer retries do not repeat announcements.
- `resume cleanup failure containment`: victory names cleanup failure and reload cannot resurrect solved Sudoku or Suguru.
- `stats and recent-solves isolation`: each exact key fails independently and later complete writes persist accumulated memory.
- `transactional Daily session fallback`: durable/pending/current faster/equal/slower table, unrelated pending keys, rejected-replay retry, off-Daily card identity, both share paths, no false `Solved locally`, durable-only streak, and later recovery writing one exact v1 ledger.
- `Weekly and Cage Garden session completion`: current-tab progression works, unsaved steps say `Complete this session`, retries are idempotent, next Cage step stays `Ready`, and no Daily credit leaks.
- `Focus session-memory disclosure`: same-document Compass fall-through remains, key stays unchanged, warning is visible, and reload reoffers Focus.
- `practice rotation health recovery`: in-memory structural bag avoids repeats and a later successful launch persists/clears only that warning.
- Accessibility: one save-health polite live region, non-live victory description, ownership under pause/result inertness, routine healthy mutation count 0, first failure 1, repeated failure 0, changed-domain set 1, recovery 1, exposed active-region completion mutation 0, title-first victory focus, and no modal collision.
- Geometry: healthy and longest degraded copy at 320/390/1440 and 200% text, with no overflow/overlap or startup CLS regression.
- Completion operation log: all applicable keys are attempted after one injected failure, resume cleanup is last, each durable ledger commits only after its write, and health/victory presentation flushes once.
- Exact payload/key audit: field-set assertions for both resumes, stats, Sudoku history, both Daily ledgers, Weekly, Cage Garden, Focus, and practice rotation; no health/pending field and no new storage key.
- Frozen contracts: exact Daily/Weekly vectors, Cage Garden 4/4, existing resume migrations, result idempotency, puzzle identity/order, and replacement guard behavior.
- Lighthouse 13.4.1: both routes/mobile+desktop, accessibility at least 98, best-practices/SEO 100, and zero named ARIA target nodes; performance observed.
- Release: latest-main/overlap check, PR-only merge, exact-SHA Pages success, deployed byte parity, canonical Daily routes, and live healthy/session-only/solved-snapshot smoke.

## Completion evidence

- Six focused commits through `9477e78` delivered solved-resume containment, per-key save health, generic progress isolation, transactional Daily results, and Weekly/Cage Garden/Focus parity without a storage-key or schema migration.
- Final local gates passed: `npm run validate`, `npm run validate:browser` with 816 assertions, and `git diff --check`. The browser matrix includes exact payload audits, write-order logs, forward rollback compatibility, 320/390/1440 geometry, and 200% text.
- Lighthouse 13.4.1 scored accessibility, best practices, and SEO at 100 for both games on mobile and desktop, with zero `aria-required-children`, `aria-required-parent`, or `label-content-name-mismatch` targets.
- Observed Lighthouse performance remained non-blocking: mobile 74/82 and desktop 99/98 for Sudoku/Suguru; TBT was 0 ms and CLS was 0 mobile, while network-sensitive desktop CLS remained observational under the documented policy.
- Persistence, provenance, accessibility, responsive presentation, and compatibility review lenses all reached no-blocker sign-off. PR, exact-SHA Pages, and production-smoke evidence remain authoritative in GitHub and Codememory release records.

## Risk and review budget

Depth large; risk high because completion credit, persistence truth, and recovery behavior change across both games. Run four review/fix lenses after plan approval:

1. persistence and Daily transaction integrity;
2. solved-resume and provenance-credit containment;
3. accessibility, announcement deduplication, and responsive geometry;
4. final compatibility and release sign-off.

Stop only when required checks are green and the latest review has no blocker.

## Deferrals and rollback

Defer Ready→Active timing, same-game multi-tab ownership, timer-write throttling, preference-save reporting, retry buttons/queues, background polling, broad runtime decomposition, accounts/cloud sync, and any puzzle/content/source redesign.

Rollback keeps R6-01 solved-resume rejection as the safety floor. Revert R6-06 through R6-02 in dependency order through a validated PR; no data migration is required because schemas do not change. If the health UI regresses, disable rendering while keeping operation outcomes and safe recovery. The rollback exit gate requires full validation, legacy payload loading, no new key/schema field, and exact solved-snapshot rejection. Pending session-only data may be discarded because it was never claimed or persisted as durable.
