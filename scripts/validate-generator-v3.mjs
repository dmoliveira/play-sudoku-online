import fs from "node:fs";
import vm from "node:vm";
import { SUDOKU_V3_CONTENT_SPECS } from "./content-specs.mjs";
import {
  GENERATOR_V2_VERSION,
  GENERATOR_V3_VERSION,
  PAYLOAD_SCHEMA_VERSION,
  RNG_VERSION,
  SEARCH_BUDGETS,
  SUDOKU_ORBIT_POLICIES,
  SUGURU_GEOMETRY_GATES,
  TRAVERSAL_VERSION,
  buildSudokuOrbits,
  canonicalizeSuguruPartition,
  constructSudoku,
  constructSuguruSolution,
  countSudokuSolutions,
  countSuguruSolutions,
  createSearchBudget,
  createXorshift32,
  generateSuguruPartition,
  getSuguruDihedralSignatures,
  satisfiesSuguruGeometryGates,
  validateSuguruPartition
} from "./generator-v3-primitives.mjs";
import { FROZEN_V2_CONTRACTS, canonicalSerialize, canonicalSha256, textSha256 } from "./frozen-v2-contracts.mjs";
import { generateSudokuV3, validateSudokuV3Spec } from "./sudoku-v3-content.mjs";

const ROOT = new URL("../", import.meta.url);
const UNIQUE_SUDOKU = "400917503325046790097235084254601379860790452970524168540160237732458916019302845";
const SUGURU_CAGES = Object.freeze([
  Object.freeze([0, 5, 6, 10, 11]),
  Object.freeze([8, 9, 13, 14, 19]),
  Object.freeze([1, 2, 3, 4]),
  Object.freeze([21, 22, 23, 24]),
  Object.freeze([7, 12, 17, 18]),
  Object.freeze([15, 16, 20])
]);

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(label, run) {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  ensure(threw, `${label} must fail closed`);
}

function readRoot(file) {
  return fs.readFileSync(new URL(file, ROOT), "utf8");
}

function validateSudokuSolution(grid, label) {
  ensure(typeof grid === "string" && /^[1-9]{81}$/.test(grid), `${label} must be a solved 81-cell grid`);
  const values = [...grid].map(Number);
  const expected = "123456789";
  for (let row = 0; row < 9; row += 1) ensure(values.slice(row * 9, row * 9 + 9).sort().join("") === expected, `${label} row ${row} is invalid`);
  for (let col = 0; col < 9; col += 1) ensure(Array.from({ length: 9 }, (_, row) => values[row * 9 + col]).sort().join("") === expected, `${label} column ${col} is invalid`);
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const box = [];
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) box.push(values[row * 9 + col]);
      ensure(box.sort().join("") === expected, `${label} box ${boxRow}/${boxCol} is invalid`);
    }
  }
}

function transformSuguruCages(cages, transformIndex, size = 5) {
  const transform = (row, col) => {
    if (transformIndex === 0) return [row, col];
    if (transformIndex === 1) return [col, size - 1 - row];
    if (transformIndex === 2) return [size - 1 - row, size - 1 - col];
    if (transformIndex === 3) return [size - 1 - col, row];
    if (transformIndex === 4) return [row, size - 1 - col];
    if (transformIndex === 5) return [size - 1 - row, col];
    if (transformIndex === 6) return [col, row];
    return [size - 1 - col, size - 1 - row];
  };
  return cages.map((cage) => cage.map((cell) => {
    const [row, col] = transform(Math.floor(cell / size), cell % size);
    return row * size + col;
  }));
}

function validateSuguruSolution(solution, cages, label) {
  ensure(typeof solution === "string" && /^[1-5]{25}$/.test(solution), `${label} must be a solved 25-cell grid`);
  const values = [...solution].map(Number);
  const cageMap = Array(25).fill(-1);
  cages.forEach((cage, cageIndex) => {
    const actual = cage.map((cell) => values[cell]).sort((left, right) => left - right).join(",");
    const expected = Array.from({ length: cage.length }, (_, index) => index + 1).join(",");
    ensure(actual === expected, `${label} cage ${cageIndex} is invalid`);
    cage.forEach((cell) => { cageMap[cell] = cageIndex; });
  });
  values.forEach((value, index) => {
    ensure(value <= cages[cageMap[index]].length, `${label} value at ${index} exceeds its cage`);
    const row = Math.floor(index / 5);
    const col = index % 5;
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (!rowOffset && !colOffset) continue;
        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        const other = nextRow * 5 + nextCol;
        if (nextRow >= 0 && nextRow < 5 && nextCol >= 0 && nextCol < 5 && other > index) ensure(values[other] !== value, `${label} has touching equal values at ${index}/${other}`);
      }
    }
  });
}

function runPrimitiveContracts() {
  ensure(PAYLOAD_SCHEMA_VERSION === 2 && GENERATOR_V2_VERSION === 2 && GENERATOR_V3_VERSION === 3, "generator version constants changed");
  ensure(RNG_VERSION === 1 && TRAVERSAL_VERSION === 1, "algorithm version constants changed");
  ensure(canonicalSerialize(SEARCH_BUDGETS) === canonicalSerialize({
    sudokuConstruction: { maxAttempts: 64, perSearchNodes: 250_000, aggregateNodes: 2_000_000 },
    sudokuCarving: { maxAttempts: 128, perSearchNodes: 2_000_000, aggregateNodes: 20_000_000, maxCalls: 10_368 },
    suguruTopology: { maxAttempts: 10_000 },
    suguruAssignment: { maxAttempts: 64, perSearchNodes: 250_000, aggregateNodes: 4_000_000 },
    suguruCarving: { maxAttempts: 20_000, perSearchNodes: 2_000_000, aggregateNodes: 20_000_000, maxCalls: 20_000 }
  }), "authoritative search budgets changed");

  const random = createXorshift32(1);
  ensure([random.nextUint32(), random.nextUint32(), random.nextUint32()].join(",") === "270369,67634689,2647435461", "xorshift32 sequence changed");
  expectThrow("zero RNG seed", () => createXorshift32(0));

  const budget = createSearchBudget("sudokuConstruction", { perSearchNodes: 2, aggregateNodes: 3, maxCalls: 2 });
  const firstBudgetResult = budget.run((nodeCap) => ({ outcome: "cap-exceeded", solutions: 0, nodes: nodeCap }));
  const secondBudgetResult = budget.run((nodeCap) => ({ outcome: "unique", solutions: 1, nodes: nodeCap }));
  const exhaustedBudgetResult = budget.run(() => ({ outcome: "unique", solutions: 1, nodes: 0 }));
  ensure(firstBudgetResult.nodes === 2 && secondBudgetResult.nodes === 1 && exhaustedBudgetResult.outcome === "cap-exceeded" && exhaustedBudgetResult.budgetExhausted, "aggregate budget must stop exactly at its caps");
  ensure(canonicalSerialize(budget.snapshot()) === canonicalSerialize({ calls: 2, nodes: 3, remainingNodes: 0, remainingCalls: 0 }), "aggregate budget counters changed");
  expectThrow("unknown aggregate budget phase", () => createSearchBudget("suguruTopology"));
  expectThrow("construction per-search cap override", () => createSearchBudget("sudokuConstruction", { perSearchNodes: SEARCH_BUDGETS.sudokuConstruction.perSearchNodes + 1 }));
  expectThrow("construction aggregate cap override", () => createSearchBudget("sudokuConstruction", { aggregateNodes: SEARCH_BUDGETS.sudokuConstruction.aggregateNodes + 1 }));
  expectThrow("construction call cap override", () => createSearchBudget("sudokuConstruction", { maxCalls: SEARCH_BUDGETS.sudokuConstruction.maxAttempts + 1 }));

  const constructed = constructSudoku({ seed: 710_001, traceLimit: 5 });
  const repeated = constructSudoku({ seed: 710_001, traceLimit: 5 });
  ensure(canonicalSerialize(constructed) === canonicalSerialize(repeated), "Sudoku construction must repeat exactly");
  ensure(constructed.outcome === "solved" && constructed.solution === "718329645432516879569487123157692384826143597943758216691234758385971462274865931" && constructed.nodes === 87, "Sudoku construction pin changed");
  ensure(canonicalSerialize(constructed.decisionTrace) === canonicalSerialize([
    { index: 0, candidates: [7, 2, 6, 4, 9, 8, 5, 3, 1] },
    { index: 1, candidates: [1, 9, 6, 2, 3, 5, 8, 4] },
    { index: 2, candidates: [8, 5, 4, 6, 3, 2, 9] },
    { index: 3, candidates: [3, 4, 5, 6, 2, 9] },
    { index: 4, candidates: [2, 9, 4, 5, 6] }
  ]), "Sudoku MRV, row-major tie-break, or seeded candidate order changed");
  validateSudokuSolution(constructed.solution, "constructed Sudoku");

  const unique = countSudokuSolutions(UNIQUE_SUDOKU, { seed: 710_002, traceLimit: 3 });
  const multiple = countSudokuSolutions("0".repeat(81), { seed: 710_003, nodeCap: 200_000, traceLimit: 3 });
  const zero = countSudokuSolutions(`11${"0".repeat(79)}`, { seed: 1 });
  const capped = countSudokuSolutions("0".repeat(81), { seed: 1, nodeCap: 1 });
  ensure(unique.outcome === "unique" && unique.solutions === 1 && unique.nodes === 16, "Sudoku unique outcome changed");
  ensure(multiple.outcome === "multiple" && multiple.solutions === 2 && multiple.nodes === 86, "Sudoku counting must stop exactly after solution two");
  ensure(zero.outcome === "zero" && zero.solutions === 0 && zero.nodes === 0, "Sudoku zero outcome changed");
  ensure(capped.outcome === "cap-exceeded" && capped.solutions === 0 && capped.nodes === 1, "Sudoku node-cap exhaustion must fail closed");
  ensure(canonicalSerialize(unique.decisionTrace) === canonicalSerialize([{ index: 1, candidates: [8] }, { index: 2, candidates: [6] }, { index: 7, candidates: [2] }]), "Sudoku counting traversal pin changed");

  const expectedOrbitCounts = { none: 81, "rotate-180": 41, "main-diagonal": 45, "vertical-reflection": 45 };
  Object.values(SUDOKU_ORBIT_POLICIES).forEach((policy) => {
    const orbits = buildSudokuOrbits(policy);
    const cells = orbits.flat();
    ensure(orbits.length === expectedOrbitCounts[policy] && cells.length === 81 && new Set(cells).size === 81 && Math.min(...cells) === 0 && Math.max(...cells) === 80, `${policy} Sudoku orbits lost integrity`);
  });
  ensure(canonicalSerialize(buildSudokuOrbits(SUDOKU_ORBIT_POLICIES.ROTATE_180).slice(0, 3)) === canonicalSerialize([[0, 80], [1, 79], [2, 78]]), "Sudoku orbit ordering changed");
  expectThrow("unknown Sudoku orbit policy", () => buildSudokuOrbits("quarter-turn"));
  expectThrow("short Sudoku board", () => countSudokuSolutions("0".repeat(80)));
  expectThrow("non-digit Sudoku board", () => countSudokuSolutions(`x${"0".repeat(80)}`));
  expectThrow("whitespace Sudoku board", () => countSudokuSolutions(` ${"0".repeat(80)}`));
  expectThrow("Sudoku carving cap override", () => countSudokuSolutions("0".repeat(81), { nodeCap: SEARCH_BUDGETS.sudokuCarving.perSearchNodes + 1 }));
  expectThrow("Sudoku construction cap override", () => constructSudoku({ seed: 1, nodeCap: SEARCH_BUDGETS.sudokuConstruction.perSearchNodes + 1 }));

  const partition = generateSuguruPartition({ size: 5, histogram: [5, 5, 4, 4, 4, 3], seed: 720_006, maxAttempts: 500 });
  const repeatedPartition = generateSuguruPartition({ size: 5, histogram: [5, 5, 4, 4, 4, 3], seed: 720_006, maxAttempts: 500 });
  ensure(canonicalSerialize(partition) === canonicalSerialize(repeatedPartition), "Suguru topology generation must repeat exactly");
  ensure(partition.outcome === "generated" && partition.attempt === 108 && canonicalSerialize(partition.cages) === canonicalSerialize(SUGURU_CAGES), "Suguru topology pin changed");
  ensure(partition.canonicalSignature === "0,0,0,0,1,2,2,3,1,1,2,2,3,1,1,2,3,3,4,4,5,5,5,5,4" && partition.partitionPerimeter === 58, "Suguru topology metrics changed");
  const validatedPartition = validateSuguruPartition({ size: 5, cages: partition.cages, expectedHistogram: [5, 5, 4, 4, 4, 3] });
  ensure(validatedPartition.cageMap.length === 25 && new Set(validatedPartition.cageMap).size === 6 && validatedPartition.histogram.join(",") === "5,5,4,4,4,3", "Suguru partition coverage, sizes, or connectivity changed");
  ensure(satisfiesSuguruGeometryGates({ size: 5, cages: partition.cages }), "generated Suguru partition must satisfy all geometry gates");
  ensure(validatedPartition.cageMetrics.every((cage) => cage.fillRatio >= SUGURU_GEOMETRY_GATES.minCageFillRatio && cage.perimeter <= SUGURU_GEOMETRY_GATES.maxCagePerimeter && cage.rowSpan < 5 && cage.columnSpan < 5), "generated Suguru cage geometry changed");
  ensure(validatedPartition.partitionPerimeter >= SUGURU_GEOMETRY_GATES.minPartitionPerimeter && validatedPartition.partitionPerimeter <= SUGURU_GEOMETRY_GATES.maxPartitionPerimeter, "generated Suguru partition perimeter changed");
  ensure(getSuguruDihedralSignatures({ size: 5, cages: partition.cages }).length === 8, "Suguru canonicalization must inspect eight transforms");
  for (let transformIndex = 0; transformIndex < 8; transformIndex += 1) {
    ensure(canonicalizeSuguruPartition({ size: 5, cages: transformSuguruCages(partition.cages, transformIndex) }) === partition.canonicalSignature, `Suguru transform ${transformIndex} changed canonical family identity`);
  }
  const exhaustedTopology = generateSuguruPartition({ size: 5, histogram: [5, 5, 4, 4, 4, 3], seed: 720_006, maxAttempts: 1 });
  ensure(exhaustedTopology.outcome === "attempts-exhausted" && exhaustedTopology.attempt === 1, "Suguru topology restart cap changed");

  const assignment = constructSuguruSolution({ size: 5, cages: partition.cages, seed: 730_006, traceLimit: 5 });
  const repeatedAssignment = constructSuguruSolution({ size: 5, cages: partition.cages, seed: 730_006, traceLimit: 5 });
  ensure(canonicalSerialize(assignment) === canonicalSerialize(repeatedAssignment), "Suguru assignment must repeat exactly");
  ensure(assignment.outcome === "solved" && assignment.solution === "2423115142343512124334312" && assignment.nodes === 30, "Suguru assignment pin changed");
  ensure(canonicalSerialize(assignment.decisionTrace) === canonicalSerialize([
    { index: 15, candidates: [2, 1, 3] },
    { index: 16, candidates: [1, 3] },
    { index: 20, candidates: [3] },
    { index: 21, candidates: [4] },
    { index: 17, candidates: [2, 3] }
  ]), "Suguru MRV, row-major tie-break, or seeded candidate order changed");
  validateSuguruSolution(assignment.solution, partition.cages, "constructed Suguru");

  const suguruUnique = countSuguruSolutions(assignment.solution, { size: 5, cages: partition.cages, seed: 740_006 });
  const suguruMultiple = countSuguruSolutions("0".repeat(25), { size: 5, cages: partition.cages, seed: 740_006, nodeCap: 200_000 });
  const suguruZero = countSuguruSolutions(`22${"0".repeat(23)}`, { size: 5, cages: partition.cages, seed: 1 });
  const suguruCapped = countSuguruSolutions("0".repeat(25), { size: 5, cages: partition.cages, seed: 740_006, nodeCap: 1 });
  ensure(suguruUnique.outcome === "unique" && suguruUnique.solutions === 1, "Suguru unique outcome changed");
  ensure(suguruMultiple.outcome === "multiple" && suguruMultiple.solutions === 2 && suguruMultiple.nodes === 32, "Suguru counting must stop exactly after solution two");
  ensure(suguruZero.outcome === "zero" && suguruZero.solutions === 0, "Suguru zero outcome changed");
  ensure(suguruCapped.outcome === "cap-exceeded" && suguruCapped.nodes === 1, "Suguru node-cap exhaustion must fail closed");
  ensure(constructSuguruSolution({ size: 5, cages: partition.cages, seed: 730_006, nodeCap: 1 }).outcome === "cap-exceeded", "Suguru assignment cap must fail closed");
  expectThrow("unsorted Suguru histogram", () => generateSuguruPartition({ histogram: [3, 5, 5, 4, 4, 4], seed: 1 }));
  expectThrow("duplicate Suguru cell", () => validateSuguruPartition({ size: 2, cages: [[0, 1], [1, 2, 3]] }));
  expectThrow("short Suguru board", () => countSuguruSolutions("0".repeat(24), { size: 5, cages: partition.cages }));
  expectThrow("whitespace Suguru board", () => countSuguruSolutions(` ${"0".repeat(24)}`, { size: 5, cages: partition.cages }));
  expectThrow("Suguru topology cap override", () => generateSuguruPartition({ histogram: [5, 5, 4, 4, 4, 3], seed: 1, maxAttempts: SEARCH_BUDGETS.suguruTopology.maxAttempts + 1 }));
  expectThrow("Suguru carving cap override", () => countSuguruSolutions("0".repeat(25), { size: 5, cages: partition.cages, nodeCap: SEARCH_BUDGETS.suguruCarving.perSearchNodes + 1 }));
  expectThrow("Suguru assignment cap override", () => constructSuguruSolution({ size: 5, cages: partition.cages, seed: 1, nodeCap: SEARCH_BUDGETS.suguruAssignment.perSearchNodes + 1 }));
}

function loadCurrentContracts() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const file of ["logic-coach.js", "generated-content.js", "puzzles.js", "suguru-puzzles.js", "daily-editions.js", "weekly-editions.js"]) {
    vm.runInContext(readRoot(file), sandbox, { filename: file });
  }
  return sandbox.window;
}

function extractArray(source, marker) {
  const markerIndex = source.indexOf(marker);
  ensure(markerIndex >= 0, `Missing source marker ${marker}`);
  const start = source.indexOf("[", markerIndex);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    else if (char === "]" && --depth === 0) return vm.runInNewContext(source.slice(start, index + 1));
  }
  throw new Error(`Unclosed source array ${marker}`);
}

function verifyHashedEntries(actual, expected, label) {
  ensure(actual.length === expected.length, `${label} v2 count changed: expected ${expected.length}, got ${actual.length}`);
  expected.forEach((fixture, index) => {
    ensure(actual[index]?.id === fixture.id, `${label} order changed at ${index}`);
    ensure(canonicalSha256(actual[index]) === fixture.sha256, `${label} object ${fixture.id} changed`);
  });
}

function verifyManifest(actual, expected, label) {
  ensure(canonicalSha256(actual) === expected.sha256, `${label} manifest changed`);
  for (const [band, fixture] of Object.entries(expected.bands)) {
    const current = actual[band];
    ensure(current && current.ids.length === fixture.count, `${label} ${band} count changed`);
    ensure(canonicalSha256(current.ids) === fixture.idsSha256, `${label} ${band} ordered IDs changed`);
    ensure(canonicalSha256(current.fingerprints) === fixture.fingerprintsSha256, `${label} ${band} fingerprints changed`);
  }
}

function runFrozenV2Contracts() {
  ensure(Object.isFrozen(FROZEN_V2_CONTRACTS) && Object.isFrozen(FROZEN_V2_CONTRACTS.generated.sudokuSources), "frozen-v2 fixtures must be deeply frozen");
  ensure(canonicalSerialize({ b: 2, a: 1 }) === '{"a":1,"b":2}', "canonical serialization key order changed");
  expectThrow("undefined canonical value", () => canonicalSerialize(undefined));

  const current = loadCurrentContracts();
  const payload = current.GENERATED_CONTENT;
  ensure(payload.version === FROZEN_V2_CONTRACTS.payloadSchemaVersion && payload.version === PAYLOAD_SCHEMA_VERSION, "generated payload schema version changed");

  for (const [band, expected] of Object.entries(FROZEN_V2_CONTRACTS.generated.sudokuSources)) {
    const actual = (payload.sudokuTemplates[band] || []).filter((entry) => entry.origin?.generatorVersion === GENERATOR_V2_VERSION);
    verifyHashedEntries(actual, expected, `generated Sudoku ${band}`);
  }
  const currentLayouts = Object.entries(payload.suguruLayouts).filter(([, layout]) => layout.origin?.generatorVersion === GENERATOR_V2_VERSION).map(([id, layout]) => ({ id, value: layout }));
  const expectedLayouts = FROZEN_V2_CONTRACTS.generated.suguruLayouts;
  ensure(currentLayouts.length === expectedLayouts.length, "generated Suguru v2 layout count changed");
  expectedLayouts.forEach((fixture, index) => {
    ensure(currentLayouts[index]?.id === fixture.id && canonicalSha256(currentLayouts[index].value) === fixture.sha256, `generated Suguru layout ${fixture.id} changed`);
  });
  for (const [level, expected] of Object.entries(FROZEN_V2_CONTRACTS.generated.suguruEntries)) {
    const actual = (payload.suguruEntries[level] || []).filter((entry) => entry.origin?.generatorVersion === GENERATOR_V2_VERSION);
    verifyHashedEntries(actual, expected, `generated Suguru ${level}`);
  }

  for (const [game, library] of [["sudoku", current.SUDOKU_PUZZLES], ["suguru", current.SUGURU_PUZZLES]]) {
    for (const [band, fixture] of Object.entries(FROZEN_V2_CONTRACTS.orderedPrefixes[game])) {
      const entries = library[band] || [];
      ensure(entries.length >= fixture.count, `${game} ${band} lost frozen prefix members`);
      ensure(canonicalSha256(entries.slice(0, fixture.count).map((entry) => entry.id)) === fixture.idsSha256, `${game} ${band} frozen ID prefix changed`);
    }
  }

  const sudokuFocus = Object.values(payload.sudokuTemplates).flat().find((entry) => entry.id === FROZEN_V2_CONTRACTS.focus.sudoku.id);
  const suguruFocus = Object.values(payload.suguruEntries).flat().find((entry) => entry.id === FROZEN_V2_CONTRACTS.focus.suguru.id);
  for (const [game, entry] of [["sudoku", sudokuFocus], ["suguru", suguruFocus]]) {
    const fixture = FROZEN_V2_CONTRACTS.focus[game];
    ensure(entry && canonicalSha256(entry) === fixture.objectSha256, `${game} Focus object changed`);
    ensure(canonicalSha256(entry.logicFocus) === fixture.evidenceSha256, `${game} Focus evidence changed`);
  }

  const daily = current.DailyEditions;
  ensure(daily.version === FROZEN_V2_CONTRACTS.daily.version, "Daily version changed");
  for (const game of ["sudoku", "suguru"]) {
    ensure(daily.getCurrentCorpusId(game) === FROZEN_V2_CONTRACTS.daily.corpora[game], `Daily ${game} corpus changed`);
    verifyManifest(daily.getManifest(game), FROZEN_V2_CONTRACTS.daily.manifests[game], `Daily ${game}`);
  }
  const weekly = current.WeeklyEditions;
  ensure(weekly.version === FROZEN_V2_CONTRACTS.weekly.version, "Weekly version changed");
  verifyManifest(weekly.getManifest(), FROZEN_V2_CONTRACTS.weekly.manifest, "Weekly Sudoku");

  const cageSteps = extractArray(readRoot("suguru-app.js"), "const CAGE_GARDEN_STEPS =");
  ensure(canonicalSha256(cageSteps) === FROZEN_V2_CONTRACTS.cageGarden.orderedDescriptorsSha256, "Cage Garden descriptor order changed");
  const suguruEntries = Object.values(current.SUGURU_PUZZLES).flat();
  FROZEN_V2_CONTRACTS.cageGarden.steps.forEach((fixture, index) => {
    const descriptor = cageSteps[index];
    const target = suguruEntries.find((entry) => entry.id === descriptor?.puzzleId);
    ensure(descriptor?.id === fixture.id && canonicalSha256(descriptor) === fixture.descriptorSha256, `Cage Garden descriptor ${fixture.id} changed`);
    ensure(target && textSha256(target.puzzle) === fixture.puzzleBytesSha256, `Cage Garden target puzzle ${fixture.id} changed`);
    ensure(canonicalSha256(target) === fixture.targetEntrySha256, `Cage Garden target entry ${fixture.id} changed`);
  });

  const hasV3Content = [
    ...Object.values(payload.sudokuTemplates).flat(),
    ...Object.values(payload.suguruEntries).flat(),
    ...Object.values(payload.suguruLayouts)
  ].some((entry) => entry.origin?.generatorVersion === GENERATOR_V3_VERSION);
  if (!hasV3Content) ensure(textSha256(readRoot("generated-content.js")) === FROZEN_V2_CONTRACTS.generatedContentV2FileSha256, "generator-v2 payload file changed before an append-only v3 suffix exists");
}

function runSudokuV3ContentContracts() {
  const current = loadCurrentContracts();
  const expectedIds = [
    "easy-morning-koi",
    "easy-bamboo-window",
    "medium-river-stones",
    "medium-crane-shadow",
    "advanced-moon-bridge",
    "advanced-pine-crossing",
    "hard-thunder-gate",
    "hard-ink-maze",
    "expert-storm-lantern",
    "expert-void-garden"
  ];
  ensure(SUDOKU_V3_CONTENT_SPECS.length === 10 && SUDOKU_V3_CONTENT_SPECS.map((spec) => spec.id).join(",") === expectedIds.join(","), "Sudoku v3 source manifest changed");
  const perBand = new Map();
  SUDOKU_V3_CONTENT_SPECS.forEach((spec) => perBand.set(spec.difficulty, (perBand.get(spec.difficulty) || 0) + 1));
  ensure(["easy", "medium", "advanced", "hard", "expert"].every((band) => perBand.get(band) === 2), "Sudoku v3 must define exactly two source families per band");
  const profilePuzzle = ({ puzzle, solution }) => current.LogicCoach.profile({ game: "sudoku", board: puzzle, puzzle, solution, nodeLimit: current.LogicCoach.SEARCH_NODE_CAP });
  const generatedIds = [];
  for (const spec of SUDOKU_V3_CONTENT_SPECS) {
    validateSudokuV3Spec(spec);
    const first = generateSudokuV3(spec, { profilePuzzle });
    const second = generateSudokuV3(spec, { profilePuzzle });
    ensure(canonicalSerialize(first.entry) === canonicalSerialize(second.entry), `${spec.id} repeated v3 generation changed`);
    const actual = current.GENERATED_CONTENT.sudokuTemplates[spec.difficulty].find((entry) => entry.id === spec.id);
    ensure(actual && canonicalSerialize(actual) === canonicalSerialize(first.entry), `${spec.id} checked-in payload is stale`);
    ensure(actual.origin.generatorVersion === GENERATOR_V3_VERSION && actual.origin.strategy === "seeded-orbit-carve", `${spec.id} generator-v3 provenance changed`);
    generatedIds.push(actual.id);
  }
  ensure(generatedIds.join(",") === expectedIds.join(","), "Sudoku v3 payload order changed");
  const v3PayloadEntries = Object.values(current.GENERATED_CONTENT.sudokuTemplates).flat().filter((entry) => entry.origin?.generatorVersion === GENERATOR_V3_VERSION);
  ensure(v3PayloadEntries.length === 10, `expected ten Sudoku v3 payload sources, got ${v3PayloadEntries.length}`);
  const generatedText = readRoot("generated-content.js");
  const addedBytes = Buffer.byteLength(generatedText, "utf8") - FROZEN_V2_CONTRACTS.generatedContentV2FileBytes;
  ensure(addedBytes > 0 && addedBytes <= 100 * 1024, `Sudoku v3 added payload ${addedBytes} bytes exceeds 100 KiB`);
  ensure(textSha256(generatedText) !== FROZEN_V2_CONTRACTS.generatedContentV2FileSha256, "v3 suffix must change the enclosing generated payload file");

  const fixture = SUDOKU_V3_CONTENT_SPECS[0];
  expectThrow("zero v3 construction seed", () => validateSudokuV3Spec({ ...fixture, constructionSeed: 0 }));
  expectThrow("v3 construction cap drift", () => validateSudokuV3Spec({ ...fixture, maxConstructionAttempts: fixture.maxConstructionAttempts + 1 }));
  expectThrow("v3 uniqueness cap drift", () => validateSudokuV3Spec({ ...fixture, maxUniquenessCalls: fixture.maxUniquenessCalls + 1 }));
  expectThrow("missing v3 puzzle pin", () => validateSudokuV3Spec({ ...fixture, expectedPuzzle: null }));
}

runPrimitiveContracts();
runFrozenV2Contracts();
runSudokuV3ContentContracts();
console.log("Generator v3 primitive, Sudoku content, and frozen-v2 validation passed");
