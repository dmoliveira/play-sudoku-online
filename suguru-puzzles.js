(function () {
  const BASE_LAYOUTS = {
    garden: {
      size: 5,
      layoutFamilyId: "garden-reflection-v1",
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
      size: 5,
      layoutFamilyId: "lantern-v1",
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
    },
    brook: {
      size: 5,
      layoutFamilyId: "garden-reflection-v1",
      cages: [
        [11, 15, 16, 20, 21],
        [3, 4, 8, 9],
        [17, 18, 22, 23],
        [1, 2, 6, 7],
        [14, 19, 24],
        [0, 5, 10],
        [12, 13]
      ],
      solution: "3212114343251213434321212"
    },
    cascade: {
      size: 5,
      layoutFamilyId: "garden-reflection-v1",
      cages: [
        [0, 1, 5, 6, 7],
        [18, 19, 23, 24],
        [10, 11, 15, 16],
        [8, 9, 13, 14],
        [20, 21, 22],
        [2, 3, 4],
        [12, 17]
      ],
      solution: "2321314542231311424223131"
    }
  };
  const LAYOUTS = { ...BASE_LAYOUTS, ...(window.GENERATED_CONTENT?.suguruLayouts || {}) };

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


  function validateSolvedLayout(solution, cages, cageMap, size) {
    const values = solution.split("").map(Number);
    cages.forEach((cage, cageIndex) => {
      const seen = cage.map((index) => values[index]).sort((a, b) => a - b);
      const expected = Array.from({ length: cage.length }, (_, index) => index + 1);
      if (seen.join(",") !== expected.join(",")) {
        throw new Error(`Suguru cage ${cageIndex} does not contain 1..${cage.length}`);
      }
    });
    values.forEach((value, index) => {
      const row = Math.floor(index / size);
      const col = index % size;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) continue
          const nextRow = row + rowOffset
          const nextCol = col + colOffset
          if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size) {
            const nextIndex = nextRow * size + nextCol
            if (values[nextIndex] === value) {
              throw new Error(`Suguru solution has touching conflict at ${index}`)
            }
          }
        }
      }
      if (value < 1 || value > cages[cageMap[index]].length) {
        throw new Error(`Suguru solution digit ${value} is invalid at ${index}`)
      }
    })
  }

  function buildEntry(entry) {
    const layout = LAYOUTS[entry.layout];
    const cages = layout.cages.map((cage) => [...cage]);
    const size = layout.size;
    const totalCells = size * size;
    if (layout.solution.length !== totalCells) {
      throw new Error(`Suguru layout ${entry.layout} solution must have ${totalCells} cells`);
    }
    if (entry.puzzle.length !== totalCells) {
      throw new Error(`Suguru puzzle ${entry.id} must have ${totalCells} cells`);
    }
    const maxValue = Math.max(...cages.map((cage) => cage.length));
    const cageMap = buildCageMap(cages, size);
    validateSolvedLayout(layout.solution, cages, cageMap, size);
    const legalDigit = (digit, index) => digit >= 0 && digit <= cages[cageMap[index]].length;
    [...entry.puzzle].forEach((char, index) => {
      if (!/^[0-9]$/.test(char)) {
        throw new Error(`Suguru puzzle ${entry.id} contains non-digit at ${index}`);
      }
      if (!legalDigit(Number(char), index)) {
        throw new Error(`Suguru puzzle ${entry.id} has out-of-range clue ${char} at ${index}`);
      }
    });
    [...layout.solution].forEach((char, index) => {
      if (!/^[0-9]$/.test(char)) {
        throw new Error(`Suguru layout ${entry.layout} contains non-digit solution value at ${index}`);
      }
      if (!legalDigit(Number(char), index) || Number(char) === 0) {
        throw new Error(`Suguru layout ${entry.layout} has invalid solution digit ${char} at ${index}`);
      }
    });
    return {
      ...entry,
      layoutFamilyId: layout.layoutFamilyId || entry.layout,
      selectable: entry.selectable !== false,
      logicProfile: entry.logicProfile ? { ...entry.logicProfile, techniques: [...(entry.logicProfile.techniques || [])] } : null,
      logicFocus: entry.logicFocus ? { ...entry.logicFocus } : null,
      origin: entry.origin ? { ...entry.origin } : { kind: "curated-baseline", version: 1 },
      size,
      maxValue,
      cages,
      cageMap,
      solution: layout.solution,
      clueCount: entry.puzzle.split("").filter((value) => value !== "0").length
    };
  }

  const BASE_PUZZLES = {
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
      }),
      buildEntry({
        id: "suguru-size5-brook-lantern",
        label: "Brook lantern",
        layout: "brook",
        puzzle: "3212100043000010000300002",
        tags: ["starter", "reflected-layout"],
        estimatedMinutes: 6,
        difficultyScore: 2
      }),
      buildEntry({
        id: "suguru-size5-cascade-lantern",
        label: "Cascade lantern",
        layout: "cascade",
        puzzle: "0000300042000010004223131",
        tags: ["starter", "rotated-layout"],
        estimatedMinutes: 6,
        difficultyScore: 2
      })
    ],
    "size5-medium": [
      buildEntry({
        id: "suguru-size5-bridge-garden",
        label: "Bridge garden",
        layout: "garden",
        puzzle: "0212334000100003000020000",
        tags: ["bridge", "mixed-cages"],
        estimatedMinutes: 7,
        difficultyScore: 2
      }),
      buildEntry({
        id: "suguru-size5-lantern-bridge",
        label: "Lantern bridge",
        layout: "lantern",
        puzzle: "0323124000500002000010000",
        tags: ["bridge", "distributed-clues"],
        estimatedMinutes: 8,
        difficultyScore: 3
      }),
      buildEntry({
        id: "suguru-size5-petal-crossing",
        label: "Petal crossing",
        layout: "garden",
        puzzle: "1012334000100003000020000",
        tags: ["bridge", "mixed-cages"],
        estimatedMinutes: 7,
        difficultyScore: 3
      }),
      buildEntry({
        id: "suguru-size5-lantern-echo",
        label: "Lantern echo",
        layout: "lantern",
        puzzle: "1023124000500002000010000",
        tags: ["bridge", "distributed-clues"],
        estimatedMinutes: 8,
        difficultyScore: 3
      }),
      buildEntry({
        id: "suguru-size5-brook-bridge",
        label: "Brook bridge",
        layout: "brook",
        puzzle: "3212000043000010000300002",
        tags: ["bridge", "reflected-layout"],
        estimatedMinutes: 8,
        difficultyScore: 3
      }),
      buildEntry({
        id: "suguru-size5-cascade-bridge",
        label: "Cascade bridge",
        layout: "cascade",
        puzzle: "0000300042000010004223130",
        tags: ["bridge", "rotated-layout"],
        estimatedMinutes: 8,
        difficultyScore: 3
      })
    ],
    "size5-challenge": [
      buildEntry({
        id: "suguru-size5-garden-challenge",
        label: "Garden challenge",
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
      }),
      buildEntry({
        id: "suguru-size5-garden-deep-night",
        label: "Garden deep night",
        layout: "garden",
        puzzle: "0210000001100003000020000",
        tags: ["challenge", "sparse"],
        estimatedMinutes: 10,
        difficultyScore: 4
      }),
      buildEntry({
        id: "suguru-size5-lantern-deep-night",
        label: "Lantern deep night",
        layout: "lantern",
        puzzle: "0320020000500002000010000",
        tags: ["challenge", "sparse"],
        estimatedMinutes: 10,
        difficultyScore: 5
      }),
      buildEntry({
        id: "suguru-size5-brook-deep-night",
        label: "Brook deep night",
        layout: "brook",
        puzzle: "0012010000000010000300002",
        tags: ["challenge", "sparse", "reflected-layout"],
        estimatedMinutes: 10,
        difficultyScore: 5
      }),
      buildEntry({
        id: "suguru-size5-garden-midnight-path",
        label: "Garden midnight path",
        layout: "garden",
        puzzle: "0200000001100003000020000",
        tags: ["challenge", "sparse"],
        estimatedMinutes: 11,
        difficultyScore: 5
      }),
      buildEntry({
        id: "suguru-size5-lantern-midnight-path",
        label: "Lantern midnight path",
        layout: "lantern",
        puzzle: "0020020000500002000010000",
        tags: ["challenge", "sparse"],
        estimatedMinutes: 11,
        difficultyScore: 5
      }),
      buildEntry({
        id: "suguru-size5-brook-midnight-path",
        label: "Brook midnight path",
        layout: "brook",
        puzzle: "0010010000000010000300002",
        tags: ["challenge", "sparse", "reflected-layout"],
        estimatedMinutes: 11,
        difficultyScore: 5
      }),
      buildEntry({
        id: "suguru-size5-cascade-midnight-path",
        label: "Cascade midnight path",
        layout: "cascade",
        puzzle: "0001000000000010000223100",
        tags: ["challenge", "sparse", "rotated-layout"],
        estimatedMinutes: 11,
        difficultyScore: 5
      })
    ]
  };
  const generatedEntries = window.GENERATED_CONTENT?.suguruEntries || {};
  window.SUGURU_PUZZLES = Object.fromEntries(Object.entries(BASE_PUZZLES).map(([level, entries]) => [
    level,
    [...entries, ...(generatedEntries[level] || []).map(buildEntry)]
  ]));
})();
