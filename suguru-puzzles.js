(function () {
  const SHARED_CAGES = [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24]
  ];

  const CAGE_MAP = Array.from({ length: 25 }, (_, index) => Math.floor(index / 5));
  const SOLUTION = "1234534512512342345151234";

  function buildEntry(entry) {
    return {
      ...entry,
      size: 5,
      maxValue: 5,
      cages: SHARED_CAGES.map((cage) => [...cage]),
      cageMap: [...CAGE_MAP],
      solution: SOLUTION,
      difficultyScore: entry.difficultyScore,
      clueCount: entry.puzzle.split("").filter((value) => value !== "0").length,
      estimatedMinutes: entry.estimatedMinutes
    };
  }

  window.SUGURU_PUZZLES = {
    "size5-easy": [
      buildEntry({
        id: "suguru-size5-garden-path",
        label: "Garden path",
        puzzle: "1030504010012040040101030",
        tags: ["starter", "row-cages"],
        estimatedMinutes: 5,
        difficultyScore: 1
      }),
      buildEntry({
        id: "suguru-size5-morning-rhythm",
        label: "Morning rhythm",
        puzzle: "1004504010010040345001004",
        tags: ["starter", "calm-scan"],
        estimatedMinutes: 6,
        difficultyScore: 2
      })
    ],
    "size5-challenge": [
      buildEntry({
        id: "suguru-size5-lantern-challenge",
        label: "Lantern challenge",
        puzzle: "1234000010000300005001000",
        tags: ["challenge", "focused"],
        estimatedMinutes: 8,
        difficultyScore: 3
      }),
      buildEntry({
        id: "suguru-size5-quiet-koi",
        label: "Quiet koi",
        puzzle: "1234000010000040005050000",
        tags: ["challenge", "sparse"],
        estimatedMinutes: 9,
        difficultyScore: 4
      })
    ]
  };
})();
