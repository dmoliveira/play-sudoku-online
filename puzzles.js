(function () {
  const VARIANTS = [
    { suffix: "a", digits: "123456789", tone: "Sakura" },
    { suffix: "b", digits: "417263859", tone: "Lantern" },
    { suffix: "c", digits: "895341672", tone: "Moon" }
  ];

  const TEMPLATES = {
    easy: [
      {
        id: "easy-calm-start",
        label: "Calm start",
        puzzle: "530070910670195300198342560859761423426803791713924850961537280287419635345280179",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["singles", "friendly"],
        estimatedMinutes: 6,
        difficultyScore: 1
      },
      {
        id: "easy-morning-flow",
        label: "Morning flow",
        puzzle: "500670912672105348198340567859061423426853791710924856961537284287410635345286109",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["steady", "warmup"],
        estimatedMinutes: 7,
        difficultyScore: 1
      },
      {
        id: "easy-garden-path",
        label: "Garden path",
        puzzle: "534000912072195348108340507859761400400853791713924850961530284287419600345286179",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["scanning", "confidence"],
        estimatedMinutes: 8,
        difficultyScore: 2
      }
    ],
    medium: [
      {
        id: "medium-balanced-logic",
        label: "Balanced logic",
        puzzle: "030670902602190348198002567850761023026853790713904850901537204287019635305286170",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["pairs", "tempo"],
        estimatedMinutes: 11,
        difficultyScore: 3
      },
      {
        id: "medium-steady-focus",
        label: "Steady focus",
        puzzle: "004070900670105040198340560850001423406853700700924856001507280287019635305200179",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["candidates", "tempo"],
        estimatedMinutes: 12,
        difficultyScore: 4
      },
      {
        id: "medium-paper-lantern",
        label: "Paper lantern",
        puzzle: "500608912070195040190300567859060423406853791700924806061537200287419035305286100",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["line-logic", "midgame"],
        estimatedMinutes: 13,
        difficultyScore: 4
      }
    ],
    hard: [
      {
        id: "hard-ink-challenge",
        label: "Ink challenge",
        puzzle: "000608900072090300100002067800701003020050091700020800960007204280410000005080100",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["chains", "pressure"],
        estimatedMinutes: 18,
        difficultyScore: 6
      },
      {
        id: "hard-quiet-precision",
        label: "Quiet precision",
        puzzle: "030008010002005300090300507800701020006050001003020800060030084200400600300206100",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["candidates", "patience"],
        estimatedMinutes: 20,
        difficultyScore: 7
      },
      {
        id: "hard-winter-ink",
        label: "Winter ink",
        puzzle: "004000900072100008090302060800700003026000791700024000960000204200010630005086100",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["advanced", "line-logic"],
        estimatedMinutes: 21,
        difficultyScore: 7
      }
    ],
    expert: [
      {
        id: "expert-deep-logic",
        label: "Deep logic",
        puzzle: "000000900072000300100002007000701000020000091700000800060007004280000000005080100",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["long-chains", "expert"],
        estimatedMinutes: 28,
        difficultyScore: 9
      },
      {
        id: "expert-no-mercy",
        label: "No mercy",
        puzzle: "000008000002000300090300007000700020006000001003000800060000084200000600300200100",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["sparse", "expert"],
        estimatedMinutes: 31,
        difficultyScore: 10
      },
      {
        id: "expert-midnight-koi",
        label: "Midnight koi",
        puzzle: "004000000000005300090000007000700003000050001703000800060000000200010000000200100",
        solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        tags: ["minimal", "deep-focus"],
        estimatedMinutes: 34,
        difficultyScore: 10
      }
    ]
  };

  function remapDigits(grid, mapping) {
    return grid.replace(/[1-9]/g, (digit) => mapping[Number(digit) - 1]);
  }

  function buildLibrary() {
    return Object.fromEntries(
      Object.entries(TEMPLATES).map(([difficulty, entries]) => [
        difficulty,
        entries.flatMap((entry) =>
          VARIANTS.map((variant) => ({
            id: `${entry.id}-${variant.suffix}`,
            difficulty,
            label: `${entry.label} · ${variant.tone}`,
            puzzle: remapDigits(entry.puzzle, variant.digits),
            solution: remapDigits(entry.solution, variant.digits),
            tags: [...entry.tags, variant.tone.toLowerCase()],
            estimatedMinutes: entry.estimatedMinutes,
            difficultyScore: entry.difficultyScore
          }))
        )
      ])
    );
  }

  window.SUDOKU_PUZZLES = buildLibrary();
})();
