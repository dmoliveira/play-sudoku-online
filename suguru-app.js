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
    statusModeLabel: document.getElementById("status-mode-label"),
    notesStatusChip: document.getElementById("notes-status-chip"),
    modeDescription: document.getElementById("mode-description"),
    numberPad: document.getElementById("number-pad"),
    checkButton: document.getElementById("check-button"),
    eraseButton: document.getElementById("erase-button"),
    notesToggleCard: document.getElementById("notes-toggle-card"),
    mistakeToggleCard: document.getElementById("mistake-toggle-card"),
    valueModeButton: document.getElementById("value-mode-button"),
    noteModeButton: document.getElementById("note-mode-button"),
    entryModeHint: document.getElementById("entry-mode-hint")
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
    if (!pool.length) {
      return null;
    }
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

  function sanitizeModeState() {
    if (!Object.prototype.hasOwnProperty.call(MODES, state.mode)) {
      state.mode = DEFAULT_MODE;
    }
    if (state.mode === "nonotes") {
      state.notesMode = false;
    }
    if (state.mode === "nomistakes") {
      state.showMistakes = true;
    }
  }

  function updateActiveControls() {
    const inactive = state.completed || !state.puzzleMeta;
    elements.pauseButton.disabled = inactive;
    elements.pauseButton.classList.toggle("is-disabled", inactive);
    elements.checkButton.disabled = inactive || state.paused;
    elements.checkButton.classList.toggle("is-disabled", inactive || state.paused);
    elements.eraseButton.disabled = inactive || state.paused || state.selectedIndex === null || state.puzzle[state.selectedIndex] !== 0;
    elements.eraseButton.classList.toggle("is-disabled", inactive || state.paused || state.selectedIndex === null || state.puzzle[state.selectedIndex] !== 0);
    elements.valueModeButton.disabled = inactive;
    elements.valueModeButton.classList.toggle("is-disabled", inactive);
    elements.noteModeButton.disabled = inactive || state.mode === "nonotes";
    elements.noteModeButton.classList.toggle("is-disabled", inactive || state.mode === "nonotes");
  }

  function updatePauseButton() {
    const paused = state.paused;
    elements.pauseButton.textContent = paused ? "Resume ▶" : "Pause ⏸";
    elements.pauseButton.setAttribute("aria-pressed", String(paused));
    updateActiveControls();
  }

  function refreshModeUi() {
    elements.notesToggle.checked = state.notesMode;
    elements.mistakeToggle.checked = state.showMistakes;
    elements.notesToggle.disabled = state.mode === "nonotes";
    elements.mistakeToggle.disabled = state.mode === "nomistakes";
    elements.notesToggleCard.classList.toggle("is-disabled", state.mode === "nonotes");
    elements.mistakeToggleCard.classList.toggle("is-disabled", state.mode === "nomistakes");
    elements.statusModeLabel.textContent = MODES[state.mode].label;
    elements.notesStatusChip.hidden = !state.notesMode;
    elements.modeDescription.textContent = state.mode === "daily"
      ? "Daily keeps the same Suguru board for everyone on this date and level."
      : state.mode === "challenge"
      ? "Challenge hides instant mistake glow and asks you to trust your pattern reads."
      : state.mode === "nonotes"
      ? "No notes strips pencil marks for a cleaner pressure solve."
      : state.mode === "nomistakes"
      ? "No mistakes rejects wrong values the moment you place them."
      : "Classic Suguru keeps notes and checks flexible while you learn the cage rhythm.";
    const selectedCageSize = getSelectedCageSize();
    if (state.mode === "nonotes") {
      elements.notesToggleCard.title = "Locked by No notes mode";
      elements.entryModeHint.textContent = `Selected cage: ${selectedCageSize} cell${selectedCageSize === 1 ? "" : "s"} → use 1–${selectedCageSize}. Notes are locked by the current mode.`;
    } else {
      elements.notesToggleCard.removeAttribute("title");
      elements.entryModeHint.textContent = state.notesMode
        ? `Notes mode on. Selected cage: ${selectedCageSize} cells → use 1–${selectedCageSize}.`
        : `Value mode on. Selected cage: ${selectedCageSize} cells → use 1–${selectedCageSize}.`;
    }
    if (state.mode === "nomistakes") {
      elements.mistakeToggleCard.title = "Locked by No mistakes mode";
    } else {
      elements.mistakeToggleCard.removeAttribute("title");
    }
    elements.valueModeButton.classList.toggle("is-active", !state.notesMode);
    elements.noteModeButton.classList.toggle("is-active", state.notesMode);
    elements.valueModeButton.setAttribute("aria-pressed", String(!state.notesMode));
    elements.noteModeButton.setAttribute("aria-pressed", String(state.notesMode));
    updatePauseButton();
  }

  function applyModeDefaults() {
    const mode = MODES[state.mode];
    state.notesMode = mode.notesMode;
    state.showMistakes = mode.showMistakes;
    sanitizeModeState();
    refreshModeUi();
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
    setMessage(MODES[state.mode].label + ": fill each outlined cage with 1 up to its size, and use touching-neighbor elimination — even diagonally — to narrow placements.");
    renderBoard();
    renderNumberPad();
    startTimer();
    saveResume();
    syncUrl();
  }

  function getMaxValue() {
    return state.puzzleMeta?.maxValue || 5;
  }

  function getSelectedCageSize(index = state.selectedIndex) {
    if (!state.puzzleMeta || !Number.isInteger(index) || index < 0) {
      return getMaxValue();
    }
    return window.SuguruCore.getCageSize(index, state.puzzleMeta);
  }

  function isValidBoardSnapshot(board, puzzleMeta, puzzleBoard) {
    return Array.isArray(board)
      && board.length === puzzleMeta.size * puzzleMeta.size
      && board.every((value, index) => Number.isInteger(value)
        && value >= 0
        && value <= window.SuguruCore.getCageSize(index, puzzleMeta)
        && (puzzleBoard[index] === 0 || value === puzzleBoard[index]));
  }

  function getSanitizedNotes(index, noteSet = state.notes[index]) {
    const maxForCell = getSelectedCageSize(index);
    return Array.from(noteSet).filter((value) => Number.isInteger(value) && value >= 1 && value <= maxForCell);
  }

  function buildCellLabel(index, value, row, col, conflicts) {
    const parts = [`Row ${row + 1}, column ${col + 1}`];
    if (state.puzzle[index] !== 0) {
      parts.push(`given ${value}`);
    } else if (value !== 0) {
      parts.push(`value ${value}`);
    } else if (state.notes[index].size) {
      parts.push(`notes ${getSanitizedNotes(index).join(", ")}`);
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
      note.textContent = getSanitizedNotes(index).includes(value) ? String(value) : "";
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
    elements.board.inert = state.paused || state.completed || !state.puzzleMeta;
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
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-selected", String(state.selectedIndex === index));
      cell.setAttribute("aria-readonly", String(state.puzzle[index] !== 0));
      cell.disabled = state.paused || state.completed;
      cell.setAttribute("aria-label", buildCellLabel(index, value, row, col, conflicts));
      cell.style.borderTop = window.SuguruCore.hasRegionBoundary(index, "top", meta)
        ? "3px solid var(--line-strong)"
        : "1px solid var(--line)";
      cell.style.borderLeft = window.SuguruCore.hasRegionBoundary(index, "left", meta)
        ? "3px solid var(--line-strong)"
        : "1px solid var(--line)";
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
        syncUrl();
      });
      elements.board.appendChild(cell);
    });
    focusSelectedCell();
  }

  function renderNumberPad() {
    elements.numberPad.innerHTML = "";
    const selectedCageSize = getSelectedCageSize();
    for (let value = 1; value <= getMaxValue(); value += 1) {
      const button = document.createElement("button");
      const allowed = value <= selectedCageSize;
      button.type = "button";
      button.className = "number-button";
      button.disabled = state.paused || state.completed || !state.puzzleMeta || !allowed;
      button.innerHTML = `<span class="digit">${value}</span><span class="remaining">${allowed ? `cage max ${selectedCageSize}` : "too high"}</span>`;
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
    if (value > getSelectedCageSize()) {
      setMessage(`This ${getSelectedCageSize()}-cell cage can only use 1–${getSelectedCageSize()}.`);
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
    refreshModeUi();
    saveResume();
    syncUrl();
    checkWin();
  }

  function eraseSelected() {
    if (state.selectedIndex === null || state.puzzle[state.selectedIndex] !== 0 || state.paused || state.completed) {
      return;
    }
    state.board[state.selectedIndex] = 0;
    state.notes[state.selectedIndex].clear();
    renderBoard();
    renderNumberPad();
    refreshModeUi();
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
    if (state.completed || !state.puzzleMeta) {
      return;
    }
    state.paused = !state.paused;
    if (state.paused) {
      stopTimer();
      setMessage("Suguru paused.");
    } else {
      startTimer();
      setMessage("Suguru resumed.");
    }
    updatePauseButton();
    renderBoard();
    saveResume();
    syncUrl();
  }

  function startNewPuzzle(level = state.level, mode = state.mode) {
    state.level = LEVELS.some((entry) => entry.id === level) ? level : DEFAULT_LEVEL;
    state.mode = Object.prototype.hasOwnProperty.call(MODES, mode) ? mode : DEFAULT_MODE;
    elements.levelSelect.value = state.level;
    elements.modeSelect.value = state.mode;
    applyModeDefaults();
    const puzzle = getSelectedPuzzle(state.level, state.mode);
    if (!puzzle) {
      stopTimer();
      state.puzzleMeta = null;
      state.puzzle = [];
      state.solution = [];
      state.board = [];
      state.notes = [];
      state.selectedIndex = null;
      state.completed = true;
      elements.challengeLabel.textContent = `${getLevelMeta(state.level).label} unavailable`;
      elements.notesToggle.checked = false;
      elements.mistakeToggle.checked = state.showMistakes;
      state.notesMode = false;
      elements.timer.textContent = "00:00";
      elements.mistakeCount.textContent = "0";
      elements.board.innerHTML = "";
    elements.board.inert = state.paused || state.completed || !state.puzzleMeta;
      elements.numberPad.innerHTML = "";
      clearResume();
      updatePauseButton();
      setMessage(`No Suguru puzzles are available for ${getLevelMeta(state.level).label} right now.`);
      syncUrl();
      return;
    }
    resetForPuzzle(puzzle);
  }

  function restoreOrStart(settings) {
    if (settings.hasGameplayParams) {
      startNewPuzzle(settings.level, settings.mode);
      if (settings.notesMode !== undefined) {
        state.notesMode = settings.notesMode;
      }
      if (settings.showMistakes !== undefined) {
        state.showMistakes = settings.showMistakes;
      }
      sanitizeModeState();
      refreshModeUi();
      syncUrl();
      return;
    }

    const saved = loadResume();
    if (!saved) {
      startNewPuzzle(state.level, state.mode);
      return;
    }
    const savedLevel = LEVELS.some((entry) => entry.id === saved?.level) ? saved.level : null;
    const savedMode = Object.prototype.hasOwnProperty.call(MODES, saved?.mode) ? saved.mode : null;
    const puzzle = savedLevel ? getPuzzles(savedLevel).find((entry) => entry.id === saved.puzzleId) : null;
    const validBoard = puzzle && isValidBoardSnapshot(saved?.board, puzzle, window.SuguruCore.parseGrid(puzzle.puzzle));
    const validNotes = Array.isArray(saved?.notes) && puzzle && saved.notes.length === puzzle.size * puzzle.size;
    const validSelectedIndex = Number.isInteger(saved?.selectedIndex) && puzzle && saved.selectedIndex >= 0 && saved.selectedIndex < puzzle.size * puzzle.size;
    if (!puzzle || !savedMode || !validBoard || !validNotes) {
      clearResume();
      startNewPuzzle(state.level, state.mode);
      return;
    }
    state.level = savedLevel;
    state.mode = savedMode;
    applyModeDefaults();
    state.puzzleMeta = puzzle;
    state.puzzle = window.SuguruCore.parseGrid(puzzle.puzzle);
    state.solution = window.SuguruCore.parseGrid(puzzle.solution);

    state.board = [...saved.board];
    state.notes = createEmptyNotes(puzzle);
    saved.notes.forEach((values, index) => {
      const cageSize = window.SuguruCore.getCageSize(index, puzzle);
      state.notes[index] = new Set(Array.isArray(values) ? values.filter((value) => Number.isInteger(value) && value >= 1 && value <= cageSize) : []);
    });
    state.selectedIndex = validSelectedIndex ? saved.selectedIndex : state.puzzle.findIndex((value) => value === 0);
    state.mistakes = Number.isInteger(saved.mistakes) ? saved.mistakes : 0;
    state.notesMode = Boolean(saved.notesMode);
    state.showMistakes = saved.showMistakes !== undefined ? Boolean(saved.showMistakes) : state.showMistakes;
    state.secondsElapsed = Number.isInteger(saved.secondsElapsed) ? saved.secondsElapsed : 0;
    sanitizeModeState();
    refreshModeUi();
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
      if (Number(key) > getSelectedCageSize()) {
        setMessage(`This ${getSelectedCageSize()}-cell cage can only use 1–${getSelectedCageSize()}.`);
        return;
      }
      handleDigit(Number(key));
      return;
    }
    if (key === "Backspace" || key === "Delete" || key === "0") {
      eraseSelected();
      return;
    }
    if (key.toLowerCase() === "x" && state.mode !== "nonotes") {
      state.notesMode = !state.notesMode;
      sanitizeModeState();
      refreshModeUi();
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
      renderNumberPad();
      refreshModeUi();
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
    renderNumberPad();
    refreshModeUi();
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
      sanitizeModeState();
      refreshModeUi();
      saveResume();
      syncUrl();
    });
    elements.mistakeToggle.addEventListener("change", (event) => {
      if (state.mode === "nomistakes") {
        elements.mistakeToggle.checked = true;
        return;
      }
      state.showMistakes = event.target.checked;
      sanitizeModeState();
      refreshModeUi();
      renderBoard();
      saveResume();
      syncUrl();
    });
    elements.newGameButton.addEventListener("click", () => startNewPuzzle(state.level, state.mode));
    elements.pauseButton.addEventListener("click", togglePause);
    elements.checkButton.addEventListener("click", checkBoard);
    elements.eraseButton.addEventListener("click", eraseSelected);
    elements.valueModeButton.addEventListener("click", () => {
      state.notesMode = false;
      sanitizeModeState();
      refreshModeUi();
      saveResume();
      syncUrl();
    });
    elements.noteModeButton.addEventListener("click", () => {
      if (state.mode === "nonotes") {
        refreshModeUi();
        return;
      }
      state.notesMode = true;
      sanitizeModeState();
      refreshModeUi();
      saveResume();
      syncUrl();
    });
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !state.paused && !state.completed) {
        state.paused = true;
        stopTimer();
        setMessage("Suguru auto-paused while this tab was hidden.");
        updatePauseButton();
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
    updatePauseButton();
    restoreOrStart(settings);
    syncUrl();
  }

  initialize();
})();
