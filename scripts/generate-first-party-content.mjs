import fs from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { CONTENT_GENERATOR_VERSION, SUDOKU_CONTENT_SPECS, SUGURU_LAYOUT_SPECS } from "./content-specs.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "generated-content.js");
const TEMP_OUTPUT = `${OUTPUT}.tmp`;
const CHECK_ONLY = process.argv.includes("--check");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(join(ROOT, "logic-coach.js"), "utf8"), sandbox, { filename: "logic-coach.js" });
const LogicCoach = sandbox.window.LogicCoach;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function createRandom(seed) {
  let value = seed | 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function countBits(mask) {
  let value = mask >>> 0;
  let count = 0;
  while (value) { value &= value - 1; count += 1; }
  return count;
}

function valuesFromMask(mask) {
  const values = [];
  for (let value = 1; value <= 9; value += 1) if (mask & (1 << (value - 1))) values.push(value);
  return values;
}

function sudokuMask(board, index) {
  if (board[index]) return 0;
  const row = Math.floor(index / 9);
  const col = index % 9;
  let mask = 0x1ff;
  for (let offset = 0; offset < 9; offset += 1) {
    if (board[row * 9 + offset]) mask &= ~(1 << (board[row * 9 + offset] - 1));
    if (board[offset * 9 + col]) mask &= ~(1 << (board[offset * 9 + col] - 1));
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let nextRow = boxRow; nextRow < boxRow + 3; nextRow += 1) {
    for (let nextCol = boxCol; nextCol < boxCol + 3; nextCol += 1) {
      const value = board[nextRow * 9 + nextCol];
      if (value) mask &= ~(1 << (value - 1));
    }
  }
  return mask;
}

function countSudokuSolutions(board, limit = 2) {
  let bestIndex = -1;
  let bestMask = 0;
  let bestCount = Infinity;
  for (let index = 0; index < 81; index += 1) {
    if (board[index]) continue;
    const mask = sudokuMask(board, index);
    const count = countBits(mask);
    if (!count) return 0;
    if (count < bestCount) { bestIndex = index; bestMask = mask; bestCount = count; if (count === 1) break; }
  }
  if (bestIndex < 0) return 1;
  let solutions = 0;
  for (const value of valuesFromMask(bestMask)) {
    board[bestIndex] = value;
    solutions += countSudokuSolutions(board, limit - solutions);
    board[bestIndex] = 0;
    if (solutions >= limit) return solutions;
  }
  return solutions;
}

function validateSudokuSolution(solution, label) {
  ensure(typeof solution === "string" && /^[1-9]{81}$/.test(solution), `${label} must be an 81-digit solved grid`);
  const board = [...solution].map(Number);
  const units = [];
  for (let row = 0; row < 9; row += 1) units.push(Array.from({ length: 9 }, (_, col) => board[row * 9 + col]));
  for (let col = 0; col < 9; col += 1) units.push(Array.from({ length: 9 }, (_, row) => board[row * 9 + col]));
  for (let boxRow = 0; boxRow < 3; boxRow += 1) for (let boxCol = 0; boxCol < 3; boxCol += 1) {
    const values = [];
    for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) values.push(board[row * 9 + col]);
    units.push(values);
  }
  units.forEach((values, index) => ensure([...values].sort().join("") === "123456789", `${label} has invalid unit ${index}`));
}

function isTouching(left, right, size) {
  return left !== right
    && Math.abs(Math.floor(left / size) - Math.floor(right / size)) <= 1
    && Math.abs(left % size - right % size) <= 1;
}

function buildCageMap(layout) {
  const map = Array(layout.size * layout.size).fill(-1);
  layout.cages.forEach((cage, cageIndex) => cage.forEach((cellIndex) => {
    ensure(map[cellIndex] === -1, `${layout.id} repeats cell ${cellIndex}`);
    map[cellIndex] = cageIndex;
  }));
  ensure(map.every((entry) => entry >= 0), `${layout.id} cages must cover the board`);
  return map;
}

function validateConnectedCages(layout) {
  layout.cages.forEach((cage, cageIndex) => {
    const reached = new Set([cage[0]]);
    let changed = true;
    while (changed) {
      changed = false;
      cage.forEach((cell) => {
        if (reached.has(cell)) return;
        const row = Math.floor(cell / layout.size);
        const col = cell % layout.size;
        const neighbors = [
          row > 0 ? cell - layout.size : -1,
          row < layout.size - 1 ? cell + layout.size : -1,
          col > 0 ? cell - 1 : -1,
          col < layout.size - 1 ? cell + 1 : -1
        ];
        if (neighbors.some((neighbor) => reached.has(neighbor))) { reached.add(cell); changed = true; }
      });
    }
    ensure(reached.size === cage.length, `${layout.id} cage ${cageIndex} must be orthogonally connected`);
  });
}

function validateSuguruSolution(layout) {
  ensure(typeof layout.solution === "string" && /^[1-9]+$/.test(layout.solution) && layout.solution.length === layout.size * layout.size, `${layout.id} has invalid solved grid`);
  const board = [...layout.solution].map(Number);
  const cageMap = buildCageMap(layout);
  validateConnectedCages(layout);
  layout.cages.forEach((cage, cageIndex) => {
    const values = cage.map((cell) => board[cell]).sort((left, right) => left - right);
    const expected = Array.from({ length: cage.length }, (_, index) => index + 1);
    ensure(values.join(",") === expected.join(","), `${layout.id} cage ${cageIndex} must contain 1..N`);
  });
  board.forEach((value, index) => {
    ensure(value <= layout.cages[cageMap[index]].length, `${layout.id} value out of cage range at ${index}`);
    for (let other = index + 1; other < board.length; other += 1) {
      if (isTouching(index, other, layout.size)) ensure(board[other] !== value, `${layout.id} solved grid touches equal values at ${index}/${other}`);
    }
  });
}

function suguruCandidates(board, index, layout, cageMap) {
  if (board[index]) return [];
  const cage = layout.cages[cageMap[index]];
  const candidates = [];
  for (let value = 1; value <= cage.length; value += 1) {
    if (cage.some((cell) => board[cell] === value)) continue;
    if (board.some((entry, other) => entry === value && isTouching(index, other, layout.size))) continue;
    candidates.push(value);
  }
  return candidates;
}

function countSuguruSolutions(board, layout, cageMap, limit = 2) {
  let bestIndex = -1;
  let bestCandidates = null;
  for (let index = 0; index < board.length; index += 1) {
    if (board[index]) continue;
    const candidates = suguruCandidates(board, index, layout, cageMap);
    if (!candidates.length) return 0;
    if (!bestCandidates || candidates.length < bestCandidates.length) { bestIndex = index; bestCandidates = candidates; if (candidates.length === 1) break; }
  }
  if (bestIndex < 0) return 1;
  let solutions = 0;
  for (const value of bestCandidates) {
    board[bestIndex] = value;
    solutions += countSuguruSolutions(board, layout, cageMap, limit - solutions);
    board[bestIndex] = 0;
    if (solutions >= limit) return solutions;
  }
  return solutions;
}

function summarizeProfile(profile) {
  return {
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
    techniques: [...new Set(profile.trace.map((step) => step.technique))]
  };
}

function acceptsProfile(spec, profile) {
  if (profile.status === "invalid") return false;
  if (profile.logicalSteps < spec.minTraceSteps || profile.placementSteps < spec.minPlacements) return false;
  if (spec.requiredStatus && profile.status !== spec.requiredStatus) return false;
  if (spec.requiredBand && profile.hardestBand !== spec.requiredBand) return false;
  if (spec.requiredAnyBand && !profile.trace.some((step) => spec.requiredAnyBand.includes(step.band))) return false;
  return true;
}

function carveSudoku(spec) {
  validateSudokuSolution(spec.solution, spec.id);
  const random = createRandom(spec.seed);
  const indexes = Array.from({ length: 81 }, (_, index) => index);
  for (let attempt = 0; attempt < 3000; attempt += 1) {
    const board = [...spec.solution].map(Number);
    for (const index of shuffle(indexes, random)) {
      if (board.filter(Boolean).length <= spec.targetClues) break;
      const previous = board[index];
      board[index] = 0;
      if (countSudokuSolutions([...board], 2) !== 1) board[index] = previous;
    }
    if (board.filter(Boolean).length !== spec.targetClues) continue;
    const puzzle = board.join("");
    const profile = LogicCoach.profile({ game: "sudoku", board: puzzle, puzzle, solution: spec.solution, nodeLimit: LogicCoach.SEARCH_NODE_CAP });
    if (!acceptsProfile(spec, profile)) continue;
    ensure(attempt === spec.expectedAttempt, `${spec.id} expected attempt ${spec.expectedAttempt}, got ${attempt}`);
    ensure(puzzle === spec.expectedPuzzle, `${spec.id} generated puzzle changed`);
    return {
      id: spec.id,
      label: spec.label,
      puzzle,
      solution: spec.solution,
      tags: [...spec.tags],
      selectable: true,
      minTraceSteps: spec.minTraceSteps,
      minPlacements: spec.minPlacements,
      logicProfile: summarizeProfile(profile),
      origin: { kind: "first-party-generated", generatorVersion: CONTENT_GENERATOR_VERSION, seed: spec.seed, attempt }
    };
  }
  throw new Error(`${spec.id} failed bounded Sudoku clue carving`);
}

function carveSuguru(layout, spec) {
  const random = createRandom(spec.seed);
  const indexes = Array.from({ length: layout.size * layout.size }, (_, index) => index);
  const cageMap = buildCageMap(layout);
  for (const clueCount of spec.clueTargets) {
    for (let attempt = 0; attempt < 200000; attempt += 1) {
      const keep = new Set(shuffle(indexes, random).slice(0, clueCount));
      const puzzle = [...layout.solution].map((value, index) => keep.has(index) ? value : "0").join("");
      if (countSuguruSolutions([...puzzle].map(Number), layout, cageMap, 2) !== 1) continue;
      const profile = LogicCoach.profile({ game: "suguru", board: puzzle, puzzle, solution: layout.solution, meta: layout, nodeLimit: LogicCoach.SEARCH_NODE_CAP });
      if (!acceptsProfile(spec, profile)) continue;
      ensure(attempt === spec.expectedAttempt, `${spec.id} expected attempt ${spec.expectedAttempt}, got ${attempt}`);
      ensure(puzzle === spec.expectedPuzzle, `${spec.id} generated puzzle changed`);
      return {
        id: spec.id,
        label: spec.label,
        layout: layout.id,
        puzzle,
        tags: [...spec.tags],
        selectable: true,
        minTraceSteps: spec.minTraceSteps,
        minPlacements: spec.minPlacements,
        logicProfile: summarizeProfile(profile),
        origin: { kind: "first-party-generated", generatorVersion: CONTENT_GENERATOR_VERSION, seed: spec.seed, attempt }
      };
    }
  }
  throw new Error(`${spec.id} failed bounded Suguru clue carving`);
}

const sudokuTemplates = { easy: [], medium: [], advanced: [], hard: [], expert: [] };
for (const spec of SUDOKU_CONTENT_SPECS) sudokuTemplates[spec.difficulty].push(carveSudoku(spec));

const suguruLayouts = {};
const suguruEntries = { "size5-easy": [], "size5-medium": [], "size5-challenge": [] };
for (const layoutSpec of SUGURU_LAYOUT_SPECS) {
  validateSuguruSolution(layoutSpec);
  suguruLayouts[layoutSpec.id] = {
    size: layoutSpec.size,
    cages: layoutSpec.cages.map((cage) => [...cage]),
    solution: layoutSpec.solution,
    layoutFamilyId: layoutSpec.layoutFamilyId,
    origin: { kind: "first-party-construction", generatorVersion: CONTENT_GENERATOR_VERSION, seed: layoutSpec.seed }
  };
  const generated = layoutSpec.levels.map((spec) => ({ level: spec.level, entry: carveSuguru(layoutSpec, spec) }));
  const easy = generated.find((item) => item.level === "size5-easy").entry.puzzle;
  const bridge = generated.find((item) => item.level === "size5-medium").entry.puzzle;
  const differingClues = easy.split("").filter((value, index) => value !== bridge[index]).length;
  ensure(differingClues > 1, `${layoutSpec.id} Bridge must not be a one-full-house-clue delta from Easy`);
  generated.forEach(({ level, entry }) => suguruEntries[level].push(entry));
}

const payload = { version: CONTENT_GENERATOR_VERSION, sudokuTemplates, suguruLayouts, suguruEntries };
const output = `(function () {
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }
  window.GENERATED_CONTENT = deepFreeze(${JSON.stringify(payload, null, 2)});
})();
`;

if (CHECK_ONLY) {
  ensure(fs.existsSync(OUTPUT), "generated-content.js is missing; run the generator");
  ensure(fs.readFileSync(OUTPUT, "utf8") === output, "generated-content.js is stale; run the generator");
  console.log("First-party content regeneration check passed");
} else {
  await writeFile(TEMP_OUTPUT, output, "utf8");
  await rename(TEMP_OUTPUT, OUTPUT);
  console.log("Generated first-party content at generated-content.js");
}
