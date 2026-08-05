(function () {
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }
  window.GENERATED_CONTENT = deepFreeze({
  "version": 2,
  "sudokuTemplates": {
    "easy": [
      {
        "id": "easy-sunlit-maple",
        "label": "Sunlit maple",
        "puzzle": "400917503325046790097235084254601379860790452970524168540160237732458916019302845",
        "solution": "486917523325846791197235684254681379861793452973524168548169237732458916619372845",
        "tags": [
          "singles",
          "first-party",
          "sunlit"
        ],
        "selectable": true,
        "minTraceSteps": 15,
        "minPlacements": 15,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "full-house",
          "hardestBand": "local",
          "logicalSteps": 15,
          "placementSteps": 15,
          "eliminationSteps": 0,
          "explicitCandidateEliminations": 0,
          "minAvailableSteps": 3,
          "remainingCells": 0,
          "techniques": [
            "full-house"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "unique-carve",
          "seed": 140401,
          "attempt": 0
        }
      },
      {
        "id": "easy-morning-koi",
        "label": "Morning koi",
        "puzzle": "070628350862350910004000086203041708680705021107860503310000800098017635026583040",
        "solution": "971628354862354917534179286253941768689735421147862593315496872498217635726583149",
        "tags": [
          "generator-v3",
          "rotational",
          "morning"
        ],
        "selectable": true,
        "minTraceSteps": 25,
        "minPlacements": 25,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "naked-single",
          "hardestBand": "local",
          "logicalSteps": 31,
          "placementSteps": 31,
          "eliminationSteps": 0,
          "explicitCandidateEliminations": 0,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "naked-single",
            "full-house"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810001,
          "constructionAttempt": 0,
          "constructionNodes": 86,
          "carveSeed": 820001,
          "carveAttempt": 3,
          "orbitPolicy": "rotate-180",
          "uniquenessCalls": 64,
          "uniquenessNodes": 1135
        }
      },
      {
        "id": "easy-bamboo-window",
        "label": "Bamboo window",
        "puzzle": "003804901040030700901752030204398570079600200605207349530921087007506100100003600",
        "solution": "753864921842139765961752834214398576379645218685217349536921487427586193198473652",
        "tags": [
          "generator-v3",
          "diagonal",
          "bamboo"
        ],
        "selectable": true,
        "minTraceSteps": 25,
        "minPlacements": 25,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "naked-single",
          "hardestBand": "local",
          "logicalSteps": 35,
          "placementSteps": 35,
          "eliminationSteps": 0,
          "explicitCandidateEliminations": 0,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "naked-single",
            "full-house"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810002,
          "constructionAttempt": 0,
          "constructionNodes": 82,
          "carveSeed": 821001,
          "carveAttempt": 1,
          "orbitPolicy": "main-diagonal",
          "uniquenessCalls": 40,
          "uniquenessNodes": 795
        }
      }
    ],
    "medium": [
      {
        "id": "medium-river-stones",
        "label": "River stones",
        "puzzle": "435682917610040085008050400500030009000504000001000300904060801070408090850913042",
        "solution": "435682917617349285298157463542831679369574128781296354924765831173428596856913742",
        "tags": [
          "generator-v3",
          "reflection",
          "river"
        ],
        "selectable": true,
        "minTraceSteps": 36,
        "minPlacements": 34,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "naked-single",
          "hardestBand": "local",
          "logicalSteps": 41,
          "placementSteps": 41,
          "eliminationSteps": 0,
          "explicitCandidateEliminations": 0,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "naked-single",
            "full-house"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810003,
          "constructionAttempt": 0,
          "constructionNodes": 82,
          "carveSeed": 822001,
          "carveAttempt": 4,
          "orbitPolicy": "vertical-reflection",
          "uniquenessCalls": 126,
          "uniquenessNodes": 3097
        }
      },
      {
        "id": "medium-crane-shadow",
        "label": "Crane shadow",
        "puzzle": "280010900136450780000086030400061050002504190051900000510300024060125009700040000",
        "solution": "285713946136459782947286531493861257672534198851972463518397624364125879729648315",
        "tags": [
          "generator-v3",
          "asymmetric",
          "crane"
        ],
        "selectable": true,
        "minTraceSteps": 36,
        "minPlacements": 34,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "naked-single",
          "hardestBand": "local",
          "logicalSteps": 43,
          "placementSteps": 43,
          "eliminationSteps": 0,
          "explicitCandidateEliminations": 0,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "naked-single",
            "full-house"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810004,
          "constructionAttempt": 0,
          "constructionNodes": 82,
          "carveSeed": 823001,
          "carveAttempt": 1,
          "orbitPolicy": "none",
          "uniquenessCalls": 89,
          "uniquenessNodes": 2104
        }
      }
    ],
    "advanced": [
      {
        "id": "advanced-moon-bridge",
        "label": "Moon bridge",
        "puzzle": "307506009008010304190307650500900000030000060000005003076402031203060900400803706",
        "solution": "327546189658219374194387652562938417739124568841675293976452831283761945415893726",
        "tags": [
          "generator-v3",
          "rotational",
          "interaction"
        ],
        "selectable": true,
        "minTraceSteps": 40,
        "minPlacements": 36,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "pointing",
          "hardestBand": "interaction",
          "logicalSteps": 46,
          "placementSteps": 45,
          "eliminationSteps": 1,
          "explicitCandidateEliminations": 2,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "naked-single",
            "full-house",
            "hidden-single",
            "pointing"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810005,
          "constructionAttempt": 0,
          "constructionNodes": 82,
          "carveSeed": 824004,
          "carveAttempt": 83,
          "orbitPolicy": "rotate-180",
          "uniquenessCalls": 2097,
          "uniquenessNodes": 56107
        }
      },
      {
        "id": "advanced-pine-crossing",
        "label": "Pine crossing",
        "puzzle": "907012030010400070806500001495008012000050098000020546760390000000200060009040100",
        "solution": "947812635512436879836579421495768312623154798178923546761395284354281967289647153",
        "tags": [
          "generator-v3",
          "asymmetric",
          "interaction"
        ],
        "selectable": true,
        "minTraceSteps": 40,
        "minPlacements": 36,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "pointing",
          "hardestBand": "interaction",
          "logicalSteps": 50,
          "placementSteps": 47,
          "eliminationSteps": 3,
          "explicitCandidateEliminations": 5,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "naked-single",
            "hidden-single",
            "pointing",
            "full-house"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810006,
          "constructionAttempt": 0,
          "constructionNodes": 82,
          "carveSeed": 825008,
          "carveAttempt": 21,
          "orbitPolicy": "none",
          "uniquenessCalls": 1080,
          "uniquenessNodes": 29755
        }
      }
    ],
    "hard": [
      {
        "id": "hard-temple-current",
        "label": "Temple current",
        "puzzle": "400050300051306009306000005904502000003010000060000900040100050030007092020630870",
        "solution": "498251367251376489376498215914562738783914526562783941847129653635847192129635874",
        "tags": [
          "candidate-lines",
          "first-party",
          "temple"
        ],
        "selectable": true,
        "minTraceSteps": 12,
        "minPlacements": 4,
        "logicProfile": {
          "version": 1,
          "status": "stalled",
          "hardestTechnique": "pointing",
          "hardestBand": "interaction",
          "logicalSteps": 32,
          "placementSteps": 31,
          "eliminationSteps": 1,
          "explicitCandidateEliminations": 1,
          "minAvailableSteps": 1,
          "remainingCells": 19,
          "techniques": [
            "naked-single",
            "hidden-single",
            "full-house",
            "pointing"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "unique-carve",
          "seed": 140402,
          "attempt": 1
        }
      },
      {
        "id": "hard-pair-current",
        "label": "Pair current",
        "puzzle": "480000020005000700000035080000080309861003000070504108008160200702000010610000040",
        "solution": "486917523325846791197235684254681379861793452973524168548169237732458916619372845",
        "tags": [
          "naked-pair",
          "pair-focus",
          "first-party",
          "current"
        ],
        "selectable": true,
        "minTraceSteps": 52,
        "minPlacements": 51,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "naked-pair",
          "hardestBand": "subset",
          "logicalSteps": 52,
          "placementSteps": 51,
          "eliminationSteps": 1,
          "explicitCandidateEliminations": 3,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "naked-single",
            "hidden-single",
            "full-house",
            "naked-pair"
          ]
        },
        "logicFocus": {
          "profileVersion": 1,
          "technique": "naked-pair",
          "traceIndex": 10,
          "candidateEliminations": 3,
          "downstreamPlacements": 41
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "sample-clues",
          "seed": 1364197376,
          "attempt": 1494
        }
      },
      {
        "id": "hard-thunder-gate",
        "label": "Thunder gate",
        "puzzle": "500003060008600900604020010870061000010000070000470081060010208009008100080500003",
        "solution": "597143862128657934634829517873961425412385679956472381365714298749238156281596743",
        "tags": [
          "generator-v3",
          "rotational",
          "subset"
        ],
        "selectable": true,
        "minTraceSteps": 45,
        "minPlacements": 40,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "naked-pair",
          "hardestBand": "subset",
          "logicalSteps": 56,
          "placementSteps": 51,
          "eliminationSteps": 5,
          "explicitCandidateEliminations": 9,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "hidden-single",
            "naked-single",
            "full-house",
            "pointing",
            "naked-pair"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810007,
          "constructionAttempt": 0,
          "constructionNodes": 82,
          "carveSeed": 826001,
          "carveAttempt": 100,
          "orbitPolicy": "rotate-180",
          "uniquenessCalls": 3077,
          "uniquenessNodes": 120307
        }
      },
      {
        "id": "hard-ink-maze",
        "label": "Ink maze",
        "puzzle": "060080034000103860800005120003000001008730000070006900000300076380010200506000000",
        "solution": "761982534254173869839465127623549781498731652175826943912358476387614295546297318",
        "tags": [
          "generator-v3",
          "asymmetric",
          "subset"
        ],
        "selectable": true,
        "minTraceSteps": 45,
        "minPlacements": 40,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "naked-pair",
          "hardestBand": "subset",
          "logicalSteps": 54,
          "placementSteps": 52,
          "eliminationSteps": 2,
          "explicitCandidateEliminations": 5,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "hidden-single",
            "naked-single",
            "full-house",
            "pointing",
            "naked-pair"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810008,
          "constructionAttempt": 0,
          "constructionNodes": 86,
          "carveSeed": 827001,
          "carveAttempt": 72,
          "orbitPolicy": "none",
          "uniquenessCalls": 4223,
          "uniquenessNodes": 164537
        }
      }
    ],
    "expert": [
      {
        "id": "expert-starlit-pines",
        "label": "Starlit pines",
        "puzzle": "009000400003000087210000300040000010032000600500302000980031002007800000000040090",
        "solution": "879563421653124987214789365748956213132478659596312874985631742427895136361247598",
        "tags": [
          "subsets",
          "first-party",
          "starlit"
        ],
        "selectable": true,
        "minTraceSteps": 6,
        "minPlacements": 2,
        "logicProfile": {
          "version": 1,
          "status": "stalled",
          "hardestTechnique": "naked-pair",
          "hardestBand": "subset",
          "logicalSteps": 23,
          "placementSteps": 17,
          "eliminationSteps": 6,
          "explicitCandidateEliminations": 10,
          "minAvailableSteps": 1,
          "remainingCells": 39,
          "techniques": [
            "hidden-single",
            "naked-single",
            "full-house",
            "pointing",
            "naked-pair"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "unique-carve",
          "seed": 140403,
          "attempt": 1
        }
      },
      {
        "id": "expert-storm-lantern",
        "label": "Storm lantern",
        "puzzle": "006080050000001000300095400200000035600203008170000009004570006000100000010030800",
        "solution": "796482351425361987381795462248917635659243718173856249934578126867124593512639874",
        "tags": [
          "generator-v3",
          "rotational",
          "deep-subset"
        ],
        "selectable": true,
        "minTraceSteps": 20,
        "minPlacements": 10,
        "logicProfile": {
          "version": 1,
          "status": "stalled",
          "hardestTechnique": "naked-pair",
          "hardestBand": "subset",
          "logicalSteps": 23,
          "placementSteps": 13,
          "eliminationSteps": 10,
          "explicitCandidateEliminations": 20,
          "minAvailableSteps": 1,
          "remainingCells": 42,
          "techniques": [
            "hidden-single",
            "pointing",
            "naked-single",
            "claiming",
            "naked-pair"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810009,
          "constructionAttempt": 0,
          "constructionNodes": 82,
          "carveSeed": 828002,
          "carveAttempt": 20,
          "orbitPolicy": "rotate-180",
          "uniquenessCalls": 838,
          "uniquenessNodes": 76031
        }
      },
      {
        "id": "expert-void-garden",
        "label": "Void garden",
        "puzzle": "000070100080000000200960004000520009103000208009700050401008000090000001302000000",
        "solution": "536874192984312567217965384748523619153649278629781453471258936895436721362197845",
        "tags": [
          "generator-v3",
          "asymmetric",
          "deep-subset"
        ],
        "selectable": true,
        "minTraceSteps": 20,
        "minPlacements": 10,
        "logicProfile": {
          "version": 1,
          "status": "stalled",
          "hardestTechnique": "naked-pair",
          "hardestBand": "subset",
          "logicalSteps": 25,
          "placementSteps": 21,
          "eliminationSteps": 4,
          "explicitCandidateEliminations": 9,
          "minAvailableSteps": 1,
          "remainingCells": 36,
          "techniques": [
            "hidden-single",
            "naked-single",
            "full-house",
            "pointing",
            "naked-pair"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 3,
          "strategy": "seeded-orbit-carve",
          "rngVersion": 1,
          "traversalVersion": 1,
          "constructionSeed": 810010,
          "constructionAttempt": 0,
          "constructionNodes": 87,
          "carveSeed": 829001,
          "carveAttempt": 31,
          "orbitPolicy": "none",
          "uniquenessCalls": 2560,
          "uniquenessNodes": 274725
        }
      }
    ]
  },
  "suguruLayouts": {
    "mist": {
      "size": 5,
      "cages": [
        [
          5,
          6,
          10,
          11,
          12
        ],
        [
          9,
          13,
          14,
          19
        ],
        [
          3,
          4,
          7,
          8
        ],
        [
          15,
          16,
          17,
          20,
          21
        ],
        [
          0,
          1,
          2
        ],
        [
          18,
          22,
          23,
          24
        ]
      ],
      "solution": "1234334121125345341221234",
      "layoutFamilyId": "mist-v1",
      "origin": {
        "kind": "first-party-construction",
        "generatorVersion": 2,
        "seed": 240401
      }
    },
    "cedar": {
      "size": 5,
      "cages": [
        [
          12,
          13,
          17,
          18,
          19
        ],
        [
          3,
          4,
          8,
          9,
          14
        ],
        [
          16,
          21,
          22,
          23,
          24
        ],
        [
          0,
          5
        ],
        [
          1,
          2,
          6,
          7,
          11
        ],
        [
          10,
          15,
          20
        ]
      ],
      "solution": "1414525231131522424331352",
      "layoutFamilyId": "cedar-v1",
      "origin": {
        "kind": "first-party-construction",
        "generatorVersion": 2,
        "seed": 240402
      }
    }
  },
  "suguruEntries": {
    "size5-easy": [
      {
        "id": "suguru-size5-mist-garden",
        "label": "Mist garden",
        "layout": "mist",
        "puzzle": "0000300020105045300220004",
        "tags": [
          "starter",
          "new-layout",
          "mist"
        ],
        "selectable": true,
        "minTraceSteps": 15,
        "minPlacements": 15,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "cell-single",
          "hardestBand": "local",
          "logicalSteps": 15,
          "placementSteps": 15,
          "eliminationSteps": 0,
          "explicitCandidateEliminations": 0,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "cell-single",
            "cage-full-house"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "sample-clues",
          "seed": 240401,
          "attempt": 0
        }
      },
      {
        "id": "suguru-size5-cedar-garden",
        "label": "Cedar garden",
        "layout": "cedar",
        "puzzle": "0004505201001500020001300",
        "tags": [
          "starter",
          "new-layout",
          "cedar"
        ],
        "selectable": true,
        "minTraceSteps": 15,
        "minPlacements": 15,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "cell-single",
          "hardestBand": "local",
          "logicalSteps": 15,
          "placementSteps": 15,
          "eliminationSteps": 0,
          "explicitCandidateEliminations": 0,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "cell-single",
            "cage-full-house"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "sample-clues",
          "seed": 240402,
          "attempt": 54
        }
      }
    ],
    "size5-medium": [
      {
        "id": "suguru-size5-mist-bridge",
        "label": "Mist crossing",
        "layout": "mist",
        "puzzle": "0000000020105040040000204",
        "tags": [
          "bridge",
          "cross-cage",
          "mist"
        ],
        "selectable": true,
        "minTraceSteps": 6,
        "minPlacements": 2,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "cross-cage",
          "hardestBand": "interaction",
          "logicalSteps": 19,
          "placementSteps": 18,
          "eliminationSteps": 1,
          "explicitCandidateEliminations": 1,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "cell-single",
            "cage-full-house",
            "cage-hidden-single",
            "cross-cage"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "sample-clues",
          "seed": 240502,
          "attempt": 3
        }
      },
      {
        "id": "suguru-size5-cedar-bridge",
        "label": "Cedar bridge",
        "layout": "cedar",
        "puzzle": "1004005000000020000300052",
        "tags": [
          "bridge",
          "cross-cage",
          "cedar"
        ],
        "selectable": true,
        "minTraceSteps": 6,
        "minPlacements": 2,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "cross-cage",
          "hardestBand": "interaction",
          "logicalSteps": 21,
          "placementSteps": 18,
          "eliminationSteps": 3,
          "explicitCandidateEliminations": 3,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "cage-full-house",
            "cage-hidden-single",
            "cross-cage",
            "cell-single"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "sample-clues",
          "seed": 240503,
          "attempt": 439
        }
      }
    ],
    "size5-challenge": [
      {
        "id": "suguru-size5-mist-deep-current",
        "label": "Mist deep current",
        "layout": "mist",
        "puzzle": "0000030000105300000000000",
        "tags": [
          "challenge",
          "cross-cage",
          "mist"
        ],
        "selectable": true,
        "minTraceSteps": 6,
        "minPlacements": 2,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "cross-cage",
          "hardestBand": "interaction",
          "logicalSteps": 26,
          "placementSteps": 21,
          "eliminationSteps": 5,
          "explicitCandidateEliminations": 5,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "cage-hidden-single",
            "cross-cage",
            "cell-single",
            "cage-full-house"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "sample-clues",
          "seed": 240603,
          "attempt": 4
        }
      },
      {
        "id": "suguru-size5-cedar-deep-night",
        "label": "Cedar deep night",
        "layout": "cedar",
        "puzzle": "0004005001000000000001050",
        "tags": [
          "challenge",
          "cross-cage",
          "cedar"
        ],
        "selectable": true,
        "minTraceSteps": 6,
        "minPlacements": 2,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "cross-cage",
          "hardestBand": "interaction",
          "logicalSteps": 23,
          "placementSteps": 20,
          "eliminationSteps": 3,
          "explicitCandidateEliminations": 3,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "cage-hidden-single",
            "cell-single",
            "cage-full-house",
            "cross-cage"
          ]
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "sample-clues",
          "seed": 240604,
          "attempt": 3608
        }
      },
      {
        "id": "suguru-size5-mist-pair-current",
        "label": "Mist pair current",
        "layout": "mist",
        "puzzle": "0000000000005300000020034",
        "tags": [
          "challenge",
          "cage-naked-pair",
          "pair-focus",
          "mist"
        ],
        "selectable": true,
        "minTraceSteps": 29,
        "minPlacements": 20,
        "logicProfile": {
          "version": 1,
          "status": "solved-logically",
          "hardestTechnique": "cage-naked-pair",
          "hardestBand": "subset",
          "logicalSteps": 29,
          "placementSteps": 20,
          "eliminationSteps": 9,
          "explicitCandidateEliminations": 13,
          "minAvailableSteps": 1,
          "remainingCells": 0,
          "techniques": [
            "cross-cage",
            "cell-single",
            "cage-hidden-single",
            "cage-naked-pair",
            "cage-full-house"
          ]
        },
        "logicFocus": {
          "profileVersion": 1,
          "technique": "cage-naked-pair",
          "traceIndex": 8,
          "candidateEliminations": 4,
          "downstreamPlacements": 17
        },
        "origin": {
          "kind": "first-party-generated",
          "generatorVersion": 2,
          "strategy": "sample-clues",
          "seed": 1511472606,
          "attempt": 541
        }
      }
    ]
  }
});
})();
