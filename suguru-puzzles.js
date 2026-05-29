(function () {
  const SOLUTION = "1234534512512342345151234";

  const CAGE_LAYOUTS = {
    breeze: [
      [0, 1, 2, 3, 7],
      [4, 8, 9, 13, 14],
      [5, 6, 10, 11, 12],
      [15, 16, 17, 20, 21],
      [18, 19, 22, 23, 24]
    ],
    lantern: [
      [0, 1, 5, 6, 7],
      [2, 3, 4, 8, 9],
      [10, 11, 15, 16, 17],
      [12, 13, 14, 18, 19],
      [20, 21, 22, 23, 24]
    ]
  };

  function buildCageMap(cages) {
    const map = Array(25).fill(-1);
    cages.forEach((cage, cageIndex) => {
      cage.forEach((cellIndex) => {
        map[cellIndex] = cageIndex;
      });
    });
    return map;
  }

  function buildEntry(entry) {
    const cages = CAGE_LAYOUTS[entry.layout].map((cage) => [...cage]);
    return {
      ...entry,
      size: 5,
      maxValue: 5,
      cages,
      cageMap: buildCageMap(cages),
      solution: SOLUTION,
      clueCount: entry.puzzle.split("").filter((value) => value !== "0").length
    };
  }

  window.SUGURU_PUZZLES = {
    "size5-easy": [
      buildEntry({
        id: "suguru-size5-garden-path",
        label: "Garden path",
        layout: "breeze",
        puzzle: "1230530000000300005001000",
        tags: ["starter", "walkthrough-shape"],
        estimatedMinutes: 5,
        difficultyScore: 1
      }),
      buildEntry({
        id: "suguru-size5-morning-rhythm",
        label: "Morning rhythm",
        layout: "lantern",
        puzzle: "1234000002000300005001000",
        tags: ["starter", "irregular-cages"],
        estimatedMinutes: 6,
        difficultyScore: 2
      })
    ],
    "size5-challenge": [
      buildEntry({
        id: "suguru-size5-lantern-challenge",
        label: "Lantern challenge",
        layout: "breeze",
        puzzle: "1230530000000040005001000",
        tags: ["challenge", "walkthrough-shape"],
        estimatedMinutes: 8,
        difficultyScore: 3
      }),
      buildEntry({
        id: "suguru-size5-quiet-koi",
        label: "Quiet koi",
        layout: "lantern",
        puzzle: "1234000002000300005050000",
        tags: ["challenge", "sparse"],
        estimatedMinutes: 9,
        difficultyScore: 4
      })
    ]
  };
})();
