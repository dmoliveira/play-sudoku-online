(function () {
  const SUDOKU_TO_SUGURU_MODE = {
    classic: "classic",
    daily: "daily",
    nomistakes: "nomistakes",
    nonotes: "nonotes",
    sprint: "challenge",
    nocheck: "challenge",
    zen: "classic"
  };

  const SUGURU_TO_SUDOKU_MODE = {
    classic: "classic",
    daily: "daily",
    nomistakes: "nomistakes",
    nonotes: "nonotes",
    challenge: "nocheck"
  };

  function targetForGame(gameId) {
    return gameId === "suguru" ? "suguru.html" : "index.html";
  }

  function currentGameId() {
    const path = window.location.pathname;
    return path.endsWith("/suguru.html") || path.endsWith("suguru.html") ? "suguru" : "sudoku";
  }

  function buildNextUrl(nextGame) {
    const params = new URLSearchParams(window.location.search);
    const current = currentGameId();

    if (nextGame === "suguru") {
      const difficulty = params.get("difficulty");
      const mode = params.get("mode");
      const mappedLevel = ["hard", "expert"].includes(difficulty)
        ? "size5-challenge"
        : ["medium", "advanced"].includes(difficulty)
          ? "size5-medium"
          : "size5-easy";
      const mappedMode = SUDOKU_TO_SUGURU_MODE[mode] || "classic";
      const nextParams = new URLSearchParams();
      nextParams.set("game", "suguru");
      nextParams.set("level", params.get("level") || mappedLevel);
      nextParams.set("mode", mappedMode || "classic");
      if (current === "sudoku") {
        if (difficulty) nextParams.set("sourceDifficulty", difficulty);
        if (mode) nextParams.set("sourceMode", mode);
      }
      if (params.has("notes")) nextParams.set("notes", params.get("notes"));
      if (params.has("mistakes")) nextParams.set("mistakes", params.get("mistakes"));
      return `${targetForGame(nextGame)}?${nextParams.toString()}`;
    }

    const level = params.get("level");
    const sourceDifficulty = params.get("sourceDifficulty");
    const sourceMode = params.get("sourceMode");
    const mappedDifficulty = level === "size5-challenge"
      ? "hard"
      : level === "size5-medium"
        ? "medium"
        : "easy";
    const mappedMode = params.get("mode") === "challenge" && sourceMode
      ? sourceMode
      : SUGURU_TO_SUDOKU_MODE[params.get("mode")] || "classic";
    const nextParams = new URLSearchParams();
    nextParams.set("game", "sudoku");
    nextParams.set(
      "difficulty",
      current === "suguru"
        ? (sourceDifficulty || mappedDifficulty)
        : (params.get("difficulty") || mappedDifficulty)
    );
    nextParams.set("mode", mappedMode);
    if (params.has("notes")) nextParams.set("notes", params.get("notes"));
    if (params.has("mistakes")) nextParams.set("mistakes", params.get("mistakes"));
    return `${targetForGame(nextGame)}?${nextParams.toString()}`;
  }

  function initializeGameSwitcher() {
    const select = document.getElementById("game-select");
    if (!select) {
      return;
    }

    select.value = currentGameId();
    select.addEventListener("change", (event) => {
      const nextGame = event.target.value;
      if (nextGame === currentGameId()) {
        return;
      }
      window.location.href = buildNextUrl(nextGame);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeGameSwitcher, { once: true });
  } else {
    initializeGameSwitcher();
  }
})();
