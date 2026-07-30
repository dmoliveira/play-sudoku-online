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
