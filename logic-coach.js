(function () {
  "use strict";

  const PROFILE_VERSION = 1;
  const SEARCH_NODE_CAP = 200000;
  const MAX_LOGIC_STEPS = 2000;
  const SUDOKU_SIZE = 9;
  const SUDOKU_CELLS = 81;
  const SUDOKU_MASK = 0x1ff;
  const issuedStates = new WeakSet();
  const issuedStepStates = new WeakMap();

  const TECHNIQUE_META = Object.freeze({
    "full-house": Object.freeze({ rank: 0, band: "local" }),
    "naked-single": Object.freeze({ rank: 1, band: "local" }),
    "hidden-single": Object.freeze({ rank: 2, band: "local" }),
    "pointing": Object.freeze({ rank: 3, band: "interaction" }),
    "claiming": Object.freeze({ rank: 4, band: "interaction" }),
    "naked-pair": Object.freeze({ rank: 5, band: "subset" }),
    "cage-full-house": Object.freeze({ rank: 0, band: "local" }),
    "cell-single": Object.freeze({ rank: 1, band: "local" }),
    "cage-hidden-single": Object.freeze({ rank: 2, band: "local" }),
    "cross-cage": Object.freeze({ rank: 3, band: "interaction" }),
    "cage-naked-pair": Object.freeze({ rank: 4, band: "subset" })
  });
  const BAND_RANK = Object.freeze({ local: 0, interaction: 1, subset: 2 });

  function invariant(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function freezeGraph(value, seen = new WeakSet()) {
    if (!value || typeof value !== "object" || seen.has(value)) {
      return value;
    }
    seen.add(value);
    Object.values(value).forEach((entry) => freezeGraph(entry, seen));
    return Object.freeze(value);
  }

  function bitFor(value) {
    return 1 << (value - 1);
  }

  function countBits(mask) {
    let value = mask >>> 0;
    let count = 0;
    while (value) {
      value &= value - 1;
      count += 1;
    }
    return count;
  }

  function valuesFromMask(mask) {
    const values = [];
    for (let value = 1; value <= 9; value += 1) {
      if (mask & bitFor(value)) {
        values.push(value);
      }
    }
    return Object.freeze(values);
  }

  function uniqueSorted(values) {
    return [...new Set(values)].sort((left, right) => left - right);
  }

  function normalizeGrid(value, expectedLength, label) {
    const grid = typeof value === "string"
      ? value.split("").map((entry) => Number(entry))
      : Array.isArray(value)
        ? [...value]
        : null;
    invariant(Array.isArray(grid), `${label} must be a digit string or array`);
    invariant(grid.length === expectedLength, `${label} must contain ${expectedLength} cells`);
    invariant(grid.every((entry) => Number.isSafeInteger(entry)), `${label} must contain safe integers`);
    return grid;
  }

  function buildSudokuUnits() {
    const units = [];
    for (let row = 0; row < SUDOKU_SIZE; row += 1) {
      units.push({ kind: "row", index: row, label: `row ${row + 1}`, indexes: Array.from({ length: 9 }, (_, col) => row * 9 + col) });
    }
    for (let col = 0; col < SUDOKU_SIZE; col += 1) {
      units.push({ kind: "column", index: col, label: `column ${col + 1}`, indexes: Array.from({ length: 9 }, (_, row) => row * 9 + col) });
    }
    for (let boxRow = 0; boxRow < 3; boxRow += 1) {
      for (let boxCol = 0; boxCol < 3; boxCol += 1) {
        const indexes = [];
        for (let rowOffset = 0; rowOffset < 3; rowOffset += 1) {
          for (let colOffset = 0; colOffset < 3; colOffset += 1) {
            indexes.push((boxRow * 3 + rowOffset) * 9 + boxCol * 3 + colOffset);
          }
        }
        const index = boxRow * 3 + boxCol;
        units.push({ kind: "box", index, label: `box ${boxRow + 1},${boxCol + 1}`, indexes });
      }
    }
    return freezeGraph(units);
  }

  const SUDOKU_UNITS = buildSudokuUnits();
  const SUDOKU_ROWS = SUDOKU_UNITS.filter((unit) => unit.kind === "row");
  const SUDOKU_COLUMNS = SUDOKU_UNITS.filter((unit) => unit.kind === "column");
  const SUDOKU_BOXES = SUDOKU_UNITS.filter((unit) => unit.kind === "box");
  const SUDOKU_PEERS = freezeGraph(Array.from({ length: SUDOKU_CELLS }, (_, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    return uniqueSorted([
      ...SUDOKU_ROWS[row].indexes,
      ...SUDOKU_COLUMNS[col].indexes,
      ...SUDOKU_BOXES[box].indexes
    ].filter((peer) => peer !== index));
  }));

  function normalizeSuguruMeta(input) {
    invariant(input && typeof input === "object", "Suguru metadata is required");
    const size = Number(input.size);
    invariant(Number.isSafeInteger(size) && size >= 2 && size <= 9, "Suguru size must be within 2..9");
    const total = size * size;
    invariant(Array.isArray(input.cages) && input.cages.length > 0, "Suguru cages are required");
    const cages = input.cages.map((cage, cageIndex) => {
      invariant(Array.isArray(cage) && cage.length >= 1 && cage.length <= 9, `Suguru cage ${cageIndex} has invalid size`);
      const normalized = cage.map(Number);
      invariant(normalized.every((index) => Number.isSafeInteger(index) && index >= 0 && index < total), `Suguru cage ${cageIndex} has invalid cells`);
      invariant(new Set(normalized).size === normalized.length, `Suguru cage ${cageIndex} repeats a cell`);
      return uniqueSorted(normalized);
    });
    const cageMap = Array(total).fill(-1);
    cages.forEach((cage, cageIndex) => {
      cage.forEach((cellIndex) => {
        invariant(cageMap[cellIndex] === -1, `Suguru cell ${cellIndex} appears in multiple cages`);
        cageMap[cellIndex] = cageIndex;
      });
    });
    invariant(cageMap.every((entry) => entry >= 0), "Suguru cages must cover every cell");
    if (Array.isArray(input.cageMap)) {
      invariant(input.cageMap.length === total, "Suguru cage map has invalid length");
      invariant(input.cageMap.every((entry, index) => Number(entry) === cageMap[index]), "Suguru cage map disagrees with cages");
    }
    return freezeGraph({
      size,
      total,
      maxValue: Math.max(...cages.map((cage) => cage.length)),
      cages,
      cageMap
    });
  }

  function sudokuDirectMask(board, index) {
    if (board[index] !== 0) {
      return 0;
    }
    let mask = SUDOKU_MASK;
    SUDOKU_PEERS[index].forEach((peerIndex) => {
      const value = board[peerIndex];
      if (value) {
        mask &= ~bitFor(value);
      }
    });
    return mask & SUDOKU_MASK;
  }

  function areTouching(leftIndex, rightIndex, meta) {
    const leftRow = Math.floor(leftIndex / meta.size);
    const leftCol = leftIndex % meta.size;
    const rightRow = Math.floor(rightIndex / meta.size);
    const rightCol = rightIndex % meta.size;
    return leftIndex !== rightIndex
      && Math.abs(leftRow - rightRow) <= 1
      && Math.abs(leftCol - rightCol) <= 1;
  }

  function getSuguruTouching(index, meta) {
    const indexes = [];
    for (let other = 0; other < meta.total; other += 1) {
      if (areTouching(index, other, meta)) {
        indexes.push(other);
      }
    }
    return indexes;
  }

  function getSuguruPeers(index, meta) {
    return uniqueSorted([
      ...getSuguruTouching(index, meta),
      ...meta.cages[meta.cageMap[index]].filter((peer) => peer !== index)
    ]);
  }

  function suguruDirectMask(board, index, meta) {
    if (board[index] !== 0) {
      return 0;
    }
    const cage = meta.cages[meta.cageMap[index]];
    let mask = (1 << cage.length) - 1;
    getSuguruPeers(index, meta).forEach((peerIndex) => {
      const value = board[peerIndex];
      if (value) {
        mask &= ~bitFor(value);
      }
    });
    return mask & ((1 << cage.length) - 1);
  }

  function buildDirectCandidates(game, board, meta) {
    return board.map((value, index) => value !== 0
      ? 0
      : game === "sudoku"
        ? sudokuDirectMask(board, index)
        : suguruDirectMask(board, index, meta));
  }

  function findDuplicate(game, board, meta) {
    const groups = game === "sudoku" ? SUDOKU_UNITS.map((unit) => unit.indexes) : meta.cages;
    for (const indexes of groups) {
      const seen = new Map();
      for (const index of indexes) {
        const value = board[index];
        if (!value) {
          continue;
        }
        if (seen.has(value)) {
          return { type: "duplicate", indexes: uniqueSorted([seen.get(value), index]), value };
        }
        seen.set(value, index);
      }
    }
    if (game === "suguru") {
      for (let index = 0; index < board.length; index += 1) {
        if (!board[index]) {
          continue;
        }
        for (const otherIndex of getSuguruTouching(index, meta)) {
          if (otherIndex > index && board[otherIndex] === board[index]) {
            return { type: "duplicate", indexes: [index, otherIndex], value: board[index] };
          }
        }
      }
    }
    return null;
  }

  function findMissingSupport(game, board, candidates, meta) {
    const units = game === "sudoku"
      ? SUDOKU_UNITS.map((unit) => ({ label: unit.label, indexes: unit.indexes, maxValue: 9 }))
      : meta.cages.map((indexes, cageIndex) => ({ label: `cage ${cageIndex + 1}`, indexes, maxValue: indexes.length }));
    for (const unit of units) {
      const placed = new Set(unit.indexes.map((index) => board[index]).filter(Boolean));
      for (let value = 1; value <= unit.maxValue; value += 1) {
        if (placed.has(value)) {
          continue;
        }
        const supported = unit.indexes.some((index) => board[index] === 0 && (candidates[index] & bitFor(value)));
        if (!supported) {
          return { type: "missing-support", indexes: [...unit.indexes], value, label: unit.label };
        }
      }
    }
    return null;
  }

  function findContradiction({ game, board, puzzle, solution, meta, candidates }) {
    for (let index = 0; index < board.length; index += 1) {
      if (puzzle[index] !== 0 && board[index] !== puzzle[index]) {
        return { type: "given-mismatch", indexes: [index], expected: puzzle[index] };
      }
    }
    const duplicate = findDuplicate(game, board, meta);
    if (duplicate) {
      return duplicate;
    }
    if (solution) {
      for (let index = 0; index < board.length; index += 1) {
        if (board[index] !== 0 && board[index] !== solution[index]) {
          return { type: "wrong-entry", indexes: [index], expected: solution[index], actual: board[index] };
        }
      }
    }
    const direct = buildDirectCandidates(game, board, meta);
    for (let index = 0; index < board.length; index += 1) {
      if (board[index] !== 0) {
        if (candidates[index] !== 0) {
          return { type: "filled-candidates", indexes: [index] };
        }
        continue;
      }
      if ((candidates[index] & ~direct[index]) !== 0) {
        return { type: "illegal-candidate", indexes: [index] };
      }
      if (candidates[index] === 0) {
        return { type: "dead-cell", indexes: [index] };
      }
      if (solution && !(candidates[index] & bitFor(solution[index]))) {
        return { type: "solution-eliminated", indexes: [index], expected: solution[index] };
      }
    }
    return findMissingSupport(game, board, candidates, meta);
  }

  function issueState({ game, board, puzzle, solution, meta, candidates, appliedKeys }) {
    const contradiction = findContradiction({ game, board, puzzle, solution, meta, candidates });
    const state = {
      profileVersion: PROFILE_VERSION,
      game,
      board: [...board],
      puzzle: [...puzzle],
      solution: solution ? [...solution] : null,
      meta,
      candidates: [...candidates],
      appliedKeys: [...appliedKeys],
      contradiction: contradiction ? { ...contradiction, indexes: [...contradiction.indexes] } : null
    };
    freezeGraph(state);
    issuedStates.add(state);
    return state;
  }

  function createState({ game, board, puzzle = null, solution = null, meta = null }) {
    invariant(game === "sudoku" || game === "suguru", "LogicCoach game must be sudoku or suguru");
    const normalizedMeta = game === "suguru" ? normalizeSuguruMeta(meta) : null;
    const expectedLength = game === "sudoku" ? SUDOKU_CELLS : normalizedMeta.total;
    const normalizedBoard = normalizeGrid(board, expectedLength, "board");
    const normalizedPuzzle = puzzle === null
      ? Array(expectedLength).fill(0)
      : normalizeGrid(puzzle, expectedLength, "puzzle");
    const normalizedSolution = solution === null
      ? null
      : normalizeGrid(solution, expectedLength, "solution");
    normalizedBoard.forEach((value, index) => {
      const maxValue = game === "sudoku" ? 9 : normalizedMeta.cages[normalizedMeta.cageMap[index]].length;
      invariant(value >= 0 && value <= maxValue, `board value out of range at ${index}`);
      invariant(normalizedPuzzle[index] >= 0 && normalizedPuzzle[index] <= maxValue, `puzzle value out of range at ${index}`);
      if (normalizedSolution) {
        invariant(normalizedSolution[index] >= 1 && normalizedSolution[index] <= maxValue, `solution value out of range at ${index}`);
      }
    });
    const candidates = buildDirectCandidates(game, normalizedBoard, normalizedMeta);
    return issueState({
      game,
      board: normalizedBoard,
      puzzle: normalizedPuzzle,
      solution: normalizedSolution,
      meta: normalizedMeta,
      candidates,
      appliedKeys: []
    });
  }

  function requireIssuedState(state) {
    invariant(state && typeof state === "object" && issuedStates.has(state), "LogicCoach state was not issued by createState/applyStep");
    invariant(Object.isFrozen(state), "LogicCoach state must remain frozen");
  }

  function normalizeEliminations(entries) {
    return entries
      .map((entry) => ({ index: entry.index, values: uniqueSorted(entry.values) }))
      .filter((entry) => entry.values.length)
      .sort((left, right) => left.index - right.index || left.values.join(",").localeCompare(right.values.join(",")));
  }

  function createRawStep(state, spec) {
    const meta = TECHNIQUE_META[spec.technique];
    invariant(meta, `Unknown technique ${spec.technique}`);
    const placements = (spec.placements || []).map((entry) => ({ index: entry.index, value: entry.value })).sort((left, right) => left.index - right.index);
    const eliminations = normalizeEliminations(spec.eliminations || []);
    const sourceIndexes = uniqueSorted(spec.sourceIndexes || []);
    const focusIndexes = uniqueSorted(spec.focusIndexes || []);
    const targetIndexes = uniqueSorted(spec.targetIndexes || [
      ...placements.map((entry) => entry.index),
      ...eliminations.map((entry) => entry.index)
    ]);
    const values = uniqueSorted(spec.values || [
      ...placements.map((entry) => entry.value),
      ...eliminations.flatMap((entry) => entry.values)
    ]);
    const keyPayload = {
      game: state.game,
      technique: spec.technique,
      kind: spec.kind,
      values,
      sourceIndexes,
      targetIndexes,
      placements,
      eliminations
    };
    return {
      profileVersion: PROFILE_VERSION,
      game: state.game,
      technique: spec.technique,
      techniqueRank: meta.rank,
      band: meta.band,
      kind: spec.kind,
      values,
      sourceIndexes,
      focusIndexes,
      targetIndexes,
      placements,
      eliminations,
      context: spec.context ? { ...spec.context } : null,
      canonicalKey: JSON.stringify(keyPayload)
    };
  }

  function finalizeSteps(state, rawSteps) {
    const byKey = new Map();
    rawSteps.forEach((step) => {
      if (!byKey.has(step.canonicalKey)) {
        byKey.set(step.canonicalKey, step);
      }
    });
    const steps = [...byKey.values()]
      .sort((left, right) => left.canonicalKey.localeCompare(right.canonicalKey))
      .map((step) => {
        freezeGraph(step);
        issuedStepStates.set(step, state);
        return step;
      });
    return Object.freeze(steps);
  }

  function missingValues(board, indexes, maxValue) {
    const placed = new Set(indexes.map((index) => board[index]).filter(Boolean));
    return Array.from({ length: maxValue }, (_, index) => index + 1).filter((value) => !placed.has(value));
  }

  function findSudokuFullHouses(state) {
    const steps = [];
    SUDOKU_UNITS.forEach((unit) => {
      const empty = unit.indexes.filter((index) => state.board[index] === 0);
      if (empty.length !== 1) {
        return;
      }
      const values = missingValues(state.board, unit.indexes, 9);
      if (values.length === 1 && (state.candidates[empty[0]] & bitFor(values[0]))) {
        steps.push(createRawStep(state, {
          technique: "full-house",
          kind: "placement",
          values,
          sourceIndexes: unit.indexes.filter((index) => state.board[index] !== 0),
          focusIndexes: unit.indexes,
          placements: [{ index: empty[0], value: values[0] }],
          context: { unitKind: unit.kind, unitIndex: unit.index, label: unit.label }
        }));
      }
    });
    return steps;
  }

  function findSudokuNakedSingles(state) {
    const steps = [];
    state.board.forEach((value, index) => {
      if (value === 0 && countBits(state.candidates[index]) === 1) {
        const candidate = valuesFromMask(state.candidates[index])[0];
        steps.push(createRawStep(state, {
          technique: "naked-single",
          kind: "placement",
          values: [candidate],
          sourceIndexes: SUDOKU_PEERS[index].filter((peer) => state.board[peer] !== 0),
          focusIndexes: [index, ...SUDOKU_PEERS[index]],
          placements: [{ index, value: candidate }],
          context: { row: Math.floor(index / 9), col: index % 9 }
        }));
      }
    });
    return steps;
  }

  function findSudokuHiddenSingles(state) {
    const steps = [];
    SUDOKU_UNITS.forEach((unit) => {
      missingValues(state.board, unit.indexes, 9).forEach((value) => {
        const positions = unit.indexes.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
        if (positions.length === 1) {
          steps.push(createRawStep(state, {
            technique: "hidden-single",
            kind: "placement",
            values: [value],
            sourceIndexes: unit.indexes.filter((index) => index !== positions[0]),
            focusIndexes: unit.indexes,
            placements: [{ index: positions[0], value }],
            context: { unitKind: unit.kind, unitIndex: unit.index, label: unit.label }
          }));
        }
      });
    });
    return steps;
  }

  function findSudokuPointing(state) {
    const steps = [];
    SUDOKU_BOXES.forEach((box) => {
      missingValues(state.board, box.indexes, 9).forEach((value) => {
        const positions = box.indexes.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
        if (positions.length < 2 || positions.length > 3) {
          return;
        }
        const rows = uniqueSorted(positions.map((index) => Math.floor(index / 9)));
        const cols = uniqueSorted(positions.map((index) => index % 9));
        if (rows.length === 1) {
          const targets = SUDOKU_ROWS[rows[0]].indexes.filter((index) => !box.indexes.includes(index) && state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
          if (targets.length) {
            steps.push(createRawStep(state, { technique: "pointing", kind: "elimination", values: [value], sourceIndexes: positions, focusIndexes: uniqueSorted([...box.indexes, ...SUDOKU_ROWS[rows[0]].indexes]), eliminations: targets.map((index) => ({ index, values: [value] })), context: { unitKind: "row", unitIndex: rows[0], boxIndex: box.index } }));
          }
        }
        if (cols.length === 1) {
          const targets = SUDOKU_COLUMNS[cols[0]].indexes.filter((index) => !box.indexes.includes(index) && state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
          if (targets.length) {
            steps.push(createRawStep(state, { technique: "pointing", kind: "elimination", values: [value], sourceIndexes: positions, focusIndexes: uniqueSorted([...box.indexes, ...SUDOKU_COLUMNS[cols[0]].indexes]), eliminations: targets.map((index) => ({ index, values: [value] })), context: { unitKind: "column", unitIndex: cols[0], boxIndex: box.index } }));
          }
        }
      });
    });
    return steps;
  }

  function findSudokuClaiming(state) {
    const steps = [];
    [...SUDOKU_ROWS, ...SUDOKU_COLUMNS].forEach((unit) => {
      missingValues(state.board, unit.indexes, 9).forEach((value) => {
        const positions = unit.indexes.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
        if (positions.length < 2 || positions.length > 3) {
          return;
        }
        const boxes = uniqueSorted(positions.map((index) => Math.floor(Math.floor(index / 9) / 3) * 3 + Math.floor((index % 9) / 3)));
        if (boxes.length !== 1) {
          return;
        }
        const box = SUDOKU_BOXES[boxes[0]];
        const targets = box.indexes.filter((index) => !unit.indexes.includes(index) && state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
        if (targets.length) {
          steps.push(createRawStep(state, { technique: "claiming", kind: "elimination", values: [value], sourceIndexes: positions, focusIndexes: uniqueSorted([...unit.indexes, ...box.indexes]), eliminations: targets.map((index) => ({ index, values: [value] })), context: { unitKind: unit.kind, unitIndex: unit.index, boxIndex: box.index } }));
        }
      });
    });
    return steps;
  }

  function findNakedPairs(state, units, technique) {
    const steps = [];
    units.forEach((unit) => {
      const groups = new Map();
      unit.indexes.forEach((index) => {
        const mask = state.candidates[index];
        if (state.board[index] !== 0 || countBits(mask) !== 2) {
          return;
        }
        const positions = groups.get(mask) || [];
        positions.push(index);
        groups.set(mask, positions);
      });
      groups.forEach((positions, mask) => {
        if (positions.length !== 2) {
          return;
        }
        const eliminations = unit.indexes
          .filter((index) => state.board[index] === 0 && !positions.includes(index) && (state.candidates[index] & mask))
          .map((index) => ({ index, values: valuesFromMask(state.candidates[index] & mask) }));
        if (eliminations.length) {
          steps.push(createRawStep(state, {
            technique,
            kind: "elimination",
            values: valuesFromMask(mask),
            sourceIndexes: positions,
            focusIndexes: unit.indexes,
            eliminations,
            context: { unitKind: unit.kind || "cage", unitIndex: unit.index, label: unit.label }
          }));
        }
      });
    });
    return steps;
  }

  function suguruUnits(state) {
    return state.meta.cages.map((indexes, index) => ({ kind: "cage", index, label: `cage ${index + 1}`, indexes }));
  }

  function findSuguruFullHouses(state) {
    const steps = [];
    suguruUnits(state).forEach((unit) => {
      const empty = unit.indexes.filter((index) => state.board[index] === 0);
      if (empty.length !== 1) {
        return;
      }
      const values = missingValues(state.board, unit.indexes, unit.indexes.length);
      if (values.length === 1 && (state.candidates[empty[0]] & bitFor(values[0]))) {
        steps.push(createRawStep(state, { technique: "cage-full-house", kind: "placement", values, sourceIndexes: unit.indexes.filter((index) => state.board[index] !== 0), focusIndexes: unit.indexes, placements: [{ index: empty[0], value: values[0] }], context: { cageIndex: unit.index } }));
      }
    });
    return steps;
  }

  function findSuguruCellSingles(state) {
    const steps = [];
    state.board.forEach((value, index) => {
      if (value === 0 && countBits(state.candidates[index]) === 1) {
        const candidate = valuesFromMask(state.candidates[index])[0];
        steps.push(createRawStep(state, { technique: "cell-single", kind: "placement", values: [candidate], sourceIndexes: getSuguruPeers(index, state.meta).filter((peer) => state.board[peer] !== 0), focusIndexes: [index, ...getSuguruPeers(index, state.meta)], placements: [{ index, value: candidate }], context: { cageIndex: state.meta.cageMap[index] } }));
      }
    });
    return steps;
  }

  function findSuguruHiddenSingles(state) {
    const steps = [];
    suguruUnits(state).forEach((unit) => {
      missingValues(state.board, unit.indexes, unit.indexes.length).forEach((value) => {
        const positions = unit.indexes.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
        if (positions.length === 1) {
          steps.push(createRawStep(state, { technique: "cage-hidden-single", kind: "placement", values: [value], sourceIndexes: unit.indexes.filter((index) => index !== positions[0]), focusIndexes: unit.indexes, placements: [{ index: positions[0], value }], context: { cageIndex: unit.index } }));
        }
      });
    });
    return steps;
  }

  function findSuguruCrossCage(state) {
    const steps = [];
    suguruUnits(state).forEach((unit) => {
      missingValues(state.board, unit.indexes, unit.indexes.length).forEach((value) => {
        const supports = unit.indexes.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
        if (!supports.length) {
          return;
        }
        const targets = state.board
          .map((entry, index) => ({ entry, index }))
          .filter(({ entry, index }) => entry === 0
            && !unit.indexes.includes(index)
            && (state.candidates[index] & bitFor(value))
            && supports.every((support) => areTouching(support, index, state.meta)))
          .map(({ index }) => index);
        if (targets.length) {
          steps.push(createRawStep(state, { technique: "cross-cage", kind: "elimination", values: [value], sourceIndexes: supports, focusIndexes: uniqueSorted([...unit.indexes, ...targets]), eliminations: targets.map((index) => ({ index, values: [value] })), context: { cageIndex: unit.index } }));
        }
      });
    });
    return steps;
  }

  const SUDOKU_DETECTORS = [
    findSudokuFullHouses,
    findSudokuNakedSingles,
    findSudokuHiddenSingles,
    findSudokuPointing,
    findSudokuClaiming,
    (state) => findNakedPairs(state, SUDOKU_UNITS, "naked-pair")
  ];
  const SUGURU_DETECTORS = [
    findSuguruFullHouses,
    findSuguruCellSingles,
    findSuguruHiddenSingles,
    findSuguruCrossCage,
    (state) => findNakedPairs(state, suguruUnits(state), "cage-naked-pair")
  ];

  function getNextSteps(state) {
    requireIssuedState(state);
    if (state.contradiction || state.board.every(Boolean)) {
      return Object.freeze([]);
    }
    const detectors = state.game === "sudoku" ? SUDOKU_DETECTORS : SUGURU_DETECTORS;
    for (const detector of detectors) {
      const rawSteps = detector(state);
      if (rawSteps.length) {
        return finalizeSteps(state, rawSteps);
      }
    }
    return Object.freeze([]);
  }

  function getNextStep(state) {
    return getNextSteps(state)[0] || null;
  }

  function sameNumbers(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function sameEliminations(left, right) {
    return JSON.stringify(normalizeEliminations(left)) === JSON.stringify(normalizeEliminations(right));
  }

  function validateStepEnvelope(state, step) {
    const meta = TECHNIQUE_META[step.technique];
    invariant(meta && step.game === state.game, "LogicCoach step has invalid technique metadata");
    invariant(step.profileVersion === PROFILE_VERSION && step.techniqueRank === meta.rank && step.band === meta.band, "LogicCoach step version/rank/band mismatch");
    invariant(step.kind === "placement" || step.kind === "elimination", "LogicCoach step has invalid kind");
    const maxIndex = state.board.length - 1;
    [step.sourceIndexes, step.focusIndexes, step.targetIndexes].forEach((indexes) => {
      invariant(Array.isArray(indexes) && indexes.every((index) => Number.isSafeInteger(index) && index >= 0 && index <= maxIndex), "LogicCoach step has invalid indexes");
      invariant(sameNumbers(indexes, uniqueSorted(indexes)), "LogicCoach step indexes must be unique and sorted");
    });
    invariant(Array.isArray(step.values) && step.values.every((value) => Number.isSafeInteger(value) && value >= 1 && value <= 9), "LogicCoach step has invalid values");
    invariant(sameNumbers(step.values, uniqueSorted(step.values)), "LogicCoach step values must be unique and sorted");
    invariant(Array.isArray(step.placements) && Array.isArray(step.eliminations), "LogicCoach step actions are required");
    const normalizedEliminations = normalizeEliminations(step.eliminations);
    invariant(sameEliminations(step.eliminations, normalizedEliminations), "LogicCoach eliminations must be normalized");
    const actionTargets = uniqueSorted([
      ...step.placements.map((entry) => entry.index),
      ...step.eliminations.map((entry) => entry.index)
    ]);
    const actionValues = uniqueSorted([
      ...step.placements.map((entry) => entry.value),
      ...step.eliminations.flatMap((entry) => entry.values)
    ]);
    invariant(sameNumbers(step.targetIndexes, actionTargets), "LogicCoach target indexes must match actions");
    invariant(sameNumbers(step.values, actionValues), "LogicCoach values must match actions");
    const keyPayload = {
      game: step.game,
      technique: step.technique,
      kind: step.kind,
      values: step.values,
      sourceIndexes: step.sourceIndexes,
      targetIndexes: step.targetIndexes,
      placements: step.placements,
      eliminations: step.eliminations
    };
    invariant(step.canonicalKey === JSON.stringify(keyPayload), "LogicCoach canonical key mismatch");
    if (step.kind === "placement") {
      invariant(step.placements.length === 1 && step.eliminations.length === 0, "Placement proof must have one action");
      const placement = step.placements[0];
      invariant(Number.isSafeInteger(placement.index) && placement.index >= 0 && placement.index <= maxIndex, "Placement proof has invalid target");
      invariant(Number.isSafeInteger(placement.value) && state.candidates[placement.index] & bitFor(placement.value), "Placement proof value is not a candidate");
      invariant(state.board[placement.index] === 0, "Placement proof target must be empty");
      if (state.solution) invariant(state.solution[placement.index] === placement.value, "Placement proof disagrees with validated solution");
    } else {
      invariant(step.placements.length === 0 && step.eliminations.length > 0, "Elimination proof must remove candidates");
      step.eliminations.forEach((entry) => {
        invariant(Number.isSafeInteger(entry.index) && entry.index >= 0 && entry.index <= maxIndex && state.board[entry.index] === 0, "Elimination proof has invalid target");
        entry.values.forEach((value) => {
          invariant(state.candidates[entry.index] & bitFor(value), "Elimination proof must remove an existing candidate");
          if (state.solution) invariant(state.solution[entry.index] !== value, "Elimination proof removes validated solution value");
        });
      });
    }
  }

  function sudokuContextUnit(step) {
    if (step.context?.unitKind === "row") return SUDOKU_ROWS[step.context.unitIndex];
    if (step.context?.unitKind === "column") return SUDOKU_COLUMNS[step.context.unitIndex];
    if (step.context?.unitKind === "box") return SUDOKU_BOXES[step.context.unitIndex];
    return null;
  }

  function validateSudokuStep(state, step) {
    const value = step.values[0];
    const placement = step.placements[0] || null;
    if (step.technique === "full-house") {
      const unit = sudokuContextUnit(step);
      invariant(unit, "Full-house proof requires a valid unit");
      const empty = unit.indexes.filter((index) => state.board[index] === 0);
      const values = missingValues(state.board, unit.indexes, 9);
      invariant(empty.length === 1 && values.length === 1 && placement.index === empty[0] && placement.value === values[0], "Invalid full-house proof");
      return;
    }
    if (step.technique === "naked-single") {
      invariant(countBits(state.candidates[placement.index]) === 1 && valuesFromMask(state.candidates[placement.index])[0] === placement.value, "Invalid naked-single proof");
      return;
    }
    if (step.technique === "hidden-single") {
      const unit = sudokuContextUnit(step);
      invariant(unit, "Hidden-single proof requires a valid unit");
      const supports = unit.indexes.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
      invariant(supports.length === 1 && supports[0] === placement.index, "Invalid hidden-single proof");
      return;
    }
    if (step.technique === "pointing") {
      const box = SUDOKU_BOXES[step.context?.boxIndex];
      const line = sudokuContextUnit(step);
      invariant(box && line && ["row", "column"].includes(step.context.unitKind), "Pointing proof requires a box and line");
      const supports = box.indexes.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
      invariant(supports.length >= 2 && supports.length <= 3 && sameNumbers(supports, step.sourceIndexes), "Pointing proof has invalid supports");
      invariant(supports.every((index) => line.indexes.includes(index)), "Pointing supports must share the line");
      const targets = line.indexes.filter((index) => !box.indexes.includes(index) && state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
      invariant(sameEliminations(step.eliminations, targets.map((index) => ({ index, values: [value] }))), "Pointing proof has invalid eliminations");
      return;
    }
    if (step.technique === "claiming") {
      const line = sudokuContextUnit(step);
      const box = SUDOKU_BOXES[step.context?.boxIndex];
      invariant(line && box && ["row", "column"].includes(step.context.unitKind), "Claiming proof requires a line and box");
      const supports = line.indexes.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
      invariant(supports.length >= 2 && supports.length <= 3 && sameNumbers(supports, step.sourceIndexes), "Claiming proof has invalid supports");
      invariant(supports.every((index) => box.indexes.includes(index)), "Claiming supports must share the box");
      const targets = box.indexes.filter((index) => !line.indexes.includes(index) && state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
      invariant(sameEliminations(step.eliminations, targets.map((index) => ({ index, values: [value] }))), "Claiming proof has invalid eliminations");
      return;
    }
    invariant(step.technique === "naked-pair", `Unexpected Sudoku technique ${step.technique}`);
    const unit = sudokuContextUnit(step);
    invariant(unit && step.sourceIndexes.length === 2, "Naked-pair proof requires one unit and two sources");
    const pairMask = state.candidates[step.sourceIndexes[0]];
    invariant(countBits(pairMask) === 2 && state.candidates[step.sourceIndexes[1]] === pairMask, "Naked-pair sources must share two candidates");
    invariant(sameNumbers(step.values, [...valuesFromMask(pairMask)]), "Naked-pair values mismatch");
    const eliminations = unit.indexes
      .filter((index) => state.board[index] === 0 && !step.sourceIndexes.includes(index) && (state.candidates[index] & pairMask))
      .map((index) => ({ index, values: [...valuesFromMask(state.candidates[index] & pairMask)] }));
    invariant(sameEliminations(step.eliminations, eliminations), "Naked-pair proof has invalid eliminations");
  }

  function validateSuguruStep(state, step) {
    const value = step.values[0];
    const placement = step.placements[0] || null;
    const cageIndex = Number.isSafeInteger(step.context?.cageIndex) ? step.context.cageIndex : step.context?.unitIndex;
    const cage = state.meta.cages[cageIndex];
    invariant(cage, "Suguru proof requires a valid cage");
    if (step.technique === "cage-full-house") {
      const empty = cage.filter((index) => state.board[index] === 0);
      const values = missingValues(state.board, cage, cage.length);
      invariant(empty.length === 1 && values.length === 1 && placement.index === empty[0] && placement.value === values[0], "Invalid cage-full-house proof");
      return;
    }
    if (step.technique === "cell-single") {
      invariant(countBits(state.candidates[placement.index]) === 1 && valuesFromMask(state.candidates[placement.index])[0] === placement.value, "Invalid Suguru cell-single proof");
      return;
    }
    if (step.technique === "cage-hidden-single") {
      const supports = cage.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
      invariant(supports.length === 1 && supports[0] === placement.index, "Invalid cage-hidden-single proof");
      return;
    }
    if (step.technique === "cross-cage") {
      const supports = cage.filter((index) => state.board[index] === 0 && (state.candidates[index] & bitFor(value)));
      invariant(supports.length > 0 && sameNumbers(supports, step.sourceIndexes), "Cross-cage proof has invalid supports");
      const targets = state.board
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry, index }) => entry === 0 && !cage.includes(index) && (state.candidates[index] & bitFor(value)) && supports.every((support) => areTouching(support, index, state.meta)))
        .map(({ index }) => index);
      invariant(sameEliminations(step.eliminations, targets.map((index) => ({ index, values: [value] }))), "Cross-cage proof has invalid eliminations");
      return;
    }
    invariant(step.technique === "cage-naked-pair" && step.sourceIndexes.length === 2, `Unexpected Suguru technique ${step.technique}`);
    const pairMask = state.candidates[step.sourceIndexes[0]];
    invariant(countBits(pairMask) === 2 && state.candidates[step.sourceIndexes[1]] === pairMask, "Cage-pair sources must share two candidates");
    invariant(sameNumbers(step.values, [...valuesFromMask(pairMask)]), "Cage-pair values mismatch");
    const eliminations = cage
      .filter((index) => state.board[index] === 0 && !step.sourceIndexes.includes(index) && (state.candidates[index] & pairMask))
      .map((index) => ({ index, values: [...valuesFromMask(state.candidates[index] & pairMask)] }));
    invariant(sameEliminations(step.eliminations, eliminations), "Cage-pair proof has invalid eliminations");
  }

  function validateStepProof(state, step) {
    validateStepEnvelope(state, step);
    if (state.game === "sudoku") validateSudokuStep(state, step);
    else validateSuguruStep(state, step);
  }

  function measureState(board, candidates) {
    return [
      board.filter((value) => value === 0).length,
      candidates.reduce((total, mask) => total + countBits(mask), 0)
    ];
  }

  function applyStep(state, step) {
    requireIssuedState(state);
    invariant(step && issuedStepStates.get(step) === state, "LogicCoach step does not belong to this state");
    invariant(!state.appliedKeys.includes(step.canonicalKey), "LogicCoach step was already applied");
    validateStepProof(state, step);
    const board = [...state.board];
    const candidates = [...state.candidates];
    const before = measureState(board, candidates);

    if (step.kind === "placement") {
      invariant(step.placements.length === 1 && step.eliminations.length === 0, "Placement step must contain exactly one placement");
      const placement = step.placements[0];
      invariant(board[placement.index] === 0, "Placement target must be empty");
      invariant(candidates[placement.index] & bitFor(placement.value), "Placement value must be a current candidate");
      board[placement.index] = placement.value;
      const direct = buildDirectCandidates(state.game, board, state.meta);
      for (let index = 0; index < board.length; index += 1) {
        candidates[index] = board[index] === 0 ? candidates[index] & direct[index] : 0;
      }
    } else {
      invariant(step.kind === "elimination" && step.eliminations.length > 0 && step.placements.length === 0, "Elimination step must contain candidate removals");
      step.eliminations.forEach((entry) => {
        invariant(board[entry.index] === 0, "Elimination target must be empty");
        entry.values.forEach((value) => {
          const bit = bitFor(value);
          invariant(candidates[entry.index] & bit, "Elimination must remove an existing candidate");
          candidates[entry.index] &= ~bit;
        });
      });
    }

    const after = measureState(board, candidates);
    invariant(after[0] < before[0] || (after[0] === before[0] && after[1] < before[1]), "LogicCoach step must make strict progress");
    const next = issueState({
      game: state.game,
      board,
      puzzle: state.puzzle,
      solution: state.solution,
      meta: state.meta,
      candidates,
      appliedKeys: [...state.appliedKeys, step.canonicalKey]
    });
    return next;
  }

  function serializeStep(step) {
    return freezeGraph({
      game: step.game,
      technique: step.technique,
      techniqueRank: step.techniqueRank,
      band: step.band,
      kind: step.kind,
      values: [...step.values],
      sourceIndexes: [...step.sourceIndexes],
      focusIndexes: [...step.focusIndexes],
      targetIndexes: [...step.targetIndexes],
      placements: step.placements.map((entry) => ({ ...entry })),
      eliminations: step.eliminations.map((entry) => ({ index: entry.index, values: [...entry.values] })),
      context: step.context ? { ...step.context } : null,
      canonicalKey: step.canonicalKey
    });
  }

  function residualSearch(state, requestedLimit = SEARCH_NODE_CAP) {
    requireIssuedState(state);
    const nodeLimit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000000)
      : SEARCH_NODE_CAP;
    const board = [...state.board];
    const allowed = [...state.candidates];
    let nodes = 0;
    let backtracks = 0;
    let maxDepth = 0;
    let solutions = 0;
    let capped = false;

    function search(depth) {
      if (solutions >= 2 || capped) {
        return;
      }
      maxDepth = Math.max(maxDepth, depth);
      let bestIndex = -1;
      let bestMask = 0;
      let bestCount = Infinity;
      for (let index = 0; index < board.length; index += 1) {
        if (board[index] !== 0) {
          continue;
        }
        const direct = state.game === "sudoku"
          ? sudokuDirectMask(board, index)
          : suguruDirectMask(board, index, state.meta);
        const mask = direct & allowed[index];
        const count = countBits(mask);
        if (count === 0) {
          return;
        }
        if (count < bestCount) {
          bestIndex = index;
          bestMask = mask;
          bestCount = count;
        }
      }
      if (bestIndex === -1) {
        solutions += 1;
        return;
      }
      for (const value of valuesFromMask(bestMask)) {
        if (nodes >= nodeLimit) {
          capped = true;
          return;
        }
        const beforeSolutions = solutions;
        nodes += 1;
        board[bestIndex] = value;
        search(depth + 1);
        board[bestIndex] = 0;
        if (solutions === beforeSolutions) {
          backtracks += 1;
        }
        if (solutions >= 2 || capped) {
          return;
        }
      }
    }

    search(0);
    const status = solutions >= 2 ? "multiple" : capped ? "capped" : solutions === 1 ? "unique" : "none";
    return freezeGraph({ status, solutions: Math.min(solutions, 2), nodes, backtracks, maxDepth, nodeLimit });
  }

  function profile(options) {
    let state;
    try {
      state = createState(options);
    } catch (error) {
      return freezeGraph({
        profileVersion: PROFILE_VERSION,
        game: options?.game || null,
        status: "invalid",
        contradiction: { type: "invalid-input", message: error.message },
        hardestTechnique: null,
        hardestBand: null,
        logicalSteps: 0,
        placementSteps: 0,
        eliminationSteps: 0,
        explicitCandidateEliminations: 0,
        minAvailableSteps: 0,
        remainingCells: 0,
        trace: [],
        residualSearch: null
      });
    }
    if (state.contradiction) {
      return freezeGraph({
        profileVersion: PROFILE_VERSION,
        game: state.game,
        status: "invalid",
        contradiction: { ...state.contradiction, indexes: [...state.contradiction.indexes] },
        hardestTechnique: null,
        hardestBand: null,
        logicalSteps: 0,
        placementSteps: 0,
        eliminationSteps: 0,
        explicitCandidateEliminations: 0,
        minAvailableSteps: 0,
        remainingCells: state.board.filter((value) => value === 0).length,
        trace: [],
        residualSearch: null
      });
    }

    const trace = [];
    let minAvailableSteps = Infinity;
    let hardestStep = null;
    while (!state.board.every(Boolean) && trace.length < MAX_LOGIC_STEPS) {
      const steps = getNextSteps(state);
      if (!steps.length) {
        break;
      }
      minAvailableSteps = Math.min(minAvailableSteps, steps.length);
      const step = steps[0];
      if (!hardestStep
        || BAND_RANK[step.band] > BAND_RANK[hardestStep.band]
        || (BAND_RANK[step.band] === BAND_RANK[hardestStep.band] && step.techniqueRank > hardestStep.techniqueRank)) {
        hardestStep = step;
      }
      trace.push(serializeStep(step));
      state = applyStep(state, step);
    }

    const solved = state.board.every(Boolean);
    const status = solved ? "solved-logically" : state.contradiction ? "invalid" : "stalled";
    const residual = status === "stalled" ? residualSearch(state, options.nodeLimit) : null;
    return freezeGraph({
      profileVersion: PROFILE_VERSION,
      game: state.game,
      status,
      contradiction: state.contradiction ? { ...state.contradiction, indexes: [...state.contradiction.indexes] } : null,
      hardestTechnique: hardestStep?.technique || null,
      hardestBand: hardestStep?.band || null,
      logicalSteps: trace.length,
      placementSteps: trace.filter((step) => step.kind === "placement").length,
      eliminationSteps: trace.filter((step) => step.kind === "elimination").length,
      explicitCandidateEliminations: trace.reduce((total, step) => total + step.eliminations.reduce((sum, entry) => sum + entry.values.length, 0), 0),
      minAvailableSteps: minAvailableSteps === Infinity ? 0 : minAvailableSteps,
      remainingCells: state.board.filter((value) => value === 0).length,
      trace,
      residualSearch: residual
    });
  }

  function inspectState(state) {
    requireIssuedState(state);
    return freezeGraph({
      profileVersion: state.profileVersion,
      game: state.game,
      board: [...state.board],
      puzzle: [...state.puzzle],
      solution: state.solution ? [...state.solution] : null,
      meta: state.meta ? { size: state.meta.size, maxValue: state.meta.maxValue, cages: state.meta.cages.map((cage) => [...cage]), cageMap: [...state.meta.cageMap] } : null,
      candidates: state.candidates.map((mask) => ({ mask, values: [...valuesFromMask(mask)] })),
      appliedKeys: [...state.appliedKeys],
      contradiction: state.contradiction ? { ...state.contradiction, indexes: [...state.contradiction.indexes] } : null
    });
  }

  function getContradiction(state) {
    requireIssuedState(state);
    return state.contradiction;
  }

  window.LogicCoach = Object.freeze({
    PROFILE_VERSION,
    SEARCH_NODE_CAP,
    createState,
    getContradiction,
    getNextSteps,
    getNextStep,
    applyStep,
    inspectState,
    profile,
    residualSearch,
    valuesFromMask
  });
})();
