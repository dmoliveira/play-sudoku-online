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
      }
    ],
    "medium": [],
    "advanced": [],
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
