(function () {
  const LAYOUTS = {
    garden: {
      cages: [
        [13, 18, 19, 23, 24],
        [0, 1, 5, 6],
        [16, 17, 21, 22],
        [2, 3, 7, 8],
        [10, 15, 20],
        [4, 9, 14],
        [11, 12]
      ],
      solution: "1212334341121523434321212"
    },
    lantern: {
      cages: [
        [0, 1, 5, 6, 10],
        [2, 3, 4, 8],
        [7, 12, 13],
        [9, 14],
        [11, 16, 17, 22],
        [15, 20, 21],
        [18, 19, 23, 24]
      ],
      solution: "1323124142532312414213231"
    }
  };

  function buildCageMap(cages, size) {
    const totalCells = size * size;
    const map = Array(totalCells).fill(-1);
    cages.forEach((cage, cageIndex) => {
      cage.forEach((cellIndex) => {
        if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= totalCells) {
          throw new Error(`Invalid Suguru cell index ${cellIndex} in cage ${cageIndex}`);
        }
        if (map[cellIndex] !== -1) {
          throw new Error(`Duplicate Suguru cell index ${cellIndex} across cages`);
        }
        map[cellIndex] = cageIndex;
      });
    });
    if (map.some((value) => value === -1)) {
      throw new Error('Suguru cage layout must cover every board cell exactly once');
    }
    return map;
  }

  function buildEntry(entry) {
    const layout = LAYOUTS[entry.layout];
    const cages = layout.cages.map((cage) => [...cage]);
    const size = 5;
    const maxValue = Math.max(...cages.map((cage) => cage.length));
    return {
      ...entry,
      size,
      maxValue,
      cages,
      cageMap: buildCageMap(cages, size),
      solution: layout.solution,
      clueCount: entry.puzzle.split("").filter((value) => value !== "0").length
    };
  }

  window.SUGURU_PUZZLES = {
    "size5-easy": [
      buildEntry({
        id: "suguru-size5-garden-path",
        label: "Garden path",
        layout: "garden",
        puzzle: "1212334000100003000020000",
        tags: ["starter", "mixed-cages"],
        estimatedMinutes: 5,
        difficultyScore: 1
      }),
      buildEntry({
        id: "suguru-size5-morning-rhythm",
        label: "Morning rhythm",
        layout: "lantern",
        puzzle: "1323124000500002000010000",
        tags: ["starter", "distributed-clues"],
        estimatedMinutes: 6,
        difficultyScore: 2
      })
    ],
    "size5-challenge": [
      buildEntry({
        id: "suguru-size5-lantern-challenge",
        label: "Lantern challenge",
        layout: "garden",
        puzzle: "1210000001100003000020000",
        tags: ["challenge", "mixed-cages"],
        estimatedMinutes: 8,
        difficultyScore: 3
      }),
      buildEntry({
        id: "suguru-size5-quiet-koi",
        label: "Quiet koi",
        layout: "lantern",
        puzzle: "1320020000500002000010000",
        tags: ["challenge", "sparse"],
        estimatedMinutes: 9,
        difficultyScore: 4
      })
    ]
  };
})();
