(function () {
  const STORAGE_KEY = "sudoku-sakura-stats";
  const AUDIO_KEY = "sudoku-sakura-audio";
  const PAD_TIPS_KEY = "sudoku-sakura-pad-tips";
  const RANKS = [
    { name: "Petal novice", threshold: 0 },
    { name: "Garden solver", threshold: 40 },
    { name: "Lantern thinker", threshold: 90 },
    { name: "Temple tactician", threshold: 160 },
    { name: "Sakura master", threshold: 260 }
  ];
  const MODES = {
    classic: {
      label: "Classic",
      description: "Balanced play with full control over notes and feedback.",
      defaults: { showMistakes: true, notesMode: false }
    },
    zen: {
      label: "Zen",
      description: "Slow, calm, and clean. Notes on and instant mistake glow off.",
      defaults: { showMistakes: false, notesMode: true }
    },
    sprint: {
      label: "Sprint",
      description: "Move fast, trust the timer, and chase your best time.",
      defaults: { showMistakes: true, notesMode: false }
    },
    nomistakes: {
      label: "No mistakes",
      description: "Wrong moves are rejected immediately. Precision first.",
      defaults: { showMistakes: true, notesMode: false }
    },
    daily: {
      label: "Daily puzzle",
      description: "A deterministic puzzle for the current date and difficulty.",
      defaults: { showMistakes: false, notesMode: true }
    }
  };

  function createBucket() {
    return {
      started: 0,
      solved: 0,
      abandoned: 0,
      totalTime: 0,
      bestTime: null,
      mistakes: 0
    };
  }

  function buildDefaultStats() {
    return {
      overall: {
        ...createBucket(),
        streak: 0,
        lastSolvedOn: null,
        pausedCount: 0
      },
      difficulties: {
        easy: createBucket(),
        medium: createBucket(),
        hard: createBucket(),
        expert: createBucket()
      },
      modes: Object.fromEntries(Object.keys(MODES).map((mode) => [mode, createBucket()]))
    };
  }

  function cloneDefaultStats() {
    return JSON.parse(JSON.stringify(buildDefaultStats()));
  }

  const state = {
    difficulty: "easy",
    mode: "classic",
    puzzleId: null,
    puzzleMeta: null,
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
    paused: false,
    pauseReason: null,
    audioEnabled: loadAudioPreference(),
    padTipsEnabled: loadPadTipsPreference(),
    audioContext: null,
    stats: loadStats(),
    activeSessionRecorded: false,
    lastPuzzleKey: null,
    revealIndices: new Set(),
    revealTimeoutId: null
  };

  const elements = {
    topbar: document.querySelector(".topbar"),
    sidebar: document.querySelector(".sidebar"),
    contentGrid: document.querySelector(".content-grid"),
    seoPanel: document.querySelector(".seo-panel"),
    faq: document.querySelector(".faq"),
    siteFooter: document.querySelector(".site-footer"),
    gameHeader: document.querySelector(".game-header"),
    controlsRow: document.querySelector(".controls-row"),
    focusRibbon: document.querySelector(".focus-ribbon"),
    boardMeta: document.querySelector(".board-meta"),
    actionsBar: document.querySelector(".actions-bar"),
    board: document.getElementById("sudoku-board"),
    pauseOverlay: document.getElementById("pause-overlay"),
    pauseOverlayText: document.getElementById("pause-overlay-text"),
    victoryOverlay: document.getElementById("victory-overlay"),
    victorySummary: document.getElementById("victory-summary"),
    victoryNewGameButton: document.getElementById("victory-new-game-button"),
    resumeButton: document.getElementById("resume-button"),
    pauseButton: document.getElementById("pause-button"),
    timer: document.getElementById("timer"),
    mistakeCount: document.getElementById("mistake-count"),
    difficultySelect: document.getElementById("difficulty-select"),
    modeSelect: document.getElementById("mode-select"),
    mistakeToggle: document.getElementById("mistake-toggle"),
    mistakeToggleLabel: document.getElementById("mistake-toggle-label"),
    notesToggle: document.getElementById("notes-toggle"),
    audioToggle: document.getElementById("audio-toggle"),
    padTipsToggle: document.getElementById("pad-tips-toggle"),
    newGameButton: document.getElementById("new-game-button"),
    eraseButton: document.getElementById("erase-button"),
    resetButton: document.getElementById("reset-button"),
    checkButton: document.getElementById("check-button"),
    numberPad: document.getElementById("number-pad"),
    challengeLabel: document.getElementById("challenge-label"),
    message: document.getElementById("game-message"),
    currentDifficultyLabel: document.getElementById("current-difficulty-label"),
    currentModeLabel: document.getElementById("current-mode-label"),
    bestTimeOverview: document.getElementById("best-time-overview"),
    streakOverview: document.getElementById("streak-overview"),
    rankOverview: document.getElementById("rank-overview"),
    statsList: document.getElementById("stats-list"),
    analyticsList: document.getElementById("analytics-list"),
    achievementList: document.getElementById("achievement-list"),
    rankTitle: document.getElementById("rank-title"),
    rankMeterFill: document.getElementById("rank-meter-fill"),
    rankSummary: document.getElementById("rank-summary"),
    statusModeLabel: document.getElementById("status-mode-label"),
    selectedDigitLabel: document.getElementById("selected-digit-label"),
    selectedRemainingLabel: document.getElementById("selected-remaining-label")
  };

  const modalMutedSections = [
    elements.topbar,
    elements.sidebar,
    elements.contentGrid,
    elements.seoPanel,
    elements.faq,
    elements.siteFooter,
    elements.gameHeader,
    elements.controlsRow,
    elements.focusRibbon,
    elements.boardMeta,
    elements.actionsBar,
    elements.numberPad
  ].filter(Boolean);

  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const defaults = cloneDefaultStats();
      if (!raw) {
        return defaults;
      }

      const parsed = JSON.parse(raw);
      defaults.overall = { ...defaults.overall, ...(parsed.overall || {}) };
      Object.keys(defaults.difficulties).forEach((difficulty) => {
        defaults.difficulties[difficulty] = {
          ...defaults.difficulties[difficulty],
          ...((parsed.difficulties || {})[difficulty] || {})
        };
      });
      Object.keys(defaults.modes).forEach((mode) => {
        defaults.modes[mode] = {
          ...defaults.modes[mode],
          ...((parsed.modes || {})[mode] || {})
        };
      });
      return defaults;
    } catch (error) {
      return cloneDefaultStats();
    }
  }

  function loadAudioPreference() {
    try {
      const raw = localStorage.getItem(AUDIO_KEY);
      return raw === null ? true : raw === "on";
    } catch (error) {
      return true;
    }
  }

  function saveAudioPreference() {
    try {
      localStorage.setItem(AUDIO_KEY, state.audioEnabled ? "on" : "off");
    } catch (error) {
      // ignore preference-only storage issues
    }
  }

  function loadPadTipsPreference() {
    try {
      const raw = localStorage.getItem(PAD_TIPS_KEY);
      return raw === null ? true : raw === "on";
    } catch (error) {
      return true;
    }
  }

  function savePadTipsPreference() {
    try {
      localStorage.setItem(PAD_TIPS_KEY, state.padTipsEnabled ? "on" : "off");
    } catch (error) {
      // ignore preference-only storage issues
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stats));
    } catch (error) {
      setMessage("Solved, but browser storage is unavailable for saving stats.");
    }
  }

  function ensureAudioContext() {
    if (!state.audioEnabled) {
      return null;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    if (!state.audioContext) {
      state.audioContext = new AudioCtor();
    }

    if (state.audioContext.state === "suspended") {
      state.audioContext.resume().catch(() => {});
    }

    return state.audioContext;
  }

  function playTone(frequency, duration = 0.08, type = "sine", gainValue = 0.03) {
    const context = ensureAudioContext();
    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function playSound(kind) {
    if (!state.audioEnabled) {
      return;
    }

    if (kind === "place") playTone(440, 0.08, "sine", 0.025);
    if (kind === "note") playTone(660, 0.05, "triangle", 0.02);
    if (kind === "error") playTone(210, 0.12, "square", 0.028);
    if (kind === "pause") playTone(300, 0.08, "triangle", 0.02);
    if (kind === "resume") playTone(520, 0.08, "triangle", 0.02);
    if (kind === "win") {
      playTone(523.25, 0.08, "triangle", 0.022);
      window.setTimeout(() => playTone(659.25, 0.09, "triangle", 0.022), 70);
      window.setTimeout(() => playTone(783.99, 0.12, "triangle", 0.022), 150);
    }
  }

  function getCurrentDateKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getBucketAverage(bucket) {
    return bucket.solved ? Math.round(bucket.totalTime / bucket.solved) : null;
  }

  function formatAverage(bucket) {
    const average = getBucketAverage(bucket);
    return average ? SudokuCore.formatTime(average) : "—";
  }

  function getRankScore() {
    const overall = state.stats.overall;
    return (
      overall.solved * 10 +
      state.stats.overall.streak * 15 +
      state.stats.difficulties.hard.solved * 8 +
      state.stats.difficulties.expert.solved * 20 +
      state.stats.modes.daily.solved * 6 -
      overall.abandoned * 2
    );
  }

  function getRankInfo() {
    const score = Math.max(0, getRankScore());
    let currentRank = RANKS[0];
    let nextRank = null;

    for (const rank of RANKS) {
      if (score >= rank.threshold) {
        currentRank = rank;
      } else {
        nextRank = rank;
        break;
      }
    }

    const nextThreshold = nextRank ? nextRank.threshold : currentRank.threshold;
    const baseThreshold = currentRank.threshold;
    const progress = nextRank
      ? Math.min(100, ((score - baseThreshold) / Math.max(1, nextThreshold - baseThreshold)) * 100)
      : 100;

    return {
      score,
      currentRank,
      nextRank,
      progress,
      pointsToNext: nextRank ? Math.max(0, nextRank.threshold - score) : 0
    };
  }

  function hashText(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function clearReveal() {
    if (state.revealTimeoutId) {
      window.clearTimeout(state.revealTimeoutId);
      state.revealTimeoutId = null;
    }
    state.revealIndices = new Set();
  }

  function revealIndices(indices, duration = 2500) {
    clearReveal();
    state.revealIndices = new Set(indices);
    if (state.revealIndices.size) {
      state.revealTimeoutId = window.setTimeout(() => {
        state.revealIndices = new Set();
        state.revealTimeoutId = null;
        renderBoard();
      }, duration);
    }
  }

  function shouldRevealMistakes(index) {
    return state.showMistakes || state.revealIndices.has(index);
  }

  function hasActivePuzzle() {
    return Boolean(state.puzzleId && state.activeSessionRecorded && !state.completed);
  }

  function recordStart() {
    state.activeSessionRecorded = true;
    state.stats.overall.started += 1;
    state.stats.difficulties[state.difficulty].started += 1;
    state.stats.modes[state.mode].started += 1;
    saveStats();
  }

  function recordAbandon() {
    if (!hasActivePuzzle()) {
      return;
    }
    state.stats.overall.abandoned += 1;
    state.stats.difficulties[state.difficulty].abandoned += 1;
    state.stats.modes[state.mode].abandoned += 1;
    state.activeSessionRecorded = false;
    saveStats();
  }

  function updateStreak() {
    const today = getCurrentDateKey();
    const lastSolvedOn = state.stats.overall.lastSolvedOn;
    if (lastSolvedOn === today) {
      return;
    }

    if (!lastSolvedOn) {
      state.stats.overall.streak = 1;
      state.stats.overall.lastSolvedOn = today;
      return;
    }

    const oneDay = 24 * 60 * 60 * 1000;
    const difference = Math.round((new Date(today) - new Date(lastSolvedOn)) / oneDay);
    state.stats.overall.streak = difference === 1 ? state.stats.overall.streak + 1 : 1;
    state.stats.overall.lastSolvedOn = today;
  }

  function recordSolve() {
    const difficultyBucket = state.stats.difficulties[state.difficulty];
    const modeBucket = state.stats.modes[state.mode];
    const overallBucket = state.stats.overall;

    [difficultyBucket, modeBucket, overallBucket].forEach((bucket) => {
      bucket.solved += 1;
      bucket.totalTime += state.secondsElapsed;
      bucket.mistakes += state.mistakes;
      if (!bucket.bestTime || state.secondsElapsed < bucket.bestTime) {
        bucket.bestTime = state.secondsElapsed;
      }
    });

    updateStreak();
    state.activeSessionRecorded = false;
    saveStats();
  }

  function recordPause() {
    state.stats.overall.pausedCount += 1;
    saveStats();
  }

  function getAvailablePuzzles(difficulty) {
    return window.SUDOKU_PUZZLES[difficulty] || [];
  }

  function getDailyPuzzle(difficulty) {
    const pool = getAvailablePuzzles(difficulty);
    const dateKey = getCurrentDateKey();
    return pool[hashText(`${difficulty}-${dateKey}`) % pool.length];
  }

  function getRandomPuzzle(difficulty, mode) {
    const pool = getAvailablePuzzles(difficulty);
    const previousKey = state.lastPuzzleKey;
    const filtered = pool.filter((entry) => `${difficulty}:${mode}:${entry.id}` !== previousKey);
    const source = filtered.length ? filtered : pool;
    const puzzle = source[Math.floor(Math.random() * source.length)];
    state.lastPuzzleKey = `${difficulty}:${mode}:${puzzle.id}`;
    return puzzle;
  }

  function getSelectedPuzzle(difficulty, mode) {
    if (mode === "daily") {
      const puzzle = getDailyPuzzle(difficulty);
      state.lastPuzzleKey = `${difficulty}:${mode}:${puzzle.id}`;
      return puzzle;
    }
    return getRandomPuzzle(difficulty, mode);
  }

  function startTimer() {
    stopTimer();
    if (state.paused || state.completed) {
      return;
    }
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

  function applyModeDefaults(mode) {
    const defaults = MODES[mode].defaults;
    state.showMistakes = defaults.showMistakes;
    state.notesMode = defaults.notesMode;
    elements.mistakeToggle.checked = state.showMistakes;
    elements.notesToggle.checked = state.notesMode;
  }

  function readSettingsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const difficulty = params.get("difficulty");
    const mode = params.get("mode");
    return {
      difficulty: ["easy", "medium", "hard", "expert"].includes(difficulty) ? difficulty : "easy",
      mode: Object.prototype.hasOwnProperty.call(MODES, mode) ? mode : "classic",
      showMistakes: params.has("mistakes") ? params.get("mistakes") !== "off" : undefined,
      notesMode: params.has("notes") ? params.get("notes") === "on" : undefined
    };
  }

  function syncUrl() {
    const params = new URLSearchParams(window.location.search);
    params.set("difficulty", state.difficulty);
    params.set("mode", state.mode);
    params.set("mistakes", state.showMistakes ? "on" : "off");
    params.set("notes", state.notesMode ? "on" : "off");
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }

  function updateOverview() {
    const modeBucket = state.stats.modes[state.mode];
    const rankInfo = getRankInfo();
    elements.currentDifficultyLabel.textContent = capitalize(state.difficulty);
    elements.currentModeLabel.textContent = MODES[state.mode].label;
    elements.statusModeLabel.textContent = MODES[state.mode].label;
    elements.bestTimeOverview.textContent = modeBucket.bestTime ? SudokuCore.formatTime(modeBucket.bestTime) : "—";
    elements.streakOverview.textContent = `${state.stats.overall.streak} day${state.stats.overall.streak === 1 ? "" : "s"}`;
    elements.rankOverview.textContent = rankInfo.currentRank.name;
  }

  function statRow(label, value) {
    return `<div class="stats-item"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function renderAchievements() {
    const achievements = [];
    const overall = state.stats.overall;

    if (overall.solved >= 1) achievements.push({ title: "🌸 First Bloom", text: "Complete your first puzzle and begin your Sakura rhythm." });
    if (overall.solved >= 10) achievements.push({ title: "🏯 Steady Solver", text: "Reach ten completed boards across any mode." });
    if (overall.streak >= 3) achievements.push({ title: "📿 Daily Rhythm", text: "Keep a three-day solving streak alive." });
    if (state.stats.difficulties.hard.solved >= 3 || state.stats.difficulties.expert.solved >= 1) achievements.push({ title: "⚔️ Challenge Spirit", text: "Win on hard or expert and prove your logic under pressure." });
    if (state.stats.modes.daily.solved >= 2) achievements.push({ title: "☀️ Daily Devotee", text: "Return for the daily puzzle more than once." });
    if (overall.abandoned === 0 && overall.solved >= 3) achievements.push({ title: "🪷 Clean Focus", text: "Finish multiple boards without recording an abandon." });

    elements.achievementList.innerHTML = achievements.length
      ? achievements.map((entry) => `<div class="achievement-item"><strong>${entry.title}</strong><span>${entry.text}</span></div>`).join("")
      : `<div class="achievement-item"><strong>🌱 Budding player</strong><span>Solve a few boards and your local achievements will blossom here.</span></div>`;
  }

  function renderRankPanel() {
    const rankInfo = getRankInfo();
    elements.rankTitle.textContent = rankInfo.currentRank.name;
    elements.rankMeterFill.style.width = `${rankInfo.progress}%`;
    elements.rankSummary.innerHTML = [
      statRow("Rank score", String(rankInfo.score)),
      statRow("Current tier", rankInfo.currentRank.name),
      statRow("Next tier", rankInfo.nextRank ? `${rankInfo.nextRank.name} in ${rankInfo.pointsToNext}` : "Top tier reached"),
      statRow("Momentum", `${state.stats.overall.streak} day streak`)
    ].join("");
  }

  function renderStats() {
    const difficultyBucket = state.stats.difficulties[state.difficulty];
    const modeBucket = state.stats.modes[state.mode];
    const overallBucket = state.stats.overall;

    elements.statsList.innerHTML = [
      statRow(`Best ${capitalize(state.difficulty)}`, difficultyBucket.bestTime ? SudokuCore.formatTime(difficultyBucket.bestTime) : "No record yet"),
      statRow(`Avg ${MODES[state.mode].label}`, formatAverage(modeBucket)),
      statRow("Solved total", `${overallBucket.solved} completed`),
      statRow("Current mode", `${modeBucket.solved} solved`)
    ].join("");

    elements.analyticsList.innerHTML = [
      statRow("Starts", `${overallBucket.started} sessions`),
      statRow("Abandoned", `${overallBucket.abandoned} exits`),
      statRow("Paused", `${overallBucket.pausedCount} times`),
      statRow("Avg all modes", formatAverage(overallBucket))
    ].join("");
  }

  function resetStateForPuzzle(puzzle, options = {}) {
    if (options.countAbandon !== false) {
      recordAbandon();
    }

    clearReveal();
    state.puzzleId = puzzle.id;
    state.puzzleMeta = puzzle;
    state.puzzle = SudokuCore.parseGrid(puzzle.puzzle);
    state.solution = SudokuCore.parseGrid(puzzle.solution);
    state.board = [...state.puzzle];
    state.notes = SudokuCore.createNotesState();
    state.selectedIndex = state.puzzle.findIndex((value) => value === 0);
    state.mistakes = 0;
    state.secondsElapsed = 0;
    state.completed = false;
    state.paused = false;
    state.pauseReason = null;
    elements.victoryOverlay.hidden = true;

    elements.timer.textContent = "00:00";
    elements.mistakeCount.textContent = "0";
    elements.challengeLabel.textContent = `${capitalize(state.difficulty)} · ${MODES[state.mode].label} · ${puzzle.label}`;
    setMessage(MODES[state.mode].description);
    updatePauseUi();
    recordStart();
    startTimer();
    updateOverview();
    renderStats();
    renderAchievements();
    renderRankPanel();
    syncUrl();
  }

  function newGame(difficulty = state.difficulty, mode = state.mode, options = {}) {
    state.difficulty = difficulty;
    state.mode = mode;
    elements.difficultySelect.value = difficulty;
    elements.modeSelect.value = mode;
    applyModeDefaults(mode);

    if (options.overrideShowMistakes !== undefined) {
      state.showMistakes = options.overrideShowMistakes;
      elements.mistakeToggle.checked = state.showMistakes;
    }
    if (options.overrideNotesMode !== undefined) {
      state.notesMode = options.overrideNotesMode;
      elements.notesToggle.checked = state.notesMode;
    }

    refreshMistakeToggleUi();

    resetStateForPuzzle(getSelectedPuzzle(difficulty, mode), { countAbandon: options.countAbandon });
    renderBoard();
    renderNumberPad();
    renderAchievements();
  }

  function refreshMistakeToggleUi() {
    const locked = state.mode === "nomistakes";
    elements.mistakeToggle.checked = locked ? true : state.showMistakes;
    elements.mistakeToggle.disabled = locked;
    elements.mistakeToggle.closest("label")?.classList.toggle("is-disabled", locked);
    elements.mistakeToggleLabel.textContent = locked ? "Wrong moves rejected instantly" : "Show wrong guesses";
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function renderBoard() {
    elements.board.innerHTML = "";
    elements.board.classList.toggle("is-paused", state.paused);
    elements.board.setAttribute("aria-disabled", String(state.paused));
    elements.board.inert = state.paused || state.completed;

    state.board.forEach((value, index) => {
      const cell = document.createElement("button");
      const { row, col } = SudokuCore.indexToRowCol(index);
      const related = state.selectedIndex !== null && SudokuCore.getPeers(state.selectedIndex).has(index);
      const sameNumber = state.selectedIndex !== null && value !== 0 && value === state.board[state.selectedIndex];
      const revealMistakes = shouldRevealMistakes(index);
      const invalid = revealMistakes && value !== 0 && value !== state.solution[index];
      const conflicts = revealMistakes ? SudokuCore.collectConflicts(state.board, index) : [];
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
      cell.setAttribute("aria-readonly", String(state.puzzle[index] !== 0));
      cell.tabIndex = isSelected ? 0 : -1;
      cell.disabled = state.paused;
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

    updatePauseUi();
    renderSelectionSummary();
    focusSelectedCell();
  }

  function getSelectedDigit() {
    if (state.selectedIndex === null) {
      return null;
    }

    const currentValue = state.board[state.selectedIndex];
    if (currentValue) {
      return currentValue;
    }

    const notes = Array.from(state.notes[state.selectedIndex]);
    return notes.length === 1 ? notes[0] : null;
  }

  function renderSelectionSummary() {
    const selectedDigit = getSelectedDigit();
    const placedCount = selectedDigit ? state.board.filter((value) => value === selectedDigit).length : 0;
    elements.selectedDigitLabel.textContent = selectedDigit ? String(selectedDigit) : "—";
    elements.selectedRemainingLabel.textContent = selectedDigit ? String(Math.max(0, 9 - placedCount)) : "9";
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
    if (state.paused) {
      parts.push("paused");
    }

    return parts.join(", ");
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
    const selectedDigit = getSelectedDigit();
    for (let value = 1; value <= 9; value += 1) {
      const button = document.createElement("button");
      const placedCount = state.board.filter((entry) => entry === value).length;
      const remaining = Math.max(0, 9 - placedCount);
      button.type = "button";
      button.className = [
        "number-button",
        selectedDigit === value ? "is-active" : "",
        remaining === 0 ? "is-complete" : ""
      ].filter(Boolean).join(" ");
      button.innerHTML = state.padTipsEnabled
        ? `<span class="digit">${value}</span><span class="remaining">${remaining} left</span>`
        : `<span class="digit">${value}</span>`;
      button.disabled = state.paused;
      button.setAttribute("aria-pressed", String(selectedDigit === value));
      button.setAttribute("aria-label", remaining === 0 ? `${value}, complete` : `${value}, ${remaining} left`);
      button.addEventListener("click", () => handleDigit(value));
      elements.numberPad.appendChild(button);
    }
  }

  function getActiveOverlayButton() {
    if (!elements.pauseOverlay.hidden) {
      return elements.resumeButton;
    }
    if (!elements.victoryOverlay.hidden) {
      return elements.victoryNewGameButton;
    }
    return null;
  }

  function updateModalInertState() {
    const overlayActive = state.paused || state.completed;
    modalMutedSections.forEach((section) => {
      section.inert = overlayActive;
      section.setAttribute("aria-hidden", String(overlayActive));
    });
  }

  function selectCell(index) {
    if (state.paused) {
      return;
    }
    state.selectedIndex = index;
    renderBoard();
    renderNumberPad();
  }

  function clearTransientFeedback() {
    if (state.revealIndices.size) {
      clearReveal();
    }
  }

  function handleDigit(value) {
    if (state.selectedIndex === null || state.completed || state.paused) {
      return;
    }

    clearTransientFeedback();

    if (state.puzzle[state.selectedIndex] !== 0) {
      setMessage("That cell is fixed. Choose an empty square.");
      return;
    }

    if (state.notesMode) {
      toggleNote(state.selectedIndex, value);
      renderBoard();
      renderNumberPad();
      playSound("note");
      return;
    }

    const previous = state.board[state.selectedIndex];

    if (state.mode === "nomistakes" && value !== state.solution[state.selectedIndex]) {
      state.mistakes += 1;
      elements.mistakeCount.textContent = String(state.mistakes);
      revealIndices([state.selectedIndex]);
      setMessage("❌ No mistakes mode rejected that move.");
      renderBoard();
      renderNumberPad();
      playSound("error");
      return;
    }

    state.board[state.selectedIndex] = value;
    state.notes[state.selectedIndex].clear();

    if (state.showMistakes && value !== state.solution[state.selectedIndex] && previous !== value) {
      state.mistakes += 1;
      elements.mistakeCount.textContent = String(state.mistakes);
      setMessage("⚠️ That guess clashes with the solution. Try another path.");
      playSound("error");
    } else {
      setMessage("Nice. Keep scanning rows, columns, and boxes.");
      playSound("place");
    }

    renderBoard();
    renderNumberPad();
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
    if (state.selectedIndex === null || state.completed || state.paused) {
      return;
    }
    clearTransientFeedback();
    if (state.puzzle[state.selectedIndex] !== 0) {
      setMessage("Given clues cannot be erased.");
      return;
    }
    state.board[state.selectedIndex] = 0;
    state.notes[state.selectedIndex].clear();
    setMessage("Cell cleared.");
    renderBoard();
    renderNumberPad();
  }

  function restartPuzzle() {
    resetStateForPuzzle(state.puzzleMeta, { countAbandon: false });
    renderBoard();
    renderNumberPad();
  }

  function checkBoard() {
    if (state.paused) {
      setMessage("Resume the game before checking the board.");
      return;
    }

    const wrongIndices = [];
    state.board.forEach((value, index) => {
      if (value !== 0 && value !== state.solution[index]) {
        wrongIndices.push(index);
      }
    });

    if (!wrongIndices.length && !state.board.includes(0)) {
      finishPuzzle();
      return;
    }

    if (wrongIndices.length) {
      revealIndices(wrongIndices);
      setMessage(`Check board found ${wrongIndices.length} incorrect cell${wrongIndices.length === 1 ? "" : "s"}.`);
    } else {
      setMessage("No mistakes spotted so far. Keep going.");
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
    state.paused = false;
    stopTimer();
    clearReveal();
    recordSolve();
    renderStats();
    renderAchievements();
    renderRankPanel();
    updateOverview();
    updatePauseUi();
    elements.victorySummary.textContent = `Solved ${capitalize(state.difficulty)} · ${MODES[state.mode].label} in ${SudokuCore.formatTime(state.secondsElapsed)} with ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}.`;
    elements.victoryOverlay.hidden = false;
    setMessage(`🎉 Puzzle solved in ${SudokuCore.formatTime(state.secondsElapsed)}. Beautiful work.`);
    renderBoard();
    renderNumberPad();
    playSound("win");
    elements.victoryNewGameButton.focus();
  }

  function pauseGame(reason = "manual") {
    if (state.paused || state.completed) {
      return;
    }
    state.paused = true;
    state.pauseReason = reason;
    stopTimer();
    recordPause();
    updatePauseUi();
    renderBoard();
    renderNumberPad();
    setMessage(reason === "hidden" ? "Game auto-paused while the tab was hidden." : "Game paused.");
    playSound("pause");
    elements.resumeButton.focus();
  }

  function resumeGame() {
    if (!state.paused || state.completed) {
      return;
    }
    state.paused = false;
    state.pauseReason = null;
    updatePauseUi();
    startTimer();
    renderBoard();
    renderNumberPad();
    setMessage("Back in focus. Continue your solve.");
    playSound("resume");
    focusSelectedCell();
  }

  function updatePauseUi() {
    elements.pauseButton.textContent = state.paused ? "Resume ▶" : "Pause ⏸";
    elements.pauseButton.disabled = state.completed;
    elements.pauseOverlay.hidden = !state.paused;
    elements.pauseOverlayText.textContent = state.pauseReason === "hidden" ? "Paused while you were away" : "Game paused";
    updateModalInertState();
  }

  function togglePause() {
    if (state.paused) {
      resumeGame();
    } else {
      pauseGame();
    }
  }

  function handleVisibilityChange() {
    if (document.hidden && hasActivePuzzle() && !state.paused) {
      pauseGame("hidden");
    }
  }

  function handleBeforeUnload() {
    recordAbandon();
  }

  function handleKeydown(event) {
    const overlayButton = getActiveOverlayButton();
    if (overlayButton) {
      if (event.key === "Tab") {
        event.preventDefault();
        overlayButton.focus({ preventScroll: true });
      }

      if (state.paused && event.key === "Enter") {
        event.preventDefault();
        resumeGame();
      }

      if (state.paused && event.key === "Escape") {
        event.preventDefault();
        resumeGame();
      }
      return;
    }

    if (shouldIgnoreBoardKeydown()) {
      return;
    }

    const { key } = event;

    if (key === " ") {
      event.preventDefault();
      togglePause();
      return;
    }

    if (state.paused) {
      if (key === "Enter") {
        event.preventDefault();
        resumeGame();
      }
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

  function shouldIgnoreBoardKeydown() {
    const activeElement = document.activeElement;
    return !(activeElement === elements.board || elements.board.contains(activeElement));
  }

  function wireEvents() {
    elements.difficultySelect.addEventListener("change", (event) => {
      newGame(event.target.value, state.mode);
    });

    elements.modeSelect.addEventListener("change", (event) => {
      newGame(state.difficulty, event.target.value);
    });

    elements.mistakeToggle.addEventListener("change", (event) => {
      if (state.mode === "nomistakes") {
        refreshMistakeToggleUi();
        setMessage("No mistakes mode always rejects wrong moves instantly.");
        return;
      }
      state.showMistakes = event.target.checked;
      syncUrl();
      setMessage(state.showMistakes ? "Wrong guesses will glow instantly." : "Wrong guesses are hidden until you ask for a check.");
      renderBoard();
    });

    elements.notesToggle.addEventListener("change", (event) => {
      state.notesMode = event.target.checked;
      syncUrl();
      setMessage(state.notesMode ? "Notes mode on. Tap numbers to add candidates." : "Notes mode off. Tap numbers to place values.");
    });

    elements.audioToggle.checked = state.audioEnabled;
    elements.audioToggle.addEventListener("change", (event) => {
      state.audioEnabled = event.target.checked;
      saveAudioPreference();
      if (state.audioEnabled) {
        if (ensureAudioContext()) {
          setMessage("Sound cues on.");
          playTone(520, 0.05, "triangle", 0.014);
        } else {
          state.audioEnabled = false;
          elements.audioToggle.checked = false;
          saveAudioPreference();
          setMessage("Audio is unavailable in this browser/device.");
        }
      } else {
        setMessage("Sound cues off.");
      }
    });

    elements.padTipsToggle.checked = state.padTipsEnabled;
    elements.padTipsToggle.addEventListener("change", (event) => {
      state.padTipsEnabled = event.target.checked;
      savePadTipsPreference();
      renderNumberPad();
      setMessage(state.padTipsEnabled ? "Number pad tips on." : "Number pad tips off.");
    });

    elements.newGameButton.addEventListener("click", () => newGame(state.difficulty, state.mode));
    elements.pauseButton.addEventListener("click", togglePause);
    elements.resumeButton.addEventListener("click", resumeGame);
    elements.victoryNewGameButton.addEventListener("click", () => newGame(state.difficulty, state.mode));
    elements.eraseButton.addEventListener("click", eraseSelected);
    elements.resetButton.addEventListener("click", restartPuzzle);
    elements.checkButton.addEventListener("click", checkBoard);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  function initialize() {
    const settings = readSettingsFromUrl();
    wireEvents();
    newGame(settings.difficulty, settings.mode, {
      countAbandon: false,
      overrideShowMistakes: settings.showMistakes,
      overrideNotesMode: settings.notesMode
    });
    renderAchievements();
    renderRankPanel();
  }

  initialize();
})();
