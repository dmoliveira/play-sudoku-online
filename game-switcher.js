(function () {
  const SUDOKU_TO_SUGURU_MODE = {
    classic: "classic",
    nomistakes: "nomistakes",
    nonotes: "nonotes",
    sprint: "challenge",
    nocheck: "challenge",
    zen: "classic"
  };
  const SUGURU_TO_SUDOKU_MODE = {
    classic: "classic",
    nomistakes: "nomistakes",
    nonotes: "nonotes",
    challenge: "nocheck"
  };
  let navigationContext = { runSource: null, dailyEdition: null };

  function shouldCarrySourceDifficulty(difficulty) {
    return ["medium", "advanced", "hard", "expert"].includes(difficulty);
  }

  function shouldCarrySourceMode(mode) {
    return ["sprint", "nocheck", "zen"].includes(mode);
  }

  function mapSudokuDifficultyToSuguru(difficulty) {
    return ["hard", "expert"].includes(difficulty)
      ? "size5-challenge"
      : ["medium", "advanced"].includes(difficulty)
        ? "size5-medium"
        : "size5-easy";
  }

  function canReuseSourceDifficulty(sourceDifficulty, currentSuguruLevel) {
    return Boolean(sourceDifficulty) && mapSudokuDifficultyToSuguru(sourceDifficulty) === currentSuguruLevel;
  }

  function canReuseSourceMode(sourceMode, currentSuguruMode) {
    return Boolean(sourceMode) && SUDOKU_TO_SUGURU_MODE[sourceMode] === currentSuguruMode;
  }

  function targetForGame(gameId) {
    return gameId === "suguru" ? "suguru.html" : "index.html";
  }

  function currentGameId() {
    const path = window.location.pathname;
    return path.endsWith("/suguru.html") || path.endsWith("suguru.html") ? "suguru" : "sudoku";
  }

  function isVerifiedDailyContext(current) {
    const identity = navigationContext.dailyEdition;
    const daily = window.DailyEditions;
    return navigationContext.runSource === "daily-edition"
      && identity?.gameId === current
      && identity?.version === daily?.version
      && identity?.corpus === daily?.getCurrentCorpusId(current)
      && daily?.isValidEditionDate(identity?.edition)
      && !daily?.isFutureEdition(identity.edition);
  }

  function copySetupParams(source, target) {
    for (const key of ["notes", "mistakes"]) {
      const value = source.get(key);
      if (value === "on" || value === "off") target.set(key, value);
    }
  }

  function buildNextUrl(nextGame) {
    const params = new URLSearchParams(window.location.search);
    const current = currentGameId();
    const verifiedDaily = isVerifiedDailyContext(current);

    if (nextGame === "suguru") {
      const difficulty = params.get("difficulty");
      const sourceMode = params.get("mode");
      const mappedLevel = mapSudokuDifficultyToSuguru(difficulty);
      const mappedMode = verifiedDaily
        ? "daily"
        : sourceMode === "daily" || navigationContext.runSource === "weekly"
          ? "classic"
          : SUDOKU_TO_SUGURU_MODE[sourceMode] || "classic";
      const nextParams = new URLSearchParams();
      nextParams.set("game", "suguru");
      nextParams.set("level", current === "suguru" ? (params.get("level") || mappedLevel) : mappedLevel);
      nextParams.set("mode", mappedMode);
      if (verifiedDaily) {
        nextParams.set("edition", navigationContext.dailyEdition.edition);
        nextParams.set("corpus", window.DailyEditions.getCurrentCorpusId("suguru"));
      } else if (current === "sudoku") {
        if (shouldCarrySourceDifficulty(difficulty)) nextParams.set("sourceDifficulty", difficulty);
        if (shouldCarrySourceMode(sourceMode)) nextParams.set("sourceMode", sourceMode);
      }
      copySetupParams(params, nextParams);
      return `${targetForGame(nextGame)}?${nextParams.toString()}`;
    }

    const level = params.get("level");
    const sourceDifficulty = params.get("sourceDifficulty");
    const sourceMode = params.get("sourceMode");
    const currentSuguruMode = params.get("mode");
    const mappedDifficulty = level === "size5-challenge" ? "hard" : level === "size5-medium" ? "advanced" : "easy";
    const mappedMode = verifiedDaily
      ? "daily"
      : currentSuguruMode === "daily" || navigationContext.runSource === "cage-garden"
        ? "classic"
        : canReuseSourceMode(sourceMode, currentSuguruMode)
          ? sourceMode
          : SUGURU_TO_SUDOKU_MODE[currentSuguruMode] || "classic";
    const nextParams = new URLSearchParams();
    nextParams.set("game", "sudoku");
    nextParams.set(
      "difficulty",
      current === "suguru"
        ? (canReuseSourceDifficulty(sourceDifficulty, level) ? sourceDifficulty : mappedDifficulty)
        : (params.get("difficulty") || mappedDifficulty)
    );
    nextParams.set("mode", mappedMode);
    if (verifiedDaily) {
      nextParams.set("edition", navigationContext.dailyEdition.edition);
      nextParams.set("corpus", window.DailyEditions.getCurrentCorpusId("sudoku"));
    }
    copySetupParams(params, nextParams);
    return `${targetForGame(nextGame)}?${nextParams.toString()}`;
  }

  function updateGameNavLinks() {
    const sudokuLink = document.getElementById("topnav-sudoku-link");
    const suguruLink = document.getElementById("topnav-suguru-link");
    if (sudokuLink) sudokuLink.href = currentGameId() === "sudoku" ? window.location.href : buildNextUrl("sudoku");
    if (suguruLink) suguruLink.href = currentGameId() === "suguru" ? window.location.href : buildNextUrl("suguru");
  }

  function setGameNavigationContext(context = {}) {
    navigationContext = {
      runSource: typeof context.runSource === "string" ? context.runSource : null,
      dailyEdition: context.dailyEdition && typeof context.dailyEdition === "object"
        ? { ...context.dailyEdition }
        : null
    };
    updateGameNavLinks();
  }

  function initializeGameSwitcher() {
    const select = document.getElementById("game-select");
    updateGameNavLinks();
    if (!select) return;
    select.value = currentGameId();
    select.addEventListener("change", (event) => {
      const nextGame = event.target.value;
      if (nextGame !== currentGameId()) window.location.href = buildNextUrl(nextGame);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeGameSwitcher, { once: true });
  } else {
    initializeGameSwitcher();
  }

  window.setGameNavigationContext = setGameNavigationContext;
  window.updateGameNavLinks = updateGameNavLinks;
})();
