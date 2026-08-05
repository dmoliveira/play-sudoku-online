import {
  GENERATOR_V3_VERSION,
  RNG_VERSION,
  SEARCH_BUDGETS,
  SUDOKU_ORBIT_POLICIES,
  TRAVERSAL_VERSION,
  buildSudokuOrbits,
  constructSudoku,
  countSudokuSolutions,
  createSearchBudget,
  createXorshift32,
  deriveSeed,
  shuffleDeterministically
} from "./generator-v3-primitives.mjs";

export const SHIPPED_SUDOKU_STRUCTURES = Object.freeze([
  Object.freeze({ suffix: "r0", rowMap: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8]), colMap: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8]) }),
  Object.freeze({ suffix: "r1", rowMap: Object.freeze([1, 2, 0, 4, 5, 3, 7, 8, 6]), colMap: Object.freeze([0, 1, 2, 4, 5, 3, 7, 8, 6]) }),
  Object.freeze({ suffix: "r2", rowMap: Object.freeze([2, 0, 1, 5, 3, 4, 8, 6, 7]), colMap: Object.freeze([2, 0, 1, 5, 3, 4, 8, 6, 7]) })
]);

function ensure(condition, message, ErrorType = Error) {
  if (!condition) throw new ErrorType(message);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalValue(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function countClues(puzzle) {
  return [...puzzle].filter((value) => value !== "0").length;
}

function remapStructure(grid, structure) {
  let output = "";
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) output += grid[structure.rowMap[row] * 9 + structure.colMap[col]];
  }
  return output;
}

function binaryMask(puzzle) {
  return puzzle.replace(/[1-9]/g, "1");
}

export function getSudokuFamilyMaskSignature(puzzle) {
  ensure(typeof puzzle === "string" && /^[0-9]{81}$/.test(puzzle), "family mask source must be an 81-digit Sudoku puzzle", TypeError);
  return SHIPPED_SUDOKU_STRUCTURES.map((structure) => binaryMask(remapStructure(puzzle, structure))).sort().join("|");
}

function isMaskSymmetric(puzzle, policy) {
  const mask = binaryMask(puzzle);
  const orbits = buildSudokuOrbits(policy);
  return orbits.every((orbit) => orbit.every((index) => mask[index] === mask[orbit[0]]));
}

function longestEmptyRun(puzzle, indexes) {
  let longest = 0;
  let current = 0;
  indexes.forEach((index) => {
    if (puzzle[index] === "0") {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  });
  return longest;
}

export function getSudokuSourceMetrics(puzzle) {
  ensure(typeof puzzle === "string" && /^[0-9]{81}$/.test(puzzle), "source metrics require an 81-digit Sudoku puzzle", TypeError);
  const rowClues = Array.from({ length: 9 }, (_, row) => countClues(puzzle.slice(row * 9, row * 9 + 9)));
  const columnClues = Array.from({ length: 9 }, (_, col) => countClues(Array.from({ length: 9 }, (_, row) => puzzle[row * 9 + col]).join("")));
  const boxClues = [];
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const indexes = [];
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) indexes.push(row * 9 + col);
      boxClues.push(indexes.filter((index) => puzzle[index] !== "0").length);
    }
  }
  let maxEmptyRun = 0;
  for (let row = 0; row < 9; row += 1) maxEmptyRun = Math.max(maxEmptyRun, longestEmptyRun(puzzle, Array.from({ length: 9 }, (_, col) => row * 9 + col)));
  for (let col = 0; col < 9; col += 1) maxEmptyRun = Math.max(maxEmptyRun, longestEmptyRun(puzzle, Array.from({ length: 9 }, (_, row) => row * 9 + col)));
  return Object.freeze({
    clueCount: countClues(puzzle),
    rowClues: Object.freeze(rowClues),
    columnClues: Object.freeze(columnClues),
    boxClues: Object.freeze(boxClues),
    minUnitClues: Math.min(...rowClues, ...columnClues, ...boxClues),
    maxEmptyRun,
    symmetry: Object.freeze({
      rotate180: isMaskSymmetric(puzzle, SUDOKU_ORBIT_POLICIES.ROTATE_180),
      mainDiagonal: isMaskSymmetric(puzzle, SUDOKU_ORBIT_POLICIES.MAIN_DIAGONAL),
      verticalReflection: isMaskSymmetric(puzzle, SUDOKU_ORBIT_POLICIES.VERTICAL_REFLECTION)
    })
  });
}

export function summarizeSudokuProfile(profile) {
  return Object.freeze({
    version: profile.profileVersion,
    status: profile.status,
    hardestTechnique: profile.hardestTechnique,
    hardestBand: profile.hardestBand,
    logicalSteps: profile.logicalSteps,
    placementSteps: profile.placementSteps,
    eliminationSteps: profile.eliminationSteps,
    explicitCandidateEliminations: profile.explicitCandidateEliminations,
    minAvailableSteps: profile.minAvailableSteps,
    remainingCells: profile.remainingCells,
    techniques: Object.freeze([...new Set(profile.trace.map((step) => step.technique))])
  });
}

function validateProfileGate(gate, label) {
  ensure(gate && typeof gate === "object" && !Array.isArray(gate), `${label} must define profileGate`, TypeError);
  ensure(Array.isArray(gate.allowedStatuses) && gate.allowedStatuses.length > 0, `${label} profileGate needs allowedStatuses`, TypeError);
  ensure(Array.isArray(gate.allowedHardestBands) && gate.allowedHardestBands.length > 0, `${label} profileGate needs allowedHardestBands`, TypeError);
  ensure(Array.isArray(gate.requiredBands), `${label} profileGate requiredBands must be an array`, TypeError);
  for (const field of ["minLogicalSteps", "minPlacements", "minEliminations"]) ensure(Number.isSafeInteger(gate[field]) && gate[field] >= 0, `${label} profileGate ${field} must be nonnegative`, RangeError);
  if (gate.maxRemainingCells !== undefined) ensure(Number.isSafeInteger(gate.maxRemainingCells) && gate.maxRemainingCells >= 0, `${label} profileGate maxRemainingCells must be nonnegative`, RangeError);
}

export function validateSudokuV3Spec(spec) {
  const label = spec?.id || "unnamed Sudoku v3 spec";
  ensure(spec && typeof spec === "object" && !Array.isArray(spec), `${label} must be an object`, TypeError);
  ensure(typeof spec.id === "string" && spec.id, `${label} must have an id`, TypeError);
  ensure(["easy", "medium", "advanced", "hard", "expert"].includes(spec.difficulty), `${label} has an invalid difficulty`, RangeError);
  ensure(typeof spec.label === "string" && spec.label, `${label} must have a label`, TypeError);
  ensure(typeof spec.selectable === "boolean", `${label} selectable must be boolean`, TypeError);
  ensure(Array.isArray(spec.tags), `${label} tags must be an array`, TypeError);
  ensure(spec.rngVersion === RNG_VERSION && spec.traversalVersion === TRAVERSAL_VERSION, `${label} algorithm version pins changed`, RangeError);
  for (const field of ["constructionSeed", "carveSeed"]) ensure(Number.isInteger(spec[field]) && spec[field] > 0 && spec[field] <= 0xffff_ffff, `${label} ${field} must be a nonzero uint32`, RangeError);
  ensure(spec.maxConstructionAttempts === SEARCH_BUDGETS.sudokuConstruction.maxAttempts, `${label} construction attempt cap changed`, RangeError);
  ensure(spec.maxConstructionNodesPerAttempt === SEARCH_BUDGETS.sudokuConstruction.perSearchNodes, `${label} construction node cap changed`, RangeError);
  ensure(spec.maxConstructionAggregateNodes === SEARCH_BUDGETS.sudokuConstruction.aggregateNodes, `${label} construction aggregate cap changed`, RangeError);
  ensure(spec.maxCarveAttempts === SEARCH_BUDGETS.sudokuCarving.maxAttempts, `${label} carve attempt cap changed`, RangeError);
  ensure(spec.maxUniquenessCalls === SEARCH_BUDGETS.sudokuCarving.maxCalls, `${label} uniqueness call cap changed`, RangeError);
  ensure(spec.maxUniquenessNodesPerCall === SEARCH_BUDGETS.sudokuCarving.perSearchNodes, `${label} uniqueness node cap changed`, RangeError);
  ensure(spec.maxUniquenessAggregateNodes === SEARCH_BUDGETS.sudokuCarving.aggregateNodes, `${label} uniqueness aggregate cap changed`, RangeError);
  ensure(Object.values(SUDOKU_ORBIT_POLICIES).includes(spec.orbitPolicy), `${label} has an invalid orbit policy`, RangeError);
  ensure(Number.isInteger(spec.targetClues) && spec.targetClues > 0 && spec.targetClues < 81, `${label} targetClues is invalid`, RangeError);
  ensure(Number.isInteger(spec.minUnitClues) && spec.minUnitClues > 0, `${label} minUnitClues is invalid`, RangeError);
  ensure(Number.isInteger(spec.maxEmptyRun) && spec.maxEmptyRun > 0, `${label} maxEmptyRun is invalid`, RangeError);
  ensure(typeof spec.requireAsymmetric === "boolean", `${label} requireAsymmetric must be boolean`, TypeError);
  validateProfileGate(spec.profileGate, label);
  const integerPins = ["expectedConstructionAttempt", "expectedConstructionNodes", "expectedCarveAttempt", "expectedClueCount", "expectedUniquenessCalls", "expectedUniquenessNodes"];
  integerPins.forEach((field) => ensure(Number.isSafeInteger(spec[field]) && spec[field] >= 0, `${label} must pin ${field}`, RangeError));
  ensure(typeof spec.expectedSolution === "string" && /^[1-9]{81}$/.test(spec.expectedSolution), `${label} must pin expectedSolution`, TypeError);
  ensure(typeof spec.expectedPuzzle === "string" && /^[0-9]{81}$/.test(spec.expectedPuzzle), `${label} must pin expectedPuzzle`, TypeError);
  ensure(spec.expectedClueCount === spec.targetClues, `${label} expected clue count must match target`, RangeError);
  ensure(typeof spec.expectedFamilyMaskSignature === "string" && spec.expectedFamilyMaskSignature, `${label} must pin expectedFamilyMaskSignature`, TypeError);
  ensure(spec.expectedSourceMetrics && typeof spec.expectedSourceMetrics === "object", `${label} must pin expectedSourceMetrics`, TypeError);
  ensure(spec.expectedProfile && typeof spec.expectedProfile === "object", `${label} must pin expectedProfile`, TypeError);
}

function acceptsGeometry(spec, metrics) {
  if (metrics.clueCount !== spec.targetClues || metrics.minUnitClues < spec.minUnitClues || metrics.maxEmptyRun > spec.maxEmptyRun) return false;
  const symmetryField = {
    [SUDOKU_ORBIT_POLICIES.ROTATE_180]: "rotate180",
    [SUDOKU_ORBIT_POLICIES.MAIN_DIAGONAL]: "mainDiagonal",
    [SUDOKU_ORBIT_POLICIES.VERTICAL_REFLECTION]: "verticalReflection"
  }[spec.orbitPolicy];
  if (symmetryField && !metrics.symmetry[symmetryField]) return false;
  if (spec.requireAsymmetric && Object.values(metrics.symmetry).some(Boolean)) return false;
  return true;
}

function acceptsProfile(gate, profile) {
  if (!gate.allowedStatuses.includes(profile.status) || !gate.allowedHardestBands.includes(profile.hardestBand)) return false;
  if (profile.logicalSteps < gate.minLogicalSteps || profile.placementSteps < gate.minPlacements || profile.eliminationSteps < gate.minEliminations) return false;
  if (!gate.requiredBands.every((band) => profile.trace.some((step) => step.band === band))) return false;
  if (gate.maxRemainingCells !== undefined && profile.remainingCells > gate.maxRemainingCells) return false;
  return true;
}

function constructSource(spec) {
  const budget = createSearchBudget("sudokuConstruction", {
    perSearchNodes: spec.maxConstructionNodesPerAttempt,
    aggregateNodes: spec.maxConstructionAggregateNodes,
    maxCalls: spec.maxConstructionAttempts
  });
  for (let attempt = 0; attempt < spec.maxConstructionAttempts; attempt += 1) {
    const result = budget.run((nodeCap) => constructSudoku({ seed: deriveSeed(spec.constructionSeed, attempt), nodeCap }));
    if (result.outcome === "solved") return { attempt, nodes: budget.snapshot().nodes, solution: result.solution };
    if (result.budgetExhausted) break;
  }
  throw new Error(`${spec.id} exhausted Sudoku construction caps`);
}

function carveSource(spec, solution, profilePuzzle) {
  const orbits = buildSudokuOrbits(spec.orbitPolicy);
  const budget = createSearchBudget("sudokuCarving", {
    perSearchNodes: spec.maxUniquenessNodesPerCall,
    aggregateNodes: spec.maxUniquenessAggregateNodes,
    maxCalls: spec.maxUniquenessCalls
  });
  let uniquenessCalls = 0;
  for (let attempt = 0; attempt < spec.maxCarveAttempts; attempt += 1) {
    const board = [...solution].map(Number);
    const random = createXorshift32(deriveSeed(spec.carveSeed, attempt));
    const order = shuffleDeterministically(orbits, random);
    let budgetExhausted = false;
    for (const orbit of order) {
      const liveCells = orbit.filter((index) => board[index] !== 0);
      if (!liveCells.length || countClues(board.join("")) - liveCells.length < spec.targetClues) continue;
      const beforeCall = budget.snapshot();
      if (beforeCall.remainingCalls <= 0 || beforeCall.remainingNodes <= 0) {
        budgetExhausted = true;
        break;
      }
      const previous = liveCells.map((index) => board[index]);
      liveCells.forEach((index) => { board[index] = 0; });
      const callNumber = beforeCall.calls + 1;
      const result = budget.run((nodeCap) => countSudokuSolutions(board, { seed: deriveSeed(spec.carveSeed, callNumber), nodeCap }));
      uniquenessCalls = budget.snapshot().calls;
      if (result.outcome !== "unique") previous.forEach((value, offset) => { board[liveCells[offset]] = value; });
      if (result.budgetExhausted) {
        budgetExhausted = true;
        break;
      }
    }
    if (budgetExhausted) break;
    const puzzle = board.join("");
    if (countClues(puzzle) !== spec.targetClues) continue;
    const metrics = getSudokuSourceMetrics(puzzle);
    if (!acceptsGeometry(spec, metrics)) continue;
    const profile = profilePuzzle({ puzzle, solution });
    if (!acceptsProfile(spec.profileGate, profile)) continue;
    return {
      attempt,
      puzzle,
      metrics,
      profile: summarizeSudokuProfile(profile),
      uniquenessCalls,
      uniquenessNodes: budget.snapshot().nodes,
      familyMaskSignature: getSudokuFamilyMaskSignature(puzzle)
    };
  }
  throw new Error(`${spec.id} exhausted Sudoku carving caps after ${uniquenessCalls} uniqueness calls and ${budget.snapshot().nodes} nodes`);
}

function verifyGeneratedPins(spec, construction, carved) {
  const checks = [
    [construction.attempt, spec.expectedConstructionAttempt, "construction attempt"],
    [construction.nodes, spec.expectedConstructionNodes, "construction nodes"],
    [construction.solution, spec.expectedSolution, "solution"],
    [carved.attempt, spec.expectedCarveAttempt, "carve attempt"],
    [carved.puzzle, spec.expectedPuzzle, "puzzle"],
    [carved.metrics.clueCount, spec.expectedClueCount, "clue count"],
    [carved.uniquenessCalls, spec.expectedUniquenessCalls, "uniqueness calls"],
    [carved.uniquenessNodes, spec.expectedUniquenessNodes, "uniqueness nodes"],
    [carved.familyMaskSignature, spec.expectedFamilyMaskSignature, "family mask signature"]
  ];
  checks.forEach(([actual, expected, field]) => ensure(actual === expected, `${spec.id} ${field} pin changed`));
  ensure(canonicalValue(carved.metrics) === canonicalValue(spec.expectedSourceMetrics), `${spec.id} source metrics pin changed`);
  ensure(canonicalValue(carved.profile) === canonicalValue(spec.expectedProfile), `${spec.id} logic profile pin changed`);
}

export function generateSudokuV3(spec, { profilePuzzle, verifyPins = true } = {}) {
  ensure(typeof profilePuzzle === "function", "profilePuzzle must be a function", TypeError);
  if (verifyPins) validateSudokuV3Spec(spec);
  const construction = constructSource(spec);
  const carved = carveSource(spec, construction.solution, profilePuzzle);
  if (verifyPins) verifyGeneratedPins(spec, construction, carved);
  return Object.freeze({
    entry: Object.freeze({
      id: spec.id,
      label: spec.label,
      puzzle: carved.puzzle,
      solution: construction.solution,
      tags: Object.freeze([...spec.tags]),
      selectable: spec.selectable,
      minTraceSteps: spec.profileGate.minLogicalSteps,
      minPlacements: spec.profileGate.minPlacements,
      logicProfile: carved.profile,
      origin: Object.freeze({
        kind: "first-party-generated",
        generatorVersion: GENERATOR_V3_VERSION,
        strategy: "seeded-orbit-carve",
        rngVersion: spec.rngVersion,
        traversalVersion: spec.traversalVersion,
        constructionSeed: spec.constructionSeed,
        constructionAttempt: construction.attempt,
        constructionNodes: construction.nodes,
        carveSeed: spec.carveSeed,
        carveAttempt: carved.attempt,
        orbitPolicy: spec.orbitPolicy,
        uniquenessCalls: carved.uniquenessCalls,
        uniquenessNodes: carved.uniquenessNodes
      })
    }),
    construction: Object.freeze(construction),
    carved: Object.freeze(carved)
  });
}
