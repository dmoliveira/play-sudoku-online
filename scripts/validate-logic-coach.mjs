import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of ["logic-coach.js", "puzzles.js", "suguru-puzzles.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), sandbox, { filename: file });
}

const { LogicCoach, SUDOKU_PUZZLES, SUGURU_PUZZLES } = sandbox.window;
const ALL_SUDOKU = 0x1ff;
let assertions = 0;
const coveredTechniques = new Set();
const rejectedNearMisses = new Set();
let preservedEliminationChecks = 0;

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function equal(actual, expected, message) {
  assertions += 1;
  const normalize = (value) => value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
  assert.deepEqual(normalize(actual), normalize(expected), message);
}

function throws(run, pattern, message) {
  assertions += 1;
  assert.throws(run, pattern, message);
}

function bit(value) {
  return 1 << (value - 1);
}

function bitCount(mask) {
  let value = mask >>> 0;
  let count = 0;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function maskValues(mask) {
  const values = [];
  for (let value = 1; value <= 9; value += 1) if (mask & bit(value)) values.push(value);
  return values;
}

function sorted(values) {
  return [...values].sort((left, right) => typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right)));
}

const sudokuRows = Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => row * 9 + col));
const sudokuColumns = Array.from({ length: 9 }, (_, col) => Array.from({ length: 9 }, (_, row) => row * 9 + col));
const sudokuBoxes = Array.from({ length: 9 }, (_, box) => {
  const boxRow = Math.floor(box / 3) * 3;
  const boxCol = (box % 3) * 3;
  const indexes = [];
  for (let row = boxRow; row < boxRow + 3; row += 1) for (let col = boxCol; col < boxCol + 3; col += 1) indexes.push(row * 9 + col);
  return indexes;
});
const sudokuUnits = [...sudokuRows, ...sudokuColumns, ...sudokuBoxes];
const sudokuPeers = Array.from({ length: 81 }, (_, index) => {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  return sorted(new Set([...sudokuRows[row], ...sudokuColumns[col], ...sudokuBoxes[box]].filter((peer) => peer !== index)));
});

function normalizeMeta(meta) {
  const cages = meta.cages.map((cage) => sorted(cage));
  const cageMap = Array(meta.size * meta.size);
  cages.forEach((cage, cageIndex) => cage.forEach((index) => { cageMap[index] = cageIndex; }));
  return { size: meta.size, cages, cageMap, total: meta.size * meta.size };
}

function touching(left, right, meta) {
  return left !== right
    && Math.abs(Math.floor(left / meta.size) - Math.floor(right / meta.size)) <= 1
    && Math.abs(left % meta.size - right % meta.size) <= 1;
}

function suguruPeers(index, meta) {
  const cage = meta.cages[meta.cageMap[index]];
  const peers = new Set(cage.filter((other) => other !== index));
  for (let other = 0; other < meta.total; other += 1) if (touching(index, other, meta)) peers.add(other);
  return sorted(peers);
}

function directMask(game, board, index, meta) {
  if (board[index]) return 0;
  if (game === "sudoku") {
    let mask = ALL_SUDOKU;
    sudokuPeers[index].forEach((peer) => { if (board[peer]) mask &= ~bit(board[peer]); });
    return mask & ALL_SUDOKU;
  }
  const cage = meta.cages[meta.cageMap[index]];
  let mask = (1 << cage.length) - 1;
  suguruPeers(index, meta).forEach((peer) => { if (board[peer]) mask &= ~bit(board[peer]); });
  return mask & ((1 << cage.length) - 1);
}

function createReference(fixture) {
  const board = [...fixture.puzzle].map(Number);
  const meta = fixture.game === "suguru" ? normalizeMeta(fixture.meta) : null;
  return {
    game: fixture.game,
    board,
    solution: [...fixture.solution].map(Number),
    meta,
    candidates: board.map((_, index) => directMask(fixture.game, board, index, meta))
  };
}

function cloneReference(reference) {
  return { ...reference, board: [...reference.board], candidates: [...reference.candidates] };
}

function sudokuUnit(kind, index) {
  if (kind === "row") return sudokuRows[index];
  if (kind === "column") return sudokuColumns[index];
  if (kind === "box") return sudokuBoxes[index];
  throw new Error(`Unknown Sudoku unit ${kind}`);
}

function sameIndexes(actual, expected) {
  assert.deepEqual(sorted(actual), sorted(expected));
}

function verifyTechnique(step, reference) {
  const value = step.values[0];
  const target = step.targetIndexes[0];
  if (step.technique === "full-house" || step.technique === "hidden-single") {
    const unit = sudokuUnit(step.context.unitKind, step.context.unitIndex);
    if (step.technique === "full-house") {
      assert.equal(unit.filter((index) => reference.board[index] === 0).length, 1);
    } else {
      const supports = unit.filter((index) => reference.board[index] === 0 && (reference.candidates[index] & bit(value)));
      sameIndexes(supports, [target]);
    }
    return;
  }
  if (step.technique === "naked-single") {
    assert.equal(bitCount(reference.candidates[target]), 1);
    return;
  }
  if (step.technique === "pointing") {
    const box = sudokuBoxes[step.context.boxIndex];
    const supports = box.filter((index) => reference.board[index] === 0 && (reference.candidates[index] & bit(value)));
    sameIndexes(supports, step.sourceIndexes);
    assert.ok(supports.length >= 2 && supports.length <= 3);
    const line = sudokuUnit(step.context.unitKind, step.context.unitIndex);
    step.eliminations.forEach((entry) => assert.ok(line.includes(entry.index) && !box.includes(entry.index)));
    return;
  }
  if (step.technique === "claiming") {
    const line = sudokuUnit(step.context.unitKind, step.context.unitIndex);
    const supports = line.filter((index) => reference.board[index] === 0 && (reference.candidates[index] & bit(value)));
    sameIndexes(supports, step.sourceIndexes);
    const box = sudokuBoxes[step.context.boxIndex];
    assert.ok(supports.every((index) => box.includes(index)));
    step.eliminations.forEach((entry) => assert.ok(box.includes(entry.index) && !line.includes(entry.index)));
    return;
  }
  if (step.technique === "naked-pair") {
    const unit = sudokuUnit(step.context.unitKind, step.context.unitIndex);
    assert.equal(step.sourceIndexes.length, 2);
    const mask = reference.candidates[step.sourceIndexes[0]];
    assert.equal(bitCount(mask), 2);
    assert.equal(reference.candidates[step.sourceIndexes[1]], mask);
    sameIndexes(maskValues(mask), step.values);
    step.eliminations.forEach((entry) => assert.ok(unit.includes(entry.index) && !step.sourceIndexes.includes(entry.index)));
    return;
  }

  const cageIndex = Number.isInteger(step.context.cageIndex) ? step.context.cageIndex : step.context.unitIndex;
  const cage = reference.meta.cages[cageIndex];
  if (step.technique === "cage-full-house") {
    assert.equal(cage.filter((index) => reference.board[index] === 0).length, 1);
    return;
  }
  if (step.technique === "cell-single") {
    assert.equal(bitCount(reference.candidates[target]), 1);
    return;
  }
  if (step.technique === "cage-hidden-single") {
    const supports = cage.filter((index) => reference.board[index] === 0 && (reference.candidates[index] & bit(value)));
    sameIndexes(supports, [target]);
    return;
  }
  if (step.technique === "cross-cage") {
    const supports = cage.filter((index) => reference.board[index] === 0 && (reference.candidates[index] & bit(value)));
    assert.ok(supports.length > 0);
    sameIndexes(supports, step.sourceIndexes);
    step.eliminations.forEach((entry) => {
      assert.ok(!cage.includes(entry.index));
      assert.ok(supports.every((source) => touching(source, entry.index, reference.meta)));
    });
    return;
  }
  if (step.technique === "cage-naked-pair") {
    assert.equal(step.sourceIndexes.length, 2);
    const mask = reference.candidates[step.sourceIndexes[0]];
    assert.equal(bitCount(mask), 2);
    assert.equal(reference.candidates[step.sourceIndexes[1]], mask);
    sameIndexes(maskValues(mask), step.values);
    step.eliminations.forEach((entry) => assert.ok(cage.includes(entry.index) && !step.sourceIndexes.includes(entry.index)));
    return;
  }
  throw new Error(`No independent verifier for ${step.technique}`);
}

function countReferenceSolutions(reference, limit = 2, forced = null) {
  const board = [...reference.board];
  if (forced) {
    if (board[forced.index] !== 0 || !(reference.candidates[forced.index] & bit(forced.value))) return 0;
    board[forced.index] = forced.value;
  }
  function search() {
    let best = -1, bestMask = 0, bestCount = Infinity;
    for (let index = 0; index < board.length; index += 1) {
      if (board[index]) continue;
      const mask = reference.candidates[index] & directMask(reference.game, board, index, reference.meta);
      const count = bitCount(mask);
      if (!count) return 0;
      if (count < bestCount) { best = index; bestMask = mask; bestCount = count; if (count === 1) break; }
    }
    if (best < 0) return 1;
    let solutions = 0;
    for (const value of maskValues(bestMask)) {
      board[best] = value;
      solutions += search();
      board[best] = 0;
      if (solutions >= limit) return solutions;
    }
    return solutions;
  }
  return search();
}

function verifyStep(step, reference) {
  verifyTechnique(step, reference);
  if (step.kind === "placement") {
    assert.equal(step.placements.length, 1);
    const placement = step.placements[0];
    assert.equal(reference.board[placement.index], 0);
    assert.ok(reference.candidates[placement.index] & bit(placement.value));
    assert.equal(placement.value, reference.solution[placement.index]);
  } else {
    assert.ok(step.eliminations.length > 0);
    step.eliminations.forEach((entry) => entry.values.forEach((value) => {
      assert.ok(reference.candidates[entry.index] & bit(value));
      assert.notEqual(value, reference.solution[entry.index]);
    }));
  }
  if (reference.game === "suguru") {
    assert.ok(countReferenceSolutions(reference, 1) >= 1);
    if (step.kind === "placement") {
      const placement = step.placements[0];
      assert.ok(countReferenceSolutions(reference, 1, placement) >= 1);
      maskValues(reference.candidates[placement.index]).filter((value) => value !== placement.value).forEach((value) => {
        assert.equal(countReferenceSolutions(reference, 1, { index: placement.index, value }), 0);
      });
    } else {
      step.eliminations.forEach((entry) => entry.values.forEach((value) => {
        assert.equal(countReferenceSolutions(reference, 1, { index: entry.index, value }), 0);
      }));
    }
  }
}

function applyReference(step, reference) {
  verifyStep(step, reference);
  const next = cloneReference(reference);
  if (step.kind === "placement") {
    const placement = step.placements[0];
    next.board[placement.index] = placement.value;
    next.candidates = next.board.map((entry, index) => entry ? 0 : reference.candidates[index] & directMask(next.game, next.board, index, next.meta));
  } else {
    step.eliminations.forEach((entry) => entry.values.forEach((value) => { next.candidates[entry.index] &= ~bit(value); }));
  }
  next.board.forEach((entry, index) => {
    if (!entry) {
      assert.ok(next.candidates[index] !== 0);
      assert.ok(next.candidates[index] & bit(next.solution[index]));
      assert.equal(next.candidates[index] & ~directMask(next.game, next.board, index, next.meta), 0);
    }
  });
  return next;
}

function assertNearMissRejected(step, reference) {
  if (rejectedNearMisses.has(step.technique)) return;
  const tampered = JSON.parse(JSON.stringify(step));
  if (tampered.kind === "placement") {
    const max = reference.game === "sudoku" ? 9 : reference.meta.cages[reference.meta.cageMap[tampered.placements[0].index]].length;
    tampered.placements[0].value = tampered.placements[0].value % max + 1;
    tampered.values = [tampered.placements[0].value];
  } else {
    const index = tampered.eliminations[0].index;
    tampered.eliminations[0].values = [reference.solution[index]];
    tampered.values = sorted(new Set(tampered.eliminations.flatMap((entry) => entry.values)));
  }
  assert.throws(() => verifyStep(tampered, cloneReference(reference)));
  rejectedNearMisses.add(step.technique);
  assertions += 1;
}

function engineOptions(fixture) {
  return { game: fixture.game, board: fixture.puzzle, puzzle: fixture.puzzle, solution: fixture.solution, meta: fixture.meta || null };
}

function walkFixture(fixture) {
  let state = LogicCoach.createState(engineOptions(fixture));
  let reference = createReference(fixture);
  const seen = new Set();
  const removed = new Map();
  let steps = 0;
  while (!LogicCoach.getContradiction(state) && !state.board.every(Boolean)) {
    const available = LogicCoach.getNextSteps(state);
    if (!available.length) break;
    const step = available[0];
    check(!seen.has(step.canonicalKey), `${fixture.id} repeated ${step.technique}`);
    seen.add(step.canonicalKey);
    coveredTechniques.add(step.technique);
    assertNearMissRejected(step, reference);
    const nextReference = applyReference(step, reference);
    if (step.kind === "elimination") {
      step.eliminations.forEach((entry) => entry.values.forEach((value) => removed.set(`${entry.index}:${value}`, { index: entry.index, value })));
    }
    const nextState = LogicCoach.applyStep(state, step);
    const inspected = LogicCoach.inspectState(nextState);
    equal(inspected.board, nextReference.board, `${fixture.id} board replay drift`);
    equal(inspected.candidates.map((entry) => entry.mask), nextReference.candidates, `${fixture.id} candidate replay drift`);
    if (step.kind === "placement" && removed.size) {
      removed.forEach(({ index, value }, key) => {
        if (inspected.board[index] === 0) {
          check(!(inspected.candidates[index].mask & bit(value)), `${fixture.id} reintroduced eliminated candidate`);
          preservedEliminationChecks += 1;
        } else {
          removed.delete(key);
        }
      });
    }
    state = nextState;
    reference = nextReference;
    steps += 1;
    check(steps < 500, `${fixture.id} failed to terminate`);
  }
  if (state.board.every(Boolean)) equal(state.board, reference.solution, `${fixture.id} solved board mismatch`);
  return steps;
}

function countSudokuSolutions(puzzle, limit = 2) {
  const board = [...puzzle].map(Number);
  function search() {
    let best = -1, bestMask = 0, bestCount = Infinity;
    for (let index = 0; index < 81; index += 1) if (!board[index]) {
      const mask = directMask("sudoku", board, index, null);
      const count = bitCount(mask);
      if (!count) return 0;
      if (count < bestCount) { best = index; bestMask = mask; bestCount = count; if (count === 1) break; }
    }
    if (best < 0) return 1;
    let solutions = 0;
    for (const value of maskValues(bestMask)) {
      board[best] = value;
      solutions += search();
      board[best] = 0;
      if (solutions >= limit) return solutions;
    }
    return solutions;
  }
  return search();
}

const pointingFixture = {
  id: "sudoku-pointing-fixture", game: "sudoku",
  puzzle: "030070010070090000090002060050760003406003000013920056000000200000419000005200070",
  solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
};
const pairFixture = {
  id: "sudoku-pair-fixture", game: "sudoku",
  puzzle: "000070900000095340098340500050761020020850001000024000000007000200009030000000079",
  solution: pointingFixture.solution
};
const suguruPairFixture = {
  id: "suguru-pair-fixture", game: "suguru",
  puzzle: "0000004000000340000000000",
  solution: "1234334121125345341221234",
  meta: { size: 5, cages: [[5,6,10,11,12],[9,13,14,19],[3,4,7,8],[15,16,17,20,21],[0,1,2],[18,22,23,24]] }
};

check(LogicCoach.PROFILE_VERSION === 1, "profile version must be frozen at 1");
check(LogicCoach.SEARCH_NODE_CAP === 200000, "search cap must be concrete");
check(Object.isFrozen(LogicCoach), "public API must be frozen");

const baseSudoku = SUDOKU_PUZZLES.easy[0];
const sourceBoard = [...baseSudoku.puzzle].map(Number);
const state = LogicCoach.createState({ game: "sudoku", board: sourceBoard, puzzle: sourceBoard, solution: baseSudoku.solution });
sourceBoard.fill(9);
check(state.board.join("") === baseSudoku.puzzle, "state must not alias caller board");
check(Object.isFrozen(state) && Object.isFrozen(state.board) && Object.isFrozen(state.candidates) && Object.isFrozen(state.appliedKeys), "Sudoku state graph must be frozen");
throws(() => { state.board = []; }, /read only|extensible|frozen|assign/i, "top-level board replacement must fail");
throws(() => { state.board[0] = 9; }, /read only|extensible|frozen|assign/i, "board mutation must fail");
throws(() => { state.candidates[0] = 0; }, /read only|extensible|frozen|assign/i, "candidate mutation must fail");
throws(() => { state.appliedKeys.push("forged"); }, /read only|extensible|frozen|assign/i, "history mutation must fail");
const firstStep = LogicCoach.getNextStep(state);
check(firstStep && Object.isFrozen(firstStep) && Object.isFrozen(firstStep.targetIndexes), "issued proof must be frozen");
throws(() => LogicCoach.applyStep({ ...state }, firstStep), /not issued/, "forged state must fail");
const equivalentState = LogicCoach.createState({ game: "sudoku", board: baseSudoku.puzzle, puzzle: baseSudoku.puzzle, solution: baseSudoku.solution });
throws(() => LogicCoach.applyStep(equivalentState, firstStep), /does not belong/, "proof must stay bound to its state");
const inspected = LogicCoach.inspectState(state);
check(Object.isFrozen(inspected) && Object.isFrozen(inspected.candidates) && Object.isFrozen(inspected.candidates[0]), "diagnostics must be copied and frozen");

const suguruBase = SUGURU_PUZZLES["size5-easy"][0];
const mutableMeta = { size: suguruBase.size, cages: suguruBase.cages.map((cage) => [...cage]), cageMap: [...suguruBase.cageMap] };
const suguruState = LogicCoach.createState({ game: "suguru", board: suguruBase.puzzle, puzzle: suguruBase.puzzle, solution: suguruBase.solution, meta: mutableMeta });
mutableMeta.cages[0][0] = 999;
check(suguruState.meta.cages[0][0] !== 999, "Suguru metadata must not alias input");
check(Object.isFrozen(suguruState.meta) && Object.isFrozen(suguruState.meta.cages) && Object.isFrozen(suguruState.meta.cages[0]) && Object.isFrozen(suguruState.meta.cageMap), "Suguru state metadata graph must be frozen");
throws(() => { suguruState.meta = null; }, /read only|extensible|frozen|assign/i, "metadata replacement must fail");
throws(() => { suguruState.meta.cages[0][0] = 2; }, /read only|extensible|frozen|assign/i, "nested cage mutation must fail");

throws(() => LogicCoach.createState({ game: "sudoku", board: [0] }), /81 cells/, "wrong Sudoku size must fail before iteration");
equal(LogicCoach.profile({ game: "sudoku", board: [0] }).status, "invalid", "invalid profile input must fail closed");
const duplicateBoard = Array(81).fill(0); duplicateBoard[0] = 5; duplicateBoard[1] = 5;
equal(LogicCoach.getContradiction(LogicCoach.createState({ game: "sudoku", board: duplicateBoard })).type, "duplicate", "duplicates must be detected");
const deadBoard = Array(81).fill(0); [1,2,3,4,5,6,7,8].forEach((value, offset) => { deadBoard[offset] = value; }); deadBoard[17] = 9;
equal(LogicCoach.getContradiction(LogicCoach.createState({ game: "sudoku", board: deadBoard })).type, "dead-cell", "dead cells must be detected without duplicates");

const wrongBoard = [...baseSudoku.puzzle].map(Number);
const wrongReference = createReference({ game: "sudoku", puzzle: baseSudoku.puzzle, solution: baseSudoku.solution });
let wrongIndex = -1, wrongValue = 0;
wrongReference.candidates.some((mask, index) => {
  const candidate = maskValues(mask).find((value) => value !== wrongReference.solution[index]);
  if (candidate) { wrongIndex = index; wrongValue = candidate; return true; }
  return false;
});
check(wrongIndex >= 0, "fixture must contain a locally legal wrong entry");
wrongBoard[wrongIndex] = wrongValue;
const wrongState = LogicCoach.createState({ game: "sudoku", board: wrongBoard, puzzle: baseSudoku.puzzle, solution: baseSudoku.solution });
equal(LogicCoach.getContradiction(wrongState).type, "wrong-entry", "locally legal wrong values must be correction states");
equal(LogicCoach.getNextSteps(wrongState).length, 0, "correction states must not emit coaching");

const blank = "0".repeat(81);
const capped = LogicCoach.profile({ game: "sudoku", board: blank, puzzle: blank, nodeLimit: 1 });
equal([capped.status, capped.residualSearch.status], ["stalled", "capped"], "node cap must report capped without a uniqueness claim");
const multiple = LogicCoach.profile({ game: "sudoku", board: blank, puzzle: blank, nodeLimit: 10000 });
equal(multiple.residualSearch.status, "multiple", "blank Sudoku must report multiple solutions");
const solved = LogicCoach.profile({ game: "sudoku", board: baseSudoku.solution, puzzle: baseSudoku.solution, solution: baseSudoku.solution });
equal([solved.status, solved.logicalSteps], ["solved-logically", 0], "solved input must need no steps");

const sudokuFixtures = [pointingFixture, pairFixture];
for (const [band, entries] of Object.entries(SUDOKU_PUZZLES)) {
  const seenFamilies = new Set();
  entries.forEach((entry) => {
    const family = entry.id.replace(/-[abc]-r[012]$/, "");
    if (!seenFamilies.has(family)) {
      seenFamilies.add(family);
      sudokuFixtures.push({ id: `${band}:${family}`, game: "sudoku", puzzle: entry.puzzle, solution: entry.solution });
    }
  });
  const firstFamily = entries[0].id.replace(/-[abc]-r[012]$/, "");
  entries.filter((entry) => entry.id.startsWith(`${firstFamily}-`)).forEach((entry) => sudokuFixtures.push({ id: `transform:${entry.id}`, game: "sudoku", puzzle: entry.puzzle, solution: entry.solution }));
}

const suguruFixtures = [suguruPairFixture];
Object.entries(SUGURU_PUZZLES).forEach(([level, entries]) => entries.forEach((entry) => suguruFixtures.push({ id: `${level}:${entry.id}`, game: "suguru", puzzle: entry.puzzle, solution: entry.solution, meta: entry })));

for (const [level, entries] of Object.entries(SUGURU_PUZZLES)) {
  entries.forEach((entry) => {
    const reference = createReference({ game: "suguru", puzzle: entry.puzzle, solution: entry.solution, meta: entry });
    equal(countReferenceSolutions(reference, 2), 1, `${level}:${entry.id} must have one independent Suguru completion`);
  });
}

for (const fixture of [...sudokuFixtures, ...suguruFixtures]) walkFixture(fixture);

const expectedTechniques = ["full-house", "naked-single", "hidden-single", "pointing", "claiming", "naked-pair", "cage-full-house", "cell-single", "cage-hidden-single", "cross-cage", "cage-naked-pair"];
equal(sorted(coveredTechniques), sorted(expectedTechniques), "every v1 technique must have a positive fixture");
equal(sorted(rejectedNearMisses), sorted(expectedTechniques), "every v1 technique must have a rejected near-miss proof");
check(preservedEliminationChecks > 0, "a later placement must preserve prior candidate eliminations");
check(countSudokuSolutions(pointingFixture.puzzle, 2) >= 1, "pointing fixture must have a completion");
check(countSudokuSolutions(pairFixture.puzzle, 2) >= 1, "pair fixture must have a completion");

for (const [band, entries] of Object.entries(SUDOKU_PUZZLES)) {
  const family = entries[0].id.replace(/-[abc]-r[012]$/, "");
  const profiles = entries.filter((entry) => entry.id.startsWith(`${family}-`)).map((entry) => LogicCoach.profile({ game: "sudoku", board: entry.puzzle, puzzle: entry.puzzle, solution: entry.solution }));
  const classifications = new Set(profiles.map((profile) => `${profile.status}:${profile.hardestBand || "none"}`));
  equal(classifications.size, 1, `${band} shipped transforms must preserve capability classification`);
}

const deterministicA = LogicCoach.profile(engineOptions(pointingFixture));
const deterministicB = LogicCoach.profile(engineOptions(pointingFixture));
equal(JSON.stringify(deterministicA), JSON.stringify(deterministicB), "profiles must be byte-deterministic");
check(deterministicA.trace.every((step, index, trace) => trace.findIndex((entry) => entry.canonicalKey === step.canonicalKey) === index), "profile proof keys must not repeat");

console.log(`Logic coach validation passed: ${assertions} assertions, ${sudokuFixtures.length + suguruFixtures.length} profiles, ${coveredTechniques.size} techniques`);
