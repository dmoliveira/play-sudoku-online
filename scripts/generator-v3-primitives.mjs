export const PAYLOAD_SCHEMA_VERSION = 2;
export const GENERATOR_V2_VERSION = 2;
export const GENERATOR_V3_VERSION = 3;
export const RNG_VERSION = 1;
export const TRAVERSAL_VERSION = 1;

export const SEARCH_BUDGETS = deepFreeze({
  sudokuConstruction: { maxAttempts: 64, perSearchNodes: 250_000, aggregateNodes: 2_000_000 },
  sudokuCarving: { maxAttempts: 128, perSearchNodes: 2_000_000, aggregateNodes: 20_000_000, maxCalls: 10_368 },
  suguruTopology: { maxAttempts: 10_000 },
  suguruAssignment: { maxAttempts: 64, perSearchNodes: 250_000, aggregateNodes: 4_000_000 },
  suguruCarving: { maxAttempts: 20_000, perSearchNodes: 2_000_000, aggregateNodes: 20_000_000, maxCalls: 20_000 }
});

export const SUGURU_GEOMETRY_GATES = deepFreeze({
  minCageFillRatio: 0.4,
  maxCagePerimeter: 14,
  minPartitionPerimeter: 48,
  maxPartitionPerimeter: 72,
  forbidFullRowOrColumnSpan: true
});

export const SUDOKU_ORBIT_POLICIES = Object.freeze({
  NONE: "none",
  ROTATE_180: "rotate-180",
  MAIN_DIAGONAL: "main-diagonal",
  VERTICAL_REFLECTION: "vertical-reflection"
});

const SUDOKU_SIZE = 9;
const SUDOKU_CELLS = 81;
const SUDOKU_FULL_MASK = 0x1ff;
const UINT32_MAX = 0xffff_ffff;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function ensure(condition, message, ErrorType = Error) {
  if (!condition) throw new ErrorType(message);
}

function requirePositiveInteger(value, label) {
  ensure(Number.isSafeInteger(value) && value > 0, `${label} must be a positive safe integer`, RangeError);
  return value;
}

function requireCappedInteger(value, label, maximum) {
  requirePositiveInteger(value, label);
  ensure(value <= maximum, `${label} must not exceed the authoritative cap ${maximum}`, RangeError);
  return value;
}

function requireSeed(seed, label = "seed") {
  ensure(Number.isInteger(seed) && seed > 0 && seed <= UINT32_MAX, `${label} must be a nonzero uint32`, RangeError);
  return seed >>> 0;
}

function valuesFromMask(mask, maxValue = 9) {
  const values = [];
  for (let value = 1; value <= maxValue; value += 1) {
    if (mask & (1 << (value - 1))) values.push(value);
  }
  return values;
}

export function createXorshift32(seed) {
  let state = requireSeed(seed);
  return Object.freeze({
    nextUint32() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return state >>> 0;
    },
    nextFloat() {
      return this.nextUint32() / 4_294_967_296;
    }
  });
}

export function deriveSeed(seed, salt) {
  const base = requireSeed(seed);
  ensure(Number.isSafeInteger(salt) && salt >= 0, "salt must be a nonnegative safe integer", RangeError);
  let mixed = (base ^ Math.imul((salt + 1) >>> 0, 0x9e37_79b9)) >>> 0;
  mixed = (mixed ^ (mixed >>> 16)) >>> 0;
  mixed = Math.imul(mixed, 0x85eb_ca6b) >>> 0;
  mixed = (mixed ^ (mixed >>> 13)) >>> 0;
  mixed = Math.imul(mixed, 0xc2b2_ae35) >>> 0;
  mixed = (mixed ^ (mixed >>> 16)) >>> 0;
  return mixed || 0x6d2b_79f5;
}

export function shuffleDeterministically(values, random) {
  ensure(Array.isArray(values), "values must be an array", TypeError);
  ensure(random && typeof random.nextFloat === "function", "random must be a xorshift32 instance", TypeError);
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random.nextFloat() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function createSearchBudget(phase, overrides = {}) {
  const authority = SEARCH_BUDGETS[phase];
  ensure(authority?.perSearchNodes && authority?.aggregateNodes, `Unknown node-budget phase: ${phase}`, RangeError);
  ensure(overrides && typeof overrides === "object" && !Array.isArray(overrides), "budget overrides must be an object", TypeError);
  const perSearchNodes = overrides.perSearchNodes ?? authority.perSearchNodes;
  const aggregateNodes = overrides.aggregateNodes ?? authority.aggregateNodes;
  const authoritativeCalls = authority.maxCalls ?? authority.maxAttempts;
  const maxCalls = overrides.maxCalls ?? authoritativeCalls;
  requireCappedInteger(perSearchNodes, "perSearchNodes", authority.perSearchNodes);
  requireCappedInteger(aggregateNodes, "aggregateNodes", authority.aggregateNodes);
  requireCappedInteger(maxCalls, "maxCalls", authoritativeCalls);
  let calls = 0;
  let nodes = 0;
  return Object.freeze({
    run(search) {
      ensure(typeof search === "function", "search must be a function", TypeError);
      if (calls >= maxCalls || nodes >= aggregateNodes) {
        return { outcome: "cap-exceeded", solutions: 0, nodes: 0, budgetExhausted: true };
      }
      const nodeCap = Math.min(perSearchNodes, aggregateNodes - nodes);
      calls += 1;
      const result = search(nodeCap);
      ensure(result && typeof result === "object", "search must return a result object", TypeError);
      ensure(Number.isSafeInteger(result.nodes) && result.nodes >= 0 && result.nodes <= nodeCap, "search returned an invalid node count", RangeError);
      nodes += result.nodes;
      return result;
    },
    snapshot() {
      return Object.freeze({ calls, nodes, remainingNodes: aggregateNodes - nodes, remainingCalls: maxCalls - calls });
    }
  });
}

function normalizeSudokuBoard(input) {
  if (typeof input === "string") ensure(/^[0-9]{81}$/.test(input), "Sudoku string boards must contain exactly 81 ASCII digits", TypeError);
  const values = typeof input === "string" ? [...input].map(Number) : Array.isArray(input) ? [...input] : null;
  ensure(values && values.length === SUDOKU_CELLS, "Sudoku board must contain exactly 81 cells", TypeError);
  ensure(values.every((value) => Number.isInteger(value) && value >= 0 && value <= 9), "Sudoku cells must be integers from 0 through 9", TypeError);
  return values;
}

function sudokuCandidateMask(board, index) {
  if (board[index]) return 0;
  const row = Math.floor(index / SUDOKU_SIZE);
  const col = index % SUDOKU_SIZE;
  let mask = SUDOKU_FULL_MASK;
  for (let offset = 0; offset < SUDOKU_SIZE; offset += 1) {
    const rowValue = board[row * SUDOKU_SIZE + offset];
    const colValue = board[offset * SUDOKU_SIZE + col];
    if (rowValue) mask &= ~(1 << (rowValue - 1));
    if (colValue) mask &= ~(1 << (colValue - 1));
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let nextRow = boxRow; nextRow < boxRow + 3; nextRow += 1) {
    for (let nextCol = boxCol; nextCol < boxCol + 3; nextCol += 1) {
      const value = board[nextRow * SUDOKU_SIZE + nextCol];
      if (value) mask &= ~(1 << (value - 1));
    }
  }
  return mask;
}

function sudokuHasConflict(board) {
  for (let index = 0; index < SUDOKU_CELLS; index += 1) {
    const value = board[index];
    if (!value) continue;
    board[index] = 0;
    const allowed = sudokuCandidateMask(board, index) & (1 << (value - 1));
    board[index] = value;
    if (!allowed) return true;
  }
  return false;
}

function runBacktrackingSearch({ board, domainAt, nodeCap, solutionLimit, random, traceLimit = 0 }) {
  requirePositiveInteger(nodeCap, "nodeCap");
  requirePositiveInteger(solutionLimit, "solutionLimit");
  ensure(Number.isSafeInteger(traceLimit) && traceLimit >= 0, "traceLimit must be a nonnegative safe integer", RangeError);
  let nodes = 0;
  let solutions = 0;
  let capped = false;
  let firstSolution = null;
  const decisionTrace = [];

  function visit() {
    if (nodes >= nodeCap) {
      capped = true;
      return;
    }
    nodes += 1;
    let bestIndex = -1;
    let bestCandidates = null;
    for (let index = 0; index < board.length; index += 1) {
      if (board[index]) continue;
      const candidates = domainAt(index);
      if (!candidates.length) return;
      if (!bestCandidates || candidates.length < bestCandidates.length) {
        bestIndex = index;
        bestCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }
    if (bestIndex < 0) {
      solutions += 1;
      if (!firstSolution) firstSolution = [...board];
      return;
    }
    const candidates = random ? shuffleDeterministically(bestCandidates, random) : bestCandidates;
    if (decisionTrace.length < traceLimit) decisionTrace.push(Object.freeze({ index: bestIndex, candidates: Object.freeze([...candidates]) }));
    for (const value of candidates) {
      board[bestIndex] = value;
      visit();
      board[bestIndex] = 0;
      if (capped || solutions >= solutionLimit) return;
    }
  }

  visit();
  return { capped, solutions, nodes, firstSolution, decisionTrace: Object.freeze(decisionTrace) };
}

function countOutcome(result) {
  if (result.capped) return "cap-exceeded";
  if (result.solutions === 0) return "zero";
  if (result.solutions === 1) return "unique";
  return "multiple";
}

export function countSudokuSolutions(input, { seed = 1, nodeCap = SEARCH_BUDGETS.sudokuCarving.perSearchNodes, traceLimit = 0 } = {}) {
  const board = normalizeSudokuBoard(input);
  requireSeed(seed);
  requireCappedInteger(nodeCap, "nodeCap", SEARCH_BUDGETS.sudokuCarving.perSearchNodes);
  if (sudokuHasConflict(board)) return Object.freeze({ outcome: "zero", solutions: 0, nodes: 0, decisionTrace: Object.freeze([]) });
  const random = createXorshift32(seed);
  const result = runBacktrackingSearch({ board, nodeCap, solutionLimit: 2, random, traceLimit, domainAt: (index) => valuesFromMask(sudokuCandidateMask(board, index)) });
  return Object.freeze({ outcome: countOutcome(result), solutions: result.solutions, nodes: result.nodes, decisionTrace: result.decisionTrace });
}

export function constructSudoku({ seed, board: input = "0".repeat(SUDOKU_CELLS), nodeCap = SEARCH_BUDGETS.sudokuConstruction.perSearchNodes, traceLimit = 0 } = {}) {
  const board = normalizeSudokuBoard(input);
  const random = createXorshift32(seed);
  requireCappedInteger(nodeCap, "nodeCap", SEARCH_BUDGETS.sudokuConstruction.perSearchNodes);
  if (sudokuHasConflict(board)) return Object.freeze({ outcome: "unsolved", solution: null, nodes: 0, decisionTrace: Object.freeze([]) });
  const result = runBacktrackingSearch({ board, nodeCap, solutionLimit: 1, random, traceLimit, domainAt: (index) => valuesFromMask(sudokuCandidateMask(board, index)) });
  return Object.freeze({ outcome: result.capped ? "cap-exceeded" : result.firstSolution ? "solved" : "unsolved", solution: result.firstSolution ? result.firstSolution.join("") : null, nodes: result.nodes, decisionTrace: result.decisionTrace });
}

function sudokuOrbitTransform(policy, index) {
  const row = Math.floor(index / SUDOKU_SIZE);
  const col = index % SUDOKU_SIZE;
  if (policy === SUDOKU_ORBIT_POLICIES.NONE) return index;
  if (policy === SUDOKU_ORBIT_POLICIES.ROTATE_180) return SUDOKU_CELLS - 1 - index;
  if (policy === SUDOKU_ORBIT_POLICIES.MAIN_DIAGONAL) return col * SUDOKU_SIZE + row;
  if (policy === SUDOKU_ORBIT_POLICIES.VERTICAL_REFLECTION) return row * SUDOKU_SIZE + (SUDOKU_SIZE - 1 - col);
  throw new RangeError(`Unknown Sudoku orbit policy: ${policy}`);
}

export function buildSudokuOrbits(policy) {
  ensure(Object.values(SUDOKU_ORBIT_POLICIES).includes(policy), `Unknown Sudoku orbit policy: ${policy}`, RangeError);
  const visited = new Set();
  const orbits = [];
  for (let index = 0; index < SUDOKU_CELLS; index += 1) {
    if (visited.has(index)) continue;
    const orbit = [...new Set([index, sudokuOrbitTransform(policy, index)])].sort((left, right) => left - right);
    orbit.forEach((cell) => visited.add(cell));
    orbits.push(Object.freeze(orbit));
  }
  ensure(visited.size === SUDOKU_CELLS, `${policy} orbits must cover all 81 cells`);
  return Object.freeze(orbits);
}

function normalizeSuguruPartition({ size, cages }) {
  ensure(Number.isInteger(size) && size >= 2 && size <= 9, "Suguru size must be an integer from 2 through 9", RangeError);
  ensure(Array.isArray(cages) && cages.length > 0, "Suguru cages must be a nonempty array", TypeError);
  const cellCount = size * size;
  const cageMap = Array(cellCount).fill(-1);
  const normalizedCages = cages.map((cage, cageIndex) => {
    ensure(Array.isArray(cage) && cage.length >= 2 && cage.length <= 5, `Suguru cage ${cageIndex} must contain 2 through 5 cells`, RangeError);
    const normalized = [...cage].sort((left, right) => left - right);
    ensure(new Set(normalized).size === normalized.length, `Suguru cage ${cageIndex} repeats a cell`, RangeError);
    normalized.forEach((cell) => {
      ensure(Number.isInteger(cell) && cell >= 0 && cell < cellCount, `Suguru cage ${cageIndex} has an out-of-range cell`, RangeError);
      ensure(cageMap[cell] < 0, `Suguru cell ${cell} appears in more than one cage`, RangeError);
      cageMap[cell] = cageIndex;
    });
    return Object.freeze(normalized);
  });
  ensure(cageMap.every((value) => value >= 0), "Suguru cages must cover every cell exactly once", RangeError);
  return { size, cages: Object.freeze(normalizedCages), cageMap: Object.freeze(cageMap) };
}

function orthogonalNeighbors(index, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  const neighbors = [];
  if (row > 0) neighbors.push(index - size);
  if (row < size - 1) neighbors.push(index + size);
  if (col > 0) neighbors.push(index - 1);
  if (col < size - 1) neighbors.push(index + 1);
  return neighbors;
}

function kingNeighbors(index, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (!rowOffset && !colOffset) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size) neighbors.push(nextRow * size + nextCol);
    }
  }
  return neighbors;
}

function isOrthogonallyConnected(cage, size) {
  const allowed = new Set(cage);
  const reached = new Set([cage[0]]);
  const queue = [cage[0]];
  while (queue.length) {
    for (const neighbor of orthogonalNeighbors(queue.shift(), size)) {
      if (allowed.has(neighbor) && !reached.has(neighbor)) {
        reached.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return reached.size === cage.length;
}

function normalizedRegionSignature(cageMap) {
  const labels = new Map();
  let nextLabel = 0;
  return cageMap.map((region) => {
    if (!labels.has(region)) labels.set(region, nextLabel++);
    return labels.get(region);
  }).join(",");
}

function transformCoordinates(row, col, size, transformIndex) {
  if (transformIndex === 0) return [row, col];
  if (transformIndex === 1) return [col, size - 1 - row];
  if (transformIndex === 2) return [size - 1 - row, size - 1 - col];
  if (transformIndex === 3) return [size - 1 - col, row];
  if (transformIndex === 4) return [row, size - 1 - col];
  if (transformIndex === 5) return [size - 1 - row, col];
  if (transformIndex === 6) return [col, row];
  return [size - 1 - col, size - 1 - row];
}

export function getSuguruDihedralSignatures({ size, cages }) {
  const partition = normalizeSuguruPartition({ size, cages });
  const signatures = [];
  for (let transformIndex = 0; transformIndex < 8; transformIndex += 1) {
    const transformed = Array(size * size);
    partition.cageMap.forEach((region, index) => {
      const [row, col] = transformCoordinates(Math.floor(index / size), index % size, size, transformIndex);
      transformed[row * size + col] = region;
    });
    signatures.push(normalizedRegionSignature(transformed));
  }
  return Object.freeze(signatures);
}

export function canonicalizeSuguruPartition(partition) {
  return [...getSuguruDihedralSignatures(partition)].sort()[0];
}

export function validateSuguruPartition({ size, cages, expectedHistogram } = {}) {
  const partition = normalizeSuguruPartition({ size, cages });
  partition.cages.forEach((cage, cageIndex) => ensure(isOrthogonallyConnected(cage, size), `Suguru cage ${cageIndex} must be orthogonally connected`, RangeError));
  const histogram = partition.cages.map((cage) => cage.length).sort((left, right) => right - left);
  if (expectedHistogram !== undefined) {
    ensure(Array.isArray(expectedHistogram) && expectedHistogram.every(Number.isInteger), "expectedHistogram must be an integer array", TypeError);
    const expected = [...expectedHistogram].sort((left, right) => right - left);
    ensure(histogram.join(",") === expected.join(","), `Suguru histogram ${histogram.join(",")} does not match ${expected.join(",")}`, RangeError);
  }
  const cagesWithMetrics = partition.cages.map((cage) => {
    const rows = cage.map((cell) => Math.floor(cell / size));
    const cols = cage.map((cell) => cell % size);
    const area = (Math.max(...rows) - Math.min(...rows) + 1) * (Math.max(...cols) - Math.min(...cols) + 1);
    const cells = new Set(cage);
    const perimeter = cage.reduce((total, cell) => total + 4 - orthogonalNeighbors(cell, size).filter((neighbor) => cells.has(neighbor)).length, 0);
    return Object.freeze({ fillRatio: cage.length / area, perimeter, rowSpan: Math.max(...rows) - Math.min(...rows) + 1, columnSpan: Math.max(...cols) - Math.min(...cols) + 1 });
  });
  return Object.freeze({ size, cages: partition.cages, cageMap: partition.cageMap, histogram: Object.freeze(histogram), cageMetrics: Object.freeze(cagesWithMetrics), partitionPerimeter: cagesWithMetrics.reduce((total, cage) => total + cage.perimeter, 0), canonicalSignature: canonicalizeSuguruPartition(partition) });
}

function hasAllowedSuguruGeometry(partition) {
  return partition.cageMetrics.every((cage) => cage.fillRatio >= SUGURU_GEOMETRY_GATES.minCageFillRatio
    && cage.perimeter <= SUGURU_GEOMETRY_GATES.maxCagePerimeter
    && (!SUGURU_GEOMETRY_GATES.forbidFullRowOrColumnSpan || (cage.rowSpan < partition.size && cage.columnSpan < partition.size)))
    && partition.partitionPerimeter >= SUGURU_GEOMETRY_GATES.minPartitionPerimeter
    && partition.partitionPerimeter <= SUGURU_GEOMETRY_GATES.maxPartitionPerimeter;
}

export function satisfiesSuguruGeometryGates(partition) {
  return hasAllowedSuguruGeometry(validateSuguruPartition(partition));
}

export function generateSuguruPartition({ size = 5, histogram, seed, maxAttempts = SEARCH_BUDGETS.suguruTopology.maxAttempts, forbiddenSignatures = [] } = {}) {
  requireSeed(seed);
  requireCappedInteger(maxAttempts, "maxAttempts", SEARCH_BUDGETS.suguruTopology.maxAttempts);
  ensure(Array.isArray(histogram) && histogram.length > 0, "histogram must be a nonempty array", TypeError);
  const sizes = [...histogram];
  ensure(sizes.every((value) => Number.isInteger(value) && value >= 2 && value <= 5), "histogram sizes must be integers from 2 through 5", RangeError);
  ensure(sizes.join(",") === [...sizes].sort((left, right) => right - left).join(","), "histogram must be sorted from largest to smallest", RangeError);
  ensure(sizes.reduce((total, value) => total + value, 0) === size * size, "histogram must cover the board exactly", RangeError);
  const forbidden = new Set(forbiddenSignatures);
  const indexes = Array.from({ length: size * size }, (_, index) => index);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const random = createXorshift32(deriveSeed(seed, attempt));
    const seedCells = shuffleDeterministically(indexes, random).slice(0, sizes.length);
    const cages = seedCells.map((cell) => [cell]);
    const cageMap = Array(size * size).fill(-1);
    seedCells.forEach((cell, cageIndex) => { cageMap[cell] = cageIndex; });
    let assigned = seedCells.length;
    while (assigned < indexes.length) {
      const moves = [];
      cages.forEach((cage, cageIndex) => {
        if (cage.length >= sizes[cageIndex]) return;
        const frontier = new Set();
        cage.forEach((cell) => orthogonalNeighbors(cell, size).forEach((neighbor) => {
          if (cageMap[neighbor] < 0) frontier.add(neighbor);
        }));
        frontier.forEach((cell) => moves.push([cageIndex, cell]));
      });
      if (!moves.length) break;
      const [cageIndex, cell] = moves[Math.floor(random.nextFloat() * moves.length)];
      cages[cageIndex].push(cell);
      cageMap[cell] = cageIndex;
      assigned += 1;
    }
    if (assigned !== indexes.length || cages.some((cage, cageIndex) => cage.length !== sizes[cageIndex])) continue;
    try {
      const validated = validateSuguruPartition({ size, cages, expectedHistogram: sizes });
      if (forbidden.has(validated.canonicalSignature) || !hasAllowedSuguruGeometry(validated)) continue;
      return Object.freeze({ outcome: "generated", attempt, ...validated });
    } catch {
      // A failed growth is a bounded rejected attempt, not evidence of impossibility.
    }
  }
  return Object.freeze({ outcome: "attempts-exhausted", attempt: maxAttempts, cages: null, cageMap: null, canonicalSignature: null });
}

function normalizeSuguruBoard(input, partition) {
  if (typeof input === "string") ensure(new RegExp(`^[0-9]{${partition.size * partition.size}}$`).test(input), `Suguru string boards must contain exactly ${partition.size * partition.size} ASCII digits`, TypeError);
  const values = typeof input === "string" ? [...input].map(Number) : Array.isArray(input) ? [...input] : null;
  ensure(values && values.length === partition.size * partition.size, `Suguru board must contain exactly ${partition.size * partition.size} cells`, TypeError);
  ensure(values.every((value, index) => Number.isInteger(value) && value >= 0 && value <= partition.cages[partition.cageMap[index]].length), "Suguru cells must fit their cage ranges", TypeError);
  return values;
}

function suguruHasConflict(board, partition) {
  for (let index = 0; index < board.length; index += 1) {
    const value = board[index];
    if (!value) continue;
    const cage = partition.cages[partition.cageMap[index]];
    if (cage.some((cell) => cell !== index && board[cell] === value)) return true;
    if (kingNeighbors(index, partition.size).some((neighbor) => board[neighbor] === value)) return true;
  }
  return false;
}

function suguruCandidates(board, index, partition) {
  const cage = partition.cages[partition.cageMap[index]];
  let mask = (1 << cage.length) - 1;
  cage.forEach((cell) => { if (board[cell]) mask &= ~(1 << (board[cell] - 1)); });
  kingNeighbors(index, partition.size).forEach((neighbor) => { if (board[neighbor]) mask &= ~(1 << (board[neighbor] - 1)); });
  return valuesFromMask(mask, cage.length);
}

export function countSuguruSolutions(input, { size, cages, seed = 1, nodeCap = SEARCH_BUDGETS.suguruCarving.perSearchNodes, traceLimit = 0 } = {}) {
  const partition = validateSuguruPartition({ size, cages });
  const board = normalizeSuguruBoard(input, partition);
  requireSeed(seed);
  requireCappedInteger(nodeCap, "nodeCap", SEARCH_BUDGETS.suguruCarving.perSearchNodes);
  if (suguruHasConflict(board, partition)) return Object.freeze({ outcome: "zero", solutions: 0, nodes: 0, decisionTrace: Object.freeze([]) });
  const result = runBacktrackingSearch({ board, nodeCap, solutionLimit: 2, random: createXorshift32(seed), traceLimit, domainAt: (index) => suguruCandidates(board, index, partition) });
  return Object.freeze({ outcome: countOutcome(result), solutions: result.solutions, nodes: result.nodes, decisionTrace: result.decisionTrace });
}

export function constructSuguruSolution({ size, cages, seed, board: input, nodeCap = SEARCH_BUDGETS.suguruAssignment.perSearchNodes, traceLimit = 0 } = {}) {
  const partition = validateSuguruPartition({ size, cages });
  const board = normalizeSuguruBoard(input ?? "0".repeat(size * size), partition);
  const random = createXorshift32(seed);
  requireCappedInteger(nodeCap, "nodeCap", SEARCH_BUDGETS.suguruAssignment.perSearchNodes);
  if (suguruHasConflict(board, partition)) return Object.freeze({ outcome: "unsolved", solution: null, nodes: 0, decisionTrace: Object.freeze([]) });
  const result = runBacktrackingSearch({ board, nodeCap, solutionLimit: 1, random, traceLimit, domainAt: (index) => suguruCandidates(board, index, partition) });
  return Object.freeze({ outcome: result.capped ? "cap-exceeded" : result.firstSolution ? "solved" : "unsolved", solution: result.firstSolution ? result.firstSolution.join("") : null, nodes: result.nodes, decisionTrace: result.decisionTrace });
}
