# Diverse Challenge Generator v3

Status: approved / doing
Codememory: `epic_88` / research `task_5655` / primitives `task_5660` / Sudoku `task_5656` / Suguru `task_5657` / experience `task_5658` / release `task_5659`
Runtime session: `ses_05761cc04ffejP8v4Be5IVzikQ`

## Objective

Substantially expand ordinary Sudoku and Suguru play with deterministic, uniquely solvable, structurally diverse challenges from Easy through Expert/Challenge. Replace hand-supplied v3 solution/layout inputs with bounded seeded construction, improve clue-position diversity and profile-based publication bands, and add one accessible **Fresh challenge** launch surface. Keep runtime play dependency-free and preserve every shipped identity and persistence contract.

## Baseline

- Sudoku: 198 IDs across 22 source families. Four generated-v2 source families contribute 36 transformed IDs.
- Suguru: 26 entries across six named layouts and four canonical structural families. Seven entries are generated-v2.
- Generator v2 uses xorshift32, shuffled greedy/sample clue carving, MRV cutoff-at-two uniqueness, pinned attempts/puzzles, and LogicCoach-v1 profile gates.
- Complete Sudoku solutions and Suguru layouts/solutions are currently supplied by hand; generation mainly chooses clues.
- PracticeSelection rotates source family/layout bags but does not balance clue geometry or profile mix.
- Daily Sudoku/Suguru v1, Weekly v1, Cage Garden, both Focus identities, resume schemas, and PracticeSelection v1 are frozen.

## Research basis

- Peter Norvig, “Solving Every Sudoku Puzzle”: constraint propagation plus search, including unit-only placements and MRV-style branching: <https://norvig.com/sudoku.html>.
- Donald Knuth, “Dancing Links” (2000): reversible exact-cover search; useful as a Sudoku reference, though shared bitmask CSP is simpler for Suguru adjacency constraints: <https://arxiv.org/abs/cs/0011047>.
- McGuire, Tugemann, and Civario, “There is no 16-Clue Sudoku”: 17 is a lower bound, not a difficulty target; clue minimality is distinct from human difficulty: <https://arxiv.org/abs/1201.0749>.
- Janko Suguru rules: each connected region contains `1..N`, and equal values cannot touch orthogonally or diagonally: <https://www.janko.at/Raetsel/Suguru/index.htm>.
- qqwing is a useful technique/rating reference but GPL-2.0-or-later; no implementation code will be copied: <https://github.com/stephenostermiller/qqwing>.
- `robatron/sudoku.js` is MIT-licensed but is reference-only; v3 will be independently implemented without a runtime dependency: <https://github.com/robatron/sudoku.js>.

Research conclusion: use deterministic randomized MRV CSP for construction and cutoff-at-two uniqueness, orbit-aware clue carving for Sudoku, connected-region growth plus CSP assignment for Suguru, and deterministic human-technique profiles rather than clue count as the primary publication-band evidence. Randomized DFS is practical diversity, not uniform sampling.

## Scope and target inventory

### Sudoku

- Add ten source families, exactly two in each existing band.
- Expand each source through the existing three digit maps by three structural transforms.
- Final inventory: **288 IDs / 32 families**.
- V3 symmetry mix: four 180-degree rotational, two reflection/diagonal, and four intentionally asymmetric source masks.

### Suguru

- Add six generated 5×5 layouts with unique canonical dihedral signatures.
- Add Easy, Bridge, and Challenge clue sets for each layout.
- Final inventory: **44 entries / 12 named layouts / 10 structural families**.
- Keep cage sizes 2–5, exact coverage, orthogonal connectivity, and the eight-neighbor inequality rule.

### Experience

- Add one compact **Fresh challenge** surface per route with shared semantics.
- Launch via the existing ordinary-practice adapter and PracticeSelection v1 bag.
- Use current pending band/level; normalize pending Daily to ordinary Classic.
- Add no mode, storage key, result ledger, URL parameter, or resume field.

## Compatibility invariants

1. Generator-v2 content remains byte-identical: object fields, ordering, puzzles, solutions, cages, seeds, attempts, and Focus evidence.
2. `daily-editions.js`, `weekly-editions.js`, and `logic-coach.js` remain unchanged.
3. Daily v1 manifests/fingerprints, Weekly v1 manifests/fingerprints, Cage Garden descriptors/targets, and both Focus entries remain byte-identical.
4. New content is append-only, selectable ordinary content and never enters a frozen manifest.
5. Existing puzzle IDs remain resolvable indefinitely, including when a v3 family is disabled through forward rollback.
6. Resume versions, stats/history payloads, Challenge Compass schema/priority, and PracticeSelection v1 remain unchanged.
7. Generation occurs only offline; browsers load checked-in content and perform no construction search.

## Generator-v3 architecture

Add `scripts/generator-v3-primitives.mjs`, `scripts/validate-generator-v3.mjs`, and reviewed `scripts/frozen-v2-contracts.mjs`. V2 paths remain untouched and run first. Use `PAYLOAD_SCHEMA_VERSION = 2`, `GENERATOR_V2_VERSION = 2`, and `GENERATOR_V3_VERSION = 3`: the payload shape remains v2-compatible, existing origins remain version 2, and only new objects receive version 3.

Frozen fixtures are captured before payload mutation and contain canonical SHA-256 hashes for every current generated-v2 Sudoku source, Suguru layout, Suguru entry, both Focus objects/evidence, ordered IDs per band/level, Daily/Weekly manifests and fingerprints, and Cage Garden descriptors/target puzzle bytes. Validation reads reviewed constants and never rewrites them. “Byte-identical v2” means canonical object serialization plus exact ordered-prefix equality; the enclosing generated file must change when suffixes are appended.

### Shared deterministic search

- Versioned seeded xorshift32 PRNG and Fisher–Yates shuffle; seed must be a nonzero uint32.
- Bitmask domains, MRV variable selection, row-major tie-break, seeded candidate order.
- Explicit per-search and aggregate node counters and caps.
- Solution counting returns `zero`, `unique`, `multiple`, or `cap-exceeded`; search stops after solution two. `cap-exceeded` never proves uniqueness.
- Independent shipped validators confirm accepted puzzles through their separate traversal implementation and release timeout.

### V3 pin schema

Every Sudoku spec pins:

- `rngVersion`, `traversalVersion`, nonzero `constructionSeed`, nonzero `carveSeed`;
- `maxConstructionAttempts`, per-search nodes, aggregate construction nodes;
- `expectedConstructionAttempt`, `expectedConstructionNodes`, `expectedSolution`;
- explicit orbit policy, clue target/range, geometry constants;
- `maxCarveAttempts`, `maxUniquenessCalls`, per-call and aggregate uniqueness nodes;
- `expectedCarveAttempt`, puzzle, clue count, uniqueness call/node totals, and exact profile summary.

Every Suguru spec additionally pins topology seed/attempt/nodes, ordered cages, canonical signature, assignment seed/attempt/nodes/solution, cage histogram, compactness metrics, then level-specific carve pins. Zero seeds, malformed pins, cap exhaustion, and any expected/current mismatch fail closed with phase-specific diagnostics.

### Sudoku construction and carving

1. Construct a complete solved grid through seeded MRV CSP.
2. Build clue orbits for the manifest’s exact policy.
3. Seed-shuffle orbit order and tentatively remove complete orbits.
4. Keep an orbit removed only when counting completes before its node cap with result `unique`.
5. Retry bounded carve orders until the exact target and profile contract pass; do not claim global minimum clues.
6. Compute source-mask metrics only. Structural/digit transforms within a family are expected equivalents.

Numeric geometry gates:

| Band | Clue range | Source targets | Minimum clues per row/column/box | Maximum consecutive empty cells in a row/column |
|---|---:|---|---:|---:|
| Easy | 42–54 | 50, 46 | 3 | 5 |
| Medium | 34–44 | 40, 38 | 2 | 6 |
| Advanced | 30–39 | 36, 34 | 2 | 6 |
| Hard | 26–34 | 30, 29 | 1 | 7 |
| Expert | 23–31 | 26, 24 | 1 | 7 |

Ten-family manifest:

| Band | Stable source ID | Orbit policy |
|---|---|---|
| Easy | `easy-morning-koi` | 180° rotation |
| Easy | `easy-bamboo-window` | main diagonal |
| Medium | `medium-river-stones` | vertical reflection |
| Medium | `medium-crane-shadow` | none/asymmetric |
| Advanced | `advanced-moon-bridge` | 180° rotation |
| Advanced | `advanced-pine-crossing` | none/asymmetric |
| Hard | `hard-thunder-gate` | 180° rotation |
| Hard | `hard-ink-maze` | none/asymmetric |
| Expert | `expert-storm-lantern` | 180° rotation |
| Expert | `expert-void-garden` | none/asymmetric |

For each family, compute the three binary clue masks produced by the exact three shipped `STRUCTURES` in `puzzles.js`, ignore digit maps, sort those three masks lexicographically, and join them as the family mask signature. All 32 family signatures must be unique, and no transformed puzzle/solution pair may collide across families. Axis symmetry is asserted on source masks; transformed masks retain their declared transform metadata rather than the source’s visual axis.

### Suguru layout, solution, and carving

1. Generate a connected partition by seeded frontier growth from one of these exact sorted histograms: `[5,5,4,4,4,3]`, `[5,5,5,4,3,3]`, or `[5,4,4,4,3,3,2]`; use each twice.
2. Reject stranded cells, size/connectivity failures, or a canonical signature already mapped to a named layout.
3. Require each cage’s bounding-box fill ratio ≥0.4, cage perimeter ≤14, board partition perimeter 48–72, and no cage spanning all five rows or all five columns. Cage perimeter is the number of orthogonal cell edges touching the board boundary or a cell outside that cage; partition perimeter is the sum of all cage perimeters, so a shared cage boundary is counted once for each adjacent cage.
4. Generate a complete assignment through seeded MRV CSP with region all-different and king-move inequality.
5. Carve and profile Easy, Bridge, and Challenge independently.

Numeric puzzle gates:

| Level | Clues | Profile status | Evidence floors |
|---|---:|---|---|
| Easy | 9–13 | solved logically; hardest `local` | ≥12 logical steps and ≥12 placements |
| Bridge | 6–10 | solved logically; includes `interaction` | ≥10 logical steps, ≥8 placements, ≥1 explicit elimination |
| Challenge | 4–8 | solved or explicit stall; includes interaction/subset | ≥8 logical steps, ≥4 placements; stalled remaining cells ≤12 |

Bridge versus Easy on one layout requires at least two fewer clues and a clue-position symmetric difference ≥4. Challenge versus Bridge requires a symmetric difference ≥3 and no larger clue count.

Across named Suguru layouts, each canonical dihedral topology maps to exactly one `layoutFamilyId`; six v3 layouts add six signatures absent from the four frozen families. Three level puzzles on one layout intentionally share its signature.

### Honest difficulty contracts

LogicCoach techniques will not be expanded this round. Public labels are deterministic publication bands, not universal human ratings. Clue count is only a geometry/anomaly gate.

| Sudoku band | Exact profile gate |
|---|---|
| Easy | `solved-logically`, hardest `local`, ≥25 logical steps and ≥25 placements |
| Medium | `solved-logically`, local or interaction, ≥36 logical steps and ≥34 placements |
| Advanced | `solved-logically`, trace includes `interaction`, ≥40 logical steps, ≥36 placements, ≥1 elimination |
| Hard | `solved-logically`, trace includes `subset`, ≥45 logical steps, ≥40 placements, ≥1 elimination |
| Expert | unique, trace includes `subset`, ≥20 logical steps and ≥10 placements; if stalled, remaining cells ≤45 |

Runtime copy must not claim “human-rated,” “requires technique X,” or unsupported solve-time estimates.

### Authoritative search budgets

| Phase | Attempts/restarts | Per-search nodes | Aggregate nodes | Other cap |
|---|---:|---:|---:|---:|
| Sudoku construction/family | 64 | 250,000 | 2,000,000 | — |
| Sudoku carving/family | 128 | 2,000,000 per uniqueness call | 20,000,000 | ≤10,368 uniqueness calls |
| Suguru topology/layout | 10,000 | n/a | n/a | exact restart cap |
| Suguru assignment/layout | 64 | 250,000 | 4,000,000 | — |
| Suguru carving/level | 20,000 | 2,000,000 per uniqueness call | 20,000,000 | ≤20,000 uniqueness calls |

Node/call caps are authoritative and emit `cap-exceeded`. Timing is informational locally but CI applies named hard timeouts: primitives 15 seconds, complete generation 120 seconds, complete content validation 180 seconds on the documented Node 22 runner.

## Delivery sequence

### R7-01 — generator primitives (`task_5660`)

Status: completed and validated.

Files: new primitive/validator modules, `package.json`, plan status.

Acceptance:

- deterministic repeated construction;
- pinned MRV/tie-break behavior;
- solution counts 0/1/2 and exact cutoff;
- node-cap failure closed;
- Sudoku orbit integrity;
- Suguru partition coverage/connectivity/size and eight-way canonicalization;
- valid solved grids for both games;
- malformed inputs rejected;
- generated-content remains byte-identical.

Budgets and tri-state cap outcomes must match the authoritative table above. R7-01 also captures and reviews frozen-v2 fixture constants before any generated payload changes.

Commit: `Add deterministic generator v3 primitives`.

### R7-02 — Sudoku expansion (`task_5656`)

Status: completed and validated.

Files: content specs, generator adapter, generated payload, puzzle/logic/practice/browser validators.

Acceptance:

- ten source families/two per band;
- exactly 288 IDs/32 families and nine transforms per source;
- unique solutions independently validated;
- no source/transformed collision;
- declared symmetry and clue-spread metrics pass;
- profile contract recomputes for every transform;
- all v2 canonical hashes/order and both frozen registries remain exact;
- two consecutive regeneration runs are byte-identical;
- On the documented Node 22 CI runner, Sudoku generation ≤45 seconds; added payload ≤100 KiB.

Commit: `Expand deterministic Sudoku families`.

### R7-03 — Suguru expansion (`task_5657`)

Files: content specs, generator adapter, generated payload, Suguru/logic/practice/browser validators.

Acceptance:

- six layouts and eighteen clue sets;
- exactly 44 entries/12 layouts/10 structural families;
- six novel canonical signatures;
- all cages connected and size 2–5;
- every solution obeys region and touching rules;
- all puzzles uniquely solvable and profile-qualified;
- Bridge meets the numeric two-fewer-clues and symmetric-difference ≥4 rule for its layout;
- existing 26-entry prefix, Daily v1, Cage Garden, and Focus bytes remain exact;
- On the documented Node 22 CI runner, complete regeneration ≤90 seconds with hard timeout 120 seconds; total generated payload ≤200 KiB.

Commit: `Add generated Suguru expeditions`.

### R7-04 — Fresh challenge surface (`task_5658`)

Files: both HTML routes, both app adapters, styles, static/browser/practice validators.

Two-phase preview/commit contract:

1. Read the existing PracticeSelection v1 state and call pure `PracticeSelection.select()` to create one preview.
2. Retain the exact `puzzle` and `nextState` in ephemeral memory; preview changes no storage, URL, resume, focus, or board.
3. Keep/Escape discards the preview byte-neutrally.
4. After discard confirmation, write `preview.nextState` exactly once and launch `preview.puzzle`; repeated Confirm cannot double-write or double-launch.
5. A denied write launches that same puzzle and reports existing session-only rotation health.
6. Preserve supported ordinary mode preferences, map pending Daily to Classic, set ordinary provenance, and clear every Daily/Weekly/Cage/Focus identity through existing source setters.

Acceptance:

- one native, keyboard-operable, ≥44px CTA per route;
- one preview at a time; no whole-corpus rendering;
- existing discard confirmation runs before rotation/resume writes;
- Keep/Escape preserves board, URL, focus, and storage bytes;
- Confirm launches once with `runSource: ordinary` and no special identity fields;
- structural bag exhausts before reuse and avoids a boundary repeat;
- pending Daily becomes ordinary Classic;
- no Daily/Weekly/Cage/Focus credit;
- storage failure uses existing session-only health;
- no overflow at 320–1440 or 200% text; startup CLS ≤0.02.

Commit: `Launch fresh structural challenges`.

### R7-05 — hardening and release (`task_5659`)

Files: README, validation guide, completed plan, final count copy.

Acceptance:

- full gates and all review lenses green;
- final inventory/canonical hashes recorded;
- source-artifact manual sampling complete;
- Lighthouse thresholds pass;
- PR-only merge, exact-SHA Pages build, deployed byte parity, and production smoke pass.

Commit: `Document diverse challenge release`.

## Per-commit gates

- Plan/research: `npm run validate`, `git diff --check`, plan-critic approval.
- R7-01: primitive validator, frozen fixture validator, full `npm run validate`, generated-content byte identity, correctness review.
- R7-02: all Sudoku/logic/practice/Daily/Weekly checks, full regenerate twice with no diff, frozen hashes, full `npm run validate`.
- R7-03: combined Sudoku/Suguru generation and validators, deterministic reruns, frozen hashes, full `npm run validate`.
- R7-04: generated corpus bytes must be unchanged; static/practice/full browser gates and accessibility/provenance review.
- R7-05: full local/browser/Lighthouse/review gates. Repository docs record only pre-merge evidence; merge SHA, Pages build, byte parity, and production smoke remain authoritative in GitHub/Codememory after deployment rather than being claimed early.

## Validation matrix

### Generator and content

```bash
node scripts/validate-generator-v3.mjs
node scripts/generate-first-party-content.mjs
node scripts/generate-first-party-content.mjs --check
node scripts/validate-puzzles.mjs
node scripts/validate-suguru.mjs
node scripts/validate-logic-coach.mjs
node scripts/validate-practice-selection.mjs
node scripts/validate-daily-editions.mjs
node scripts/validate-weekly-editions.mjs
npm run validate
```

Additional hard assertions:

- frozen v2 canonical SHA-256 fixtures are reviewed constants, never regenerated in validation;
- v2 IDs/objects are exact prefixes and v3 objects suffix-only;
- Daily/Weekly member count remains 162 Sudoku; Suguru Daily remains 19;
- Cage Garden and Focus target/evidence hashes remain exact;
- no duplicate source puzzle/solution pair across families; the exact sorted three-`STRUCTURES` family mask signatures are unique across all 32 families, while digit variants are expected equivalents; each named Suguru layout maps to one signature and its level clue sets intentionally share it;
- independent validators prove every new puzzle unique;
- generation caps/timings and payload budgets pass.

### Browser and accessibility

```bash
npm run validate:browser
```

Cover inventory metadata, Fresh launch/confirmation/provenance, no special credit, resume restore for v3 IDs, disabled-v3 forward rollback, rotation failure health, responsive geometry, keyboard/focus, high contrast, reduced motion, 200% text, and runtime exceptions.

Release Lighthouse 13.4.1 on both routes/mobile+desktop:

- accessibility ≥98;
- best practices 100;
- SEO 100;
- zero `aria-required-children`, `aria-required-parent`, and `label-content-name-mismatch` nodes;
- performance observed separately with transfer-size/FCP/LCP review.

## Manual content review

- Review all ten Sudoku source masks and one deterministic transformed member per family for clue balance, symmetry policy, accidental empty units, solution consistency, and honest profile copy.
- Review all six Suguru layouts and all eighteen clue sets for readable cages, Easy/Bridge/Challenge differentiation, awkward thin shapes, and Nudge behavior.
- Complete at least one Fresh challenge per game and one per publication boundary; verify no special-source credit.
- Exercise Keep/Escape/Confirm, storage denied, 320/390/1440, 200% text, high contrast, and reduced motion.

## Review budget

High risk; run six lenses and stop only when the latest review has no blocker:

1. generator completeness, determinism, and cap safety;
2. uniqueness and frozen identity;
3. content diversity and profile honesty;
4. provenance, persistence, and rollback;
5. accessibility, focus, responsive geometry, and runtime cost;
6. final release/deployment sign-off.

## Rollback

Before merge, revert dependent milestones in reverse order. After release, do not delete shipped IDs, specs, or layouts: ship a forward data commit that marks defective v3 groups `selectable: false`, retains registry resolution for resumes, removes them from ordinary/Fresh rotation, and hides Fresh challenge only if its adapter is defective. Tests disable one v3 Sudoku family and one Suguru layout, prove direct saved-ID/resume resolution, prove selection exclusion, and prove only the affected PracticeSelection inventory branch resets while all content bytes/metadata remain unchanged.

## Completion gate

Round seven is complete only when the reviewed plan commit plus five implementation/release commits exist in dependency order `R7-01 → R7-02 → R7-03 → R7-04 → R7-05`; inventories are exactly 288/32 and 44/12/10; generation is byte-reproducible and within budget; uniqueness/profile/frozen hashes pass; full browser and accessibility gates pass; manual source sampling is recorded; no high-severity review finding remains; and the exact deployed SHA passes asset parity and live smoke.
