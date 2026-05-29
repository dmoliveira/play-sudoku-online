(function () {
  const STORAGE_KEY = "sudoku-sakura-suguru-stats";
  const RESUME_KEY = "sudoku-sakura-suguru-resume";
  const LEVELS = [
    { id: "size5-easy", label: "Size 5 · Easy" },
    { id: "size5-challenge", label: "Size 5 · Challenge" }
  ];
  const MODES = {
    classic: { label: "Classic", notesMode: false, showMistakes: true },
    daily: { label: "Daily", notesMode: true, showMistakes: false },
    challenge: { label: "Challenge", notesMode: false, showMistakes: false },
    nomistakes: { label: "No mistakes", notesMode: false, showMistakes: true },
    nonotes: { label: "No notes", notesMode: false, showMistakes: true }
  };
  const DEFAULT_LEVEL = LEVELS[0].id;
  const DEFAULT_MODE = "classic";

  const state = {
    gameId: "suguru",
    level: "size5-easy",
    mode: "classic",
    puzzleMeta: null,
    puzzle: [],
    solution: [],
    board: [],
    notes: [],
    selectedIndex: null,
    notesMode: false,
    showMistakes: true,
    mistakes: 0,
    secondsElapsed: 0,
    paused: false,
    completed: false,
    intervalId: null,
    lastPuzzleKey: null,
    stats: loadStats()
  };

  const elements = {
    levelSelect: document.getElementById("level-select"),
    modeSelect: document.getElementById("mode-select"),
    notesToggle: document.getElementById("notes-toggle"),
    mistakeToggle: document.getElementById("mistake-toggle"),
    newGameButton: document.getElementById("new-game-button"),
    pauseButton: document.getElementById("pause-button"),
    board: document.getElementById("suguru-board"),
    timer: document.getElementById("timer"),
    mistakeCount: document.getElementById("mistake-count"),
    message: document.getElementById("game-message"),
    challengeLabel: document.getElementById("challenge-label"),
    modeDescription: document.getElementById("mode-description"),
    numberPad: document.getElementById("number-pad"),
    checkButton: document.getElementById("check-button")
  };

  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { solved: 0, bestTimes: {}, streak: 0, lastSolvedOn: null };
    } catch (error) {
      return { solved: 0, bestTimes: {}, streak: 0, lastSolvedOn: null };
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stats));
    } catch (error) {
      // ignore stats-only persistence failures
    }
  }

  function loadResume() {
    try {
      return JSON.parse(localStorage.getItem(RESUME_KEY));
    } catch (error) {
      return null;
    }
  }

  function clearResume() {
    try {
      localStorage.removeItem(RESUME_KEY);
    } catch (error) {
      // ignore resume cleanup failures
    }
  }

  function saveResume() {
    if (!state.puzzleMeta || state.completed) {
      clearResume();
      return;
    }
    try {
      localStorage.setItem(RESUME_KEY, JSON.stringify({
        level: state.level,
        mode: state.mode,
        puzzleId: state.puzzleMeta.id,
        board: state.board,
        notes: state.notes.map((entry) => Array.from(entry)),
        selectedIndex: state.selectedIndex,
        mistakes: state.mistakes,
        notesMode: state.notesMode,
        showMistakes: state.showMistakes,
        secondsElapsed: state.secondsElapsed
      }));
    } catch (error) {
      // ignore resume-only persistence failures
    }
  }

  function getCurrentDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function hashText(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getPuzzles(level) {
    return window.SUGURU_PUZZLES[level] || [];
  }

  function getLevelMeta(level = state.level) {
    return LEVELS.find((entry) => entry.id === level) || LEVELS[0];
  }

  function getCurrentPageName() {
    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);
    return segments[segments.length - 1] || "suguru.html";
  }

  function readSettingsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const level = params.get("level");
    const mode = params.get("mode");
    return {
      hasGameplayParams: ["level", "mode", "notes", "mistakes"].some((key) => params.has(key)),
      level: LEVELS.some((entry) => entry.id === level) ? level : DEFAULT_LEVEL,
      mode: Object.prototype.hasOwnProperty.call(MODES, mode) ? mode : DEFAULT_MODE,
      notesMode: params.has("notes") ? params.get("notes") === "on" : undefined,
      showMistakes: params.has("mistakes") ? params.get("mistakes") !== "off" : undefined
    };
  }

  function syncUrl() {
    const params = new URLSearchParams(window.location.search);
    params.set("game", "suguru");
    params.set("level", state.level);
    params.set("mode", state.mode);
    params.set("notes", state.notesMode ? "on" : "off");
    params.set("mistakes", state.showMistakes ? "on" : "off");
    window.history.replaceState({}, "", `${getCurrentPageName()}?${params.toString()}`);
  }

  function shouldIgnoreKeydown() {
    const activeElement = document.activeElement;
    return !(activeElement === elements.board || elements.board.contains(activeElement));
  }


  function getSelectedPuzzle(level, mode) {
    const pool = getPuzzles(level);
    if (mode === "daily") {
      return pool[hashText(`${level}-${getCurrentDateKey()}`) % pool.length];
    }
    const filtered = pool.filter((entry) => `${level}:${entry.id}` !== state.lastPuzzleKey);
    const source = filtered.length ? filtered : pool;
    const puzzle = source[Math.floor(Math.random() * source.length)];
    state.lastPuzzleKey = `${level}:${puzzle.id}`;
    return puzzle;
  }

  function setMessage(message) {
    elements.message.textContent = message;
  }

  function populateLevels() {
    elements.levelSelect.innerHTML = LEVELS.map((level) => `<option value="${level.id}">${level.label}</option>`).join("");
  }

  function applyModeDefaults() {
    const mode = MODES[state.mode];
    state.notesMode = mode.notesMode;
    state.showMistakes = mode.showMistakes;
    elements.notesToggle.checked = state.notesMode;
    elements.mistakeToggle.checked = state.showMistakes;
    elements.notesToggle.disabled = state.mode === "nonotes";
    elements.mistakeToggle.disabled = state.mode === "nomistakes";
    elements.modeDescription.textContent = state.mode === "daily"
      ? "Daily keeps the same Suguru board for everyone on this date and level."
      : state.mode === "challenge"
      ? "Challenge hides instant mistake glow and asks you to trust your pattern reads."
      : state.mode === "nonotes"
      ? "No notes strips pencil marks for a cleaner pressure solve."
      : state.mode === "nomistakes"
      ? "No mistakes rejects wrong values the moment you place them."
      : "Classic Suguru keeps notes and checks flexible while you learn the cage rhythm.";
  }

  function createEmptyNotes(meta) {
    return window.SuguruCore.createNotesState(meta);
  }

  function startTimer() {
    stopTimer();
    if (state.paused || state.completed) {
      return;
    }
    state.intervalId = window.setInterval(() => {
      state.secondsElapsed += 1;
      elements.timer.textContent = window.SuguruCore.formatTime(state.secondsElapsed);
      saveResume();
    }, 1000);
  }

  function stopTimer() {
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
  }

  function resetForPuzzle(puzzle) {
    state.puzzleMeta = puzzle;
    state.puzzle = window.SuguruCore.parseGrid(puzzle.puzzle);
    state.solution = window.SuguruCore.parseGrid(puzzle.solution);
    state.board = [...state.puzzle];
    state.notes = createEmptyNotes(puzzle);
    state.selectedIndex = state.puzzle.findIndex((value) => value === 0);
    state.mistakes = 0;
    state.secondsElapsed = 0;
    state.paused = false;
    state.completed = false;
    elements.challengeLabel.textContent = `${puzzle.label} · ${LEVELS.find((entry) => entry.id === state.level)?.label || state.level}`;
    elements.timer.textContent = "00:00";
    elements.mistakeCount.textContent = "0";
    setMessage(MODES[state.mode].label + ": fill each cage with 1 to its size, and keep matching digits from touching — even diagonally.");
    renderBoard();
    renderNumberPad();
    startTimer();
    saveResume();
    syncUrl();
  }

  function getMaxValue() {
    return state.puzzleMeta?.maxValue || 5;
  }

  function buildCellLabel(index, value, row, col, conflicts) {
    const parts = [`Row ${row + 1}, column ${col + 1}`];
    if (state.puzzle[index] !== 0) {
      parts.push(`given ${value}`);
    } else if (value !== 0) {
      parts.push(`value ${value}`);
    } else if (state.notes[index].size) {
      parts.push(`notes ${Array.from(state.notes[index]).join(", ")}`);
    } else {
      parts.push("empty");
    }
    if (conflicts.length) {
      parts.push("conflict");
    }
    return parts.join(", ");
  }

  function renderNotes(index) {
    const notesWrap = document.createElement("div");
    notesWrap.className = "notes-grid";
    notesWrap.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(getMaxValue()))}, 1fr)`;
    for (let value = 1; value <= getMaxValue(); value += 1) {
      const note = document.createElement("span");
      note.textContent = state.notes[index].has(value) ? String(value) : "";
      notesWrap.appendChild(note);
    }
    return notesWrap;
  }

  function focusSelectedCell() {
    if (state.selectedIndex === null || state.paused) {
      return;
    }
    const selectedCell = elements.board.querySelector(`[data-index="${state.selectedIndex}"]`);
    if (selectedCell) {
      selectedCell.focus({ preventScroll: true });
    } else {
      elements.board.focus({ preventScroll: true });
    }
  }

  function renderBoard() {
    const meta = state.puzzleMeta;
    elements.board.innerHTML = "";
    elements.board.style.gridTemplateColumns = `repeat(${meta.size}, 1fr)`;
    elements.board.classList.add("is-suguru");
    elements.board.classList.toggle("is-paused", state.paused);

    state.board.forEach((value, index) => {
      const cell = document.createElement("button");
      const { row, col } = window.SuguruCore.indexToRowCol(index, meta);
      const conflicts = value !== 0 ? window.SuguruCore.collectConflicts(state.board, index, meta) : [];
      const invalid = state.showMistakes && value !== 0 && value !== state.solution[index];
      cell.type = "button";
      cell.className = [
        "cell",
        state.puzzle[index] !== 0 ? "given" : "",
        state.selectedIndex === index ? "selected" : "",
        conflicts.length ? "conflict" : "",
        invalid ? "invalid" : ""
      ].filter(Boolean).join(" ");
      cell.dataset.index = String(index);
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.tabIndex = state.selectedIndex === index ? 0 : -1;
      cell.setAttribute("aria-label", buildCellLabel(index, value, row, col, conflicts));
      cell.style.borderRight = window.SuguruCore.hasRegionBoundary(index, "right", meta)
        ? "3px solid var(--line-strong)"
        : "1px solid var(--line)";
      cell.style.borderBottom = window.SuguruCore.hasRegionBoundary(index, "bottom", meta)
        ? "3px solid var(--line-strong)"
        : "1px solid var(--line)";
      if (value === 0) {
        cell.appendChild(renderNotes(index));
      } else {
        cell.textContent = String(value);
      }
      cell.addEventListener("click", () => {
        state.selectedIndex = index;
        renderBoard();
        renderNumberPad();
        saveResume();
      });
      elements.board.appendChild(cell);
    });
    focusSelectedCell();
  }

  function renderNumberPad() {
    elements.numberPad.innerHTML = "";
    for (let value = 1; value <= getMaxValue(); value += 1) {
      const button = document.createElement("button");
      const placedCount = state.board.filter((entry) => entry === value).length;
      button.type = "button";
      button.className = "number-button";
      button.innerHTML = `<span class="digit">${value}</span><span class="remaining">${placedCount} placed</span>`;
      button.addEventListener("click", () => handleDigit(value));
      elements.numberPad.appendChild(button);
    }
  }

  function handleDigit(value) {
    if (state.selectedIndex === null || state.paused || state.completed) {
      return;
    }
    if (state.puzzle[state.selectedIndex] !== 0) {
      setMessage("That clue is fixed.");
      return;
    }
    if (state.notesMode) {
      if (state.notes[state.selectedIndex].has(value)) {
        state.notes[state.selectedIndex].delete(value);
      } else {
        state.notes[state.selectedIndex].add(value);
      }
      renderBoard();
      saveResume();
      syncUrl();
      return;
    }
    if (state.mode === "nomistakes" && value !== state.solution[state.selectedIndex]) {
      state.mistakes += 1;
      elements.mistakeCount.textContent = String(state.mistakes);
      setMessage("No mistakes mode rejected that value.");
      saveResume();
      syncUrl();
      return;
    }
    state.board[state.selectedIndex] = value;
    state.notes[state.selectedIndex].clear();
    if (state.showMistakes && value !== state.solution[state.selectedIndex]) {
      state.mistakes += 1;
      elements.mistakeCount.textContent = String(state.mistakes);
      setMessage("That value does not match the stored solution.");
    } else {
      setMessage("Good. Watch the cage size and all touching neighbors.");
    }
    renderBoard();
    renderNumberPad();
    saveResume();
    syncUrl();
    syncUrl();
    checkWin();
  }

  function eraseSelected() {
    if (state.selectedIndex === null || state.puzzle[state.selectedIndex] !== 0) {
      return;
    }
    state.board[state.selectedIndex] = 0;
    state.notes[state.selectedIndex].clear();
    renderBoard();
    renderNumberPad();
    saveResume();
  }

  function checkBoard() {
    const wrong = [];
    state.board.forEach((value, index) => {
      if (value !== 0 && value !== state.solution[index]) {
        wrong.push(index);
      }
    });
    if (!wrong.length && !state.board.includes(0)) {
      finishPuzzle();
      return;
    }
    setMessage(wrong.length ? `Check found ${wrong.length} incorrect cell${wrong.length === 1 ? "" : "s"}.` : "No incorrect values found so far.");
    renderBoard();
  }

  function updateStreak() {
    const today = getCurrentDateKey();
    if (state.stats.lastSolvedOn === today) {
      return;
    }
    const oneDay = 24 * 60 * 60 * 1000;
    const last = state.stats.lastSolvedOn;
    const difference = last ? Math.round((new Date(today) - new Date(last)) / oneDay) : 1;
    state.stats.streak = difference === 1 ? state.stats.streak + 1 : 1;
    state.stats.lastSolvedOn = today;
  }

  function finishPuzzle() {
    if (state.completed) {
      return;
    }
    state.completed = true;
    stopTimer();
    state.stats.solved += 1;
    updateStreak();
    const key = `${state.level}:${state.mode}`;
    const best = state.stats.bestTimes[key];
    if (!best || state.secondsElapsed < best) {
      state.stats.bestTimes[key] = state.secondsElapsed;
    }
    saveStats();
    clearResume();
    syncUrl();
    setMessage(`Solved ${LEVELS.find((entry) => entry.id === state.level)?.label || state.level} in ${window.SuguruCore.formatTime(state.secondsElapsed)} with ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}. Streak: ${state.stats.streak}.`);
  }

  function checkWin() {
    if (window.SuguruCore.isSolved(state.board, state.solution)) {
      finishPuzzle();
    }
  }

  function togglePause() {
    state.paused = !state.paused;
    if (state.paused) {
      stopTimer();
      setMessage("Suguru paused.");
    } else {
      startTimer();
      setMessage("Suguru resumed.");
    }
    renderBoard();
    saveResume();
    syncUrl();
  }

  function startNewPuzzle(level = state.level, mode = state.mode) {
    state.level = level;
    state.mode = mode;
    elements.levelSelect.value = level;
    elements.modeSelect.value = mode;
    applyModeDefaults();
    resetForPuzzle(getSelectedPuzzle(level, mode));
  }

  function restoreOrStart(settings) {
    if (settings.hasGameplayParams) {
      startNewPuzzle(settings.level, settings.mode);
      if (settings.notesMode !== undefined) {
        state.notesMode = settings.notesMode;
        elements.notesToggle.checked = state.notesMode;
      }
      if (settings.showMistakes !== undefined) {
        state.showMistakes = settings.showMistakes;
        elements.mistakeToggle.checked = state.showMistakes;
      }
      syncUrl();
      return;
    }

    const saved = loadResume();
    if (!saved) {
      startNewPuzzle(state.level, state.mode);
      return;
    }
    const puzzle = getPuzzles(saved.level).find((entry) => entry.id === saved.puzzleId);
    if (!puzzle) {
      startNewPuzzle(state.level, state.mode);
      return;
    }
    state.level = saved.level;
    state.mode = saved.mode;
    applyModeDefaults();
    state.puzzleMeta = puzzle;
    state.puzzle = window.SuguruCore.parseGrid(puzzle.puzzle);
    state.solution = window.SuguruCore.parseGrid(puzzle.solution);
    state.board = saved.board;
    state.notes = createEmptyNotes(puzzle);
    (saved.notes || []).forEach((values, index) => {
      state.notes[index] = new Set(values || []);
    });
    state.selectedIndex = saved.selectedIndex;
    state.mistakes = saved.mistakes || 0;
    state.notesMode = saved.notesMode || false;
    state.showMistakes = saved.showMistakes !== undefined ? saved.showMistakes : state.showMistakes;
    state.secondsElapsed = saved.secondsElapsed || 0;
    elements.levelSelect.value = state.level;
    elements.modeSelect.value = state.mode;
    elements.timer.textContent = window.SuguruCore.formatTime(state.secondsElapsed);
    elements.mistakeCount.textContent = String(state.mistakes);
    elements.challengeLabel.textContent = `${puzzle.label} · ${LEVELS.find((entry) => entry.id === state.level)?.label || state.level}`;
    renderBoard();
    renderNumberPad();
    if (state.notesMode) {
      elements.notesToggle.checked = true;
    }
    if (!state.showMistakes) {
      elements.mistakeToggle.checked = false;
    }
    startTimer();
    syncUrl();
    setMessage("Resumed your Suguru run.");
  }

  function handleKeydown(event) {
    const { key } = event;
    if (shouldIgnoreKeydown()) {
      return;
    }
    if (/^[1-9]$/.test(key) && Number(key) <= getMaxValue()) {
      handleDigit(Number(key));
      return;
    }
    if (key === "Backspace" || key === "Delete" || key === "0") {
      eraseSelected();
      return;
    }
    if (key.toLowerCase() === "x" && state.mode !== "nonotes") {
      state.notesMode = !state.notesMode;
      elements.notesToggle.checked = state.notesMode;
      saveResume();
      syncUrl();
      return;
    }
    if (key.toLowerCase() === "c") {
      checkBoard();
      return;
    }
    if (key === " ") {
      event.preventDefault();
      togglePause();
      return;
    }
    if (!state.puzzleMeta || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      return;
    }
    event.preventDefault();
    if (state.selectedIndex === null) {
      state.selectedIndex = 0;
      renderBoard();
      return;
    }
    const { row, col } = window.SuguruCore.indexToRowCol(state.selectedIndex, state.puzzleMeta);
    const maxIndex = state.puzzleMeta.size - 1;
    let nextRow = row;
    let nextCol = col;
    if (key === "ArrowUp") nextRow = Math.max(0, row - 1);
    if (key === "ArrowDown") nextRow = Math.min(maxIndex, row + 1);
    if (key === "ArrowLeft") nextCol = Math.max(0, col - 1);
    if (key === "ArrowRight") nextCol = Math.min(maxIndex, col + 1);
    state.selectedIndex = window.SuguruCore.rowColToIndex(nextRow, nextCol, state.puzzleMeta);
    renderBoard();
  }

  function wireEvents() {
    elements.levelSelect.addEventListener("change", (event) => startNewPuzzle(event.target.value, state.mode));
    elements.modeSelect.addEventListener("change", (event) => startNewPuzzle(state.level, event.target.value));
    elements.notesToggle.addEventListener("change", (event) => {
      if (state.mode === "nonotes") {
        elements.notesToggle.checked = false;
        return;
      }
      state.notesMode = event.target.checked;
      saveResume();
      syncUrl();
    });
    elements.mistakeToggle.addEventListener("change", (event) => {
      if (state.mode === "nomistakes") {
        elements.mistakeToggle.checked = true;
        return;
      }
      state.showMistakes = event.target.checked;
      renderBoard();
      saveResume();
      syncUrl();
    });
    elements.newGameButton.addEventListener("click", () => startNewPuzzle(state.level, state.mode));
    elements.pauseButton.addEventListener("click", togglePause);
    elements.checkButton.addEventListener("click", checkBoard);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !state.paused && !state.completed) {
        state.paused = true;
        stopTimer();
        setMessage("Suguru auto-paused while this tab was hidden.");
        renderBoard();
        saveResume();
      }
    });
    window.addEventListener("beforeunload", saveResume);
  }

  function initialize() {
    const settings = readSettingsFromUrl();
    state.level = settings.level;
    state.mode = settings.mode;
    if (settings.notesMode !== undefined) {
      state.notesMode = settings.notesMode;
    }
    if (settings.showMistakes !== undefined) {
      state.showMistakes = settings.showMistakes;
    }
    if (typeof window.initializeGameSwitcher === "function") {
      window.initializeGameSwitcher();
    }
    populateLevels();
    wireEvents();
    restoreOrStart(settings);
    if (settings.notesMode !== undefined) {
      state.notesMode = settings.notesMode;
      elements.notesToggle.checked = state.notesMode;
    }
    if (settings.showMistakes !== undefined) {
      state.showMistakes = settings.showMistakes;
      elements.mistakeToggle.checked = state.showMistakes;
    }
    syncUrl();
  }

  initialize();
})();
