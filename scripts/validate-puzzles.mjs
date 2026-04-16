import fs from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL("../puzzles.js", import.meta.url), "utf8"), sandbox);

const library = sandbox.window.SUDOKU_PUZZLES;
const sourceText = fs.readFileSync(new URL("../puzzles.js", import.meta.url), "utf8");

const CLUE_RANGES = {
  easy: [66, 72],
  medium: [53, 62],
  hard: [31, 34],
  expert: [23, 23]
};

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
    const [minClues, maxClues] = CLUE_RANGES[difficulty];
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

console.log("Puzzle validation passed for", Object.values(library).flat().length, "puzzles");
