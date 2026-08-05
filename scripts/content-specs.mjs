export const CONTENT_GENERATOR_VERSION = 2;

export const SUDOKU_CONTENT_SPECS = Object.freeze([
  Object.freeze({
    difficulty: "easy",
    id: "easy-sunlit-maple",
    label: "Sunlit maple",
    seed: 140401,
    generationStrategy: "unique-carve",
    maxAttempts: 3000,
    solution: "486917523325846791197235684254681379861793452973524168548169237732458916619372845",
    targetClues: 66,
    minTraceSteps: 15,
    minPlacements: 15,
    requiredStatus: "solved-logically",
    requiredBand: "local",
    expectedAttempt: 0,
    expectedPuzzle: "400917503325046790097235084254601379860790452970524168540160237732458916019302845",
    tags: Object.freeze(["singles", "first-party", "sunlit"])
  }),
  Object.freeze({
    difficulty: "hard",
    id: "hard-temple-current",
    label: "Temple current",
    seed: 140402,
    generationStrategy: "unique-carve",
    maxAttempts: 3000,
    solution: "498251367251376489376498215914562738783914526562783941847129653635847192129635874",
    targetClues: 31,
    minTraceSteps: 12,
    minPlacements: 4,
    requiredAnyBand: Object.freeze(["interaction", "subset"]),
    expectedAttempt: 1,
    expectedPuzzle: "400050300051306009306000005904502000003010000060000900040100050030007092020630870",
    tags: Object.freeze(["candidate-lines", "first-party", "temple"])
  }),
  Object.freeze({
    difficulty: "hard",
    id: "hard-pair-current",
    label: "Pair current",
    seed: 1364197376,
    generationStrategy: "sample-clues",
    maxAttempts: 1500,
    solution: "486917523325846791197235684254681379861793452973524168548169237732458916619372845",
    targetClues: 30,
    minTraceSteps: 52,
    minPlacements: 51,
    requiredStatus: "solved-logically",
    requiredTechnique: "naked-pair",
    minTechniqueEliminations: 1,
    minDownstreamPlacements: 1,
    expectedAttempt: 1494,
    expectedPuzzle: "480000020005000700000035080000080309861003000070504108008160200702000010610000040",
    tags: Object.freeze(["naked-pair", "pair-focus", "first-party", "current"])
  }),
  Object.freeze({
    difficulty: "expert",
    id: "expert-starlit-pines",
    label: "Starlit pines",
    seed: 140403,
    generationStrategy: "unique-carve",
    maxAttempts: 3000,
    solution: "879563421653124987214789365748956213132478659596312874985631742427895136361247598",
    targetClues: 25,
    minTraceSteps: 6,
    minPlacements: 2,
    requiredStatus: "stalled",
    requiredAnyBand: Object.freeze(["subset"]),
    expectedAttempt: 1,
    expectedPuzzle: "009000400003000087210000300040000010032000600500302000980031002007800000000040090",
    tags: Object.freeze(["subsets", "first-party", "starlit"])
  })
]);

export const SUGURU_LAYOUT_SPECS = Object.freeze([
  Object.freeze({
    id: "mist",
    label: "Mist",
    layoutFamilyId: "mist-v1",
    seed: 240401,
    size: 5,
    cages: Object.freeze([[5,6,10,11,12],[9,13,14,19],[3,4,7,8],[15,16,17,20,21],[0,1,2],[18,22,23,24]].map((cage) => Object.freeze(cage))),
    solution: "1234334121125345341221234",
    levels: Object.freeze([
      Object.freeze({ level: "size5-easy", id: "suguru-size5-mist-garden", label: "Mist garden", seed: 240401, generationStrategy: "sample-clues", maxAttempts: 200000, clueTargets: Object.freeze([10,11,12]), minTraceSteps: 15, minPlacements: 15, requiredStatus: "solved-logically", requiredBand: "local", expectedAttempt: 0, expectedPuzzle: "0000300020105045300220004", tags: Object.freeze(["starter", "new-layout", "mist"]) }),
      Object.freeze({ level: "size5-medium", id: "suguru-size5-mist-bridge", label: "Mist crossing", seed: 240502, generationStrategy: "sample-clues", maxAttempts: 200000, clueTargets: Object.freeze([7,8,9,10]), minTraceSteps: 6, minPlacements: 2, requiredStatus: "solved-logically", requiredAnyBand: Object.freeze(["interaction"]), expectedAttempt: 3, expectedPuzzle: "0000000020105040040000204", tags: Object.freeze(["bridge", "cross-cage", "mist"]) }),
      Object.freeze({ level: "size5-challenge", id: "suguru-size5-mist-deep-current", label: "Mist deep current", seed: 240603, generationStrategy: "sample-clues", maxAttempts: 200000, clueTargets: Object.freeze([4,5,6,7,8]), minTraceSteps: 6, minPlacements: 2, requiredStatus: "solved-logically", requiredAnyBand: Object.freeze(["interaction", "subset"]), expectedAttempt: 4, expectedPuzzle: "0000030000105300000000000", tags: Object.freeze(["challenge", "cross-cage", "mist"]) })
    ])
  }),
  Object.freeze({
    id: "cedar",
    label: "Cedar",
    layoutFamilyId: "cedar-v1",
    seed: 240402,
    size: 5,
    cages: Object.freeze([[12,13,17,18,19],[3,4,8,9,14],[16,21,22,23,24],[0,5],[1,2,6,7,11],[10,15,20]].map((cage) => Object.freeze(cage))),
    solution: "1414525231131522424331352",
    levels: Object.freeze([
      Object.freeze({ level: "size5-easy", id: "suguru-size5-cedar-garden", label: "Cedar garden", seed: 240402, generationStrategy: "sample-clues", maxAttempts: 200000, clueTargets: Object.freeze([10,11,12]), minTraceSteps: 15, minPlacements: 15, requiredStatus: "solved-logically", requiredBand: "local", expectedAttempt: 54, expectedPuzzle: "0004505201001500020001300", tags: Object.freeze(["starter", "new-layout", "cedar"]) }),
      Object.freeze({ level: "size5-medium", id: "suguru-size5-cedar-bridge", label: "Cedar bridge", seed: 240503, generationStrategy: "sample-clues", maxAttempts: 200000, clueTargets: Object.freeze([7,8,9,10]), minTraceSteps: 6, minPlacements: 2, requiredStatus: "solved-logically", requiredAnyBand: Object.freeze(["interaction"]), expectedAttempt: 439, expectedPuzzle: "1004005000000020000300052", tags: Object.freeze(["bridge", "cross-cage", "cedar"]) }),
      Object.freeze({ level: "size5-challenge", id: "suguru-size5-cedar-deep-night", label: "Cedar deep night", seed: 240604, generationStrategy: "sample-clues", maxAttempts: 200000, clueTargets: Object.freeze([4,5,6,7,8]), minTraceSteps: 6, minPlacements: 2, requiredStatus: "solved-logically", requiredAnyBand: Object.freeze(["interaction", "subset"]), expectedAttempt: 3608, expectedPuzzle: "0004005001000000000001050", tags: Object.freeze(["challenge", "cross-cage", "cedar"]) })
    ])
  })
]);

export const SUGURU_FOCUS_SPECS = Object.freeze([
  Object.freeze({
    layoutId: "mist",
    level: "size5-challenge",
    id: "suguru-size5-mist-pair-current",
    label: "Mist pair current",
    seed: 1511472606,
    generationStrategy: "sample-clues",
    maxAttempts: 1000,
    clueTargets: Object.freeze([5]),
    minTraceSteps: 29,
    minPlacements: 20,
    requiredStatus: "solved-logically",
    requiredTechnique: "cage-naked-pair",
    minTechniqueEliminations: 1,
    minDownstreamPlacements: 1,
    expectedAttempt: 541,
    expectedPuzzle: "0000000000005300000020034",
    tags: Object.freeze(["challenge", "cage-naked-pair", "pair-focus", "mist"])
  })
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

const V3_SUDOKU_CAPS = deepFreeze({
  rngVersion: 1,
  traversalVersion: 1,
  maxConstructionAttempts: 64,
  maxConstructionNodesPerAttempt: 250000,
  maxConstructionAggregateNodes: 2000000,
  maxCarveAttempts: 128,
  maxUniquenessCalls: 10368,
  maxUniquenessNodesPerCall: 2000000,
  maxUniquenessAggregateNodes: 20000000
});

const V3_SUDOKU_PROFILE_GATES = deepFreeze({
  easy: { allowedStatuses: ["solved-logically"], allowedHardestBands: ["local"], requiredBands: [], minLogicalSteps: 25, minPlacements: 25, minEliminations: 0 },
  medium: { allowedStatuses: ["solved-logically"], allowedHardestBands: ["local","interaction"], requiredBands: [], minLogicalSteps: 36, minPlacements: 34, minEliminations: 0 },
  advanced: { allowedStatuses: ["solved-logically"], allowedHardestBands: ["interaction"], requiredBands: ["interaction"], minLogicalSteps: 40, minPlacements: 36, minEliminations: 1 },
  hard: { allowedStatuses: ["solved-logically"], allowedHardestBands: ["subset"], requiredBands: ["subset"], minLogicalSteps: 45, minPlacements: 40, minEliminations: 1 },
  expert: { allowedStatuses: ["solved-logically","stalled"], allowedHardestBands: ["subset"], requiredBands: ["subset"], minLogicalSteps: 20, minPlacements: 10, minEliminations: 1, maxRemainingCells: 45 }
});

function sudokuV3Spec(spec) {
  return deepFreeze({
    ...V3_SUDOKU_CAPS,
    ...spec,
    profileGate: V3_SUDOKU_PROFILE_GATES[spec.difficulty]
  });
}

export const SUDOKU_V3_CONTENT_SPECS = Object.freeze([
  sudokuV3Spec({
    id: "easy-morning-koi",
    difficulty: "easy",
    label: "Morning koi",
    selectable: true,
    tags: ["generator-v3","rotational","morning"],
    constructionSeed: 810001,
    carveSeed: 820001,
    orbitPolicy: "rotate-180",
    targetClues: 50,
    minUnitClues: 3,
    maxEmptyRun: 5,
    requireAsymmetric: false,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 86,
    expectedSolution: "971628354862354917534179286253941768689735421147862593315496872498217635726583149",
    expectedCarveAttempt: 3,
    expectedPuzzle: "070628350862350910004000086203041708680705021107860503310000800098017635026583040",
    expectedClueCount: 50,
    expectedUniquenessCalls: 64,
    expectedUniquenessNodes: 1135,
    expectedFamilyMaskSignature: "010111110111110110001000011101011101110101011101110101110000100011011111011111010|100000101001111011111011011110011110110101110011110101101111001011000010101101111|111101101001000110010111101110011110101101011101110011011110111011111100110000001",
    expectedSourceMetrics: {
      clueCount: 50,
      rowClues: [6,7,3,6,6,6,3,7,6],
      columnClues: [5,6,6,5,6,5,6,6,5],
      boxClues: [5,5,6,6,6,6,6,5,5],
      minUnitClues: 3,
      maxEmptyRun: 4,
      symmetry: {"rotate180": true,"mainDiagonal": false,"verticalReflection": false}
    },
    expectedProfile: {
      version: 1,
      status: "solved-logically",
      hardestTechnique: "naked-single",
      hardestBand: "local",
      logicalSteps: 31,
      placementSteps: 31,
      eliminationSteps: 0,
      explicitCandidateEliminations: 0,
      minAvailableSteps: 1,
      remainingCells: 0,
      techniques: ["naked-single","full-house"]
    }
  }),
  sudokuV3Spec({
    id: "easy-bamboo-window",
    difficulty: "easy",
    label: "Bamboo window",
    selectable: true,
    tags: ["generator-v3","diagonal","bamboo"],
    constructionSeed: 810002,
    carveSeed: 821001,
    orbitPolicy: "main-diagonal",
    targetClues: 46,
    minUnitClues: 3,
    maxEmptyRun: 5,
    requireAsymmetric: false,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 82,
    expectedSolution: "753864921842139765961752834214398576379645218685217349536921487427586193198473652",
    expectedCarveAttempt: 1,
    expectedPuzzle: "003804901040030700901752030204398570079600200605207349530921087007506100100003600",
    expectedClueCount: 46,
    expectedUniquenessCalls: 40,
    expectedUniquenessNodes: 795,
    expectedFamilyMaskSignature: "001101101010010100101111010101111110011100100101101111110111011001101100100001100|010100001101111100001011011011001001101011111101111101001011001100010001110111110|110111001100110110001001010110110111110111011101010010010100010011111101100110010",
    expectedSourceMetrics: {
      clueCount: 46,
      rowClues: [5,3,6,7,4,7,7,4,3],
      columnClues: [5,3,6,7,4,7,7,4,3],
      boxClues: [4,6,4,6,6,6,4,6,4],
      minUnitClues: 3,
      maxEmptyRun: 4,
      symmetry: {"rotate180": false,"mainDiagonal": true,"verticalReflection": false}
    },
    expectedProfile: {
      version: 1,
      status: "solved-logically",
      hardestTechnique: "naked-single",
      hardestBand: "local",
      logicalSteps: 35,
      placementSteps: 35,
      eliminationSteps: 0,
      explicitCandidateEliminations: 0,
      minAvailableSteps: 1,
      remainingCells: 0,
      techniques: ["naked-single","full-house"]
    }
  }),
  sudokuV3Spec({
    id: "medium-river-stones",
    difficulty: "medium",
    label: "River stones",
    selectable: true,
    tags: ["generator-v3","reflection","river"],
    constructionSeed: 810003,
    carveSeed: 822001,
    orbitPolicy: "vertical-reflection",
    targetClues: 40,
    minUnitClues: 2,
    maxEmptyRun: 6,
    requireAsymmetric: false,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 82,
    expectedSolution: "435682917617349285298157463542831679369574128781296354924765831173428596856913742",
    expectedCarveAttempt: 4,
    expectedPuzzle: "435682917610040085008050400500030009000504000001000300904060801070408090850913042",
    expectedClueCount: 40,
    expectedUniquenessCalls: 126,
    expectedUniquenessNodes: 3097,
    expectedFamilyMaskSignature: "100001010111111111011001101100000010010001100000110000011111101110001110001110001|110100110001100001111111111000011000001000001100100010010011100110111110101100011|111111111110010011001010100100010001000101000001000100101010101010101010110111011",
    expectedSourceMetrics: {
      clueCount: 40,
      rowClues: [9,5,3,3,2,2,5,4,7],
      columnClues: [5,4,4,4,6,4,4,4,5],
      boxClues: [6,5,6,2,3,2,5,6,5],
      minUnitClues: 2,
      maxEmptyRun: 5,
      symmetry: {"rotate180": false,"mainDiagonal": false,"verticalReflection": true}
    },
    expectedProfile: {
      version: 1,
      status: "solved-logically",
      hardestTechnique: "naked-single",
      hardestBand: "local",
      logicalSteps: 41,
      placementSteps: 41,
      eliminationSteps: 0,
      explicitCandidateEliminations: 0,
      minAvailableSteps: 1,
      remainingCells: 0,
      techniques: ["naked-single","full-house"]
    }
  }),
  sudokuV3Spec({
    id: "medium-crane-shadow",
    difficulty: "medium",
    label: "Crane shadow",
    selectable: true,
    tags: ["generator-v3","asymmetric","crane"],
    constructionSeed: 810004,
    carveSeed: 823001,
    orbitPolicy: "none",
    targetClues: 38,
    minUnitClues: 2,
    maxEmptyRun: 6,
    requireAsymmetric: true,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 82,
    expectedSolution: "285713946136459782947286531493861257672534198851972463518397624364125879729648315",
    expectedCarveAttempt: 1,
    expectedPuzzle: "280010900136450780000086030400061050002504190051900000510300024060125009700040000",
    expectedClueCount: 38,
    expectedUniquenessCalls: 89,
    expectedUniquenessNodes: 2104,
    expectedFamilyMaskSignature: "000101001011001010111011011101010000010101001100110011010001000011010101001111100|110010100111110110000011010100011010001101110011100000110100011010111001100010000|111101101000110100110100001001011101011001000100110100010111010100100000110001110",
    expectedSourceMetrics: {
      clueCount: 38,
      rowClues: [4,7,3,4,5,3,5,5,2],
      columnClues: [5,5,3,5,6,4,3,5,2],
      boxClues: [5,5,4,4,5,3,4,5,3],
      minUnitClues: 2,
      maxEmptyRun: 6,
      symmetry: {"rotate180": false,"mainDiagonal": false,"verticalReflection": false}
    },
    expectedProfile: {
      version: 1,
      status: "solved-logically",
      hardestTechnique: "naked-single",
      hardestBand: "local",
      logicalSteps: 43,
      placementSteps: 43,
      eliminationSteps: 0,
      explicitCandidateEliminations: 0,
      minAvailableSteps: 1,
      remainingCells: 0,
      techniques: ["naked-single","full-house"]
    }
  }),
  sudokuV3Spec({
    id: "advanced-moon-bridge",
    difficulty: "advanced",
    label: "Moon bridge",
    selectable: true,
    tags: ["generator-v3","rotational","interaction"],
    constructionSeed: 810005,
    carveSeed: 824004,
    orbitPolicy: "rotate-180",
    targetClues: 36,
    minUnitClues: 2,
    maxEmptyRun: 6,
    requireAsymmetric: false,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 82,
    expectedSolution: "327546189658219374194387652562938417739124568841675293976452831283761945415893726",
    expectedCarveAttempt: 83,
    expectedPuzzle: "307506009008010304190307650500900000030000060000005003076402031203060900400803706",
    expectedClueCount: 36,
    expectedUniquenessCalls: 2097,
    expectedUniquenessNodes: 56107,
    expectedFamilyMaskSignature: "001100011110011101101011010010000100000010010100001000101100001100011011011011110|011110011110110100100001110000100100010010000001000001010110110101110101110001010|101101001001010101110101110100100000010000010000001001011101011101010100100101101",
    expectedSourceMetrics: {
      clueCount: 36,
      rowClues: [5,4,6,2,2,2,6,4,5],
      columnClues: [5,3,4,5,2,5,4,3,5],
      boxClues: [5,5,5,2,2,2,5,5,5],
      minUnitClues: 2,
      maxEmptyRun: 5,
      symmetry: {"rotate180": true,"mainDiagonal": false,"verticalReflection": false}
    },
    expectedProfile: {
      version: 1,
      status: "solved-logically",
      hardestTechnique: "pointing",
      hardestBand: "interaction",
      logicalSteps: 46,
      placementSteps: 45,
      eliminationSteps: 1,
      explicitCandidateEliminations: 2,
      minAvailableSteps: 1,
      remainingCells: 0,
      techniques: ["naked-single","full-house","hidden-single","pointing"]
    }
  }),
  sudokuV3Spec({
    id: "advanced-pine-crossing",
    difficulty: "advanced",
    label: "Pine crossing",
    selectable: true,
    tags: ["generator-v3","asymmetric","interaction"],
    constructionSeed: 810006,
    carveSeed: 825008,
    orbitPolicy: "none",
    targetClues: 34,
    minUnitClues: 2,
    maxEmptyRun: 6,
    requireAsymmetric: true,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 82,
    expectedSolution: "947812635512436879836579421495768312623154798178923546761395284354281967289647153",
    expectedCarveAttempt: 21,
    expectedPuzzle: "907012030010400070806500001495008012000050098000020546760390000000200060009040100",
    expectedClueCount: 34,
    expectedUniquenessCalls: 1080,
    expectedUniquenessNodes: 29755,
    expectedFamilyMaskSignature: "010001100101001010101110100000100110000100111111010110000001100001100001110101000|101011010010100010101100001111001011000010011000010111110110000000100010001010100|110010100110101001001010001000001111111100101000001101100001010011011000000010001",
    expectedSourceMetrics: {
      clueCount: 34,
      rowClues: [5,3,4,6,3,4,4,2,3],
      columnClues: [4,3,4,4,5,2,2,6,4],
      boxClues: [5,4,3,3,3,7,3,4,2],
      minUnitClues: 2,
      maxEmptyRun: 5,
      symmetry: {"rotate180": false,"mainDiagonal": false,"verticalReflection": false}
    },
    expectedProfile: {
      version: 1,
      status: "solved-logically",
      hardestTechnique: "pointing",
      hardestBand: "interaction",
      logicalSteps: 50,
      placementSteps: 47,
      eliminationSteps: 3,
      explicitCandidateEliminations: 5,
      minAvailableSteps: 1,
      remainingCells: 0,
      techniques: ["naked-single","hidden-single","pointing","full-house"]
    }
  }),
  sudokuV3Spec({
    id: "hard-thunder-gate",
    difficulty: "hard",
    label: "Thunder gate",
    selectable: true,
    tags: ["generator-v3","rotational","subset"],
    constructionSeed: 810007,
    carveSeed: 826001,
    orbitPolicy: "rotate-180",
    targetClues: 30,
    minUnitClues: 1,
    maxEmptyRun: 7,
    requireAsymmetric: false,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 82,
    expectedSolution: "597143862128657934634829517873961425412385679956472381365714298749238156281596743",
    expectedCarveAttempt: 100,
    expectedPuzzle: "500003060008600900604020010870061000010000070000470081060010208009008100080500003",
    expectedClueCount: 30,
    expectedUniquenessCalls: 3077,
    expectedUniquenessNodes: 120307,
    expectedFamilyMaskSignature: "001001001101100100100010100010000100000101110110110000001010001010001010010100011|100001010001100100101010010110011000010000010000110011010010101001001100010100001|110001001010100001100010010000011101011101000001000001001010100001001110100100010",
    expectedSourceMetrics: {
      clueCount: 30,
      rowClues: [3,3,4,4,2,4,4,3,3],
      columnClues: [3,4,3,3,4,3,3,4,3],
      boxClues: [4,3,3,3,4,3,3,3,4],
      minUnitClues: 2,
      maxEmptyRun: 5,
      symmetry: {"rotate180": true,"mainDiagonal": false,"verticalReflection": false}
    },
    expectedProfile: {
      version: 1,
      status: "solved-logically",
      hardestTechnique: "naked-pair",
      hardestBand: "subset",
      logicalSteps: 56,
      placementSteps: 51,
      eliminationSteps: 5,
      explicitCandidateEliminations: 9,
      minAvailableSteps: 1,
      remainingCells: 0,
      techniques: ["hidden-single","naked-single","full-house","pointing","naked-pair"]
    }
  }),
  sudokuV3Spec({
    id: "hard-ink-maze",
    difficulty: "hard",
    label: "Ink maze",
    selectable: true,
    tags: ["generator-v3","asymmetric","subset"],
    constructionSeed: 810008,
    carveSeed: 827001,
    orbitPolicy: "none",
    targetClues: 29,
    minUnitClues: 1,
    maxEmptyRun: 7,
    requireAsymmetric: true,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 86,
    expectedSolution: "761982534254173869839465127623549781498731652175826943912358476387614295546297318",
    expectedCarveAttempt: 72,
    expectedPuzzle: "060080034000103860800005120003000001008730000070006900000300076380010200506000000",
    expectedClueCount: 29,
    expectedUniquenessCalls: 4223,
    expectedUniquenessNodes: 164537,
    expectedFamilyMaskSignature: "000011101100010101010100110001101000010010001001000010110100001101000000000001110|010010011000101110100001110001000001001110000010001100000100011110010100101000000|010100011001001101000110011001100010100000100100011000110000000000010101011001010",
    expectedSourceMetrics: {
      clueCount: 29,
      rowClues: [4,4,4,2,3,3,3,4,2],
      columnClues: [3,3,3,3,3,3,4,4,3],
      boxClues: [2,4,6,3,3,2,4,2,3],
      minUnitClues: 2,
      maxEmptyRun: 6,
      symmetry: {"rotate180": false,"mainDiagonal": false,"verticalReflection": false}
    },
    expectedProfile: {
      version: 1,
      status: "solved-logically",
      hardestTechnique: "naked-pair",
      hardestBand: "subset",
      logicalSteps: 54,
      placementSteps: 52,
      eliminationSteps: 2,
      explicitCandidateEliminations: 5,
      minAvailableSteps: 1,
      remainingCells: 0,
      techniques: ["hidden-single","naked-single","full-house","pointing","naked-pair"]
    }
  }),
  sudokuV3Spec({
    id: "expert-storm-lantern",
    difficulty: "expert",
    label: "Storm lantern",
    selectable: true,
    tags: ["generator-v3","rotational","deep-subset"],
    constructionSeed: 810009,
    carveSeed: 828002,
    orbitPolicy: "rotate-180",
    targetClues: 26,
    minUnitClues: 1,
    maxEmptyRun: 7,
    requireAsymmetric: false,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 82,
    expectedSolution: "796482351425361987381795462248917635659243718173856249934578126867124593512639874",
    expectedCarveAttempt: 20,
    expectedPuzzle: "006080050000001000300095400200000035600203008170000009004570006000100000010030800",
    expectedClueCount: 26,
    expectedUniquenessCalls: 838,
    expectedUniquenessNodes: 76031,
    expectedFamilyMaskSignature: "000010000100110001001100100100011010110000010100000110000001000010100001001101010|001010010000001000100011100100000011100101001110000001001110001000100000010010100|010101010100001001000100000011000100010000101010110100001001010100011100000010000",
    expectedSourceMetrics: {
      clueCount: 26,
      rowClues: [3,1,4,3,4,3,4,1,3],
      columnClues: [4,2,2,3,4,3,2,2,4],
      boxClues: [2,4,2,4,2,4,2,4,2],
      minUnitClues: 1,
      maxEmptyRun: 6,
      symmetry: {"rotate180": true,"mainDiagonal": false,"verticalReflection": false}
    },
    expectedProfile: {
      version: 1,
      status: "stalled",
      hardestTechnique: "naked-pair",
      hardestBand: "subset",
      logicalSteps: 23,
      placementSteps: 13,
      eliminationSteps: 10,
      explicitCandidateEliminations: 20,
      minAvailableSteps: 1,
      remainingCells: 42,
      techniques: ["hidden-single","pointing","naked-single","claiming","naked-pair"]
    }
  }),
  sudokuV3Spec({
    id: "expert-void-garden",
    difficulty: "expert",
    label: "Void garden",
    selectable: true,
    tags: ["generator-v3","asymmetric","deep-subset"],
    constructionSeed: 810010,
    carveSeed: 829001,
    orbitPolicy: "none",
    targetClues: 24,
    minUnitClues: 1,
    maxEmptyRun: 7,
    requireAsymmetric: true,
    expectedConstructionAttempt: 0,
    expectedConstructionNodes: 87,
    expectedSolution: "536874192984312567217965384748523619153649278629781453471258936895436721362197845",
    expectedCarveAttempt: 31,
    expectedPuzzle: "000070100080000000200960004000520009103000208009700050401008000090000001302000000",
    expectedClueCount: 24,
    expectedUniquenessCalls: 2560,
    expectedUniquenessNodes: 274725,
    expectedFamilyMaskSignature: "000010100010000000100110001000110001101000101001100010101001000010000001101000000|010000000100101010000100001101000011001001100000101010010000010101000000101010000|010011100000001010001000000100010001000011100110000110110000000110100000001000100",
    expectedSourceMetrics: {
      clueCount: 24,
      rowClues: [2,1,4,3,4,3,3,2,2],
      columnClues: [4,2,4,3,3,1,2,1,4],
      boxClues: [2,3,2,3,3,4,5,1,1],
      minUnitClues: 1,
      maxEmptyRun: 7,
      symmetry: {"rotate180": false,"mainDiagonal": false,"verticalReflection": false}
    },
    expectedProfile: {
      version: 1,
      status: "stalled",
      hardestTechnique: "naked-pair",
      hardestBand: "subset",
      logicalSteps: 25,
      placementSteps: 21,
      eliminationSteps: 4,
      explicitCandidateEliminations: 9,
      minAvailableSteps: 1,
      remainingCells: 36,
      techniques: ["hidden-single","naked-single","full-house","pointing","naked-pair"]
    }
  })
]);

export const SUGURU_V3_RESERVED_SIGNATURES = Object.freeze(["0,0,0,1,1,2,2,1,1,1,2,2,3,4,4,5,5,3,4,4,5,5,6,6,6","0,0,0,1,1,0,0,2,2,1,3,4,4,2,2,3,3,4,5,5,3,6,6,5,5","0,0,0,1,1,2,0,1,1,1,2,2,3,3,3,2,4,4,3,3,4,4,5,5,5","0,0,0,0,1,2,2,2,0,1,3,2,2,4,1,3,3,4,4,5,3,3,4,4,5"]);

const V3_SUGURU_LAYOUT_CAPS = deepFreeze({
  size: 5,
  rngVersion: 1,
  traversalVersion: 1,
  maxTopologyAttempts: 10000,
  maxAssignmentAttempts: 64,
  maxAssignmentNodesPerAttempt: 250000,
  maxAssignmentAggregateNodes: 4000000
});

const V3_SUGURU_LEVEL_CAPS = deepFreeze({
  maxCarveAttempts: 20000,
  maxUniquenessCalls: 20000,
  maxUniquenessNodesPerCall: 2000000,
  maxUniquenessAggregateNodes: 20000000
});

const V3_SUGURU_PROFILE_GATES = deepFreeze({
  "size5-easy": { allowedStatuses: ["solved-logically"], allowedHardestBands: ["local"], requiredAnyBands: ["local"], minLogicalSteps: 12, minPlacements: 12, minExplicitCandidateEliminations: 0 },
  "size5-medium": { allowedStatuses: ["solved-logically"], allowedHardestBands: ["interaction"], requiredAnyBands: ["interaction"], minLogicalSteps: 10, minPlacements: 8, minExplicitCandidateEliminations: 1 },
  "size5-challenge": { allowedStatuses: ["solved-logically","stalled"], allowedHardestBands: ["interaction","subset"], requiredAnyBands: ["interaction","subset"], minLogicalSteps: 8, minPlacements: 4, minExplicitCandidateEliminations: 1, maxRemainingCells: 12 }
});

function suguruV3Spec(spec) {
  return deepFreeze({
    ...V3_SUGURU_LAYOUT_CAPS,
    ...spec,
    levels: spec.levels.map((level) => ({
      ...V3_SUGURU_LEVEL_CAPS,
      ...level,
      profileGate: V3_SUGURU_PROFILE_GATES[level.level]
    }))
  });
}

export const SUGURU_V3_CONTENT_SPECS = Object.freeze([
  suguruV3Spec({
    id: "willow",
    label: "Willow",
    layoutFamilyId: "willow-v3",
    selectable: true,
    topologySeed: 910006,
    histogram: [5,5,4,4,4,3],
    assignmentSeed: 920051,
    expectedTopologyAttempt: 297,
    expectedTopologyNodes: 0,
    expectedCages: [[5,10,15,16,20],[0,1,6,11,12],[17,21,22,23],[13,18,19,24],[4,8,9,14],[2,3,7]],
    expectedCanonicalSignature: "0,0,0,0,1,2,0,1,1,1,2,2,1,3,3,2,4,4,5,3,4,4,5,5,5",
    expectedAssignmentAttempt: 0,
    expectedAssignmentNodes: 29,
    expectedSolution: "3412125343312124543413212",
    expectedCompactness: {
      histogram: [5,5,4,4,4,3],
      cageMetrics: [
        {"fillRatio": 0.625,"perimeter": 12,"rowSpan": 4,"columnSpan": 2},
        {"fillRatio": 0.5555555555555556,"perimeter": 12,"rowSpan": 3,"columnSpan": 3},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 2,"columnSpan": 3},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 3,"columnSpan": 2},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 3,"columnSpan": 2},
        {"fillRatio": 0.75,"perimeter": 8,"rowSpan": 2,"columnSpan": 2}
      ],
      partitionPerimeter: 62
    },
    levels: [
      {
        level: "size5-easy",
        id: "suguru-size5-willow-garden",
        label: "Willow garden",
        tags: ["generator-v3","willow","easy"],
        carveSeed: 930001,
        targetClues: 12,
        expectedCarveAttempt: 0,
        expectedPuzzle: "0010005343000004500413202",
        expectedClueCount: 12,
        expectedUniquenessCalls: 13,
        expectedUniquenessNodes: 104,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cell-single",
          hardestBand: "local",
          logicalSteps: 13,
          placementSteps: 13,
          eliminationSteps: 0,
          explicitCandidateEliminations: 0,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-full-house","cell-single"]
        }
      },
      {
        level: "size5-medium",
        id: "suguru-size5-willow-bridge",
        label: "Willow bridge",
        tags: ["generator-v3","willow","bridge"],
        carveSeed: 940001,
        targetClues: 8,
        expectedCarveAttempt: 5,
        expectedPuzzle: "3000105000300020000013002",
        expectedClueCount: 8,
        expectedUniquenessCalls: 104,
        expectedUniquenessNodes: 1131,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 21,
          placementSteps: 17,
          eliminationSteps: 4,
          explicitCandidateEliminations: 4,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cross-cage","cage-hidden-single","cell-single","cage-full-house"]
        }
      },
      {
        level: "size5-challenge",
        id: "suguru-size5-willow-deep",
        label: "Willow deep",
        tags: ["generator-v3","willow","challenge"],
        carveSeed: 950001,
        targetClues: 6,
        expectedCarveAttempt: 0,
        expectedPuzzle: "3000005300002000500003000",
        expectedClueCount: 6,
        expectedUniquenessCalls: 19,
        expectedUniquenessNodes: 218,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 22,
          placementSteps: 19,
          eliminationSteps: 3,
          explicitCandidateEliminations: 3,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-hidden-single","cross-cage","cell-single","cage-full-house"]
        }
      }
    ]
  }),
  suguruV3Spec({
    id: "ember",
    label: "Ember",
    layoutFamilyId: "ember-v3",
    selectable: true,
    topologySeed: 911017,
    histogram: [5,5,4,4,4,3],
    assignmentSeed: 921161,
    expectedTopologyAttempt: 340,
    expectedTopologyNodes: 0,
    expectedCages: [[0,5,6,10,11],[8,9,13,14,18],[19,22,23,24],[1,2,3,4],[15,16,20,21],[7,12,17]],
    expectedCanonicalSignature: "0,0,0,0,1,2,2,3,1,1,2,2,3,1,1,4,2,3,5,5,4,4,4,5,5",
    expectedAssignmentAttempt: 0,
    expectedAssignmentNodes: 52,
    expectedSolution: "3134225213143423215114324",
    expectedCompactness: {
      histogram: [5,5,4,4,4,3],
      cageMetrics: [
        {"fillRatio": 0.8333333333333334,"perimeter": 10,"rowSpan": 3,"columnSpan": 2},
        {"fillRatio": 0.8333333333333334,"perimeter": 10,"rowSpan": 3,"columnSpan": 2},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 2,"columnSpan": 3},
        {"fillRatio": 1,"perimeter": 10,"rowSpan": 1,"columnSpan": 4},
        {"fillRatio": 1,"perimeter": 8,"rowSpan": 2,"columnSpan": 2},
        {"fillRatio": 1,"perimeter": 8,"rowSpan": 3,"columnSpan": 1}
      ],
      partitionPerimeter: 56
    },
    levels: [
      {
        level: "size5-easy",
        id: "suguru-size5-ember-garden",
        label: "Ember garden",
        tags: ["generator-v3","ember","easy"],
        carveSeed: 931001,
        targetClues: 12,
        expectedCarveAttempt: 0,
        expectedPuzzle: "3100005210000423015100004",
        expectedClueCount: 12,
        expectedUniquenessCalls: 15,
        expectedUniquenessNodes: 125,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cell-single",
          hardestBand: "local",
          logicalSteps: 13,
          placementSteps: 13,
          eliminationSteps: 0,
          explicitCandidateEliminations: 0,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-full-house","cell-single"]
        }
      },
      {
        level: "size5-medium",
        id: "suguru-size5-ember-bridge",
        label: "Ember bridge",
        tags: ["generator-v3","ember","bridge"],
        carveSeed: 941001,
        targetClues: 8,
        expectedCarveAttempt: 1,
        expectedPuzzle: "3000005000003403000104004",
        expectedClueCount: 8,
        expectedUniquenessCalls: 34,
        expectedUniquenessNodes: 383,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 20,
          placementSteps: 17,
          eliminationSteps: 3,
          explicitCandidateEliminations: 4,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cross-cage","cell-single","cage-full-house","cage-hidden-single"]
        }
      },
      {
        level: "size5-challenge",
        id: "suguru-size5-ember-deep",
        label: "Ember deep",
        tags: ["generator-v3","ember","challenge"],
        carveSeed: 951001,
        targetClues: 6,
        expectedCarveAttempt: 0,
        expectedPuzzle: "0000025000100000000010024",
        expectedClueCount: 6,
        expectedUniquenessCalls: 22,
        expectedUniquenessNodes: 432,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 26,
          placementSteps: 19,
          eliminationSteps: 7,
          explicitCandidateEliminations: 8,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cross-cage","cell-single","cage-full-house","cage-hidden-single"]
        }
      }
    ]
  }),
  suguruV3Spec({
    id: "heron",
    label: "Heron",
    layoutFamilyId: "heron-v3",
    selectable: true,
    topologySeed: 912027,
    histogram: [5,5,5,4,3,3],
    assignmentSeed: 922261,
    expectedTopologyAttempt: 359,
    expectedTopologyNodes: 0,
    expectedCages: [[3,4,6,7,8],[18,19,22,23,24],[15,16,17,20,21],[0,1,2,5],[10,11,12],[9,13,14]],
    expectedCanonicalSignature: "0,0,0,1,1,0,0,1,1,1,2,2,3,3,3,2,4,4,4,5,4,4,5,5,5",
    expectedAssignmentAttempt: 0,
    expectedAssignmentNodes: 37,
    expectedSolution: "1232345141123233515424231",
    expectedCompactness: {
      histogram: [5,5,5,4,3,3],
      cageMetrics: [
        {"fillRatio": 0.625,"perimeter": 12,"rowSpan": 2,"columnSpan": 4},
        {"fillRatio": 0.8333333333333334,"perimeter": 10,"rowSpan": 2,"columnSpan": 3},
        {"fillRatio": 0.8333333333333334,"perimeter": 10,"rowSpan": 2,"columnSpan": 3},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 2,"columnSpan": 3},
        {"fillRatio": 1,"perimeter": 8,"rowSpan": 1,"columnSpan": 3},
        {"fillRatio": 0.75,"perimeter": 8,"rowSpan": 2,"columnSpan": 2}
      ],
      partitionPerimeter: 58
    },
    levels: [
      {
        level: "size5-easy",
        id: "suguru-size5-heron-garden",
        label: "Heron garden",
        tags: ["generator-v3","heron","easy"],
        carveSeed: 932001,
        targetClues: 12,
        expectedCarveAttempt: 0,
        expectedPuzzle: "0232000100100030515004031",
        expectedClueCount: 12,
        expectedUniquenessCalls: 16,
        expectedUniquenessNodes: 149,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cell-single",
          hardestBand: "local",
          logicalSteps: 13,
          placementSteps: 13,
          eliminationSteps: 0,
          explicitCandidateEliminations: 0,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cell-single","cage-full-house"]
        }
      },
      {
        level: "size5-medium",
        id: "suguru-size5-heron-bridge",
        label: "Heron bridge",
        tags: ["generator-v3","heron","bridge"],
        carveSeed: 942001,
        targetClues: 8,
        expectedCarveAttempt: 0,
        expectedPuzzle: "0200000000003033510400200",
        expectedClueCount: 8,
        expectedUniquenessCalls: 20,
        expectedUniquenessNodes: 213,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 18,
          placementSteps: 17,
          eliminationSteps: 1,
          explicitCandidateEliminations: 1,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cell-single","cage-full-house","cage-hidden-single","cross-cage"]
        }
      },
      {
        level: "size5-challenge",
        id: "suguru-size5-heron-deep",
        label: "Heron deep",
        tags: ["generator-v3","heron","challenge"],
        carveSeed: 952001,
        targetClues: 6,
        expectedCarveAttempt: 0,
        expectedPuzzle: "0030005000000000000424200",
        expectedClueCount: 6,
        expectedUniquenessCalls: 24,
        expectedUniquenessNodes: 553,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 26,
          placementSteps: 19,
          eliminationSteps: 7,
          explicitCandidateEliminations: 7,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-hidden-single","cross-cage","cell-single","cage-full-house"]
        }
      }
    ]
  }),
  suguruV3Spec({
    id: "lotus",
    label: "Lotus",
    layoutFamilyId: "lotus-v3",
    selectable: true,
    topologySeed: 913001,
    histogram: [5,5,5,4,3,3],
    assignmentSeed: 923001,
    expectedTopologyAttempt: 2,
    expectedTopologyNodes: 0,
    expectedCages: [[14,18,19,23,24],[1,2,3,7,12],[11,16,17,21,22],[4,8,9,13],[10,15,20],[0,5,6]],
    expectedCanonicalSignature: "0,0,0,1,1,0,0,1,1,2,3,3,2,2,2,3,3,3,4,2,5,5,5,4,4",
    expectedAssignmentAttempt: 0,
    expectedAssignmentNodes: 76,
    expectedSolution: "3452112143353252414113232",
    expectedCompactness: {
      histogram: [5,5,5,4,3,3],
      cageMetrics: [
        {"fillRatio": 0.8333333333333334,"perimeter": 10,"rowSpan": 3,"columnSpan": 2},
        {"fillRatio": 0.5555555555555556,"perimeter": 12,"rowSpan": 3,"columnSpan": 3},
        {"fillRatio": 0.8333333333333334,"perimeter": 10,"rowSpan": 3,"columnSpan": 2},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 3,"columnSpan": 2},
        {"fillRatio": 1,"perimeter": 8,"rowSpan": 3,"columnSpan": 1},
        {"fillRatio": 0.75,"perimeter": 8,"rowSpan": 2,"columnSpan": 2}
      ],
      partitionPerimeter: 58
    },
    levels: [
      {
        level: "size5-easy",
        id: "suguru-size5-lotus-garden",
        label: "Lotus garden",
        tags: ["generator-v3","lotus","easy"],
        carveSeed: 933001,
        targetClues: 12,
        expectedCarveAttempt: 0,
        expectedPuzzle: "0002112100053050010013002",
        expectedClueCount: 12,
        expectedUniquenessCalls: 15,
        expectedUniquenessNodes: 132,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cell-single",
          hardestBand: "local",
          logicalSteps: 13,
          placementSteps: 13,
          eliminationSteps: 0,
          explicitCandidateEliminations: 0,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-full-house","cell-single"]
        }
      },
      {
        level: "size5-medium",
        id: "suguru-size5-lotus-bridge",
        label: "Lotus bridge",
        tags: ["generator-v3","lotus","bridge"],
        carveSeed: 943001,
        targetClues: 8,
        expectedCarveAttempt: 0,
        expectedPuzzle: "3002002003050050004010000",
        expectedClueCount: 8,
        expectedUniquenessCalls: 19,
        expectedUniquenessNodes: 225,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 18,
          placementSteps: 17,
          eliminationSteps: 1,
          explicitCandidateEliminations: 1,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-full-house","cell-single","cage-hidden-single","cross-cage"]
        }
      },
      {
        level: "size5-challenge",
        id: "suguru-size5-lotus-deep",
        label: "Lotus deep",
        tags: ["generator-v3","lotus","challenge"],
        carveSeed: 953001,
        targetClues: 6,
        expectedCarveAttempt: 0,
        expectedPuzzle: "3002100000050052000000000",
        expectedClueCount: 6,
        expectedUniquenessCalls: 21,
        expectedUniquenessNodes: 294,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 20,
          placementSteps: 19,
          eliminationSteps: 1,
          explicitCandidateEliminations: 1,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-hidden-single","cross-cage","cell-single","cage-full-house"]
        }
      }
    ]
  }),
  suguruV3Spec({
    id: "rain",
    label: "Rain",
    layoutFamilyId: "rain-v3",
    selectable: true,
    topologySeed: 914031,
    histogram: [5,4,4,4,3,3,2],
    assignmentSeed: 924301,
    expectedTopologyAttempt: 157,
    expectedTopologyNodes: 0,
    expectedCages: [[12,13,16,17,21],[3,4,8,9],[14,18,19,24],[5,6,7,11],[0,1,2],[10,15,20],[22,23]],
    expectedCanonicalSignature: "0,0,0,1,1,2,0,3,1,1,2,3,3,4,5,3,3,4,4,5,6,6,6,4,5",
    expectedAssignmentAttempt: 0,
    expectedAssignmentNodes: 70,
    expectedSolution: "3121224343312122453413121",
    expectedCompactness: {
      histogram: [5,4,4,4,3,3,2],
      cageMetrics: [
        {"fillRatio": 0.5555555555555556,"perimeter": 12,"rowSpan": 3,"columnSpan": 3},
        {"fillRatio": 1,"perimeter": 8,"rowSpan": 2,"columnSpan": 2},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 3,"columnSpan": 2},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 2,"columnSpan": 3},
        {"fillRatio": 1,"perimeter": 8,"rowSpan": 1,"columnSpan": 3},
        {"fillRatio": 1,"perimeter": 8,"rowSpan": 3,"columnSpan": 1},
        {"fillRatio": 1,"perimeter": 6,"rowSpan": 1,"columnSpan": 2}
      ],
      partitionPerimeter: 62
    },
    levels: [
      {
        level: "size5-easy",
        id: "suguru-size5-rain-garden",
        label: "Rain garden",
        tags: ["generator-v3","rain","easy"],
        carveSeed: 934001,
        targetClues: 12,
        expectedCarveAttempt: 0,
        expectedPuzzle: "0021200040302002453013000",
        expectedClueCount: 12,
        expectedUniquenessCalls: 13,
        expectedUniquenessNodes: 104,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cell-single",
          hardestBand: "local",
          logicalSteps: 13,
          placementSteps: 13,
          eliminationSteps: 0,
          explicitCandidateEliminations: 0,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-full-house","cell-single"]
        }
      },
      {
        level: "size5-medium",
        id: "suguru-size5-rain-bridge",
        label: "Rain bridge",
        tags: ["generator-v3","rain","bridge"],
        carveSeed: 944001,
        targetClues: 8,
        expectedCarveAttempt: 143,
        expectedPuzzle: "0101200000000000050410120",
        expectedClueCount: 8,
        expectedUniquenessCalls: 2586,
        expectedUniquenessNodes: 27098,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 20,
          placementSteps: 17,
          eliminationSteps: 3,
          explicitCandidateEliminations: 3,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cell-single","cage-full-house","cage-hidden-single","cross-cage"]
        }
      },
      {
        level: "size5-challenge",
        id: "suguru-size5-rain-deep",
        label: "Rain deep",
        tags: ["generator-v3","rain","challenge"],
        carveSeed: 954001,
        targetClues: 6,
        expectedCarveAttempt: 1,
        expectedPuzzle: "0000000003000020053003100",
        expectedClueCount: 6,
        expectedUniquenessCalls: 41,
        expectedUniquenessNodes: 474,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 21,
          placementSteps: 19,
          eliminationSteps: 2,
          explicitCandidateEliminations: 2,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-full-house","cage-hidden-single","cross-cage","cell-single"]
        }
      }
    ]
  }),
  suguruV3Spec({
    id: "obsidian",
    label: "Obsidian",
    layoutFamilyId: "obsidian-v3",
    selectable: true,
    topologySeed: 915010,
    histogram: [5,4,4,4,3,3,2],
    assignmentSeed: 925091,
    expectedTopologyAttempt: 393,
    expectedTopologyNodes: 0,
    expectedCages: [[2,3,4,8,9],[1,6,7,12],[10,11,16,17],[13,14,18,19],[22,23,24],[15,20,21],[0,5]],
    expectedCanonicalSignature: "0,0,0,1,1,2,2,3,3,1,2,2,4,3,3,5,5,4,4,6,5,5,5,4,6",
    expectedAssignmentAttempt: 0,
    expectedAssignmentNodes: 233,
    expectedSolution: "1353224241131322424113132",
    expectedCompactness: {
      histogram: [5,4,4,4,3,3,2],
      cageMetrics: [
        {"fillRatio": 0.8333333333333334,"perimeter": 10,"rowSpan": 2,"columnSpan": 3},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 3,"columnSpan": 2},
        {"fillRatio": 0.6666666666666666,"perimeter": 10,"rowSpan": 2,"columnSpan": 3},
        {"fillRatio": 1,"perimeter": 8,"rowSpan": 2,"columnSpan": 2},
        {"fillRatio": 1,"perimeter": 8,"rowSpan": 1,"columnSpan": 3},
        {"fillRatio": 0.75,"perimeter": 8,"rowSpan": 2,"columnSpan": 2},
        {"fillRatio": 1,"perimeter": 6,"rowSpan": 2,"columnSpan": 1}
      ],
      partitionPerimeter: 60
    },
    levels: [
      {
        level: "size5-easy",
        id: "suguru-size5-obsidian-garden",
        label: "Obsidian garden",
        tags: ["generator-v3","obsidian","easy"],
        carveSeed: 935001,
        targetClues: 12,
        expectedCarveAttempt: 0,
        expectedPuzzle: "1350004040101020020010032",
        expectedClueCount: 12,
        expectedUniquenessCalls: 13,
        expectedUniquenessNodes: 104,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cell-single",
          hardestBand: "local",
          logicalSteps: 13,
          placementSteps: 13,
          eliminationSteps: 0,
          explicitCandidateEliminations: 0,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-full-house","cell-single"]
        }
      },
      {
        level: "size5-medium",
        id: "suguru-size5-obsidian-bridge",
        label: "Obsidian bridge",
        tags: ["generator-v3","obsidian","bridge"],
        carveSeed: 945001,
        targetClues: 8,
        expectedCarveAttempt: 83,
        expectedPuzzle: "1300204041000300000000002",
        expectedClueCount: 8,
        expectedUniquenessCalls: 1469,
        expectedUniquenessNodes: 15094,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 19,
          placementSteps: 17,
          eliminationSteps: 2,
          explicitCandidateEliminations: 2,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cage-full-house","cell-single","cross-cage"]
        }
      },
      {
        level: "size5-challenge",
        id: "suguru-size5-obsidian-deep",
        label: "Obsidian deep",
        tags: ["generator-v3","obsidian","challenge"],
        carveSeed: 955001,
        targetClues: 6,
        expectedCarveAttempt: 1,
        expectedPuzzle: "0350004040030000000000002",
        expectedClueCount: 6,
        expectedUniquenessCalls: 38,
        expectedUniquenessNodes: 434,
        expectedProfile: {
          version: 1,
          status: "solved-logically",
          hardestTechnique: "cross-cage",
          hardestBand: "interaction",
          logicalSteps: 21,
          placementSteps: 19,
          eliminationSteps: 2,
          explicitCandidateEliminations: 3,
          minAvailableSteps: 1,
          remainingCells: 0,
          techniques: ["cross-cage","cage-hidden-single","cell-single","cage-full-house"]
        }
      }
    ]
  })
]);
