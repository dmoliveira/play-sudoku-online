(function () {
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
      const mappedLevel = ["hard", "expert"].includes(difficulty)
        ? "size5-challenge"
        : ["medium", "advanced"].includes(difficulty)
          ? "size5-medium"
          : "size5-easy";
      const mappedMode = ["classic", "daily", "nomistakes", "nonotes"].includes(params.get("mode"))
        ? params.get("mode")
        : params.get("mode") === "challenge"
        ? "challenge"
        : "classic";
      const nextParams = new URLSearchParams();
      nextParams.set("game", "suguru");
      nextParams.set("level", params.get("level") || mappedLevel);
      nextParams.set("mode", mappedMode || "classic");
      if (params.has("notes")) nextParams.set("notes", params.get("notes"));
      if (params.has("mistakes")) nextParams.set("mistakes", params.get("mistakes"));
      return `${targetForGame(nextGame)}?${nextParams.toString()}`;
    }

    const level = params.get("level");
    const mappedDifficulty = level === "size5-challenge"
      ? "hard"
      : level === "size5-medium"
        ? "medium"
        : "easy";
    const mappedMode = ["classic", "daily", "nomistakes", "nonotes"].includes(params.get("mode"))
      ? params.get("mode")
      : "classic";
    const nextParams = new URLSearchParams();
    nextParams.set("game", "sudoku");
    nextParams.set("difficulty", current === "suguru" ? mappedDifficulty : (params.get("difficulty") || mappedDifficulty));
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
