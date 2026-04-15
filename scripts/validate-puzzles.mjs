import fs from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL("../puzzles.js", import.meta.url), "utf8"), sandbox);

const library = sandbox.window.SUDOKU_PUZZLES;

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

Object.entries(library).forEach(([difficulty, puzzles]) => {
  ensure(puzzles.length >= 6, `${difficulty} should have at least 6 generated puzzles`);
  puzzles.forEach((puzzle) => {
    validateGrid(puzzle.puzzle, `${puzzle.id} puzzle`);
    validateGrid(puzzle.solution, `${puzzle.id} solution`);
    puzzle.puzzle.split("").forEach((value, index) => {
      if (value !== "0") {
        ensure(value === puzzle.solution[index], `${puzzle.id} clue mismatch at cell ${index}`);
      }
    });
  });
});

console.log("Puzzle validation passed for", Object.values(library).flat().length, "puzzles");
