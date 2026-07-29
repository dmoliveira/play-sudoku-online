# Verified Daily editions

Status: done
Codememory: `epic_59` / audit `task_5519` / product `task_5520` / hardening `task_5521` / release `task_5522`
Runtime session: `ses_05761cc04ffejP8v4Be5IVzikQ`

## Outcome

Delivered and release-validated on 2026-07-29:

- immutable `sudoku-daily-v1` and `suguru-daily-v1` corpus fingerprints, strict date parsing, and baseline golden vectors;
- canonical Today/Past URLs, source-aware cross-game switching, safe fallback, and identity-only Daily sharing;
- exclusive ordinary/Daily/Weekly/Cage Garden provenance with non-destructive Sudoku-v1 and Suguru-v2 resume migration;
- normalized local result ledgers, per-game local Daily streaks, immediate progress status, and compact equivalent result cards;
- body-level viewport victory dialogs, title-first focus, static actions, Night/high-contrast hardening, and responsive result hierarchy;
- `npm run validate`, `npm run validate:browser` with 340 assertions, and `git diff --check` green;
- three implementation review/fix passes plus final browser-first UX audit with no remaining findings;
- pinned Lighthouse 13.4.1 accessibility/best-practices/SEO scores of 100 on both routes in mobile and desktop modes; observed performance scores 78/97 for Sudoku and 86/99 for Suguru;
- representative Today/Past/solved/Night/high-contrast and final victory screenshots stored outside the repository under `/tmp/round3-daily-*`.

## Why this slice

The current Daily experience is deterministic only for the current local date. Its URL does not identify the date or puzzle corpus, so a shared link can open a different board after midnight or after future inventory changes. Daily provenance also leaks across run types: a Sudoku Weekly step whose mode happens to be `daily` can receive Daily credit, ordinary Sudoku Dailies sometimes clear their date, and Suguru resumes carry no Daily date at all. Suguru also has no durable Daily result ledger.

This round makes a Daily run an explicit, reproducible edition rather than inferring it from `mode === "daily"`. It keeps all personal result data local while giving both games the same honest edition, resume, result, streak, and sharing contract.

Evidence collected on 2026-07-29:

- A clean `c7f7aac5fcdad41c9936f5bdbab5a5a785b451df` baseline passes `npm run validate`, `npm run validate:browser` with 245 assertions, and `git diff --check`.
- Sudoku `applyDailySpecialPresentation(null)` clears `currentDailyDateKey`, while completion falls back to the then-current date.
- Sudoku records a Daily result whenever `state.mode === "daily"`, including forced Weekly-path boards.
- Sudoku rejects a dated Daily resume after local midnight rather than preserving it as a truthful past edition.
- Suguru chooses a Daily board from the current date but persists neither the date nor corpus in its version-2 resume.
- Suguru records generic solve statistics only; it cannot show whether a particular Daily edition was completed.
- `syncUrl()` and `game-switcher.js` expose mode and level/difficulty but no immutable Daily identity.

## Risk and validation budget

- Depth: large — shared edition identity, two runtimes, URL precedence, resume migration, persistence, UI, tests, docs, and release all change.
- Risk: high — startup and active-game recovery behavior changes, and malformed provenance must never earn Daily credit.
- Review budget: three review/fix passes. Stop only after the full required checks are green and the latest review has no blocker.
- Required local gates: `npm run validate`, `npm run validate:browser`, and `git diff --check` on the full diff.
- Release gates: focused browser screenshots, pinned Lighthouse 13.4.1 accessibility/best-practices/SEO checks, performance observation, PR CI, exact-SHA Pages verification, and production smoke.

## Experience principles

1. **Identity before credit.** `Daily` mode alone never proves a Daily edition. Credit requires a validated identity whose game, corpus, date, band, and puzzle agree.
2. **A shared edition stays shared.** Opening a canonical Daily URL later resolves the same board, including date-driven Sudoku special presentation.
3. **Past is not today.** A restored or linked past edition remains playable and is visibly labelled as a past Daily.
4. **Personal data stays local.** URLs contain edition provenance only. Time, mistakes, assists, completion, streak, and board progress never enter a URL.
5. **One compact status surface.** Daily identity and completion appear next to the play flow without adding another competing dashboard.

## Public Daily contract

### Canonical URLs

```text
/index.html?game=sudoku&difficulty=easy&mode=daily&edition=2026-07-29&corpus=sudoku-daily-v1
/suguru.html?game=suguru&level=size5-easy&mode=daily&edition=2026-07-29&corpus=suguru-daily-v1
```

- `edition` is a literal, zero-padded Gregorian `YYYY-MM-DD` date.
- `corpus` names an immutable ordered puzzle-ID manifest and selection algorithm.
- The date is interpreted literally, not converted through the viewer's timezone.
- Today uses the player's local calendar date. A valid past date stays valid and reproducible.
- A future date is unavailable: startup replaces it with today's current edition and announces that fallback.
- Unknown corpus IDs, invalid dates, missing corpus/date pairs, and corpus/game mismatches never become verified.
- `mode=daily` with neither provenance parameter is shorthand for today's current corpus and canonicalizes immediately.
- Malformed or partial provenance falls back to today's current corpus with an explanatory message.
- Non-Daily URLs remove `edition` and `corpus`.
- Display/setup parameters (`notes`, `mistakes`, and Sudoku symbol settings) remain independent of identity.

### Frozen corpus registry

Add `daily-editions.js`, loaded before `game-switcher.js` and either app, exposing a small `window.DailyEditions` API. It owns current corpus IDs, strict date parsing, local-today formatting, exact v1 manifests, deterministic resolution, and provenance validation.

The v1 contract freezes the exact current signed-32-bit `hashText` steps and final `Math.abs` behavior, not just the seed strings. `sudoku-daily-v1` freezes each difficulty's template order and expands every template through ordered variant suffixes `a`, `b`, `c` and structure suffixes `r0`, `r1`, `r2`. Selection is exactly ``hashText(`${difficulty}-${edition}`) % ids.length``. `suguru-daily-v1` freezes each level's ordered puzzle IDs and selects with exactly ``hashText(`${level}-${edition}`) % ids.length``.

Each manifest member also freezes an identity fingerprint produced from an unambiguous stable serialization:

- Sudoku: difficulty, ID, puzzle string, and solution string.
- Suguru: level, ID, puzzle string, solution string, size, and ordered cage map.
- Sudoku specials: ordered ID/title/focus/theme/legend definitions, eligibility by difficulty, the `daily-special-${edition}-${difficulty}` seed, and the existing one-in-three gate.

Runtime resolution succeeds only when every manifest ID exists exactly once, belongs to the requested band, and matches its fingerprint. Missing, duplicate, or fingerprint-mismatched members make that corpus unavailable. In that integrity-failure case, start an ordinary same-band Classic board, announce that the Daily corpus is unavailable, and retain no verified provenance; do not silently substitute a different Daily.

Static validators compare the full identity fields and fingerprints. Golden vectors from baseline SHA `c7f7aac5fcdad41c9936f5bdbab5a5a785b451df` independently pin the hash/selection/special result for `2026-07-29`:

| Game | Band | Expected puzzle | Expected special |
| --- | --- | --- | --- |
| Sudoku | Easy | `easy-garden-path-c-r1` | none |
| Sudoku | Medium | `medium-paper-lantern-a-r0` | `petal-daily` |
| Sudoku | Advanced | `advanced-cedar-path-c-r1` | none |
| Sudoku | Hard | `hard-winter-ink-c-r2` | none |
| Sudoku | Expert | `expert-no-mercy-a-r0` | none |
| Suguru | Size 5 · Easy | `suguru-size5-garden-path` | n/a |
| Suguru | Size 5 · Bridge | `suguru-size5-cascade-bridge` | n/a |
| Suguru | Size 5 · Challenge | `suguru-size5-lantern-deep-night` | n/a |

Additional special-rule vectors pin Easy `2026-01-05` to `moon-memory-daily` and Advanced `2026-01-01` to `petal-daily`. V1 intentionally preserves the current gate/index semantics; changing special reachability or selection requires a new corpus version.

Sudoku Daily-special selection uses the resolved edition date instead of implicit today. A non-special Daily keeps player display preferences without clearing edition identity. Any v1 puzzle identity or special-rule change requires a new corpus ID while retaining the old resolver.

### Cross-game switching and sharing

- Switching games from a valid active canonical Daily keeps `edition`, maps difficulty/level as today, and substitutes the target game's current corpus.
- After startup validation, each app calls a switcher-owned `setGameNavigationContext({ runSource, dailyEdition })`; navigation links use this active context rather than inferring source from query mode. Weekly and Cage Garden always map to target Classic.
- A pairless `mode=daily` URL without a validated active Daily source is not carried as verified context; the target falls back to Classic rather than manufacturing identity.
- Canonical browser URLs are rebuilt from allowlisted fields rather than mutating the incoming query. Sudoku allows game/difficulty/mode/setup/display plus a valid edition pair; Suguru allows game/level/mode/setup plus a valid pair. `mistakes=on|off` is only a feedback preference and is distinct from the private numeric mistake count.
- Share URLs are stricter identity-only URLs: game, band, `mode=daily`, `edition`, and `corpus`. They omit notes, mistake feedback, Sudoku display preferences, navigation hints, and all unknown fields.
- Existing `sourceDifficulty` and `sourceMode` remain validated navigation-only non-Daily hints and are omitted from canonical Daily/share URLs.
- Daily victory/result share text includes the canonical edition URL and human-readable date.
- Ordinary, Weekly, Cage Garden, and other victory shares contain no Daily provenance.
- Shared URLs never contain time, mistakes, result state, streak, assists, notes progress, board contents, local journey/weekly metadata, or unknown query fields.

## Runtime provenance model

Both apps gain mutually exclusive launch provenance:

```json
{
  "runSource": "daily-edition",
  "dailyEdition": {
    "version": 1,
    "gameId": "sudoku",
    "corpus": "sudoku-daily-v1",
    "edition": "2026-07-29",
    "band": "easy",
    "puzzleId": "easy-garden-path-c-r1"
  }
}
```

Allowed sources are exclusive:

- Sudoku: `ordinary`, `daily-edition`, or `weekly`.
- Suguru: `ordinary`, `daily-edition`, or `cage-garden`.

Only `daily-edition` may retain `dailyEdition`; only `weekly` may retain/write validated week/path/step fields; only `cage-garden` may retain/write journey fields. Every launch clears all payloads owned by other sources before applying its own. Restart/replay preserves the exact active source and edition. A Weekly step may continue using Daily mode defaults, but its source remains `weekly`; a Cage Garden board remains `cage-garden`.

Daily completion requires all of:

1. source is `daily-edition`;
2. edition schema, game, corpus, date, band, and puzzle ID are valid;
3. the active puzzle matches a fresh registry resolution;
4. the edition is not in the future.

Failure records the generic solve normally but writes no verified Daily result or Daily achievement/streak credit.

## Persistence and migration

### Verified result ledgers

Use separate local-only versioned keys:

- Sudoku: `sudoku-sakura-verified-daily-results`
- Suguru: `sudoku-sakura-suguru-daily-results`

```json
{
  "version": 1,
  "entries": {
    "sudoku-daily-v1|2026-07-29|easy": {
      "edition": "2026-07-29",
      "corpus": "sudoku-daily-v1",
      "band": "easy",
      "puzzleId": "easy-garden-path-c-r1",
      "seconds": 123,
      "mistakes": 0,
      "assisted": false,
      "completedAt": "2026-07-29T12:00:00.000Z"
    }
  }
}
```

- Suguru omits `assisted`; Sudoku may retain validated medal/technique/special metadata.
- Keys and records must agree with a fresh corpus resolution. Invalid, unknown-version, array-shaped, malformed, future-dated, or mismatched entries are ignored.
- One entry exists per corpus/date/band. Replays are idempotent; a faster replay may replace performance fields while preserving earliest valid `completedAt`.
- Storage write failures do not interrupt play.
- Existing `sudoku-sakura-daily-results` records cannot exclude known Weekly false credit. Leave that key untouched for rollback safety, but do not migrate or count it as verified history.

### Daily streak

- Derive each game's Daily streak from that game's normalized verified ledger; persist no second counter.
- Multiple bands or supported corpus versions completed on one date count once per game.
- Date adjacency uses literal Gregorian calendar-day arithmetic in UTC over the `YYYY-MM-DD` keys, avoiding daylight-saving duration errors.
- The active streak is the contiguous run ending today, or ending yesterday when today is unfinished. Otherwise it is zero.
- A replay replaces performance fields only when `seconds` is strictly lower; equal/slower solves leave the entry unchanged. `completedAt` must be a parseable ISO instant and the earliest valid value is preserved.
- Generic all-solve streaks remain unchanged and are labelled solve streak/momentum, not Daily streak.
- Daily-specific result copy and achievements use the verified ledger. Neither game claims cross-device sync.

### Resume versions

- Bump Sudoku resume v1 to v2 with `runSource` and optional `dailyEdition`.
- Bump Suguru resume v2 to v3 with the same fields while retaining optional Cage Garden metadata.
- An exact Daily resume means a valid core plus exact `runSource`, game, corpus, edition, band, and freshly resolved puzzle ID. Board progress is not route identity.
- `notes`, `mistakes`, and symbol settings never disqualify a resume. They are display/setup parameters applied after restoration. A URL containing only those parameters follows bare-route precedence.
- A bare-route valid past Daily resume restores and canonicalizes its exact past URL; status says `Past Daily`. An explicit canonical URL restores only an exact matching resume; otherwise it starts the requested edition.
- Evaluate pairless `mode=daily` only after source-specific resume validation. An exact valid Weekly resume restores as `weekly`; otherwise pairless mode starts today's edition.
- A legacy Weekly context is valid only for the current week with a known path and step, matching saved difficulty/mode and exact deterministic expected puzzle. The step must be either the current contiguous next step or, after path completion, the product's permitted Step 1 replay. Otherwise preserve a valid core as `ordinary`; if its mode was Daily, downgrade to Classic.
- Sudoku v1 Daily resumes migrate to `daily-edition` only when saved date, difficulty, puzzle, and v1 resolution agree.
- Suguru v2 Cage Garden resumes retain valid journey context as `cage-garden`.
- On a bare or display-only route, a legacy snapshot with a valid core but missing, stale, or invalid Daily identity restores as `ordinary` Classic while preserving board, notes, elapsed time, mistakes, selection, pause state, and display aids; strip all Daily/special metadata. Explicit identity/gameplay URLs still win. Clear storage only when the core snapshot itself is invalid, and validate Weekly/Cage Garden context before downgrade.
- Other valid legacy non-Daily resumes retain their board and valid mode as `ordinary`.

## Startup precedence

| Route/storage state | Result |
| --- | --- |
| Explicit valid canonical Daily + exact verified resume | Restore that edition |
| Explicit valid canonical Daily + missing/mismatched resume | Start requested edition |
| Pairless `mode=daily` + exact valid Weekly resume | Restore Weekly source; do not canonicalize as Daily |
| Pairless `mode=daily` without valid Weekly source | Start and canonicalize today's current corpus |
| Invalid/partial/unknown/future provenance | Start today, canonicalize, announce fallback |
| Healthy route + unavailable/fingerprint-failed corpus | Start ordinary same-band Classic; no Daily provenance |
| Bare/display-only route + valid verified Daily resume | Restore exact edition; label Today or Past |
| Bare/display-only route + valid legacy ambiguous Daily core | Preserve progress as ordinary Classic; strip Daily metadata |
| Bare/display-only route + valid non-Daily resume | Preserve restore behavior; strip Daily params |
| Explicit non-Daily identity + exact matching resume | Restore relevant non-Daily source, then apply display/setup params |
| Explicit non-Daily identity + mismatched resume | Start requested ordinary board |
| No valid resume | Preserve current newcomer/Cage Garden bare-route behavior |

## Compact UI contract

- Reuse each board's `#status-mode-label` for `Today's Daily`, `Past Daily`, `Weekly path`, `Cage Garden`, or ordinary mode. Weekly/Cage Garden never display as verified Daily merely because mode defaults match.
- Place one compact `#daily-edition-card` in each sidebar immediately after the existing next-step section and before extras/Cage Garden. Show it for an active verified Daily or when that band's edition has a verified local result.
- Use the same stable IDs on the separate pages: `#daily-edition-title`, `#daily-edition-status`, `#daily-result-list`, `#daily-edition-streak`, `#daily-result-share-text`, `#daily-edition-primary-button`, and `#share-daily-button`, with explicit `aria-labelledby`/`aria-describedby` relationships.
- Status says `Unsolved`, `In progress`, or `Solved locally`; it never implies server verification or cross-device state.
- Rework Sudoku's existing hidden Daily details into this compact surface rather than keeping two dashboards. Add equivalent Suguru markup in existing visual language.
- Keep board and primary actions dominant at 320–500 px.
- Victory identifies Today versus Past Daily. Replay preserves exact date/corpus; a past victory separately offers today's edition.
- Provenance fallback uses the existing polite game message, not a modal.

## Implementation sequence

1. **Plan and contract (`task_5519`)**
   - Review this plan with `plan-critic` and resolve blocker findings.
   - Link the approved plan in Codememory, record provenance/privacy decisions, complete audit, and bind `task_5520`.
2. **Contract tests first (`task_5520`)**
   - Add static assertions for shared-script order, stable card IDs/ARIA, truthful copy, syntax, and manifests.
   - Add per-scenario evaluation error boundaries so one failure is recorded and later checks continue. Extend navigate and reload helpers to apply/reapply a fixed instant plus explicit CDP timezone with isolated storage.
   - Add failing tests for Today shorthand, literal past editions across UTC-positive/UTC-negative midnight boundaries, leap-day validation, future/invalid/unknown fallback, same URL/same puzzle, every baseline golden vector, game-switch mapping, allowlisted non-Daily stripping, and privacy-safe share URLs.
   - Add failing tests for Sudoku no-special date retention, Weekly non-credit, resume migrations, stale/undated handling, ledger normalization/idempotency, same-day band deduplication, gap reset, and Suguru parity.
   - Red exit: all original 245 assertions execute and pass; only an explicitly named list of new contract assertions fails.
3. **Product implementation (`task_5520`)**
   - Add registry/resolver; wire URL parsing/syncing in both apps and switcher.
   - Add source/edition state, selection/special resolution, resume persistence, and migration.
   - Add normalized ledgers, derived streaks, completion gating, canonical share text, and compact cards.
4. **Hardening (`task_5521`)**
   - Exercise malformed schema, unsupported versions, missing corpus members, storage failures, timezone-adjacent clocks, pause/reload, restart, route precedence, and source transitions.
   - Check mobile/desktop geometry, Night, contrast, reduced motion, keyboard/focus, native-share fallback, and startup CLS.
   - Update README and validation docs with URL, corpus-versioning, privacy, migration, smoke expectations, and rollback guidance. A release rollback must retain the new provenance reader or first deploy a compatibility patch that refuses newer Daily resumes; do not raw-revert to a runtime that would present v2/v3 Daily resumes without provenance validation.
5. **Release (`task_5522`)**
   - Run full gates and three review/fix passes.
   - Capture focused 390 px/1440 px Today, Past, solved, Night, and high-contrast screenshots outside the repo.
   - Run Lighthouse, commit, push one PR, review/fix, compare `origin/main`/overlaps, merge, verify exact Pages SHA, production-smoke both routes, and clean up.

## Acceptance criteria

### Reproducibility and URL safety

- Same supported game/corpus/date/band resolves the same puzzle regardless of current date or runtime pool order.
- Today shorthand canonicalizes after source-specific resume validation; valid past links remain past after reload/midnight.
- Future, malformed, partial, unknown, or wrong-game provenance never receives verified status or credit and falls back visibly.
- Non-Daily runs contain no stale provenance.
- Game switching preserves only validated dates and uses the target corpus.
- Shares reproduce the edition without personal result/board state.

### Credit and recovery

- Ordinary, Weekly, Cage Garden, malformed, legacy-undated, and forced boards cannot write verified results.
- Exact completions persist once per corpus/date/band in both games; replay is idempotent and may improve best time.
- Daily streak uses unique verified dates, handles same-day multi-band solves, and resets across a gap.
- Current-version past Daily resumes restore as Past Daily.
- Safe non-Daily legacy resumes and valid Cage Garden/Weekly context remain recoverable; ambiguous Daily cores preserve progress as ordinary Classic and never masquerade as today.

### Experience, accessibility, and regression safety

- Both games show one compact equivalent Daily edition/result surface with truthful Today/Past and local-only status.
- Weekly/Cage Garden source labels stay truthful even when mode defaults equal Daily settings.
- Board order, mobile keypad, pause/victory inertness, focus, keyboard controls, themes, contrast, reduced motion, and Cage Garden remain intact.
- `npm run validate`, `npm run validate:browser`, and `git diff --check` pass; Lighthouse and production smoke satisfy `docs/validation.md`.

## Out of scope

- Accounts, server verification, leaderboards, anti-cheat guarantees, notifications, remote sync, or result data in URLs.
- New puzzle content or changed grids.
- Combining Sudoku and Suguru into one streak; each game derives its own local Daily streak.
- Reclassifying generic solve rank/streak systems beyond correcting Daily-specific labels and achievement eligibility.
