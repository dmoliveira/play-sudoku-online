(function () {
  const LAYOUTS = {
    garden: {
      size: 5,
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
      size,
      maxValue,
      cages,
      cageMap,
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
