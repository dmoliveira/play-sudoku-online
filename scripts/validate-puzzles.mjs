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
const GENERATED_CLUE_RANGES = { easy: [60, 72], hard: [28, 34], expert: [23, 28] };

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
    const [minClues, maxClues] = generated ? GENERATED_CLUE_RANGES[difficulty] : CLUE_RANGES[difficulty];
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
ensure(allPuzzles.length === 198, `expanded Sudoku inventory must contain 198 IDs, got ${allPuzzles.length}`);
ensure(families.size === 22, `expanded Sudoku inventory must contain 22 families, got ${families.size}`);
ensure(generatedPuzzles.length === 36, `generated Sudoku inventory must contain 36 transforms, got ${generatedPuzzles.length}`);
ensure(generatedPuzzles.every((puzzle) => puzzle.selectable === true), "generated Sudoku must be enabled through practice rotation");
ensure(generatedPuzzles.every((puzzle) => puzzle.origin.generatorVersion === 2 && ["unique-carve", "sample-clues"].includes(puzzle.origin.strategy)), "generated Sudoku must expose generator v2 strategy metadata");
const expectedGeneratedFamilyOrder = {
  easy: ["easy-sunlit-maple"],
  medium: [],
  advanced: [],
  hard: ["hard-temple-current", "hard-pair-current"],
  expert: ["expert-starlit-pines"]
};
Object.entries(library).forEach(([band, entries]) => {
  const order = [...new Set(entries.filter((entry) => entry.origin?.kind === "first-party-generated").map((entry) => entry.familyId))];
  ensure(order.join(",") === expectedGeneratedFamilyOrder[band].join(","), `${band} generated family append order changed`);
});
const focusPuzzles = generatedPuzzles.filter((puzzle) => puzzle.logicFocus);
ensure(focusPuzzles.length === 9 && focusPuzzles.every((puzzle) => puzzle.familyId === "hard-pair-current"), "Pair Current must expose exactly nine focused transforms");
const baselineSolutions = new Set(allPuzzles.filter((puzzle) => puzzle.origin?.kind === "curated-baseline").map((puzzle) => puzzle.solution));
for (const familyId of [...new Set(generatedPuzzles.map((puzzle) => puzzle.familyId))]) {
  const variants = generatedPuzzles.filter((puzzle) => puzzle.familyId === familyId);
  ensure(variants.length === 9, `${familyId} must expand through nine transforms`);
  ensure(!baselineSolutions.has(variants.find((puzzle) => puzzle.transformId === "a-r0").solution), `${familyId} source solution must be outside shipped transform outputs`);
  const profiles = variants.map((puzzle) => LogicCoach.profile({ game: "sudoku", board: puzzle.puzzle, puzzle: puzzle.puzzle, solution: puzzle.solution }));
  ensure(profiles.every((profile) => profile.status !== "invalid"), `${familyId} profiles must be valid`);
  ensure(new Set(profiles.map((profile) => `${profile.status}:${profile.hardestBand}`)).size === 1, `${familyId} transforms must preserve profile classification`);
  profiles.forEach((profile, index) => {
    const expected = variants[index].logicProfile;
    ensure(profile.logicalSteps >= variants[index].minTraceSteps && profile.placementSteps >= variants[index].minPlacements, `${variants[index].id} must satisfy workload floors`);
    ensure(profile.status === expected.status && profile.hardestBand === expected.hardestBand, `${variants[index].id} profile metadata drift`);
    const focus = variants[index].logicFocus;
    if (focus) {
      const traceIndex = profile.trace.findIndex((step) => step.technique === focus.technique);
      const step = profile.trace[traceIndex];
      const candidateEliminations = (step?.eliminations || []).reduce((total, elimination) => total + elimination.values.length, 0);
      const downstreamPlacements = traceIndex < 0 ? 0 : profile.trace.slice(traceIndex + 1).filter((candidate) => candidate.kind === "placement").length;
      ensure(JSON.stringify(focus) === JSON.stringify({ profileVersion: profile.profileVersion, technique: "naked-pair", traceIndex, candidateEliminations, downstreamPlacements }), `${variants[index].id} focus metadata drift`);
      ensure(traceIndex === 10 && candidateEliminations === 3 && downstreamPlacements === 41, `${variants[index].id} must retain reviewed effective-pair evidence`);
    }
  });
}

console.log("Puzzle validation passed for", allPuzzles.length, "puzzles across", families.size, "families");
