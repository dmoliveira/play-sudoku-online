import fs from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of ["suguru.js", "logic-coach.js", "generated-content.js", "suguru-puzzles.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), sandbox, { filename: file });
}

const { SuguruCore, SUGURU_PUZZLES, LogicCoach } = sandbox.window;

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

function isConnectedCage(cage, size) {
  const reached = new Set([cage[0]]);
  let changed = true;
  while (changed) {
    changed = false;
    cage.forEach((cell) => {
      if (reached.has(cell)) return;
      const row = Math.floor(cell / size);
      const col = cell % size;
      const neighbors = [row > 0 ? cell - size : -1, row < size - 1 ? cell + size : -1, col > 0 ? cell - 1 : -1, col < size - 1 ? cell + 1 : -1];
      if (neighbors.some((neighbor) => reached.has(neighbor))) { reached.add(cell); changed = true; }
    });
  }
  return reached.size === cage.length;
}

function canonicalLayoutSignature(entry) {
  const size = entry.size;
  const transforms = [
    (row, col) => [row, col],
    (row, col) => [col, size - 1 - row],
    (row, col) => [size - 1 - row, size - 1 - col],
    (row, col) => [size - 1 - col, row],
    (row, col) => [row, size - 1 - col],
    (row, col) => [size - 1 - row, col],
    (row, col) => [col, row],
    (row, col) => [size - 1 - col, size - 1 - row]
  ];
  return transforms.map((transform) => {
    const transformed = Array(size * size);
    entry.cageMap.forEach((region, index) => {
      const [row, col] = transform(Math.floor(index / size), index % size);
      transformed[row * size + col] = region;
    });
    const regionMap = new Map();
    let nextRegion = 0;
    return transformed.map((region) => {
      if (!regionMap.has(region)) regionMap.set(region, nextRegion++);
      return regionMap.get(region);
    }).join(",");
  }).sort()[0];
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
    ensure(typeof entry.layoutFamilyId === "string" && entry.layoutFamilyId, `${entry.id} must expose stable layoutFamilyId`);
    ensure(typeof entry.selectable === "boolean", `${entry.id} must expose selectable state`);
    entry.cages.forEach((cage, cageIndex) => ensure(isConnectedCage(cage, entry.size), `${entry.id} cage ${cageIndex} must be orthogonally connected`));
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

const allEntries = Object.values(SUGURU_PUZZLES).flat();
const generatedEntries = allEntries.filter((entry) => entry.origin?.kind === "first-party-generated");
const layoutIds = new Set(allEntries.map((entry) => entry.layout));
const layoutFamilies = new Set(allEntries.map((entry) => entry.layoutFamilyId));
ensure(total === 26, `expanded Suguru inventory must contain 26 entries, got ${total}`);
ensure(layoutIds.size === 6, `expanded Suguru inventory must contain six named layouts, got ${layoutIds.size}`);
ensure(layoutFamilies.size === 4, `expanded Suguru inventory must contain four structural families, got ${layoutFamilies.size}`);
ensure(generatedEntries.length === 7 && generatedEntries.every((entry) => entry.selectable === true), "seven generated Suguru entries must be enabled through practice rotation");
ensure(generatedEntries.every((entry) => entry.origin.generatorVersion === 2 && entry.origin.strategy === "sample-clues"), "generated Suguru must expose sample-clues generator v2 metadata");
const preFocusIdVectors = {
  "size5-easy": ["suguru-size5-garden-path", "suguru-size5-morning-rhythm", "suguru-size5-brook-lantern", "suguru-size5-cascade-lantern", "suguru-size5-mist-garden", "suguru-size5-cedar-garden"],
  "size5-medium": ["suguru-size5-bridge-garden", "suguru-size5-lantern-bridge", "suguru-size5-petal-crossing", "suguru-size5-lantern-echo", "suguru-size5-brook-bridge", "suguru-size5-cascade-bridge", "suguru-size5-mist-bridge", "suguru-size5-cedar-bridge"],
  "size5-challenge": ["suguru-size5-garden-challenge", "suguru-size5-quiet-koi", "suguru-size5-garden-deep-night", "suguru-size5-lantern-deep-night", "suguru-size5-brook-deep-night", "suguru-size5-garden-midnight-path", "suguru-size5-lantern-midnight-path", "suguru-size5-brook-midnight-path", "suguru-size5-cascade-midnight-path", "suguru-size5-mist-deep-current", "suguru-size5-cedar-deep-night"]
};
Object.entries(preFocusIdVectors).forEach(([level, ids]) => {
  const actual = SUGURU_PUZZLES[level].map((entry) => entry.id);
  const expected = level === "size5-challenge" ? [...ids, "suguru-size5-mist-pair-current"] : ids;
  ensure(actual.join(",") === expected.join(","), `${level} pre-focus entry order changed`);
});
const focusEntries = generatedEntries.filter((entry) => entry.logicFocus);
ensure(focusEntries.length === 1 && focusEntries[0].id === "suguru-size5-mist-pair-current", "Suguru must expose one append-only pair focus entry");
const signatures = new Map();
allEntries.forEach((entry) => {
  const signature = canonicalLayoutSignature(entry);
  const families = signatures.get(signature) || new Set();
  families.add(entry.layoutFamilyId);
  signatures.set(signature, families);
});
signatures.forEach((families, signature) => ensure(families.size === 1, `dihedral signature ${signature} must map to one layout family`));
ensure(signatures.size === 4, `expected four canonical Suguru partitions, got ${signatures.size}`);
for (const entry of generatedEntries) {
  const profile = LogicCoach.profile({ game: "suguru", board: entry.puzzle, puzzle: entry.puzzle, solution: entry.solution, meta: entry });
  ensure(profile.status !== "invalid", `${entry.id} profile must be valid`);
  ensure(profile.logicalSteps >= entry.minTraceSteps && profile.placementSteps >= entry.minPlacements, `${entry.id} must satisfy workload floors`);
  ensure(profile.status === entry.logicProfile.status && profile.hardestBand === entry.logicProfile.hardestBand, `${entry.id} profile metadata drift`);
  if (entry.logicFocus) {
    const focus = entry.logicFocus;
    const traceIndex = profile.trace.findIndex((step) => step.technique === focus.technique);
    const step = profile.trace[traceIndex];
    const candidateEliminations = (step?.eliminations || []).reduce((total, elimination) => total + elimination.values.length, 0);
    const downstreamPlacements = traceIndex < 0 ? 0 : profile.trace.slice(traceIndex + 1).filter((candidate) => candidate.kind === "placement").length;
    ensure(JSON.stringify(focus) === JSON.stringify({ profileVersion: profile.profileVersion, technique: "cage-naked-pair", traceIndex, candidateEliminations, downstreamPlacements }), `${entry.id} focus metadata drift`);
    ensure(traceIndex === 8 && candidateEliminations === 4 && downstreamPlacements === 17, `${entry.id} must retain reviewed effective cage-pair evidence`);
  }
  if (entry.id.includes("-bridge")) ensure(profile.trace.some((step) => step.band === "interaction"), `${entry.id} Bridge must require interaction logic`);
}
for (const layout of ["mist", "cedar"]) {
  const easy = generatedEntries.find((entry) => entry.layout === layout && SUGURU_PUZZLES["size5-easy"].includes(entry));
  const bridge = generatedEntries.find((entry) => entry.layout === layout && SUGURU_PUZZLES["size5-medium"].includes(entry));
  ensure(easy && bridge, `${layout} must provide Easy and Bridge entries`);
  ensure(easy.puzzle.split("").filter((value, index) => value !== bridge.puzzle[index]).length > 1, `${layout} Bridge must not be a one-clue Easy delta`);
}

console.log("Suguru validation passed for", total, "puzzles across", layoutFamilies.size, "structural families");
