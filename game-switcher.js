(function () {
  function targetForGame(gameId) {
    return gameId === "suguru" ? "suguru.html" : "index.html";
  }

  function currentGameId() {
    const path = window.location.pathname;
    return path.endsWith("/suguru.html") || path.endsWith("suguru.html") ? "suguru" : "sudoku";
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
      window.location.href = targetForGame(nextGame);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeGameSwitcher, { once: true });
  } else {
    initializeGameSwitcher();
  }
})();
