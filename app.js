(function () {
  const STORAGE_KEY = "sudoku-sakura-stats";
  const DEFAULT_STATS = {
    easy: { bestTime: null, solved: 0 },
    medium: { bestTime: null, solved: 0 },
    hard: { bestTime: null, solved: 0 },
    expert: { bestTime: null, solved: 0 }
  };

  function cloneDefaultStats() {
    return JSON.parse(JSON.stringify(DEFAULT_STATS));
  }

  const state = {
    difficulty: "easy",
    puzzleId: null,
    puzzle: [],
    solution: [],
    board: [],
    notes: SudokuCore.createNotesState(),
    selectedIndex: null,
    showMistakes: true,
    notesMode: false,
    mistakes: 0,
    secondsElapsed: 0,
    intervalId: null,
    completed: false,
    stats: loadStats()
  };

  const elements = {
    board: document.getElementById("sudoku-board"),
    timer: document.getElementById("timer"),
    mistakeCount: document.getElementById("mistake-count"),
    difficultySelect: document.getElementById("difficulty-select"),
    mistakeToggle: document.getElementById("mistake-toggle"),
    notesToggle: document.getElementById("notes-toggle"),
    newGameButton: document.getElementById("new-game-button"),
    eraseButton: document.getElementById("erase-button"),
    resetButton: document.getElementById("reset-button"),
    checkButton: document.getElementById("check-button"),
    numberPad: document.getElementById("number-pad"),
    challengeLabel: document.getElementById("challenge-label"),
    message: document.getElementById("game-message"),
    currentDifficultyLabel: document.getElementById("current-difficulty-label"),
    bestTimeOverview: document.getElementById("best-time-overview"),
    solvedOverview: document.getElementById("solved-overview"),
    statsList: document.getElementById("stats-list")
  };

  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return cloneDefaultStats();
      }

      const parsed = JSON.parse(raw);
      const normalized = cloneDefaultStats();
      Object.keys(normalized).forEach((difficulty) => {
        normalized[difficulty] = {
          ...normalized[difficulty],
          ...(parsed[difficulty] || {})
        };
      });

      return normalized;
    } catch (error) {
      return cloneDefaultStats();
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stats));
    } catch (error) {
      setMessage("Solved, but browser storage is unavailable for saving stats.");
    }
  }

  function getRandomPuzzle(difficulty) {
    const pool = window.SUDOKU_PUZZLES[difficulty];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function startTimer() {
    stopTimer();
    state.intervalId = window.setInterval(() => {
      state.secondsElapsed += 1;
      elements.timer.textContent = SudokuCore.formatTime(state.secondsElapsed);
    }, 1000);
  }

  function stopTimer() {
    if (state.intervalId) {
      window.clearInterval(state.intervalId);
      state.intervalId = null;
    }
  }

  function setMessage(message) {
    elements.message.textContent = message;
  }

  function updateOverview() {
    const stats = state.stats[state.difficulty];
    elements.currentDifficultyLabel.textContent = capitalize(state.difficulty);
    elements.bestTimeOverview.textContent = stats.bestTime ? SudokuCore.formatTime(stats.bestTime) : "—";
    elements.solvedOverview.textContent = String(totalSolved());
  }

  function renderStats() {
    elements.statsList.innerHTML = "";
    Object.entries(state.stats).forEach(([difficulty, stats]) => {
      const item = document.createElement("div");
      item.className = "stats-item";
      item.innerHTML = `
        <span>${capitalize(difficulty)}</span>
        <strong>${stats.bestTime ? SudokuCore.formatTime(stats.bestTime) : "No record yet"} · ${stats.solved} solved</strong>
      `;
      elements.statsList.appendChild(item);
    });
  }

  function totalSolved() {
    return Object.values(state.stats).reduce((total, entry) => total + entry.solved, 0);
  }

  function resetStateForPuzzle(puzzle) {
    state.puzzleId = puzzle.id;
    state.puzzle = SudokuCore.parseGrid(puzzle.puzzle);
    state.solution = SudokuCore.parseGrid(puzzle.solution);
    state.board = [...state.puzzle];
    state.notes = SudokuCore.createNotesState();
    state.selectedIndex = state.puzzle.findIndex((value) => value === 0);
    state.mistakes = 0;
    state.secondsElapsed = 0;
    state.completed = false;

    elements.timer.textContent = "00:00";
    elements.mistakeCount.textContent = "0";
    elements.challengeLabel.textContent = puzzle.label;
    setMessage("Fill the grid so each row, column, and box contains 1–9 once.");
    startTimer();
    updateOverview();
  }

  function newGame(difficulty = state.difficulty) {
    state.difficulty = difficulty;
    elements.difficultySelect.value = difficulty;
    resetStateForPuzzle(getRandomPuzzle(difficulty));
    renderBoard();
    renderNumberPad();
    renderStats();
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function renderBoard() {
    elements.board.innerHTML = "";

    state.board.forEach((value, index) => {
      const cell = document.createElement("button");
      const { row, col } = SudokuCore.indexToRowCol(index);
      const related = state.selectedIndex !== null && SudokuCore.getPeers(state.selectedIndex).has(index);
      const sameNumber = state.selectedIndex !== null && value !== 0 && value === state.board[state.selectedIndex];
      const invalid = state.showMistakes && value !== 0 && value !== state.solution[index];
      const conflicts = state.showMistakes ? SudokuCore.collectConflicts(state.board, index) : [];
      const isSelected = state.selectedIndex === index;

      cell.type = "button";
      cell.className = [
        "cell",
        state.puzzle[index] !== 0 ? "given" : "",
        isSelected ? "selected" : "",
        related ? "related" : "",
        sameNumber ? "matching" : "",
        invalid ? "invalid" : "",
        conflicts.length ? "conflict" : ""
      ]
        .filter(Boolean)
        .join(" ");
      cell.dataset.index = String(index);
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = isSelected ? 0 : -1;
      cell.setAttribute("aria-selected", String(isSelected));
      cell.setAttribute("aria-label", buildCellLabel(index, value, row, col, conflicts.length > 0));

      if (value === 0) {
        cell.appendChild(renderNotes(index));
      } else {
        cell.textContent = String(value);
      }

      cell.addEventListener("click", () => selectCell(index));
      elements.board.appendChild(cell);
    });

    focusSelectedCell();
  }

  function buildCellLabel(index, value, row, col, hasConflict) {
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

    if (hasConflict) {
      parts.push("conflict");
    }
    if (state.selectedIndex === index) {
      parts.push("selected");
    }

    return parts.join(", ");
  }

  function focusSelectedCell() {
    if (state.selectedIndex === null) {
      return;
    }

    const selectedCell = elements.board.querySelector(`[data-index="${state.selectedIndex}"]`);
    if (selectedCell) {
      selectedCell.focus({ preventScroll: true });
    }
  }

  function renderNotes(index) {
    const notesWrap = document.createElement("div");
    notesWrap.className = "notes-grid";
    for (let value = 1; value <= 9; value += 1) {
      const note = document.createElement("span");
      note.textContent = state.notes[index].has(value) ? String(value) : "";
      notesWrap.appendChild(note);
    }
    return notesWrap;
  }

  function renderNumberPad() {
    elements.numberPad.innerHTML = "";
    for (let value = 1; value <= 9; value += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "number-button";
      button.textContent = String(value);
      button.addEventListener("click", () => handleDigit(value));
      elements.numberPad.appendChild(button);
    }
  }

  function selectCell(index) {
    state.selectedIndex = index;
    renderBoard();
  }

  function handleDigit(value) {
    if (state.selectedIndex === null || state.completed) {
      return;
    }

    if (state.puzzle[state.selectedIndex] !== 0) {
      setMessage("That cell is fixed. Choose an empty square.");
      return;
    }

    if (state.notesMode) {
      toggleNote(state.selectedIndex, value);
      renderBoard();
      return;
    }

    const previous = state.board[state.selectedIndex];
    state.board[state.selectedIndex] = value;
    state.notes[state.selectedIndex].clear();

    if (state.showMistakes && value !== state.solution[state.selectedIndex] && previous !== value) {
      state.mistakes += 1;
      elements.mistakeCount.textContent = String(state.mistakes);
      setMessage("⚠️ That guess clashes with the solution. Try another path.");
    } else {
      setMessage("Nice. Keep scanning rows, columns, and boxes.");
    }

    renderBoard();
    checkWin();
  }

  function toggleNote(index, value) {
    if (state.notes[index].has(value)) {
      state.notes[index].delete(value);
      setMessage(`Removed note ${value}.`);
    } else {
      state.notes[index].add(value);
      setMessage(`Added note ${value}.`);
    }
  }

  function eraseSelected() {
    if (state.selectedIndex === null || state.completed) {
      return;
    }
    if (state.puzzle[state.selectedIndex] !== 0) {
      setMessage("Given clues cannot be erased.");
      return;
    }
    state.board[state.selectedIndex] = 0;
    state.notes[state.selectedIndex].clear();
    setMessage("Cell cleared.");
    renderBoard();
  }

  function restartPuzzle() {
    state.board = [...state.puzzle];
    state.notes = SudokuCore.createNotesState();
    state.mistakes = 0;
    state.secondsElapsed = 0;
    state.completed = false;
    elements.timer.textContent = "00:00";
    elements.mistakeCount.textContent = "0";
    setMessage("Puzzle restarted. Fresh mind, fresh grid.");
    startTimer();
    renderBoard();
  }

  function checkBoard() {
    const hasEmpty = state.board.includes(0);
    const hasWrong = state.board.some((value, index) => value !== 0 && value !== state.solution[index]);

    if (!hasEmpty && !hasWrong) {
      finishPuzzle();
      return;
    }

    if (hasWrong) {
      setMessage("There are still wrong entries on the board.");
    } else {
      setMessage("So far so good. Keep going.");
    }
    renderBoard();
  }

  function checkWin() {
    if (SudokuCore.isSolved(state.board, state.solution)) {
      finishPuzzle();
    }
  }

  function finishPuzzle() {
    if (state.completed) {
      return;
    }

    state.completed = true;
    stopTimer();
    const stats = state.stats[state.difficulty];
    stats.solved += 1;
    if (!stats.bestTime || state.secondsElapsed < stats.bestTime) {
      stats.bestTime = state.secondsElapsed;
    }
    saveStats();
    renderStats();
    updateOverview();
    setMessage(`🎉 Puzzle solved in ${SudokuCore.formatTime(state.secondsElapsed)}. Beautiful work.`);
  }

  function handleKeydown(event) {
    const { key } = event;
    if (shouldIgnoreBoardKeydown(event)) {
      return;
    }

    if (/^[1-9]$/.test(key)) {
      handleDigit(Number(key));
      return;
    }

    if (key === "Backspace" || key === "Delete" || key === "0") {
      eraseSelected();
      return;
    }

    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      return;
    }

    event.preventDefault();
    if (state.selectedIndex === null) {
      state.selectedIndex = 0;
      renderBoard();
      return;
    }

    const { row, col } = SudokuCore.indexToRowCol(state.selectedIndex);
    let nextRow = row;
    let nextCol = col;

    if (key === "ArrowUp") nextRow = Math.max(0, row - 1);
    if (key === "ArrowDown") nextRow = Math.min(8, row + 1);
    if (key === "ArrowLeft") nextCol = Math.max(0, col - 1);
    if (key === "ArrowRight") nextCol = Math.min(8, col + 1);

    state.selectedIndex = SudokuCore.rowColToIndex(nextRow, nextCol);
    renderBoard();
  }

  function shouldIgnoreBoardKeydown(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tagName = target.tagName;
    const isInteractive = ["INPUT", "SELECT", "TEXTAREA", "OPTION"].includes(tagName) || target.isContentEditable;
    const isBoardCell = target.classList.contains("cell");
    const isBoardContainer = target.id === "sudoku-board";
    const isPageRoot = tagName === "BODY" || tagName === "HTML";
    return isInteractive || (!isBoardCell && !isBoardContainer && !isPageRoot);
  }

  function wireEvents() {
    elements.difficultySelect.addEventListener("change", (event) => {
      newGame(event.target.value);
    });

    elements.mistakeToggle.addEventListener("change", (event) => {
      state.showMistakes = event.target.checked;
      setMessage(state.showMistakes ? "Wrong guesses will glow instantly." : "Wrong guesses are hidden. Trust your logic.");
      renderBoard();
    });

    elements.notesToggle.addEventListener("change", (event) => {
      state.notesMode = event.target.checked;
      setMessage(state.notesMode ? "Notes mode on. Tap numbers to add candidates." : "Notes mode off. Tap numbers to place values.");
    });

    elements.newGameButton.addEventListener("click", () => newGame(state.difficulty));
    elements.eraseButton.addEventListener("click", eraseSelected);
    elements.resetButton.addEventListener("click", restartPuzzle);
    elements.checkButton.addEventListener("click", checkBoard);
    document.addEventListener("keydown", handleKeydown);
  }

  wireEvents();
  newGame();
})();
