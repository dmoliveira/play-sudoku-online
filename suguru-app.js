(function () {
  const STORAGE_KEY = "sudoku-sakura-suguru-stats";
  const RESUME_KEY = "sudoku-sakura-suguru-resume";
  const AUDIO_KEY = "sudoku-sakura-audio";
  const PAD_TIPS_KEY = "sudoku-sakura-pad-tips";
  const CONTRAST_KEY = "sudoku-sakura-high-contrast";
  const THEME_KEY = "sudoku-sakura-theme";
  const ONBOARDING_KEY = "sudoku-sakura-suguru-onboarding";
  const MAX_UNDO_STEPS = 100;
  const LEVELS = [
    { id: "size5-easy", label: "Size 5 · Easy" },
    { id: "size5-medium", label: "Size 5 · Bridge" },
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
    pauseReason: null,
    completed: false,
    won: false,
    revealIndices: new Set(),
    revealTimeoutId: null,
    intervalId: null,
    lastPuzzleKey: null,
    undoStack: [],
    redoStack: [],
    highContrastEnabled: loadHighContrastPreference(),
    theme: loadThemePreference(),
    onboardingDismissed: loadOnboardingPreference(),
    onboardingPeekOpen: false,
    padTipsEnabled: loadPadTipsPreference(),
    audioEnabled: loadAudioPreference(),
    audioContext: null,
    stats: loadStats()
  };

  const elements = {
    levelSelect: document.getElementById("level-select"),
    modeSelect: document.getElementById("mode-select"),
    notesToggle: document.getElementById("notes-toggle"),
    mistakeToggle: document.getElementById("mistake-toggle"),
    contrastToggle: document.getElementById("contrast-toggle"),
    themeSelect: document.getElementById("theme-select"),
    audioToggle: document.getElementById("audio-toggle"),
    padTipsToggle: document.getElementById("pad-tips-toggle"),
    newGameButton: document.getElementById("new-game-button"),
    pauseButton: document.getElementById("pause-button"),
    heroSummary: document.getElementById("hero-summary"),
    heroDailyButton: document.getElementById("hero-daily-button"),
    heroChallengeButton: document.getElementById("hero-challenge-button"),
    showSetupHelpInlineButton: document.getElementById("show-setup-help-inline-button"),
    ritualTitle: document.getElementById("suguru-ritual-title"),
    ritualText: document.getElementById("suguru-ritual-text"),
    ritualButton: document.getElementById("suguru-ritual-button"),
    resumeButton: document.getElementById("resume-button"),
    pauseOverlay: document.getElementById("pause-overlay"),
    pauseOverlayText: document.getElementById("pause-overlay-text"),
    victoryOverlay: document.getElementById("victory-overlay"),
    victorySummary: document.getElementById("victory-summary"),
    victoryShareTitle: document.getElementById("victory-share-title"),
    victoryShareMeta: document.getElementById("victory-share-meta"),
    victoryShareFacts: document.getElementById("victory-share-facts"),
    victoryProgressList: document.getElementById("victory-progress-list"),
    victoryNextLabel: document.getElementById("victory-next-label"),
    victoryNewGameButton: document.getElementById("victory-new-game-button"),
    victorySecondaryButton: document.getElementById("victory-secondary-button"),
    shareVictoryButton: document.getElementById("share-victory-button"),
    board: document.getElementById("suguru-board"),
    timer: document.getElementById("timer"),
    mistakeCount: document.getElementById("mistake-count"),
    message: document.getElementById("game-message"),
    challengeLabel: document.getElementById("challenge-label"),
    featuredChallengeTitle: document.getElementById("featured-challenge-title"),
    featuredChallengeText: document.getElementById("featured-challenge-text"),
    featuredChallengeTag: document.getElementById("featured-challenge-tag"),
    featuredChallengeFocus: document.getElementById("featured-challenge-focus"),
    featuredChallengeButton: document.getElementById("featured-challenge-button"),
    railNextStepTitle: document.getElementById("rail-next-step-title"),
    railNextStepText: document.getElementById("rail-next-step-text"),
    railNextStepTag: document.getElementById("rail-next-step-tag"),
    railNextStepFocus: document.getElementById("rail-next-step-focus"),
    railNextStepButton: document.getElementById("rail-next-step-button"),
    resetButton: document.getElementById("reset-button"),
    optionsSummaryMeta: document.getElementById("options-summary-meta"),
    puzzleFacts: document.getElementById("puzzle-facts"),
    puzzleCluesChip: document.getElementById("puzzle-clues-chip"),
    puzzleTimeChip: document.getElementById("puzzle-time-chip"),
    puzzleScoreChip: document.getElementById("puzzle-score-chip"),
    boardPuzzleFacts: document.getElementById("board-puzzle-facts"),
    boardPuzzleCluesChip: document.getElementById("board-puzzle-clues-chip"),
    boardPuzzleTimeChip: document.getElementById("board-puzzle-time-chip"),
    boardPuzzleScoreChip: document.getElementById("board-puzzle-score-chip"),
    focusRibbon: document.getElementById("focus-ribbon"),
    selectedCageLabel: document.getElementById("selected-cage-label"),
    selectedRangeLabel: document.getElementById("selected-range-label"),
    statusModeLabel: document.getElementById("status-mode-label"),
    cageStatusChip: document.getElementById("cage-status-chip"),
    cageStatusLabel: document.getElementById("cage-status-label"),
    notesStatusChip: document.getElementById("notes-status-chip"),
    modeDescription: document.getElementById("mode-description"),
    numberPad: document.getElementById("number-pad"),
    checkButton: document.getElementById("check-button"),
    undoButton: document.getElementById("undo-button"),
    redoButton: document.getElementById("redo-button"),
    undoShortcutLabel: document.getElementById("undo-shortcut-label"),
    redoShortcutLabel: document.getElementById("redo-shortcut-label"),
    eraseButton: document.getElementById("erase-button"),
    notesToggleCard: document.getElementById("notes-toggle-card"),
    mistakeToggleCard: document.getElementById("mistake-toggle-card"),
    valueModeButton: document.getElementById("value-mode-button"),
    noteModeButton: document.getElementById("note-mode-button"),
    showSetupHelpButton: document.getElementById("show-setup-help-button"),
    setupHelpPanel: document.getElementById("setup-help-panel"),
    dismissOnboardingButton: document.getElementById("dismiss-onboarding-button"),
    onboardingCard: document.querySelector(".onboarding-card"),
    entryModeHint: document.getElementById("entry-mode-hint"),
    topbar: document.querySelector(".topbar"),
    hero: document.querySelector(".hero"),
    controlsRow: document.querySelector(".controls-row"),
    gameHeader: document.querySelector(".game-header"),
    actionsBar: document.querySelector(".actions-bar"),
    entryModeBar: document.querySelector(".entry-mode-bar"),
    optionsPanel: document.querySelector(".options-panel"),
    sidebar: document.querySelector(".sidebar"),
    siteFooter: document.querySelector(".site-footer")
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

  function loadAudioPreference() {
    try {
      const raw = localStorage.getItem(AUDIO_KEY);
      return raw === null ? true : raw === "on";
    } catch (error) {
      return true;
    }
  }

  function loadHighContrastPreference() {
    try {
      const raw = localStorage.getItem(CONTRAST_KEY);
      return raw === "on";
    } catch (error) {
      return false;
    }
  }

  function saveHighContrastPreference() {
    try {
      localStorage.setItem(CONTRAST_KEY, state.highContrastEnabled ? "on" : "off");
    } catch (error) {
      // ignore preference-only storage failures
    }
  }

  function loadThemePreference() {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      return ["garden", "ink", "night"].includes(raw) ? raw : "garden";
    } catch (error) {
      return "garden";
    }
  }

  function loadOnboardingPreference() {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === "done";
    } catch (error) {
      return false;
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
      // ignore preference-only storage failures
    }
  }

  function saveOnboardingPreference() {
    try {
      localStorage.setItem(ONBOARDING_KEY, state.onboardingDismissed ? "done" : "pending");
    } catch (error) {
      // ignore preference-only storage failures
    }
  }

  function saveThemePreference() {
    try {
      localStorage.setItem(THEME_KEY, state.theme);
    } catch (error) {
      // ignore preference-only storage failures
    }
  }

  function saveAudioPreference() {
    try {
      localStorage.setItem(AUDIO_KEY, state.audioEnabled ? "on" : "off");
    } catch (error) {
      // ignore preference-only storage failures
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
        secondsElapsed: state.secondsElapsed,
        paused: state.paused,
        pauseReason: state.pauseReason
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

  function statRow(label, value) {
    return `<div class="stats-item"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function isApplePlatform() {
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    return /Mac|iPhone|iPad|iPod/.test(platform);
  }

  function applyShortcutLabels() {
    const isApple = isApplePlatform();
    if (elements.undoShortcutLabel) {
      elements.undoShortcutLabel.textContent = isApple ? "⌘Z" : "Ctrl+Z";
    }
    if (elements.redoShortcutLabel) {
      elements.redoShortcutLabel.textContent = isApple ? "⇧⌘Z" : "Ctrl+Y";
    }
  }

  function formatDayStreak(value) {
    return `${value} day${value === 1 ? "" : "s"} streak`;
  }

  function buildShareMetaChips(parts) {
    return parts.map((part) => `<span class="chip">${part}</span>`).join("");
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function applyThemePreset() {
    document.body.dataset.theme = state.theme;
    elements.themeSelect.value = state.theme;
    refreshOptionsSummary();
  }

  function applyHighContrastTheme() {
    document.body.classList.toggle("high-contrast", state.highContrastEnabled);
    elements.contrastToggle.checked = state.highContrastEnabled;
    refreshOptionsSummary();
  }

  function renderHeroSummary() {
    const key = `${state.level}:${state.mode}`;
    const best = state.stats.bestTimes[key];
    const bestLabel = best ? window.SuguruCore.formatTime(best) : "—";
    const returningPlayer = hasReturningPlayerState();
    document.body.classList.toggle("is-returning-player", returningPlayer);
    elements.heroSummary.hidden = false;
    elements.heroSummary.textContent = `${getLevelMeta(state.level).label} · ${MODES[state.mode].label} · Best ${bestLabel} · ${formatDayStreak(state.stats.streak)}`;
  }

  function hasReturningPlayerState() {
    return state.stats.solved > 0
      || Object.keys(state.stats.bestTimes || {}).length > 0
      || Boolean(loadResume());
  }

  function renderOnboardingCard() {
    if (!elements.onboardingCard) {
      return;
    }
    const shouldAutoShow = !state.onboardingDismissed && !hasReturningPlayerState();
    elements.onboardingCard.hidden = !(shouldAutoShow || state.onboardingPeekOpen);
    if (!elements.onboardingCard.hidden && elements.setupHelpPanel) {
      elements.setupHelpPanel.open = true;
    }
  }

  function getHeroDailyAction() {
    if (state.mode === "daily") {
      return {
        label: "Replay daily ↺",
        run: () => startNewPuzzle(state.level, "daily")
      };
    }

    return {
      label: "Play today ↗",
      run: () => startNewPuzzle(state.level, "daily")
    };
  }

  function getHeroProgressAction() {
    const nextAction = getVictoryNextAction();
    if (nextAction.targetMode !== "daily") {
      return nextAction;
    }

    if (state.level === "size5-easy") {
      return {
        label: "Try the bridge tier",
        run: () => startNewPuzzle("size5-medium", "classic"),
        targetLevel: "size5-medium",
        targetMode: "classic"
      };
    }

    if (state.level === "size5-medium") {
      return {
        label: "Harder cage mix",
        run: () => startNewPuzzle("size5-challenge", "classic"),
        targetLevel: "size5-challenge",
        targetMode: "classic"
      };
    }

    if (state.mode !== "challenge") {
      return {
        label: "Try challenge",
        run: () => startNewPuzzle(state.level, "challenge"),
        targetLevel: state.level,
        targetMode: "challenge"
      };
    }

    return {
      label: "Replay calm board",
      run: () => startNewPuzzle(state.level, "classic"),
      targetLevel: state.level,
      targetMode: "classic"
    };
  }

  function renderHeroActions() {
    if (!elements.heroDailyButton || !elements.heroChallengeButton) {
      return;
    }

    const dailyAction = getHeroDailyAction();
    const progressAction = getHeroProgressAction();
    elements.heroDailyButton.textContent = dailyAction.label;
    elements.heroDailyButton.onclick = dailyAction.run;
    elements.heroChallengeButton.textContent = progressAction.label;
    elements.heroChallengeButton.onclick = progressAction.run;
  }

  function renderRitualCard() {
    if (!elements.ritualTitle || !elements.ritualText || !elements.ritualButton) {
      return;
    }

    const nextAction = getVictoryNextAction();
    elements.ritualTitle.textContent = nextAction.label.replace(/^↗\s*/, "");
    elements.ritualText.textContent = nextAction.description;
    elements.ritualButton.textContent = nextAction.label;
    elements.ritualButton.onclick = nextAction.run;
  }

  function renderPuzzleFacts() {
    if (!elements.puzzleFacts && !elements.boardPuzzleFacts) {
      return;
    }

    if (!state.puzzleMeta) {
      elements.challengeLabel.hidden = true;
      if (elements.puzzleFacts) {
        elements.puzzleFacts.hidden = true;
      }
      if (elements.boardPuzzleFacts) {
        elements.boardPuzzleFacts.hidden = true;
      }
      return;
    }

    elements.challengeLabel.hidden = false;
    if (elements.puzzleFacts) {
      elements.puzzleFacts.hidden = false;
    }
    if (elements.boardPuzzleFacts) {
      elements.boardPuzzleFacts.hidden = false;
    }
    if (elements.puzzleCluesChip) {
      elements.puzzleCluesChip.textContent = `${state.puzzleMeta.clueCount} clues`;
      elements.puzzleTimeChip.textContent = `Target ${state.puzzleMeta.estimatedMinutes} min`;
      elements.puzzleScoreChip.textContent = `Logic ${state.puzzleMeta.difficultyScore}/5`;
    }
    if (elements.boardPuzzleCluesChip) {
      elements.boardPuzzleCluesChip.textContent = `${state.puzzleMeta.clueCount} clues`;
      elements.boardPuzzleTimeChip.textContent = `Target ${state.puzzleMeta.estimatedMinutes} min`;
      elements.boardPuzzleScoreChip.textContent = `Logic ${state.puzzleMeta.difficultyScore}/5`;
    }
  }

  function renderFocusRibbon() {
    if (!elements.focusRibbon || !elements.selectedCageLabel || !elements.selectedRangeLabel) {
      return;
    }

    const selectedCageSize = state.selectedIndex === null ? null : getSelectedCageSize();
    elements.focusRibbon.hidden = selectedCageSize === null;
    if (selectedCageSize === null) {
      return;
    }

    elements.selectedCageLabel.textContent = `${selectedCageSize}-cell`;
    elements.selectedRangeLabel.textContent = `1–${selectedCageSize}`;
  }

  function renderRailNextStep() {
    if (!elements.railNextStepButton) {
      return;
    }
    const nextAction = getVictoryNextAction();
    elements.railNextStepTitle.textContent = nextAction.label.replace(/^↗\s*/, "");
    elements.railNextStepText.textContent = nextAction.description;
    elements.railNextStepTag.textContent = getLevelMeta(nextAction.targetLevel || state.level).label;
    elements.railNextStepFocus.textContent = nextAction.focus || "Warm start";
    elements.railNextStepButton.textContent = nextAction.label;
    elements.railNextStepButton.onclick = nextAction.run;
  }

  function renderFeaturedChallenge() {
    if (!elements.featuredChallengeButton) {
      return;
    }
    const tags = Array.isArray(state.puzzleMeta?.tags) ? state.puzzleMeta.tags : [];
    const primaryTag = (tags[0] || "featured").replace(/(^|-)\w/g, (part) => part.toUpperCase()).replace(/-/g, " ");
    const layoutTag = state.puzzleMeta?.layout ? capitalize(state.puzzleMeta.layout) : getLevelMeta(state.level).label;
    const ctaLabel = state.mode === "daily"
      ? "Play a fresh classic board ↗"
      : `Play another ${getLevelMeta(state.level).label.toLowerCase()} ↗`;
    elements.featuredChallengeTitle.textContent = state.puzzleMeta ? `${state.puzzleMeta.label} spotlight` : "Featured Suguru board";
    elements.featuredChallengeText.textContent = state.puzzleMeta
      ? `${layoutTag} layout · ${state.puzzleMeta.clueCount} clues · Target ${state.puzzleMeta.estimatedMinutes} min. A good pick when you want more ${primaryTag.toLowerCase()} without changing the rule set.`
      : "A rotating challenge, pace cue, or layout prompt appears here to deepen the next Suguru run.";
    elements.featuredChallengeTag.textContent = getLevelMeta(state.level).label;
    elements.featuredChallengeFocus.textContent = primaryTag;
    elements.featuredChallengeButton.textContent = ctaLabel;
    elements.featuredChallengeButton.onclick = () => startNewPuzzle(state.level, state.mode === "daily" ? "classic" : state.mode);
  }

  function refreshOptionsSummary() {
    const activeAids = [
      state.notesMode,
      state.showMistakes || state.mode === "nomistakes",
      state.padTipsEnabled
    ].filter(Boolean).length;
    const themeLabel = state.theme === "ink"
      ? "墨 / Ink"
      : state.theme === "night"
        ? "夜桜 / Sakura Night"
        : "庭 / Garden";
    const summaryParts = [MODES[state.mode].label, `${activeAids} aids`];
    if (state.notesMode && state.mode !== "nonotes") {
      summaryParts.push("Notes");
    }
    if (!state.showMistakes && state.mode !== "nomistakes") {
      summaryParts.push("Mistakes hidden");
    }
    summaryParts.push(themeLabel);
    elements.optionsSummaryMeta.textContent = summaryParts.join(" — ");
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
    elements.undoButton.disabled = inactive || state.paused || state.undoStack.length === 0;
    elements.undoButton.classList.toggle("is-disabled", inactive || state.paused || state.undoStack.length === 0);
    elements.redoButton.disabled = inactive || state.paused || state.redoStack.length === 0;
    elements.redoButton.classList.toggle("is-disabled", inactive || state.paused || state.redoStack.length === 0);
    elements.eraseButton.disabled = inactive || state.paused || state.selectedIndex === null || state.puzzle[state.selectedIndex] !== 0;
    elements.eraseButton.classList.toggle("is-disabled", inactive || state.paused || state.selectedIndex === null || state.puzzle[state.selectedIndex] !== 0);
    elements.valueModeButton.disabled = inactive;
    elements.valueModeButton.classList.toggle("is-disabled", inactive);
    elements.noteModeButton.disabled = inactive || state.mode === "nonotes";
    elements.noteModeButton.classList.toggle("is-disabled", inactive || state.mode === "nonotes");
  }

  function getActiveOverlayControls() {
    if (state.paused && !elements.pauseOverlay.hidden) {
      return [elements.resumeButton];
    }

    if (state.won && !elements.victoryOverlay.hidden) {
      return [elements.victoryNewGameButton, elements.victorySecondaryButton, elements.shareVictoryButton].filter(Boolean);
    }

    return [];
  }

  function updateModalInertState() {
    const overlayActive = state.paused || (state.won && !elements.victoryOverlay.hidden);
    [elements.topbar, elements.hero, elements.gameHeader, elements.controlsRow, elements.actionsBar, elements.entryModeBar, elements.optionsPanel, elements.sidebar, elements.siteFooter, elements.numberPad]
      .filter(Boolean)
      .forEach((section) => {
        section.inert = overlayActive;
        section.setAttribute("aria-hidden", String(overlayActive));
      });
  }

  function updatePauseButton() {
    const paused = state.paused;
    elements.pauseButton.textContent = paused ? "Resume ▶" : "Pause ⏸";
    elements.pauseButton.setAttribute("aria-pressed", String(paused));
    elements.pauseOverlay.hidden = !paused;
    elements.pauseOverlayText.textContent = state.pauseReason === "hidden" ? "Paused while you were away" : "Suguru paused";
    updateActiveControls();
    updateModalInertState();
  }

  function getVictoryNextAction() {
    if (state.level === "size5-challenge" && state.mode === "challenge") {
      return {
        label: "↗ Replay calm board",
        description: "Keep the momentum going with another clean Suguru run.",
        run: () => startNewPuzzle(state.level, "classic"),
        targetLevel: state.level,
        targetMode: "classic",
        focus: "Fresh board"
      };
    }

    if (state.level === "size5-challenge") {
      return {
        label: "↗ Less feedback",
        description: "Try Challenge mode to rely more on cage structure and touch pressure.",
        run: () => startNewPuzzle(state.level, "challenge"),
        targetLevel: state.level,
        targetMode: "challenge",
        focus: "Low assist"
      };
    }

    if (state.level === "size5-medium" && (state.mode === "daily" || state.mode === "challenge")) {
      return {
        label: "↗ Harder cage mix",
        description: "You are reading the bridge tier well. Step into the challenge-tier board while the pattern memory is fresh.",
        run: () => startNewPuzzle("size5-challenge", "classic"),
        targetLevel: "size5-challenge",
        targetMode: "classic",
        focus: "Harder cages"
      };
    }

    if (state.level === "size5-easy" && (state.mode === "daily" || state.mode === "challenge")) {
      return {
        label: "↗ Try the bridge tier",
        description: "You are ready for a slightly tighter mixed-cage board before the full challenge jump.",
        run: () => startNewPuzzle("size5-medium", "classic"),
        targetLevel: "size5-medium",
        targetMode: "classic",
        focus: "Bridge tier"
      };
    }

    if (state.mode === "daily" || state.mode === "challenge") {
      return {
        label: "↗ Try the bridge tier",
        description: "Step into a slightly tighter mixed-cage board while your cage reads are still warm.",
        run: () => startNewPuzzle("size5-medium", "classic"),
        targetLevel: "size5-medium",
        targetMode: "classic",
        focus: "Bridge tier"
      };
    }

    if (state.mode !== "daily") {
      return {
        label: "↗ Try daily",
        description: "Carry this cage rhythm into today’s shared Suguru board.",
        run: () => startNewPuzzle(state.level, "daily"),
        targetLevel: state.level,
        targetMode: "daily",
        focus: "Shared board"
      };
    }

    return {
      label: "↗ Replay calm board",
      description: "Keep the momentum going with another clean Suguru run.",
      run: () => startNewPuzzle(state.level, "classic"),
      targetLevel: state.level,
      targetMode: "classic",
      focus: "Warm start"
    };
  }

  function renderVictoryShareCard() {
    elements.victoryShareTitle.textContent = `${getLevelMeta(state.level).label} · ${MODES[state.mode].label}`;
    elements.victoryShareMeta.innerHTML = buildShareMetaChips([
      window.SuguruCore.formatTime(state.secondsElapsed),
      `${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}`,
      formatDayStreak(state.stats.streak)
    ]);
    elements.victoryShareFacts.innerHTML = buildShareMetaChips([
      `${state.puzzleMeta.clueCount} clues`,
      `Target ${state.puzzleMeta.estimatedMinutes} min`,
      `Logic ${state.puzzleMeta.difficultyScore}/5`
    ]);
  }

  function updateVictoryUi() {
    elements.victoryOverlay.hidden = !state.won;
    updateModalInertState();
  }

  function buildVictoryShareText() {
    return `Sudoku Sakura Suguru ${getLevelMeta(state.level).label} · ${MODES[state.mode].label} · ${window.SuguruCore.formatTime(state.secondsElapsed)} · ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"} · ${formatDayStreak(state.stats.streak)}`;
  }

  function shareText(text, successMessage) {
    const shareUrl = buildShareUrl();
    return (async () => {
      if (navigator.share) {
        try {
          await navigator.share({ text, url: shareUrl });
          setMessage(successMessage);
          return true;
        } catch (error) {
          if (error?.name === "AbortError") {
            setMessage("Sharing was cancelled.");
            return true;
          }
        }
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(`${text} ${shareUrl}`);
          setMessage(successMessage.replace("shared", "copied to clipboard"));
          return true;
        }
      } catch (error) {
        setMessage("Sharing is unavailable in this browser.");
        return false;
      }

      setMessage("Sharing is unavailable in this browser.");
      return false;
    })();
  }

  function buildShareUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("game", "suguru");
    url.searchParams.set("level", state.level);
    url.searchParams.set("mode", state.mode);
    return url.toString();
  }

  async function shareVictoryResult() {
    if (!state.completed) {
      setMessage("Finish a Suguru board first to share the result.");
      return;
    }
    await shareText(buildVictoryShareText(), "Victory result shared.");
  }

  function buildCageRangeHint(selectedCageSize) {
    return `${selectedCageSize}-cell cage · use 1–${selectedCageSize}`;
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
    const selectedCageSize = state.selectedIndex === null ? null : getSelectedCageSize();
    elements.cageStatusChip.hidden = selectedCageSize === null;
    if (selectedCageSize !== null) {
      elements.cageStatusLabel.textContent = `1–${selectedCageSize}`;
    }
    if (selectedCageSize === null) {
      elements.notesToggleCard.removeAttribute("title");
      elements.entryModeHint.textContent = "Choose a cage · use only its range.";
    } else if (state.mode === "nonotes") {
      elements.notesToggleCard.title = "Locked by No notes mode";
      elements.entryModeHint.textContent = `${selectedCageSize}-cell cage · 1–${selectedCageSize} · notes locked`;
    } else {
      elements.notesToggleCard.removeAttribute("title");
      elements.entryModeHint.textContent = state.notesMode
        ? `Notes on · ${selectedCageSize}-cell cage · use 1–${selectedCageSize}`
        : `Value mode · ${selectedCageSize}-cell cage · use 1–${selectedCageSize}`;
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
    renderFocusRibbon();
    refreshOptionsSummary();
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

  function serializeNotesState(notes = state.notes) {
    return notes.map((entry) => Array.from(entry));
  }

  function deserializeNotesState(serialized) {
    return serialized.map((entry, index) => new Set(Array.isArray(entry)
      ? entry.filter((value) => Number.isInteger(value) && value >= 1 && value <= getSelectedCageSize(index))
      : []));
  }

  function createHistorySnapshot() {
    return {
      board: [...state.board],
      notes: serializeNotesState(),
      selectedIndex: state.selectedIndex,
      notesMode: state.notesMode,
      mistakes: state.mistakes
    };
  }

  function restoreHistorySnapshot(snapshot) {
    state.board = [...snapshot.board];
    state.notes = deserializeNotesState(snapshot.notes);
    state.selectedIndex = Number.isInteger(snapshot.selectedIndex) ? snapshot.selectedIndex : state.selectedIndex;
    state.notesMode = Boolean(snapshot.notesMode);
    state.mistakes = Number.isInteger(snapshot.mistakes) ? snapshot.mistakes : state.mistakes;
    elements.mistakeCount.textContent = String(state.mistakes);
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    saveResume();
    syncUrl();
  }

  function clearReveal() {
    if (state.revealTimeoutId) {
      window.clearTimeout(state.revealTimeoutId);
      state.revealTimeoutId = null;
    }
    state.revealIndices = new Set();
  }

  function revealIndices(indices, duration = 2200) {
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

  function pushUndoCheckpoint() {
    state.undoStack.push(createHistorySnapshot());
    if (state.undoStack.length > MAX_UNDO_STEPS) {
      state.undoStack.shift();
    }
    state.redoStack = [];
    updateActiveControls();
  }

  function undoLastAction() {
    if (state.paused || state.completed || state.undoStack.length === 0) {
      return;
    }
    state.redoStack.push(createHistorySnapshot());
    const snapshot = state.undoStack.pop();
    restoreHistorySnapshot(snapshot);
    setMessage("Undid the last Suguru move.");
  }

  function redoLastAction() {
    if (state.paused || state.completed || state.redoStack.length === 0) {
      return;
    }
    state.undoStack.push(createHistorySnapshot());
    const snapshot = state.redoStack.pop();
    restoreHistorySnapshot(snapshot);
    setMessage("Redid the Suguru move.");
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

  function restartCurrentPuzzle() {
    if (!state.puzzleMeta || state.paused) {
      return;
    }
    resetForPuzzle(state.puzzleMeta);
    setMessage(`Restarted ${state.puzzleMeta.label}.`);
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
    state.pauseReason = null;
    state.completed = false;
    state.won = false;
    state.onboardingPeekOpen = false;
    clearReveal();
    state.undoStack = [];
    state.redoStack = [];
    elements.challengeLabel.textContent = `${puzzle.label} · ${LEVELS.find((entry) => entry.id === state.level)?.label || state.level}`;
    elements.timer.textContent = "00:00";
    elements.mistakeCount.textContent = "0";
    elements.victoryOverlay.hidden = true;
    setMessage(MODES[state.mode].label + ": fill each cage with 1 up to its size and use touching-neighbor elimination to narrow the board.");
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    renderHeroSummary();
    renderHeroActions();
    renderRitualCard();
    renderRailNextStep();
    renderFeaturedChallenge();
    renderPuzzleFacts();
    updateVictoryUi();
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
    const cageSize = getSelectedCageSize(index);
    const parts = [`Row ${row + 1}, column ${col + 1}`, `${cageSize}-cell cage`];
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
    const cageSize = getSelectedCageSize(index);
    notesWrap.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(cageSize))}, 1fr)`;
    for (let value = 1; value <= cageSize; value += 1) {
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
      const invalid = (state.showMistakes || state.revealIndices.has(index)) && value !== 0 && value !== state.solution[index];
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
        refreshModeUi();
        saveResume();
        syncUrl();
      });
      elements.board.appendChild(cell);
    });
    focusSelectedCell();
  }

  function renderNumberPad() {
    elements.numberPad.innerHTML = "";
    const hasSelection = Number.isInteger(state.selectedIndex);
    const selectedCageSize = hasSelection ? getSelectedCageSize() : null;
    const selectedValue = hasSelection ? state.board[state.selectedIndex] : 0;
    for (let value = 1; value <= getMaxValue(); value += 1) {
      const button = document.createElement("button");
      const allowed = hasSelection && value <= selectedCageSize;
      const noted = hasSelection && state.notes[state.selectedIndex].has(value);
      const isCurrentValue = hasSelection && selectedValue === value;
      button.type = "button";
      button.className = [
        "number-button",
        allowed ? "is-active" : "",
        isCurrentValue || noted ? "is-complete" : ""
      ].filter(Boolean).join(" ");
      button.disabled = state.paused || state.completed || !state.puzzleMeta || !allowed;
      const helperLabel = !hasSelection
        ? "select"
        : !allowed
          ? "locked"
          : isCurrentValue
            ? "placed"
            : noted
              ? "note"
              : `1–${selectedCageSize}`;
      button.innerHTML = state.padTipsEnabled
        ? `<span class="digit">${value}</span><span class="remaining">${helperLabel}</span>`
        : `<span class="digit">${value}</span>`;
      button.setAttribute(
        "aria-label",
        hasSelection
          ? (allowed
            ? `${value}, ${isCurrentValue ? "already set" : noted ? "noted" : `allowed in ${selectedCageSize}-cell cage`}`
            : `${value}, unavailable in ${selectedCageSize}-cell cage`)
          : `${value}, select a cell first`
      );
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
      pushUndoCheckpoint();
      playSound("note");
      const hadNote = state.notes[state.selectedIndex].has(value);
      if (hadNote) {
        state.notes[state.selectedIndex].delete(value);
      } else {
        state.notes[state.selectedIndex].add(value);
      }
      setMessage(hadNote ? `Removed note ${value}.` : `Added note ${value}.`);
      renderBoard();
      renderNumberPad();
      saveResume();
      syncUrl();
      return;
    }
    if (state.mode === "nomistakes" && value !== state.solution[state.selectedIndex]) {
      state.mistakes += 1;
      elements.mistakeCount.textContent = String(state.mistakes);
      setMessage("No mistakes mode rejected that value.");
      playSound("error");
      saveResume();
      syncUrl();
      return;
    }
    pushUndoCheckpoint();
    state.board[state.selectedIndex] = value;
    state.notes[state.selectedIndex].clear();
    if (state.showMistakes && value !== state.solution[state.selectedIndex]) {
      state.mistakes += 1;
      elements.mistakeCount.textContent = String(state.mistakes);
      setMessage("That value does not match the stored solution.");
      playSound("error");
    } else {
      setMessage("Good. Watch the cage size and all touching neighbors.");
      playSound("place");
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
    if (state.board[state.selectedIndex] === 0 && state.notes[state.selectedIndex].size === 0) {
      return;
    }
    pushUndoCheckpoint();
    state.board[state.selectedIndex] = 0;
    state.notes[state.selectedIndex].clear();
    setMessage("Cleared the selected cell.");
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    saveResume();
  }

  function checkBoard() {
    const wrong = [];
    state.board.forEach((value, index) => {
      const cageSize = getSelectedCageSize(index);
      if (value !== 0 && (value > cageSize || value !== state.solution[index])) {
        wrong.push(index);
      }
    });
    if (!wrong.length && !state.board.includes(0)) {
      finishPuzzle();
      return;
    }
    if (wrong.length) {
      revealIndices(wrong);
    } else {
      clearReveal();
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
    state.won = true;
    state.paused = false;
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
    const nextAction = getVictoryNextAction();
    elements.victorySummary.textContent = `Solved ${getLevelMeta(state.level).label} · ${MODES[state.mode].label} in ${window.SuguruCore.formatTime(state.secondsElapsed)} with ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}.`;
    renderVictoryShareCard();
    elements.victoryProgressList.innerHTML = [
      statRow("Streak", `${state.stats.streak} day${state.stats.streak === 1 ? "" : "s"}`),
      statRow("Best in mode", state.stats.bestTimes[`${state.level}:${state.mode}`] ? window.SuguruCore.formatTime(state.stats.bestTimes[`${state.level}:${state.mode}`]) : "New baseline"),
      statRow("Solved total", String(state.stats.solved))
    ].join("");
    elements.victoryNextLabel.textContent = nextAction.description;
    elements.victorySecondaryButton.textContent = nextAction.label;
    elements.victorySecondaryButton.onclick = nextAction.run;
    elements.victoryNewGameButton.textContent = state.mode === "daily" ? "Replay daily ↺" : "✨ Play another";
    elements.victoryNewGameButton.onclick = () => startNewPuzzle(state.level, state.mode);
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    updateVictoryUi();
    syncUrl();
    setMessage(`Solved ${LEVELS.find((entry) => entry.id === state.level)?.label || state.level} in ${window.SuguruCore.formatTime(state.secondsElapsed)} with ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}. Streak: ${state.stats.streak}.`);
    playSound("win");
    elements.victorySecondaryButton.focus({ preventScroll: true });
  }

  function checkWin() {
    if (window.SuguruCore.isSolved(state.board, state.solution)) {
      finishPuzzle();
    }
  }

  function resumeFromPause() {
    if (state.completed || !state.puzzleMeta) {
      return;
    }
    state.paused = false;
    state.pauseReason = null;
    setMessage("Suguru resumed.");
    updatePauseButton();
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    playSound("resume");
    startTimer();
    saveResume();
    syncUrl();
  }

  function togglePause(reason = null) {
    if (state.completed || !state.puzzleMeta) {
      return;
    }
    if (state.paused) {
      resumeFromPause();
      return;
    }
    state.paused = true;
    state.pauseReason = reason;
    stopTimer();
    setMessage(reason === "hidden" ? "Suguru auto-paused while this tab was hidden." : "Suguru paused.");
    updatePauseButton();
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    playSound("pause");
    saveResume();
    syncUrl();
    elements.resumeButton.focus({ preventScroll: true });
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
      state.paused = false;
      state.pauseReason = null;
      state.completed = true;
      state.won = false;
      state.undoStack = [];
      state.redoStack = [];
      elements.challengeLabel.textContent = `${getLevelMeta(state.level).label} unavailable`;
      elements.pauseOverlay.hidden = true;
      elements.victoryOverlay.hidden = true;
      elements.notesToggle.checked = false;
      elements.mistakeToggle.checked = state.showMistakes;
      elements.audioToggle.checked = state.audioEnabled;
      state.notesMode = false;
      elements.timer.textContent = "00:00";
      elements.mistakeCount.textContent = "0";
      elements.board.innerHTML = "";
      elements.board.inert = state.paused || state.completed || !state.puzzleMeta;
      elements.numberPad.innerHTML = "";
      clearResume();
      refreshModeUi();
      renderHeroSummary();
      renderHeroActions();
      renderRitualCard();
      renderRailNextStep();
      renderFeaturedChallenge();
      renderPuzzleFacts();
      updateVictoryUi();
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
      renderBoard();
      renderNumberPad();
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
    state.paused = Boolean(saved.paused);
    state.pauseReason = typeof saved.pauseReason === "string" ? saved.pauseReason : null;
    state.won = false;
    clearReveal();
    state.undoStack = [];
    state.redoStack = [];
    sanitizeModeState();
    refreshModeUi();
    elements.levelSelect.value = state.level;
    elements.modeSelect.value = state.mode;
    elements.timer.textContent = window.SuguruCore.formatTime(state.secondsElapsed);
    elements.mistakeCount.textContent = String(state.mistakes);
    elements.challengeLabel.textContent = `${puzzle.label} · ${LEVELS.find((entry) => entry.id === state.level)?.label || state.level}`;
    renderHeroSummary();
    renderHeroActions();
    renderRitualCard();
    renderRailNextStep();
    renderFeaturedChallenge();
    renderPuzzleFacts();
    renderBoard();
    renderNumberPad();
    if (state.notesMode) {
      elements.notesToggle.checked = true;
    }
    if (!state.showMistakes) {
      elements.mistakeToggle.checked = false;
    }
    if (!state.paused) {
      startTimer();
    }
    elements.audioToggle.checked = state.audioEnabled;
    updatePauseButton();
    updateVictoryUi();
    syncUrl();
    setMessage(state.paused ? "Restored your paused Suguru run." : "Resumed your Suguru run.");
  }

  function cycleOverlayFocus(event) {
    const controls = getActiveOverlayControls();
    if (!controls.length || event.key !== "Tab") {
      return false;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return true;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
      return true;
    }
    return false;
  }

  function openSetupHelp() {
    if (!elements.setupHelpPanel) {
      return;
    }
    state.onboardingPeekOpen = true;
    renderOnboardingCard();
    elements.setupHelpPanel.open = true;
    elements.setupHelpPanel.scrollIntoView({ block: "start", behavior: "smooth" });
    const summary = elements.setupHelpPanel.querySelector("summary");
    if (summary) {
      summary.focus({ preventScroll: true });
    }
  }

  function handleKeydown(event) {
    const { key } = event;
    if (cycleOverlayFocus(event)) {
      return;
    }
    if (!elements.pauseOverlay.hidden) {
      if (key === "Enter" || key === "Escape" || key === " ") {
        event.preventDefault();
        resumeFromPause();
      }
      return;
    }
    if (!elements.victoryOverlay.hidden) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "z" && !shouldIgnoreKeydown()) {
      event.preventDefault();
      if (event.shiftKey) {
        redoLastAction();
      } else {
        undoLastAction();
      }
      return;
    }
    if (event.ctrlKey && !event.metaKey && key.toLowerCase() === "y" && !shouldIgnoreKeydown()) {
      event.preventDefault();
      redoLastAction();
      return;
    }
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
    if (key.toLowerCase() === "v") {
      state.notesMode = false;
      sanitizeModeState();
      refreshModeUi();
      saveResume();
      syncUrl();
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
      setMessage(state.notesMode ? "Notes mode on." : "Notes mode off.");
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
      setMessage(state.showMistakes ? "Wrong-guess highlighting on." : "Wrong-guess highlighting off.");
      saveResume();
      syncUrl();
    });
    elements.audioToggle.addEventListener("change", (event) => {
      state.audioEnabled = event.target.checked;
      saveAudioPreference();
      if (state.audioEnabled) {
        ensureAudioContext();
        playSound("resume");
        setMessage("Sound cues on.");
      } else {
        setMessage("Sound cues off.");
      }
      refreshOptionsSummary();
    });
    elements.padTipsToggle.checked = state.padTipsEnabled;
    elements.padTipsToggle.addEventListener("change", (event) => {
      state.padTipsEnabled = event.target.checked;
      savePadTipsPreference();
      renderNumberPad();
      setMessage(state.padTipsEnabled ? "Number pad tips on." : "Number pad tips off.");
      refreshOptionsSummary();
    });
    elements.contrastToggle.checked = state.highContrastEnabled;
    elements.contrastToggle.addEventListener("change", (event) => {
      state.highContrastEnabled = event.target.checked;
      saveHighContrastPreference();
      applyHighContrastTheme();
      setMessage(state.highContrastEnabled ? "High contrast mode on." : "High contrast mode off.");
    });
    elements.themeSelect.value = state.theme;
    elements.themeSelect.addEventListener("change", (event) => {
      state.theme = event.target.value;
      saveThemePreference();
      applyThemePreset();
      setMessage(`Theme changed to ${capitalize(state.theme === "night" ? "Sakura Night" : state.theme)}.`);
    });
    elements.newGameButton.addEventListener("click", () => startNewPuzzle(state.level, state.mode));
    elements.pauseButton.addEventListener("click", togglePause);
    elements.checkButton.addEventListener("click", checkBoard);
    elements.undoButton.addEventListener("click", undoLastAction);
    elements.redoButton.addEventListener("click", redoLastAction);
    elements.resetButton?.addEventListener("click", restartCurrentPuzzle);
    elements.eraseButton.addEventListener("click", eraseSelected);
    elements.showSetupHelpButton?.addEventListener("click", openSetupHelp);
    elements.showSetupHelpInlineButton?.addEventListener("click", openSetupHelp);
    elements.dismissOnboardingButton?.addEventListener("click", () => {
      state.onboardingDismissed = true;
      state.onboardingPeekOpen = false;
      saveOnboardingPreference();
      renderOnboardingCard();
      setMessage("Suguru quick-start tips hidden. Use Tips any time to reopen the help panel.");
    });
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
    elements.resumeButton.addEventListener("click", resumeFromPause);
    elements.shareVictoryButton.addEventListener("click", shareVictoryResult);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !state.paused && !state.completed) {
        togglePause("hidden");
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
    applyShortcutLabels();
    populateLevels();
    wireEvents();
    applyThemePreset();
    applyHighContrastTheme();
    renderHeroSummary();
    renderHeroActions();
    renderRitualCard();
    renderRailNextStep();
    renderFeaturedChallenge();
    renderOnboardingCard();
    elements.audioToggle.checked = state.audioEnabled;
    updatePauseButton();
    updateVictoryUi();
    restoreOrStart(settings);
    syncUrl();
  }

  initialize();
})();
