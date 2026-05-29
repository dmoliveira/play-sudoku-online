import fs from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL("../suguru.js", import.meta.url), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(new URL("../suguru-puzzles.js", import.meta.url), "utf8"), sandbox);

const { SuguruCore, SUGURU_PUZZLES } = sandbox.window;

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateGrid(grid, size, label) {
  ensure(typeof grid === "string", `${label} must be a string`);
  ensure(grid.length === size * size, `${label} must have ${size * size} cells`);
  ensure(/^[0-9]+$/.test(grid), `${label} must contain digits only`);
}

function validateSolution(entry) {
  const solution = SuguruCore.parseGrid(entry.solution);
  const size = entry.size;
  ensure(solution.length === size * size, `${entry.id} solution length mismatch`);

  entry.cages.forEach((cage, cageIndex) => {
    const values = cage.map((index) => solution[index]).sort((a, b) => a - b);
    const expected = Array.from({ length: cage.length }, (_, index) => index + 1);
    ensure(values.join(",") === expected.join(","), `${entry.id} cage ${cageIndex} must contain 1..${cage.length}`);
  });

  solution.forEach((value, index) => {
    ensure(value >= 1 && value <= entry.maxValue, `${entry.id} solution value out of range at ${index}`);
    const conflicts = SuguruCore.collectConflicts(solution, index, entry);
    ensure(conflicts.length === 0, `${entry.id} solution has touching conflict at ${index}`);
  });
}

function getCandidates(board, index, entry) {
  if (board[index] !== 0) {
    return [];
  }

  const cage = entry.cages[entry.cageMap[index]];
  const usedInCage = new Set(cage.map((cellIndex) => board[cellIndex]).filter(Boolean));
  const candidates = [];
  for (let value = 1; value <= cage.length; value += 1) {
    if (usedInCage.has(value)) {
      continue;
    }
    board[index] = value;
    const conflicts = SuguruCore.collectConflicts(board, index, entry);
    board[index] = 0;
    if (!conflicts.length) {
      candidates.push(value);
    }
  }
  return candidates;
}

function countSolutions(board, entry, limit = 2) {
  let bestIndex = -1;
  let bestCandidates = null;

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== 0) {
      continue;
    }
    const candidates = getCandidates(board, index, entry);
    if (candidates.length === 0) {
      return 0;
    }
    if (!bestCandidates || candidates.length < bestCandidates.length) {
      bestCandidates = candidates;
      bestIndex = index;
      if (candidates.length === 1) {
        break;
      }
    }
  }

  if (bestIndex === -1) {
    return 1;
  }

  let solutions = 0;
  for (const value of bestCandidates) {
    board[bestIndex] = value;
    solutions += countSolutions(board, entry, limit - solutions);
    board[bestIndex] = 0;
    if (solutions >= limit) {
      return solutions;
    }
  }
  return solutions;
}

let total = 0;
for (const [level, puzzles] of Object.entries(SUGURU_PUZZLES)) {
  ensure(Array.isArray(puzzles) && puzzles.length > 0, `${level} should have puzzles`);
  puzzles.forEach((entry) => {
    total += 1;
    ensure(entry.size === 5, `${entry.id} currently expects size 5`);
    ensure(entry.maxValue >= 2 && entry.maxValue <= 5, `${entry.id} maxValue should stay within 2..5`);
    ensure(Array.isArray(entry.cages) && entry.cages.length >= 5, `${entry.id} should have at least 5 cages`);
    ensure(Array.isArray(entry.cageMap) && entry.cageMap.length === 25, `${entry.id} should have a 25-cell cage map`);
    const cageSizes = entry.cages.map((cage) => cage.length);
    ensure(cageSizes.every((size) => size >= 2 && size <= 5), `${entry.id} cage sizes must stay within 2..5`);
    ensure(cageSizes.some((size) => size < 5), `${entry.id} should include at least one cage smaller than 5`);
    validateGrid(entry.puzzle, entry.size, `${entry.id} puzzle`);
    validateGrid(entry.solution, entry.size, `${entry.id} solution`);
    validateSolution(entry);
    entry.puzzle.split("").forEach((value, index) => {
      if (value !== "0") {
        ensure(value === entry.solution[index], `${entry.id} clue mismatch at ${index}`);
      }
    });
    const solutionCount = countSolutions(SuguruCore.parseGrid(entry.puzzle), entry, 2);
    ensure(solutionCount === 1, `${entry.id} should have exactly one solution, got ${solutionCount}`);
  });
}

console.log("Suguru validation passed for", total, "puzzles");
