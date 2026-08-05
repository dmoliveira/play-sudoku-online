import {
  GENERATOR_V3_VERSION,
  RNG_VERSION,
  SEARCH_BUDGETS,
  TRAVERSAL_VERSION,
  constructSuguruSolution,
  countSuguruSolutions,
  createSearchBudget,
  createXorshift32,
  deriveSeed,
  generateSuguruPartition,
  shuffleDeterministically
} from "./generator-v3-primitives.mjs";

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

function cluePositionDifference(left, right) {
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    if ((left[index] !== "0") !== (right[index] !== "0")) difference += 1;
  }
  return difference;
}

export function summarizeSuguruProfile(profile) {
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
  ensure(Array.isArray(gate.requiredAnyBands) && gate.requiredAnyBands.length > 0, `${label} profileGate needs requiredAnyBands`, TypeError);
  for (const field of ["minLogicalSteps", "minPlacements", "minExplicitCandidateEliminations"]) ensure(Number.isSafeInteger(gate[field]) && gate[field] >= 0, `${label} profileGate ${field} must be nonnegative`, RangeError);
  if (gate.maxRemainingCells !== undefined) ensure(Number.isSafeInteger(gate.maxRemainingCells) && gate.maxRemainingCells >= 0, `${label} profileGate maxRemainingCells must be nonnegative`, RangeError);
}

export function validateSuguruV3Spec(spec) {
  const label = spec?.id || "unnamed Suguru v3 spec";
  ensure(spec && typeof spec === "object" && !Array.isArray(spec), `${label} must be an object`, TypeError);
  ensure(typeof spec.id === "string" && spec.id, `${label} must have an id`, TypeError);
  ensure(typeof spec.label === "string" && spec.label, `${label} must have a label`, TypeError);
  ensure(typeof spec.layoutFamilyId === "string" && spec.layoutFamilyId, `${label} must have a layoutFamilyId`, TypeError);
  ensure(typeof spec.selectable === "boolean", `${label} selectable must be boolean`, TypeError);
  ensure(spec.size === 5, `${label} must be a 5x5 layout`, RangeError);
  ensure(spec.rngVersion === RNG_VERSION && spec.traversalVersion === TRAVERSAL_VERSION, `${label} algorithm version pins changed`, RangeError);
  for (const field of ["topologySeed", "assignmentSeed"]) ensure(Number.isInteger(spec[field]) && spec[field] > 0 && spec[field] <= 0xffff_ffff, `${label} ${field} must be a nonzero uint32`, RangeError);
  ensure(spec.maxTopologyAttempts === SEARCH_BUDGETS.suguruTopology.maxAttempts, `${label} topology attempt cap changed`, RangeError);
  ensure(spec.maxAssignmentAttempts === SEARCH_BUDGETS.suguruAssignment.maxAttempts, `${label} assignment attempt cap changed`, RangeError);
  ensure(spec.maxAssignmentNodesPerAttempt === SEARCH_BUDGETS.suguruAssignment.perSearchNodes, `${label} assignment node cap changed`, RangeError);
  ensure(spec.maxAssignmentAggregateNodes === SEARCH_BUDGETS.suguruAssignment.aggregateNodes, `${label} assignment aggregate cap changed`, RangeError);
  ensure(Array.isArray(spec.histogram) && spec.histogram.join(",") === [...spec.histogram].sort((left, right) => right - left).join(",") && spec.histogram.reduce((total, value) => total + value, 0) === 25, `${label} histogram is invalid`, RangeError);
  ensure(Number.isSafeInteger(spec.expectedTopologyAttempt) && spec.expectedTopologyAttempt >= 0, `${label} must pin expectedTopologyAttempt`, RangeError);
  ensure(spec.expectedTopologyNodes === 0, `${label} topology node pin must be zero for frontier growth`, RangeError);
  ensure(Array.isArray(spec.expectedCages), `${label} must pin expectedCages`, TypeError);
  ensure(typeof spec.expectedCanonicalSignature === "string" && spec.expectedCanonicalSignature, `${label} must pin expectedCanonicalSignature`, TypeError);
  ensure(spec.expectedCompactness && typeof spec.expectedCompactness === "object", `${label} must pin expectedCompactness`, TypeError);
  ensure(Number.isSafeInteger(spec.expectedAssignmentAttempt) && spec.expectedAssignmentAttempt >= 0, `${label} must pin expectedAssignmentAttempt`, RangeError);
  ensure(Number.isSafeInteger(spec.expectedAssignmentNodes) && spec.expectedAssignmentNodes > 0, `${label} must pin expectedAssignmentNodes`, RangeError);
  ensure(typeof spec.expectedSolution === "string" && /^[1-5]{25}$/.test(spec.expectedSolution), `${label} must pin expectedSolution`, TypeError);
  ensure(Array.isArray(spec.levels) && spec.levels.length === 3, `${label} must define three levels`, TypeError);
  ensure(spec.levels.map((level) => level.level).join(",") === "size5-easy,size5-medium,size5-challenge", `${label} levels must be Easy, Bridge, Challenge in order`, RangeError);
  spec.levels.forEach((level) => {
    const levelLabel = `${label}/${level.id || "unnamed level"}`;
    ensure(typeof level.id === "string" && level.id, `${levelLabel} needs an id`, TypeError);
    ensure(typeof level.label === "string" && level.label, `${levelLabel} needs a label`, TypeError);
    ensure(typeof level.carveSeed === "number" && Number.isInteger(level.carveSeed) && level.carveSeed > 0 && level.carveSeed <= 0xffff_ffff, `${levelLabel} carveSeed must be a nonzero uint32`, RangeError);
    ensure(Array.isArray(level.tags), `${levelLabel} tags must be an array`, TypeError);
    ensure(level.maxCarveAttempts === SEARCH_BUDGETS.suguruCarving.maxAttempts, `${levelLabel} carve attempt cap changed`, RangeError);
    ensure(level.maxUniquenessCalls === SEARCH_BUDGETS.suguruCarving.maxCalls, `${levelLabel} uniqueness call cap changed`, RangeError);
    ensure(level.maxUniquenessNodesPerCall === SEARCH_BUDGETS.suguruCarving.perSearchNodes, `${levelLabel} uniqueness node cap changed`, RangeError);
    ensure(level.maxUniquenessAggregateNodes === SEARCH_BUDGETS.suguruCarving.aggregateNodes, `${levelLabel} uniqueness aggregate cap changed`, RangeError);
    ensure(Number.isSafeInteger(level.targetClues) && level.targetClues >= 4 && level.targetClues <= 13, `${levelLabel} targetClues is invalid`, RangeError);
    validateProfileGate(level.profileGate, levelLabel);
    for (const field of ["expectedCarveAttempt", "expectedClueCount", "expectedUniquenessCalls", "expectedUniquenessNodes"]) ensure(Number.isSafeInteger(level[field]) && level[field] >= 0, `${levelLabel} must pin ${field}`, RangeError);
    ensure(level.expectedClueCount === level.targetClues, `${levelLabel} clue pin must match target`, RangeError);
    ensure(typeof level.expectedPuzzle === "string" && /^[0-5]{25}$/.test(level.expectedPuzzle), `${levelLabel} must pin expectedPuzzle`, TypeError);
    ensure(level.expectedProfile && typeof level.expectedProfile === "object", `${levelLabel} must pin expectedProfile`, TypeError);
  });
}

function acceptsProfile(gate, profile) {
  return gate.allowedStatuses.includes(profile.status)
    && gate.allowedHardestBands.includes(profile.hardestBand)
    && profile.logicalSteps >= gate.minLogicalSteps
    && profile.placementSteps >= gate.minPlacements
    && profile.explicitCandidateEliminations >= gate.minExplicitCandidateEliminations
    && gate.requiredAnyBands.some((band) => profile.trace.some((step) => step.band === band))
    && (gate.maxRemainingCells === undefined || profile.remainingCells <= gate.maxRemainingCells);
}

function assignSolution(spec, partition) {
  const budget = createSearchBudget("suguruAssignment", {
    perSearchNodes: spec.maxAssignmentNodesPerAttempt,
    aggregateNodes: spec.maxAssignmentAggregateNodes,
    maxCalls: spec.maxAssignmentAttempts
  });
  for (let attempt = 0; attempt < spec.maxAssignmentAttempts; attempt += 1) {
    const seed = attempt === 0 ? spec.assignmentSeed : deriveSeed(spec.assignmentSeed, attempt);
    const result = budget.run((nodeCap) => constructSuguruSolution({ size: spec.size, cages: partition.cages, seed, nodeCap }));
    if (result.outcome === "solved") return { attempt, nodes: budget.snapshot().nodes, solution: result.solution };
    if (result.budgetExhausted) break;
  }
  throw new Error(`${spec.id} exhausted Suguru assignment caps`);
}

function carveLevel(spec, level, partition, solution, profilePuzzle) {
  const indexes = Array.from({ length: spec.size * spec.size }, (_, index) => index);
  const budget = createSearchBudget("suguruCarving", {
    perSearchNodes: level.maxUniquenessNodesPerCall,
    aggregateNodes: level.maxUniquenessAggregateNodes,
    maxCalls: level.maxUniquenessCalls
  });
  let uniquenessCalls = 0;
  for (let attempt = 0; attempt < level.maxCarveAttempts; attempt += 1) {
    const board = [...solution].map(Number);
    const random = createXorshift32(deriveSeed(level.carveSeed, attempt));
    const order = shuffleDeterministically(indexes, random);
    let budgetExhausted = false;
    for (const index of order) {
      if (countClues(board.join("")) <= level.targetClues) break;
      const beforeCall = budget.snapshot();
      if (beforeCall.remainingCalls <= 0 || beforeCall.remainingNodes <= 0) {
        budgetExhausted = true;
        break;
      }
      const previous = board[index];
      board[index] = 0;
      const callNumber = beforeCall.calls + 1;
      const result = budget.run((nodeCap) => countSuguruSolutions(board, { size: spec.size, cages: partition.cages, seed: deriveSeed(level.carveSeed, callNumber), nodeCap }));
      uniquenessCalls = budget.snapshot().calls;
      if (result.outcome !== "unique") board[index] = previous;
      if (result.budgetExhausted) {
        budgetExhausted = true;
        break;
      }
    }
    if (budgetExhausted) break;
    const puzzle = board.join("");
    if (countClues(puzzle) !== level.targetClues) continue;
    const profile = profilePuzzle({ puzzle, solution, size: spec.size, cages: partition.cages });
    if (!acceptsProfile(level.profileGate, profile)) continue;
    return {
      attempt,
      puzzle,
      profile: summarizeSuguruProfile(profile),
      clueCount: countClues(puzzle),
      uniquenessCalls,
      uniquenessNodes: budget.snapshot().nodes
    };
  }
  throw new Error(`${level.id} exhausted Suguru carving caps after ${uniquenessCalls} calls and ${budget.snapshot().nodes} nodes`);
}

function verifyLayoutPins(spec, partition, assignment, levels) {
  const checks = [
    [partition.attempt, spec.expectedTopologyAttempt, "topology attempt"],
    [0, spec.expectedTopologyNodes, "topology nodes"],
    [partition.canonicalSignature, spec.expectedCanonicalSignature, "canonical signature"],
    [assignment.attempt, spec.expectedAssignmentAttempt, "assignment attempt"],
    [assignment.nodes, spec.expectedAssignmentNodes, "assignment nodes"],
    [assignment.solution, spec.expectedSolution, "solution"]
  ];
  checks.forEach(([actual, expected, field]) => ensure(actual === expected, `${spec.id} ${field} pin changed`));
  ensure(canonicalValue(partition.cages) === canonicalValue(spec.expectedCages), `${spec.id} cage pin changed`);
  const compactness = { histogram: partition.histogram, cageMetrics: partition.cageMetrics, partitionPerimeter: partition.partitionPerimeter };
  ensure(canonicalValue(compactness) === canonicalValue(spec.expectedCompactness), `${spec.id} compactness pin changed`);
  levels.forEach((generated, index) => {
    const level = spec.levels[index];
    const levelChecks = [
      [generated.attempt, level.expectedCarveAttempt, "carve attempt"],
      [generated.puzzle, level.expectedPuzzle, "puzzle"],
      [generated.clueCount, level.expectedClueCount, "clue count"],
      [generated.uniquenessCalls, level.expectedUniquenessCalls, "uniqueness calls"],
      [generated.uniquenessNodes, level.expectedUniquenessNodes, "uniqueness nodes"]
    ];
    levelChecks.forEach(([actual, expected, field]) => ensure(actual === expected, `${level.id} ${field} pin changed`));
    ensure(canonicalValue(generated.profile) === canonicalValue(level.expectedProfile), `${level.id} profile pin changed`);
  });
}

function validateLevelSeparation(spec, levels) {
  const [easy, bridge, challenge] = levels;
  ensure(easy.clueCount - bridge.clueCount >= 2, `${spec.id} Bridge must have at least two fewer clues than Easy`);
  ensure(cluePositionDifference(easy.puzzle, bridge.puzzle) >= 4, `${spec.id} Bridge/Easy clue-position difference must be at least four`);
  ensure(challenge.clueCount <= bridge.clueCount, `${spec.id} Challenge must not have more clues than Bridge`);
  ensure(cluePositionDifference(bridge.puzzle, challenge.puzzle) >= 3, `${spec.id} Challenge/Bridge clue-position difference must be at least three`);
}

export function generateSuguruV3(spec, { forbiddenSignatures = [], profilePuzzle, verifyPins = true } = {}) {
  ensure(typeof profilePuzzle === "function", "profilePuzzle must be a function", TypeError);
  if (verifyPins) validateSuguruV3Spec(spec);
  const partition = generateSuguruPartition({ size: spec.size, histogram: spec.histogram, seed: spec.topologySeed, maxAttempts: spec.maxTopologyAttempts, forbiddenSignatures });
  ensure(partition.outcome === "generated", `${spec.id} exhausted Suguru topology caps`);
  const assignment = assignSolution(spec, partition);
  const levels = spec.levels.map((level) => carveLevel(spec, level, partition, assignment.solution, profilePuzzle));
  validateLevelSeparation(spec, levels);
  if (verifyPins) verifyLayoutPins(spec, partition, assignment, levels);
  const layout = Object.freeze({
    size: spec.size,
    cages: Object.freeze(partition.cages.map((cage) => Object.freeze([...cage]))),
    solution: assignment.solution,
    layoutFamilyId: spec.layoutFamilyId,
    origin: Object.freeze({
      kind: "first-party-construction",
      generatorVersion: GENERATOR_V3_VERSION,
      strategy: "seeded-frontier-csp",
      rngVersion: spec.rngVersion,
      traversalVersion: spec.traversalVersion,
      topologySeed: spec.topologySeed,
      topologyAttempt: partition.attempt,
      assignmentSeed: spec.assignmentSeed,
      assignmentAttempt: assignment.attempt,
      assignmentNodes: assignment.nodes,
      canonicalSignature: partition.canonicalSignature
    })
  });
  const entries = levels.map((generated, index) => {
    const level = spec.levels[index];
    return Object.freeze({
      level: level.level,
      entry: Object.freeze({
        id: level.id,
        label: level.label,
        layout: spec.id,
        puzzle: generated.puzzle,
        tags: Object.freeze([...level.tags]),
        selectable: spec.selectable,
        minTraceSteps: level.profileGate.minLogicalSteps,
        minPlacements: level.profileGate.minPlacements,
        logicProfile: generated.profile,
        origin: Object.freeze({
          kind: "first-party-generated",
          generatorVersion: GENERATOR_V3_VERSION,
          strategy: "seeded-unique-carve",
          rngVersion: spec.rngVersion,
          traversalVersion: spec.traversalVersion,
          seed: level.carveSeed,
          attempt: generated.attempt,
          uniquenessCalls: generated.uniquenessCalls,
          uniquenessNodes: generated.uniquenessNodes
        })
      })
    });
  });
  return Object.freeze({ layout, entries: Object.freeze(entries), partition, assignment: Object.freeze(assignment), levels: Object.freeze(levels) });
}
