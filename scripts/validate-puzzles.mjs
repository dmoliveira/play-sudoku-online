import { SUDOKU_V3_CONTENT_SPECS } from "./content-specs.mjs";
import { getSudokuFamilyMaskSignature, getSudokuSourceMetrics, summarizeSudokuProfile } from "./sudoku-v3-content.mjs";

import fs from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of ["logic-coach.js", "generated-content.js", "puzzles.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), sandbox, { filename: file });
}

const { SUDOKU_PUZZLES: library, LogicCoach } = sandbox.window;
const sourceText = fs.readFileSync(new URL("../puzzles.js", import.meta.url), "utf8");

const CLUE_RANGES = {
  easy: [66, 72],
  medium: [53, 62],
  advanced: [43, 49],
  hard: [31, 34],
  expert: [23, 23]
};
const GENERATED_V2_CLUE_RANGES = { easy: [60, 72], hard: [28, 34], expert: [23, 28] };
const GENERATED_V3_CLUE_RANGES = { easy: [42, 54], medium: [34, 44], advanced: [30, 39], hard: [26, 34], expert: [23, 31] };

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateGrid(grid, label) {
  ensure(typeof grid === "string", `${label} must be a string`);
  ensure(grid.length === 81, `${label} must have 81 cells`);
  ensure(/^[0-9]+$/.test(grid), `${label} must contain digits only`);
}

function isValidUnit(values) {
  return [...values].sort().join("") === "123456789";
}

function validateSolvedGrid(grid, label) {
  const rows = Array.from({ length: 9 }, (_, row) => grid.slice(row * 9, row * 9 + 9).split("").map(Number));
  const cols = Array.from({ length: 9 }, (_, col) => rows.map((row) => row[col]));
  const boxes = [];
  for (let boxRow = 0; boxRow < 9; boxRow += 3) {
    for (let boxCol = 0; boxCol < 9; boxCol += 3) {
      const values = [];
      for (let row = boxRow; row < boxRow + 3; row += 1) {
        for (let col = boxCol; col < boxCol + 3; col += 1) {
          values.push(rows[row][col]);
        }
      }
      boxes.push(values);
    }
  }

  [...rows, ...cols, ...boxes].forEach((unit, index) => {
    ensure(isValidUnit(unit), `${label} has invalid Sudoku unit ${index}`);
  });
}

function getCandidates(board, index) {
  if (board[index] !== 0) {
    return [];
  }
  const row = Math.floor(index / 9);
  const col = index % 9;
  const used = new Set();
  for (let i = 0; i < 9; i += 1) {
    used.add(board[row * 9 + i]);
    used.add(board[i * 9 + col]);
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      used.add(board[r * 9 + c]);
    }
  }
  return [1,2,3,4,5,6,7,8,9].filter((value) => !used.has(value));
}

function countSolutions(board, limit = 2) {
  const emptyIndexes = board
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value === 0)
    .map(({ index }) => index);

  if (!emptyIndexes.length) {
    return 1;
  }

  let bestIndex = -1;
  let bestCandidates = null;
  for (const index of emptyIndexes) {
    const candidates = getCandidates(board, index);
    if (candidates.length === 0) {
      return 0;
    }
    if (!bestCandidates || candidates.length < bestCandidates.length) {
      bestCandidates = candidates;
      bestIndex = index;
      if (candidates.length === 1) break;
    }
  }

  let solutions = 0;
  for (const value of bestCandidates) {
    board[bestIndex] = value;
    solutions += countSolutions(board, limit - solutions);
    board[bestIndex] = 0;
    if (solutions >= limit) {
      return solutions;
    }
  }
  return solutions;
}

function validatePermutationSet(values, expected, label) {
  ensure(Array.isArray(values), `${label} must be an array`);
  ensure(values.length === expected.length, `${label} length mismatch`);
  ensure([...values].sort((a, b) => a - b).join(",") === [...expected].sort((a, b) => a - b).join(","), `${label} must be a permutation of ${expected.join(",")}`);
}

function validateSourcePermutations() {
  const digitsMatches = [...sourceText.matchAll(/digits:\s*"([0-9]{9})"/g)].map((match) => match[1].split("").map(Number));
  digitsMatches.forEach((digits, index) => validatePermutationSet(digits, [1,2,3,4,5,6,7,8,9], `digits mapping ${index}`));

  const rowMapMatches = [...sourceText.matchAll(/rowMap:\s*\[([^\]]+)\]/g)].map((match) => match[1].split(",").map((value) => Number(value.trim())));
  const colMapMatches = [...sourceText.matchAll(/colMap:\s*\[([^\]]+)\]/g)].map((match) => match[1].split(",").map((value) => Number(value.trim())));
  rowMapMatches.forEach((rowMap, index) => validatePermutationSet(rowMap, [0,1,2,3,4,5,6,7,8], `rowMap ${index}`));
  colMapMatches.forEach((colMap, index) => validatePermutationSet(colMap, [0,1,2,3,4,5,6,7,8], `colMap ${index}`));
}

validateSourcePermutations();

const seenIds = new Set();
const seenPuzzles = new Set();

Object.entries(library).forEach(([difficulty, puzzles]) => {
  ensure(puzzles.length >= 6, `${difficulty} should have at least 6 generated puzzles`);
  puzzles.forEach((puzzle) => {
    validateGrid(puzzle.puzzle, `${puzzle.id} puzzle`);
    validateGrid(puzzle.solution, `${puzzle.id} solution`);
    validateSolvedGrid(puzzle.solution, `${puzzle.id} solution`);
    ensure(!seenIds.has(puzzle.id), `duplicate puzzle id ${puzzle.id}`);
    seenIds.add(puzzle.id);
    ensure(!seenPuzzles.has(puzzle.puzzle), `duplicate puzzle grid ${puzzle.id}`);
    seenPuzzles.add(puzzle.puzzle);
    const clueCount = puzzle.puzzle.split("").filter((value) => value !== "0").length;
    const generated = puzzle.origin?.kind === "first-party-generated";
    const generatedRanges = puzzle.origin?.generatorVersion === 3 ? GENERATED_V3_CLUE_RANGES : GENERATED_V2_CLUE_RANGES;
    const [minClues, maxClues] = generated ? generatedRanges[difficulty] : CLUE_RANGES[difficulty];
    ensure(typeof puzzle.familyId === "string" && puzzle.familyId, `${puzzle.id} must expose stable familyId`);
    ensure(/^[abc]-r[012]$/.test(puzzle.transformId), `${puzzle.id} must expose stable transformId`);
    ensure(typeof puzzle.selectable === "boolean", `${puzzle.id} must expose selectable state`);
    ensure(clueCount >= minClues && clueCount <= maxClues, `${puzzle.id} clue count ${clueCount} outside ${difficulty} range ${minClues}-${maxClues}`);
    puzzle.puzzle.split("").forEach((value, index) => {
      if (value !== "0") {
        ensure(value === puzzle.solution[index], `${puzzle.id} clue mismatch at cell ${index}`);
      }
    });
    const puzzleBoard = puzzle.puzzle.split("").map(Number);
    const solutionCount = countSolutions([...puzzleBoard], 2);
    ensure(solutionCount === 1, `${puzzle.id} should have exactly one solution, got ${solutionCount}`);
  });
});

const allPuzzles = Object.values(library).flat();
const families = new Set(allPuzzles.map((puzzle) => puzzle.familyId));
const generatedPuzzles = allPuzzles.filter((puzzle) => puzzle.origin?.kind === "first-party-generated");
const generatedV2 = generatedPuzzles.filter((puzzle) => puzzle.origin.generatorVersion === 2);
const generatedV3 = generatedPuzzles.filter((puzzle) => puzzle.origin.generatorVersion === 3);
const v3Specs = new Map(SUDOKU_V3_CONTENT_SPECS.map((spec) => [spec.id, spec]));
ensure(allPuzzles.length === 288, `expanded Sudoku inventory must contain 288 IDs, got ${allPuzzles.length}`);
ensure(families.size === 32, `expanded Sudoku inventory must contain 32 families, got ${families.size}`);
ensure(generatedPuzzles.length === 126, `generated Sudoku inventory must contain 126 transforms, got ${generatedPuzzles.length}`);
ensure(generatedV2.length === 36 && generatedV3.length === 90, `generated Sudoku inventory must retain 36 v2 and append 90 v3 transforms, got ${generatedV2.length}/${generatedV3.length}`);
ensure(generatedPuzzles.every((puzzle) => puzzle.selectable === true), "generated Sudoku must be enabled through practice rotation");
ensure(generatedV2.every((puzzle) => ["unique-carve", "sample-clues"].includes(puzzle.origin.strategy)), "generated Sudoku v2 strategy metadata changed");
ensure(generatedV3.every((puzzle) => puzzle.origin.strategy === "seeded-orbit-carve" && puzzle.origin.rngVersion === 1 && puzzle.origin.traversalVersion === 1), "generated Sudoku v3 must expose pinned algorithm metadata");

const expectedGeneratedFamilyOrder = {
  easy: ["easy-sunlit-maple", "easy-morning-koi", "easy-bamboo-window"],
  medium: ["medium-river-stones", "medium-crane-shadow"],
  advanced: ["advanced-moon-bridge", "advanced-pine-crossing"],
  hard: ["hard-temple-current", "hard-pair-current", "hard-thunder-gate", "hard-ink-maze"],
  expert: ["expert-starlit-pines", "expert-storm-lantern", "expert-void-garden"]
};
Object.entries(library).forEach(([band, entries]) => {
  const order = [...new Set(entries.filter((entry) => entry.origin?.kind === "first-party-generated").map((entry) => entry.familyId))];
  ensure(order.join(",") === expectedGeneratedFamilyOrder[band].join(","), `${band} generated family append order changed`);
  ensure(order.filter((familyId) => v3Specs.has(familyId)).length === 2, `${band} must append exactly two v3 source families`);
});

const focusPuzzles = generatedPuzzles.filter((puzzle) => puzzle.logicFocus);
ensure(focusPuzzles.length === 9 && focusPuzzles.every((puzzle) => puzzle.familyId === "hard-pair-current" && puzzle.origin.generatorVersion === 2), "Pair Current must expose exactly nine frozen focused transforms");

function acceptsV3Profile(spec, profile) {
  const gate = spec.profileGate;
  return gate.allowedStatuses.includes(profile.status)
    && gate.allowedHardestBands.includes(profile.hardestBand)
    && profile.logicalSteps >= gate.minLogicalSteps
    && profile.placementSteps >= gate.minPlacements
    && profile.eliminationSteps >= gate.minEliminations
    && gate.requiredBands.every((band) => profile.trace.some((step) => step.band === band))
    && (gate.maxRemainingCells === undefined || profile.remainingCells <= gate.maxRemainingCells);
}

const baselineSolutions = new Set(allPuzzles.filter((puzzle) => puzzle.origin?.kind === "curated-baseline").map((puzzle) => puzzle.solution));
for (const familyId of families) {
  const variants = allPuzzles.filter((puzzle) => puzzle.familyId === familyId);
  ensure(variants.length === 9, `${familyId} must expand through nine transforms`);
}

for (const familyId of [...new Set(generatedPuzzles.map((puzzle) => puzzle.familyId))]) {
  const variants = generatedPuzzles.filter((puzzle) => puzzle.familyId === familyId);
  const source = variants.find((puzzle) => puzzle.transformId === "a-r0");
  ensure(source && !baselineSolutions.has(source.solution), `${familyId} source solution must be outside shipped baseline transform outputs`);
  const profiles = variants.map((puzzle) => LogicCoach.profile({ game: "sudoku", board: puzzle.puzzle, puzzle: puzzle.puzzle, solution: puzzle.solution }));
  ensure(profiles.every((profile) => profile.status !== "invalid"), `${familyId} profiles must be valid`);
  ensure(new Set(profiles.map((profile) => `${profile.status}:${profile.hardestBand}`)).size === 1, `${familyId} transforms must preserve profile classification`);
  const spec = v3Specs.get(familyId);
  profiles.forEach((profile, index) => {
    const variant = variants[index];
    const expected = variant.logicProfile;
    ensure(profile.logicalSteps >= variant.minTraceSteps && profile.placementSteps >= variant.minPlacements, `${variant.id} must satisfy workload floors`);
    ensure(profile.status === expected.status && profile.hardestBand === expected.hardestBand, `${variant.id} profile metadata drift`);
    if (spec) ensure(acceptsV3Profile(spec, profile), `${variant.id} must satisfy its v3 publication profile contract`);
    const focus = variant.logicFocus;
    if (focus) {
      const traceIndex = profile.trace.findIndex((step) => step.technique === focus.technique);
      const step = profile.trace[traceIndex];
      const candidateEliminations = (step?.eliminations || []).reduce((total, elimination) => total + elimination.values.length, 0);
      const downstreamPlacements = traceIndex < 0 ? 0 : profile.trace.slice(traceIndex + 1).filter((candidate) => candidate.kind === "placement").length;
      ensure(JSON.stringify(focus) === JSON.stringify({ profileVersion: profile.profileVersion, technique: "naked-pair", traceIndex, candidateEliminations, downstreamPlacements }), `${variant.id} focus metadata drift`);
      ensure(traceIndex === 10 && candidateEliminations === 3 && downstreamPlacements === 41, `${variant.id} must retain reviewed effective-pair evidence`);
    }
  });
  if (!spec) continue;
  ensure(source.puzzle === spec.expectedPuzzle && source.solution === spec.expectedSolution, `${familyId} source bytes changed`);
  ensure(source.clueCount === spec.expectedClueCount, `${familyId} source clue count changed`);
  ensure(getSudokuFamilyMaskSignature(source.puzzle) === spec.expectedFamilyMaskSignature, `${familyId} family mask signature changed`);
  ensure(JSON.stringify(getSudokuSourceMetrics(source.puzzle)) === JSON.stringify(spec.expectedSourceMetrics), `${familyId} source geometry changed`);
  ensure(JSON.stringify(summarizeSudokuProfile(profiles[variants.indexOf(source)])) === JSON.stringify(spec.expectedProfile), `${familyId} source profile pin changed`);
  ensure(source.origin.constructionSeed === spec.constructionSeed && source.origin.constructionAttempt === spec.expectedConstructionAttempt && source.origin.constructionNodes === spec.expectedConstructionNodes, `${familyId} construction provenance changed`);
  ensure(source.origin.carveSeed === spec.carveSeed && source.origin.carveAttempt === spec.expectedCarveAttempt && source.origin.orbitPolicy === spec.orbitPolicy, `${familyId} carve provenance changed`);
  ensure(source.origin.uniquenessCalls === spec.expectedUniquenessCalls && source.origin.uniquenessNodes === spec.expectedUniquenessNodes, `${familyId} uniqueness provenance changed`);
}

const familySources = allPuzzles.filter((puzzle) => puzzle.transformId === "a-r0");
ensure(familySources.length === 32, `expected one source transform for each of 32 families, got ${familySources.length}`);
const familyMaskOwners = new Map();
familySources.forEach((source) => {
  const signature = getSudokuFamilyMaskSignature(source.puzzle);
  ensure(!familyMaskOwners.has(signature), `${source.familyId} duplicates family mask signature from ${familyMaskOwners.get(signature)}`);
  familyMaskOwners.set(signature, source.familyId);
});
const sourcePairs = new Set();
familySources.forEach((source) => {
  const pair = `${source.puzzle}\u001f${source.solution}`;
  ensure(!sourcePairs.has(pair), `duplicate source puzzle/solution pair ${source.familyId}`);
  sourcePairs.add(pair);
});
const transformedPairOwners = new Map();
allPuzzles.forEach((entry) => {
  const pair = `${entry.puzzle}\u001f${entry.solution}`;
  const owner = transformedPairOwners.get(pair);
  ensure(!owner || owner === entry.familyId, `${entry.id} collides with transformed pair from ${owner}`);
  transformedPairOwners.set(pair, entry.familyId);
});

console.log("Puzzle validation passed for", allPuzzles.length, "puzzles across", families.size, "families");
