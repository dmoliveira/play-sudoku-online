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

  const GAME_REGISTRY = {
    sudoku: {
      id: "sudoku",
      label: "Sudoku",
      defaultDifficulty: "easy",
      levels: buildSudokuLevels(),
      core: window.SudokuCore,
      getPuzzles(difficulty) {
        return window.SUDOKU_PUZZLES?.[difficulty] || [];
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
