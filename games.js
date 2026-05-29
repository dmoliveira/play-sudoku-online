(function () {
  const DEFAULT_GAME_ID = "sudoku";

  function buildSudokuLevels() {
    return [
      { id: "easy", label: "Easy" },
      { id: "medium", label: "Medium" },
      { id: "advanced", label: "Advanced" },
      { id: "hard", label: "Hard" },
      { id: "expert", label: "Expert" }
    ];
  }

  function buildSuguruLevels() {
    return [
      { id: "size5-easy", label: "Size 5 · Easy" },
      { id: "size5-challenge", label: "Size 5 · Challenge" }
    ];
  }

  const GAME_REGISTRY = {
    sudoku: {
      id: "sudoku",
      label: "Sudoku",
      defaultDifficulty: "easy",
      levels: buildSudokuLevels(),
      core: window.SudokuCore,
      supportsHints: true,
      supportsSymbolPlay: true,
      getBoardSize() {
        return 9;
      },
      getMaxValue() {
        return 9;
      },
      getPuzzles(difficulty) {
        return window.SUDOKU_PUZZLES?.[difficulty] || [];
      }
    },
    suguru: {
      id: "suguru",
      label: "Suguru",
      defaultDifficulty: "size5-easy",
      levels: buildSuguruLevels(),
      core: window.SuguruCore,
      supportsHints: false,
      supportsSymbolPlay: false,
      getBoardSize(puzzleMeta) {
        return puzzleMeta?.size || 5;
      },
      getMaxValue(puzzleMeta) {
        return puzzleMeta?.maxValue || 5;
      },
      getPuzzles(difficulty) {
        return window.SUGURU_PUZZLES?.[difficulty] || [];
      }
    }
  };

  function getGameConfig(gameId = DEFAULT_GAME_ID) {
    return GAME_REGISTRY[gameId] || GAME_REGISTRY[DEFAULT_GAME_ID];
  }

  window.DEFAULT_GAME_ID = DEFAULT_GAME_ID;
  window.GAME_REGISTRY = GAME_REGISTRY;
  window.getGameConfig = getGameConfig;
})();
