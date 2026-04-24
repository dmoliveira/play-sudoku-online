(function () {
  const STORAGE_KEY = "sudoku-sakura-stats";
  const AUDIO_KEY = "sudoku-sakura-audio";
  const PAD_TIPS_KEY = "sudoku-sakura-pad-tips";
  const SCOPE_HIGHLIGHT_KEY = "sudoku-sakura-scope-highlight";
  const CONTRAST_KEY = "sudoku-sakura-high-contrast";
  const THEME_KEY = "sudoku-sakura-theme";
  const SYMBOL_PLAY_KEY = "sudoku-sakura-symbol-play";
  const SYMBOL_THEME_KEY = "sudoku-sakura-symbol-theme";
  const LEGEND_MODE_KEY = "sudoku-sakura-legend-mode";
  const SYMBOL_TUTORIAL_KEY = "sudoku-sakura-symbol-tutorial";
  const SYMBOL_TUTORIAL_SNOOZE_KEY = "sudoku-sakura-symbol-tutorial-snooze";
  const ONBOARDING_KEY = "sudoku-sakura-onboarding-dismissed";
  const DAILY_RESULTS_KEY = "sudoku-sakura-daily-results";
  const WEEKLY_RESULTS_KEY = "sudoku-sakura-weekly-paths";
  const RESUME_KEY = "sudoku-sakura-active-game";
  const SESSION_HISTORY_KEY = "sudoku-sakura-session-history";
  const DIFFICULTY_ORDER = ["easy", "medium", "advanced", "hard", "expert"];
  const SYMBOL_THEMES = {
    petals: {
      label: "Petals",
      symbols: ["✿", "❀", "❁", "✾", "✽", "✺", "✹", "✸", "✷"]
    },
    moon: {
      label: "Moon",
      symbols: ["☽", "☾", "◐", "◑", "◒", "◓", "○", "●", "◌"]
    }
  };
  const LEGEND_MODES = ["visible", "faded", "hidden"];
  const BLOOM_TOKENS_PER_RUN = 2;
  const BLOOM_PEEK_DURATION = 5000;
  const DAILY_SPECIALS = [
    {
      id: "petal-daily",
      title: "Petal Daily",
      focus: "Visible symbol rhythm",
      symbolTheme: "petals",
      legendMode: "visible"
    },
    {
      id: "moon-memory-daily",
      title: "Moon Memory Daily",
      focus: "Faded symbol recall",
      symbolTheme: "moon",
      legendMode: "faded"
    },
    {
      id: "hidden-legend-daily",
      title: "Hidden Legend Daily",
      focus: "Pure memory spotlight",
      symbolTheme: "petals",
      legendMode: "hidden"
    }
  ];
  const WEEKLY_PATHS = [
    {
      id: "bridge-week",
      title: "Bridge Week",
      text: "Move from Medium into Advanced, then finish with a steady Hard board.",
      focus: "Difficulty ladder",
      steps: [
        { id: "step-1", label: "Step 1", difficulty: "medium", mode: "classic", focus: "Warm into the week" },
        { id: "step-2", label: "Step 2", difficulty: "advanced", mode: "classic", focus: "Bridge-tier logic" },
        { id: "step-3", label: "Step 3", difficulty: "hard", mode: "zen", focus: "Finish with patience" }
      ]
    },
    {
      id: "pure-logic-week",
      title: "Pure Logic Week",
      text: "Three boards that keep the rules classic while steadily reducing how much help you rely on.",
      focus: "Trust the grid",
      steps: [
        { id: "step-1", label: "Step 1", difficulty: "medium", mode: "classic", focus: "Settle in cleanly" },
        { id: "step-2", label: "Step 2", difficulty: "advanced", mode: "nocheck", focus: "Trust your deductions" },
        { id: "step-3", label: "Step 3", difficulty: "hard", mode: "nonotes", focus: "Hold the board in your head" }
      ]
    },
    {
      id: "daily-discipline-week",
      title: "Daily Discipline Week",
      text: "A shared-rhythm path that mixes daily ritual with one stronger bridge-tier finish.",
      focus: "Shared ritual",
      steps: [
        { id: "step-1", label: "Step 1", difficulty: "easy", mode: "daily", focus: "Start the rhythm" },
        { id: "step-2", label: "Step 2", difficulty: "medium", mode: "daily", focus: "Shared step-up" },
        { id: "step-3", label: "Step 3", difficulty: "advanced", mode: "daily", focus: "Bridge-tier finale" }
      ]
    }
  ];
  const SYMBOL_WEEKLY_PATHS = [
    {
      id: "petal-recall-week",
      title: "Petal Recall Week",
      text: "Stay in Petals and move from visible legend comfort into a faded memory finish.",
      focus: "Petal memory ladder",
      steps: [
        { id: "step-1", label: "Step 1", difficulty: "easy", mode: "classic", focus: "Visible legend warm-up", symbolTheme: "petals", legendMode: "visible" },
        { id: "step-2", label: "Step 2", difficulty: "medium", mode: "classic", focus: "Faded recall bridge", symbolTheme: "petals", legendMode: "faded" },
        { id: "step-3", label: "Step 3", difficulty: "advanced", mode: "zen", focus: "Calm petal memory run", symbolTheme: "petals", legendMode: "faded" }
      ]
    },
    {
      id: "moon-memory-week",
      title: "Moon Memory Week",
      text: "Use Moon symbols to move from visible mapping into a cleaner, more memory-led solve rhythm.",
      focus: "Moon memory ladder",
      steps: [
        { id: "step-1", label: "Step 1", difficulty: "easy", mode: "classic", focus: "Moon mapping warm-up", symbolTheme: "moon", legendMode: "visible" },
        { id: "step-2", label: "Step 2", difficulty: "medium", mode: "classic", focus: "Faded moon recall", symbolTheme: "moon", legendMode: "faded" },
        { id: "step-3", label: "Step 3", difficulty: "advanced", mode: "nocheck", focus: "Moon trust run", symbolTheme: "moon", legendMode: "faded" }
      ]
    },
    {
      id: "hidden-legend-path",
      title: "Hidden Legend Path",
      text: "A three-step symbol journey for players ready to trust the mapping without visible support by the end.",
      focus: "Pure memory",
      steps: [
        { id: "step-1", label: "Step 1", difficulty: "medium", mode: "classic", focus: "Visible anchor", symbolTheme: "petals", legendMode: "visible" },
        { id: "step-2", label: "Step 2", difficulty: "advanced", mode: "classic", focus: "Faded middle step", symbolTheme: "petals", legendMode: "faded" },
        { id: "step-3", label: "Step 3", difficulty: "advanced", mode: "nonotes", focus: "Hidden-legend finish", symbolTheme: "petals", legendMode: "hidden" }
      ]
    }
  ];
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
    nonotes: {
      label: "No notes",
      description: "Notes are disabled. Solve from pure observation and memory.",
      defaults: { showMistakes: true, notesMode: false }
    },
    nocheck: {
      label: "No check",
      description: "Board checking is disabled. Trust your logic to the end.",
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
      mistakes: 0,
      hintsUsed: 0,
      checksUsed: 0,
      bloomTokensUsed: 0,
      noHintSolves: 0,
      perfectRuns: 0,
      assistedSolves: 0
    };
  }

  function createTechniqueStats() {
    return {
      nakedSingleHints: 0,
      hiddenSingleHints: 0,
      fullHouseHints: 0,
      nakedPairsHints: 0,
      pointingHints: 0,
      claimingHints: 0,
      lockedCandidatesHints: 0,
      advancedClears: 0,
      advancedNoHintClears: 0,
      symbolClears: 0,
      symbolVisibleClears: 0,
      symbolFadedClears: 0,
      symbolHiddenClears: 0,
      symbolPureClears: 0,
      symbolAssistedClears: 0,
      petalsClears: 0,
      moonClears: 0
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
        advanced: createBucket(),
        hard: createBucket(),
        expert: createBucket()
      },
      modes: Object.fromEntries(Object.keys(MODES).map((mode) => [mode, createBucket()])),
      techniques: createTechniqueStats()
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
    hintsUsed: 0,
    checksUsed: 0,
    secondsElapsed: 0,
    intervalId: null,
    completed: false,
    paused: false,
    pauseReason: null,
    audioEnabled: loadAudioPreference(),
    padTipsEnabled: loadPadTipsPreference(),
    scopeHighlightEnabled: loadScopeHighlightPreference(),
    highContrastEnabled: loadHighContrastPreference(),
    theme: loadThemePreference(),
    symbolPlayEnabled: loadSymbolPlayPreference(),
    symbolTheme: loadSymbolThemePreference(),
    legendMode: loadLegendModePreference(),
    audioContext: null,
    stats: loadStats(),
    activeSessionRecorded: false,
    lastPuzzleKey: null,
    revealIndices: new Set(),
    revealTimeoutId: null,
    bloomTokensRemaining: 0,
    bloomPeekActive: false,
    bloomPeekTimeoutId: null,
    assistedRun: false,
    hintIndex: null,
    hintStage: 0,
    lastHintKey: null,
    feedbackIndex: null,
    feedbackType: null,
    feedbackTimeoutId: null,
    onboardingDismissed: loadOnboardingPreference(),
    onboardingPeekOpen: false,
    dailyResults: loadDailyResults(),
    weeklyResults: loadWeeklyResults(),
    sessionHistory: loadSessionHistory(),
    currentWeeklyStepId: null,
    currentWeeklyPathId: null,
    currentWeeklyWeekKey: null,
    currentDailySpecial: null,
    currentDailyDateKey: null,
    symbolTutorialDone: loadSymbolTutorialPreference(),
    symbolTutorialSnoozed: loadSymbolTutorialSnoozePreference(),
    symbolTutorialActive: false,
    symbolTutorialQueue: [],
    symbolTutorialStep: 0
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
    focusRibbon: document.getElementById("focus-ribbon"),
    boardMeta: document.querySelector(".board-meta"),
    actionsBar: document.querySelector(".actions-bar"),
    onboardingCard: document.getElementById("onboarding-card"),
    dismissOnboardingButton: document.getElementById("dismiss-onboarding-button"),
    board: document.getElementById("sudoku-board"),
    pauseOverlay: document.getElementById("pause-overlay"),
    pauseOverlayText: document.getElementById("pause-overlay-text"),
    victoryOverlay: document.getElementById("victory-overlay"),
    victorySummary: document.getElementById("victory-summary"),
    victoryShareCard: document.getElementById("victory-share-card"),
    victoryShareTitle: document.getElementById("victory-share-title"),
    victoryShareMedal: document.getElementById("victory-share-medal"),
    victoryShareMeta: document.getElementById("victory-share-meta"),
    victoryProgressList: document.getElementById("victory-progress-list"),
    victoryNextLabel: document.getElementById("victory-next-label"),
    victoryNewGameButton: document.getElementById("victory-new-game-button"),
    victorySecondaryButton: document.getElementById("victory-secondary-button"),
    shareVictoryButton: document.getElementById("share-victory-button"),
    resumeButton: document.getElementById("resume-button"),
    pauseButton: document.getElementById("pause-button"),
    timer: document.getElementById("timer"),
    mistakeCount: document.getElementById("mistake-count"),
    difficultySelect: document.getElementById("difficulty-select"),
    modeSelect: document.getElementById("mode-select"),
    modeDescription: document.getElementById("mode-description"),
    symbolLegendCard: document.getElementById("symbol-legend-card"),
    symbolLegendTitle: document.getElementById("symbol-legend-title"),
    symbolLegendText: document.getElementById("symbol-legend-text"),
    symbolLegendGrid: document.getElementById("symbol-legend-grid"),
    symbolTutorialCard: document.getElementById("symbol-tutorial-card"),
    symbolTutorialTitle: document.getElementById("symbol-tutorial-title"),
    symbolTutorialText: document.getElementById("symbol-tutorial-text"),
    symbolTutorialSymbol: document.getElementById("symbol-tutorial-symbol"),
    symbolTutorialProgress: document.getElementById("symbol-tutorial-progress"),
    symbolTutorialOptions: document.getElementById("symbol-tutorial-options"),
    symbolTutorialDismiss: document.getElementById("symbol-tutorial-dismiss"),
    bloomTokenCard: document.getElementById("bloom-token-card"),
    bloomTokenTitle: document.getElementById("bloom-token-title"),
    bloomTokenText: document.getElementById("bloom-token-text"),
    bloomRevealButton: document.getElementById("bloom-reveal-button"),
    bloomVerifyButton: document.getElementById("bloom-verify-button"),
    bloomPeekButton: document.getElementById("bloom-peek-button"),
    themeSelect: document.getElementById("theme-select"),
    symbolPlayToggle: document.getElementById("symbol-play-toggle"),
    symbolThemeSelect: document.getElementById("symbol-theme-select"),
    legendModeSelect: document.getElementById("legend-mode-select"),
    optionsSummaryMeta: document.getElementById("options-summary-meta"),
    mistakeToggle: document.getElementById("mistake-toggle"),
    mistakeToggleLabel: document.getElementById("mistake-toggle-label"),
    notesToggle: document.getElementById("notes-toggle"),
    notesStatusChip: document.getElementById("notes-status-chip"),
    audioToggle: document.getElementById("audio-toggle"),
    padTipsToggle: document.getElementById("pad-tips-toggle"),
    scopeHighlightToggle: document.getElementById("scope-highlight-toggle"),
    contrastToggle: document.getElementById("contrast-toggle"),
    newGameButton: document.getElementById("new-game-button"),
    eraseButton: document.getElementById("erase-button"),
    hintButton: document.getElementById("hint-button"),
    showOnboardingButton: document.getElementById("show-onboarding-button"),
    valueModeButton: document.getElementById("value-mode-button"),
    noteModeButton: document.getElementById("note-mode-button"),
    entryModeHint: document.getElementById("entry-mode-hint"),
    resetButton: document.getElementById("reset-button"),
    checkButton: document.getElementById("check-button"),
    numberPad: document.getElementById("number-pad"),
    challengeLabel: document.getElementById("challenge-label"),
    message: document.getElementById("game-message"),
    puzzleInsights: document.getElementById("puzzle-insights"),
    currentDifficultyLabel: document.getElementById("current-difficulty-label"),
    currentModeLabel: document.getElementById("current-mode-label"),
    bestTimeOverview: document.getElementById("best-time-overview"),
    streakOverview: document.getElementById("streak-overview"),
    rankOverview: document.getElementById("rank-overview"),
    heroStatsSummary: document.getElementById("hero-stats-summary"),
    sessionRitualTitle: document.getElementById("session-ritual-title"),
    sessionRitualText: document.getElementById("session-ritual-text"),
    sessionRitualButton: document.getElementById("session-ritual-button"),
    featuredChallengeTitle: document.getElementById("featured-challenge-title"),
    featuredChallengeText: document.getElementById("featured-challenge-text"),
    featuredChallengeTag: document.getElementById("featured-challenge-tag"),
    featuredChallengeFocus: document.getElementById("featured-challenge-focus"),
    featuredChallengeButton: document.getElementById("featured-challenge-button"),
    weeklyChallengeTitle: document.getElementById("weekly-challenge-title"),
    weeklyChallengeText: document.getElementById("weekly-challenge-text"),
    weeklyChallengeTag: document.getElementById("weekly-challenge-tag"),
    weeklyChallengeFocus: document.getElementById("weekly-challenge-focus"),
    weeklyChallengeSteps: document.getElementById("weekly-challenge-steps"),
    weeklyChallengeButton: document.getElementById("weekly-challenge-button"),
    techniqueJournalList: document.getElementById("technique-journal-list"),
    symbolMasteryList: document.getElementById("symbol-mastery-list"),
    statsList: document.getElementById("stats-list"),
    analyticsList: document.getElementById("analytics-list"),
    achievementList: document.getElementById("achievement-list"),
    sessionHistoryList: document.getElementById("session-history-list"),
    dailyResultCard: document.getElementById("daily-result-card"),
    dailyResultList: document.getElementById("daily-result-list"),
    dailyShareCard: document.getElementById("daily-share-card"),
    dailyResultShareText: document.getElementById("daily-result-share-text"),
    shareDailyButton: document.getElementById("share-daily-button"),
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
      defaults.techniques = {
        ...defaults.techniques,
        ...((parsed.techniques || {}))
      };
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

  function loadScopeHighlightPreference() {
    try {
      const raw = localStorage.getItem(SCOPE_HIGHLIGHT_KEY);
      return raw === null ? true : raw === "on";
    } catch (error) {
      return true;
    }
  }

  function saveScopeHighlightPreference() {
    try {
      localStorage.setItem(SCOPE_HIGHLIGHT_KEY, state.scopeHighlightEnabled ? "on" : "off");
    } catch (error) {
      // ignore preference-only storage issues
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
      // ignore preference-only storage issues
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

  function saveThemePreference() {
    try {
      localStorage.setItem(THEME_KEY, state.theme);
    } catch (error) {
      // ignore preference-only storage issues
    }
  }

  function loadSymbolPlayPreference() {
    try {
      return localStorage.getItem(SYMBOL_PLAY_KEY) === "on";
    } catch (error) {
      return false;
    }
  }

  function saveSymbolPlayPreference() {
    try {
      localStorage.setItem(SYMBOL_PLAY_KEY, state.symbolPlayEnabled ? "on" : "off");
    } catch (error) {
      // ignore preference-only storage issues
    }
  }

  function loadSymbolThemePreference() {
    try {
      const raw = localStorage.getItem(SYMBOL_THEME_KEY);
      return Object.prototype.hasOwnProperty.call(SYMBOL_THEMES, raw) ? raw : "petals";
    } catch (error) {
      return "petals";
    }
  }

  function saveSymbolThemePreference() {
    try {
      localStorage.setItem(SYMBOL_THEME_KEY, state.symbolTheme);
    } catch (error) {
      // ignore preference-only storage issues
    }
  }

  function loadLegendModePreference() {
    try {
      const raw = localStorage.getItem(LEGEND_MODE_KEY);
      return LEGEND_MODES.includes(raw) ? raw : "visible";
    } catch (error) {
      return "visible";
    }
  }

  function saveLegendModePreference() {
    try {
      localStorage.setItem(LEGEND_MODE_KEY, state.legendMode);
    } catch (error) {
      // ignore preference-only storage issues
    }
  }

  function loadSymbolTutorialPreference() {
    try {
      return localStorage.getItem(SYMBOL_TUTORIAL_KEY) === "done";
    } catch (error) {
      return false;
    }
  }

  function saveSymbolTutorialPreference() {
    try {
      localStorage.setItem(SYMBOL_TUTORIAL_KEY, state.symbolTutorialDone ? "done" : "pending");
    } catch (error) {
      // ignore preference-only storage issues
    }
  }

  function loadSymbolTutorialSnoozePreference() {
    try {
      return localStorage.getItem(SYMBOL_TUTORIAL_SNOOZE_KEY) === "done";
    } catch (error) {
      return false;
    }
  }

  function saveSymbolTutorialSnoozePreference() {
    try {
      localStorage.setItem(SYMBOL_TUTORIAL_SNOOZE_KEY, state.symbolTutorialSnoozed ? "done" : "pending");
    } catch (error) {
      // ignore preference-only storage issues
    }
  }

  function applyThemePreset() {
    document.body.dataset.theme = state.theme;
    document.body.dataset.symbolTheme = state.symbolTheme;
    document.body.classList.toggle("symbol-play-active", state.symbolPlayEnabled);
    elements.themeSelect.value = state.theme;
    refreshOptionsSummary();
  }

  function refreshOptionsSummary() {
    const activeAids = [
      state.notesMode,
      state.showMistakes || state.mode === 'nomistakes',
      state.audioEnabled,
      state.padTipsEnabled,
      state.scopeHighlightEnabled,
      state.symbolPlayEnabled,
      state.highContrastEnabled
    ].filter(Boolean).length;
    const themeLabel = state.theme === "ink"
      ? "墨 / Ink"
      : state.theme === "night"
        ? "夜桜 / Sakura Night"
        : "庭 / Garden";
    elements.optionsSummaryMeta.textContent = `${activeAids} aids on — ${themeLabel}`;
  }

  function applyHighContrastTheme() {
    document.body.classList.toggle("high-contrast", state.highContrastEnabled);
    elements.contrastToggle.checked = state.highContrastEnabled;
  }

  function loadOnboardingPreference() {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === "done";
    } catch (error) {
      return false;
    }
  }

  function saveOnboardingPreference() {
    try {
      localStorage.setItem(ONBOARDING_KEY, state.onboardingDismissed ? "done" : "pending");
    } catch (error) {
      // ignore preference-only storage issues
    }
  }

  function loadDailyResults() {
    try {
      const raw = localStorage.getItem(DAILY_RESULTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveDailyResults() {
    try {
      localStorage.setItem(DAILY_RESULTS_KEY, JSON.stringify(state.dailyResults));
    } catch (error) {
      // ignore storage failures for history-only writes
    }
  }

  function loadWeeklyResults() {
    try {
      const raw = localStorage.getItem(WEEKLY_RESULTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveWeeklyResults() {
    try {
      localStorage.setItem(WEEKLY_RESULTS_KEY, JSON.stringify(state.weeklyResults));
    } catch (error) {
      // ignore storage failures for progression-only writes
    }
  }

  function loadSessionHistory() {
    try {
      const raw = localStorage.getItem(SESSION_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function saveSessionHistory() {
    try {
      localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(state.sessionHistory));
    } catch (error) {
      // ignore storage failures for history-only writes
    }
  }

  function renderSessionHistory() {
    if (!state.sessionHistory.length) {
      elements.sessionHistoryList.innerHTML = `<div class="achievement-item"><strong>No finished runs yet</strong><span>Your recent solves will appear here once you complete a few boards.</span></div>`;
      return;
    }

    elements.sessionHistoryList.innerHTML = state.sessionHistory
      .slice(0, 8)
      .map((entry) => `<div class="achievement-item"><strong>${getDifficultyLabel(entry.difficulty)} · ${MODES[entry.mode]?.label || entry.mode}</strong><span>${entry.date} ${entry.timeLabel || ""} · ${SudokuCore.formatTime(entry.time)} · ${entry.mistakes} mistake${entry.mistakes === 1 ? "" : "s"} · ${entry.medal || "✨ Steady finish"}</span></div>`)
      .join("");
  }

  function serializeNotes() {
    return state.notes.map((entry) => Array.from(entry));
  }

  function deserializeNotes(serialized) {
    const notes = SudokuCore.createNotesState();
    if (!Array.isArray(serialized)) {
      return notes;
    }

    serialized.forEach((values, index) => {
      if (index < notes.length && Array.isArray(values)) {
        notes[index] = new Set(values.filter((value) => Number.isInteger(value) && value >= 1 && value <= 9));
      }
    });

    return notes;
  }

  function loadResumeState() {
    try {
      const raw = localStorage.getItem(RESUME_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function clearResumeState() {
    try {
      localStorage.removeItem(RESUME_KEY);
    } catch (error) {
      // ignore resume cleanup failures
    }
  }

  function saveResumeState() {
    if (!state.puzzleMeta || state.completed || !state.activeSessionRecorded) {
      clearResumeState();
      return;
    }

    const payload = {
      version: 1,
      difficulty: state.difficulty,
      mode: state.mode,
      puzzleId: state.puzzleMeta.id,
      board: state.board,
      notes: serializeNotes(),
      selectedIndex: state.selectedIndex,
      showMistakes: state.showMistakes,
      notesMode: state.notesMode,
      mistakes: state.mistakes,
      hintsUsed: state.hintsUsed,
      checksUsed: state.checksUsed,
      currentWeeklyStepId: state.currentWeeklyStepId,
      currentWeeklyPathId: state.currentWeeklyPathId,
      currentWeeklyWeekKey: state.currentWeeklyWeekKey,
      currentDailySpecial: state.currentDailySpecial,
      currentDailyDateKey: state.currentDailyDateKey,
      symbolPlayEnabled: state.symbolPlayEnabled,
      symbolTheme: state.symbolTheme,
      legendMode: state.legendMode,
      bloomTokensRemaining: state.bloomTokensRemaining,
      bloomPeekActive: false,
      assistedRun: state.assistedRun,
      secondsElapsed: state.secondsElapsed,
      paused: state.paused,
      pauseReason: state.pauseReason,
      lastUpdatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(RESUME_KEY, JSON.stringify(payload));
    } catch (error) {
      // ignore resume persistence failures
    }
  }

  function findPuzzleById(difficulty, puzzleId) {
    return getAvailablePuzzles(difficulty).find((entry) => entry.id === puzzleId) || null;
  }

  function isValidBoardSnapshot(savedBoard, puzzleBoard) {
    return Array.isArray(savedBoard)
      && savedBoard.length === 81
      && savedBoard.every((value, index) => Number.isInteger(value)
        && value >= 0
        && value <= 9
        && (puzzleBoard[index] === 0 || value === puzzleBoard[index]));
  }

  function restoreSavedGame() {
    const saved = loadResumeState();
    if (!saved || !saved.puzzleId || !saved.difficulty || !saved.mode) {
      return { restored: false, invalid: false };
    }

    if (saved.mode === "daily" && saved.currentDailyDateKey && saved.currentDailyDateKey !== getCurrentDateKey()) {
      clearResumeState();
      return { restored: false, invalid: true };
    }

    if (!window.SUDOKU_PUZZLES[saved.difficulty] || !Object.prototype.hasOwnProperty.call(MODES, saved.mode)) {
      clearResumeState();
      return { restored: false, invalid: true };
    }

    const puzzle = findPuzzleById(saved.difficulty, saved.puzzleId);
    if (!puzzle) {
      clearResumeState();
      return { restored: false, invalid: true };
    }

    const parsedPuzzle = SudokuCore.parseGrid(puzzle.puzzle);
    if (!isValidBoardSnapshot(saved.board, parsedPuzzle)) {
      clearResumeState();
      return { restored: false, invalid: true };
    }

    state.difficulty = saved.difficulty;
    state.mode = saved.mode;
    state.puzzleId = puzzle.id;
    state.puzzleMeta = puzzle;
    state.puzzle = parsedPuzzle;
    state.solution = SudokuCore.parseGrid(puzzle.solution);
    state.board = [...saved.board];
    state.notes = deserializeNotes(saved.notes);
    state.selectedIndex = Number.isInteger(saved.selectedIndex) && saved.selectedIndex >= 0 && saved.selectedIndex < 81
      ? saved.selectedIndex
      : state.puzzle.findIndex((value) => value === 0);
    state.showMistakes = saved.showMistakes !== undefined ? Boolean(saved.showMistakes) : MODES[state.mode].defaults.showMistakes;
    state.notesMode = saved.notesMode !== undefined ? Boolean(saved.notesMode) : MODES[state.mode].defaults.notesMode;
    state.mistakes = Number.isInteger(saved.mistakes) ? saved.mistakes : 0;
    state.hintsUsed = Number.isInteger(saved.hintsUsed) ? saved.hintsUsed : 0;
    state.checksUsed = Number.isInteger(saved.checksUsed) ? saved.checksUsed : 0;
    state.currentWeeklyStepId = typeof saved.currentWeeklyStepId === "string" ? saved.currentWeeklyStepId : null;
    state.currentWeeklyPathId = typeof saved.currentWeeklyPathId === "string" ? saved.currentWeeklyPathId : null;
    state.currentWeeklyWeekKey = typeof saved.currentWeeklyWeekKey === "string" ? saved.currentWeeklyWeekKey : null;
    state.currentDailySpecial = saved.currentDailySpecial || null;
    state.currentDailyDateKey = typeof saved.currentDailyDateKey === "string" ? saved.currentDailyDateKey : null;
    state.symbolPlayEnabled = saved.symbolPlayEnabled !== undefined ? Boolean(saved.symbolPlayEnabled) : state.symbolPlayEnabled;
    state.symbolTheme = Object.prototype.hasOwnProperty.call(SYMBOL_THEMES, saved.symbolTheme) ? saved.symbolTheme : state.symbolTheme;
    state.legendMode = LEGEND_MODES.includes(saved.legendMode) ? saved.legendMode : state.legendMode;
    state.bloomTokensRemaining = Number.isInteger(saved.bloomTokensRemaining)
      ? Math.max(0, Math.min(BLOOM_TOKENS_PER_RUN, saved.bloomTokensRemaining))
      : state.bloomTokensRemaining;
    state.bloomPeekActive = false;
    state.assistedRun = Boolean(saved.assistedRun);
    state.secondsElapsed = Number.isInteger(saved.secondsElapsed) ? saved.secondsElapsed : 0;
    state.completed = false;
    state.paused = Boolean(saved.paused);
    state.pauseReason = typeof saved.pauseReason === "string" ? saved.pauseReason : null;
    state.activeSessionRecorded = true;
    clearHint();

    elements.difficultySelect.value = state.difficulty;
    elements.modeSelect.value = state.mode;
    elements.timer.textContent = SudokuCore.formatTime(state.secondsElapsed);
    elements.mistakeCount.textContent = String(state.mistakes);
    elements.challengeLabel.textContent = `${getDifficultyLabel(state.difficulty)} · ${MODES[state.mode].label} · ${puzzle.label}`;
    setMessage("Resumed your unfinished game.");
    refreshMistakeToggleUi();
    refreshNotesUi();
    refreshCheckUi();
    updateOverview();
    renderStats();
    renderLearningSurfaces();
    renderRankPanel();
    renderModeDescription();
    renderSymbolLegend();
    renderBloomTokens();
    renderPuzzleInsights();
    renderSessionRitual();
    renderFeaturedChallenge();
    renderWeeklyChallenge();
    renderSessionHistory();
    renderDailyResult();
    syncUrl();
    if (!state.paused) {
      startTimer();
    }
    renderBoard();
    renderNumberPad();
    saveResumeState();
    return { restored: true, invalid: false };
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
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getCurrentWeekKey() {
    const now = new Date();
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = local.getDay();
    const mondayOffset = (day + 6) % 7;
    local.setDate(local.getDate() - mondayOffset);
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, "0");
    const date = String(local.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  }

  function getDailySpecial(difficulty) {
    const dateKey = getCurrentDateKey();
    const seed = hashText(`daily-special-${dateKey}-${difficulty}`);
    if (seed % 3 !== 0) {
      return null;
    }
    const pool = DAILY_SPECIALS.filter((entry) => entry.legendMode !== "hidden" || ["advanced", "hard", "expert"].includes(difficulty));
    const special = pool[seed % pool.length];
    return {
      ...special,
      difficulty
    };
  }

  function clearDailySpecialPresentation() {
    state.currentDailySpecial = null;
    state.currentDailyDateKey = null;
    state.symbolPlayEnabled = loadSymbolPlayPreference();
    state.symbolTheme = loadSymbolThemePreference();
    state.legendMode = loadLegendModePreference();
    applyThemePreset();
  }

  function applyDailySpecialPresentation(special) {
    state.currentDailySpecial = special;
    state.currentDailyDateKey = getCurrentDateKey();
    if (!special) {
      clearDailySpecialPresentation();
      return;
    }
    state.symbolPlayEnabled = true;
    state.symbolTheme = special.symbolTheme;
    state.legendMode = special.legendMode;
    applyThemePreset();
  }

  function getWeeklyPath() {
    const weekKey = getCurrentWeekKey();
    if (state.currentWeeklyWeekKey === weekKey && state.currentWeeklyPathId) {
      return [...WEEKLY_PATHS, ...SYMBOL_WEEKLY_PATHS].find((path) => path.id === state.currentWeeklyPathId) || WEEKLY_PATHS[0];
    }
    const pool = state.symbolPlayEnabled ? SYMBOL_WEEKLY_PATHS : WEEKLY_PATHS;
    const seed = hashText(`${weekKey}-weekly-path-${state.symbolPlayEnabled ? state.symbolTheme : 'classic'}`);
    return pool[seed % pool.length];
  }

  function getWeeklyPathEntry() {
    const weekKey = getCurrentWeekKey();
    const current = state.weeklyResults[weekKey];
    if (current?.pathId) {
      const storedPath = [...WEEKLY_PATHS, ...SYMBOL_WEEKLY_PATHS].find((path) => path.id === current.pathId);
      if (storedPath) {
        return { weekKey, path: storedPath, result: current };
      }
    }
    const path = getWeeklyPath();
    return {
      weekKey,
      path,
      result: {
        pathId: path.id,
        completedSteps: {}
      }
    };
  }

  function getWeeklyPuzzle(step, weekKey) {
    const pool = getAvailablePuzzles(step.difficulty);
    const pathId = state.currentWeeklyPathId || getWeeklyPath().id;
    return pool[hashText(`${weekKey}-${pathId}-${step.id}-${step.difficulty}-${step.mode}`) % pool.length];
  }

  function applyWeeklyStepPresentation(step) {
    if (!step.symbolTheme && !step.legendMode && !state.symbolPlayEnabled) {
      return;
    }
    const nextSymbolPlay = Boolean(step.symbolTheme || state.symbolPlayEnabled);
    state.symbolPlayEnabled = nextSymbolPlay;
    if (step.symbolTheme) {
      state.symbolTheme = step.symbolTheme;
    }
    if (step.legendMode) {
      state.legendMode = step.legendMode;
    }
    applyThemePreset();
  }

  function getNextWeeklyStep(entry) {
    return entry.path.steps.find((step) => !entry.result.completedSteps[step.id]) || null;
  }

  function playWeeklyChallengeStep(step) {
    const entry = getWeeklyPathEntry();
    const { weekKey } = entry;
    state.currentWeeklyPathId = entry.path.id;
    state.currentWeeklyWeekKey = weekKey;
    state.weeklyResults[weekKey] = entry.result;
    saveWeeklyResults();
    const puzzle = getWeeklyPuzzle(step, weekKey);
    applyWeeklyStepPresentation(step);
    newGame(step.difficulty, step.mode, { forcedPuzzle: puzzle, weeklyStepId: step.id });
  }

  function getBucketAverage(bucket) {
    return bucket.solved ? Math.round(bucket.totalTime / bucket.solved) : null;
  }

  function formatAverage(bucket) {
    const average = getBucketAverage(bucket);
    return average ? SudokuCore.formatTime(average) : "—";
  }

  function getDifficultyLabel(difficulty) {
    return difficulty === "advanced" ? "Advanced" : capitalize(difficulty);
  }

  function getNextDifficulty(difficulty) {
    const index = DIFFICULTY_ORDER.indexOf(difficulty);
    return DIFFICULTY_ORDER[Math.min(DIFFICULTY_ORDER.length - 1, index + 1)] || difficulty;
  }

  function getAverageHintsPerSolve(bucket) {
    return bucket.solved ? bucket.hintsUsed / bucket.solved : 0;
  }

  function isReadyForAdvancedPush() {
    return state.stats.difficulties.medium.solved >= 4 && state.stats.difficulties.advanced.solved < 3;
  }

  function isReadyForHardPush() {
    return state.stats.difficulties.advanced.solved >= 3 && getAverageHintsPerSolve(state.stats.difficulties.advanced) <= 1.2;
  }

  function prefersGuidedPractice() {
    const currentBucket = state.stats.difficulties[state.difficulty];
    return getAverageHintsPerSolve(currentBucket) >= 1.5;
  }

  function hasWeeklyStepWaiting() {
    return Boolean(getNextWeeklyStep(getWeeklyPathEntry()));
  }

  function getRecommendedLegendMode() {
    const techniques = state.stats.techniques;
    if (techniques.symbolFadedClears >= 2) {
      return "hidden";
    }
    if (techniques.symbolVisibleClears >= 2) {
      return "faded";
    }
    return "visible";
  }

  function getNextLegendModeUpgrade() {
    const recommended = getRecommendedLegendMode();
    const currentIndex = LEGEND_MODES.indexOf(state.legendMode);
    const recommendedIndex = LEGEND_MODES.indexOf(recommended);
    return recommendedIndex > currentIndex ? recommended : null;
  }

  function formatPuzzleTags(tags = []) {
    return tags
      .slice(0, 2)
      .map((tag) => tag.replace(/-/g, " "))
      .map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1));
  }

  function buildTechniqueLabel(entry) {
    const formatted = formatPuzzleTags(entry?.tags || []);
    return formatted.length ? formatted.join(" · ") : "Classic logic";
  }

  function getVictoryNextAction() {
    const legendUpgrade = state.symbolPlayEnabled ? getNextLegendModeUpgrade() : null;
    if (legendUpgrade) {
      return {
        label: `Try ${legendUpgrade} legend`,
        description: legendUpgrade === "faded"
          ? "You have enough Symbol Play clears to lighten the legend and lean more on memory."
          : "You have earned a hidden-legend run. Keep Symbol Play on and trust the mapping from memory.",
        run: () => {
          state.legendMode = legendUpgrade;
          saveLegendModePreference();
          refreshSymbolUi();
          syncUrl();
          saveResumeState();
          newGame(state.difficulty, state.mode);
        },
        primary: true
      };
    }

    const weeklyEntry = getWeeklyPathEntry();
    const nextWeeklyStep = getNextWeeklyStep(weeklyEntry);
    if (nextWeeklyStep && state.currentWeeklyStepId) {
      return {
        label: `Play ${nextWeeklyStep.label}`,
        description: `Keep your ${weeklyEntry.path.title} momentum going with ${getDifficultyLabel(nextWeeklyStep.difficulty)} ${MODES[nextWeeklyStep.mode].label}.`,
        run: () => playWeeklyChallengeStep(nextWeeklyStep),
        primary: true
      };
    }

    if (state.mode !== "daily" && !state.dailyResults[`${getCurrentDateKey()}-${state.difficulty}`]) {
      return {
        label: "Play Daily",
        description: `You solved cleanly. Carry that rhythm into today’s shared ${getDifficultyLabel(state.difficulty)} board.`,
        run: () => newGame(state.difficulty, "daily"),
        primary: true
      };
    }

    if (state.hintsUsed === 0 && isReadyForHardPush()) {
      return {
        label: "Try Hard",
        description: "Your Advanced clears are staying clean. Step into Hard while the pattern memory is fresh.",
        run: () => newGame("hard", "classic"),
        primary: true
      };
    }

    if (state.hintsUsed >= 2) {
      const targetDifficulty = DIFFICULTY_ORDER.indexOf(state.difficulty) >= DIFFICULTY_ORDER.indexOf("advanced")
        ? state.difficulty
        : "advanced";
      return {
        label: "Practice Advanced",
        description: "This solve leaned on hints. Another Advanced Classic board is the best way to turn those nudges into your own reads.",
        run: () => newGame(targetDifficulty, "classic"),
        primary: true
      };
    }

    if (state.mode === "daily") {
      return {
        label: "Play a fresh classic board",
        description: `You finished today’s daily ${getDifficultyLabel(state.difficulty)}. Keep momentum going with a fresh ${getDifficultyLabel(state.difficulty)} classic puzzle.`,
        run: () => newGame(state.difficulty, "classic"),
        primary: false
      };
    }

    if (state.difficulty === "expert") {
      return {
        label: "Try Sprint mode",
        description: "You already beat Expert. Shift the challenge toward speed with an expert Sprint run.",
        run: () => newGame(state.difficulty, "sprint"),
        primary: false
      };
    }

    return {
      label: `Try ${getDifficultyLabel(getNextDifficulty(state.difficulty))}`,
      description: `Ready for a slightly tougher run? Step up from ${getDifficultyLabel(state.difficulty)} to ${getDifficultyLabel(getNextDifficulty(state.difficulty))}.`,
      run: () => newGame(getNextDifficulty(state.difficulty), state.mode),
      primary: false
    };
  }

  function getRankScore() {
    const overall = state.stats.overall;
    return ( 
      overall.solved * 10 +
      state.stats.overall.streak * 15 +
      state.stats.difficulties.advanced.solved * 4 +
      state.stats.difficulties.hard.solved * 8 +
      state.stats.difficulties.expert.solved * 20 +
      overall.perfectRuns * 5 +
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

  function clearHint() {
    state.hintIndex = null;
    state.hintStage = 0;
    state.lastHintKey = null;
  }

  function clearFeedbackPulse() {
    if (state.feedbackTimeoutId) {
      window.clearTimeout(state.feedbackTimeoutId);
      state.feedbackTimeoutId = null;
    }
    state.feedbackIndex = null;
    state.feedbackType = null;
  }

  function pulseCell(index, type) {
    clearFeedbackPulse();
    state.feedbackIndex = index;
    state.feedbackType = type;
    state.feedbackTimeoutId = window.setTimeout(() => {
      state.feedbackIndex = null;
      state.feedbackType = null;
      state.feedbackTimeoutId = null;
      renderBoard();
    }, 320);
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

  function getCandidates(index) {
    if (state.board[index] !== 0 || state.puzzle[index] !== 0) {
      return [];
    }

    const used = new Set();
    for (const peerIndex of SudokuCore.getPeers(index)) {
      const value = state.board[peerIndex];
      if (value) {
        used.add(value);
      }
    }

    return Array.from({ length: 9 }, (_, position) => position + 1).filter((value) => !used.has(value));
  }

  function findHiddenSingleHintForIndexes(indexes, groupName, type) {
    const candidateMap = new Map();

    indexes
      .filter((index) => state.board[index] === 0)
      .forEach((index) => {
        getCandidates(index).forEach((candidate) => {
          const positions = candidateMap.get(candidate) || [];
          positions.push(index);
          candidateMap.set(candidate, positions);
        });
      });

    for (const [value, positions] of candidateMap.entries()) {
      if (positions.length === 1) {
        const index = positions[0];
        const { row, col } = SudokuCore.indexToRowCol(index);
        return {
          index,
          value,
          messages: [
            `Hint ✦ Hidden single: scan ${groupName} and track where ${formatDisplayValueLabel(value)} can still go.`,
            `Hint ✦ In ${groupName}, only row ${row + 1}, column ${col + 1} can take ${formatDisplayValueLabel(value)}.`,
            `Hint ✦ Place ${formatDisplayValueLabel(value)} at row ${row + 1}, column ${col + 1}.`
          ],
          type
        };
      }
    }

    return null;
  }

  function getHintTechniqueKey(type) {
    if (type === "single") {
      return "nakedSingleHints";
    }
    if (["hidden-row", "hidden-column", "hidden-box"].includes(type)) {
      return "hiddenSingleHints";
    }
    if (["row", "column", "box"].includes(type)) {
      return "fullHouseHints";
    }
    if (type === "naked-pairs") {
      return "nakedPairsHints";
    }
    if (type === "pointing-pairs") {
      return "pointingHints";
    }
    if (type === "claiming-pairs") {
      return "claimingHints";
    }
    if (type === "locked-candidates") {
      return "lockedCandidatesHints";
    }
    return null;
  }

  function recordHintTechnique(type) {
    const key = getHintTechniqueKey(type);
    if (!key) {
      return;
    }
    state.stats.techniques[key] += 1;
  }

  function buildBoxCandidateMap(boxRow, boxCol) {
    const candidateMap = new Map();

    for (let row = boxRow; row < boxRow + 3; row += 1) {
      for (let col = boxCol; col < boxCol + 3; col += 1) {
        const index = SudokuCore.rowColToIndex(row, col);
        if (state.board[index] !== 0) {
          continue;
        }
        getCandidates(index).forEach((candidate) => {
          const positions = candidateMap.get(candidate) || [];
          positions.push({ index, row, col });
          candidateMap.set(candidate, positions);
        });
      }
    }

    return candidateMap;
  }

  function buildUnitCandidateMap(indexes) {
    const candidateMap = new Map();

    indexes.forEach((index) => {
      if (state.board[index] !== 0) {
        return;
      }
      const { row, col } = SudokuCore.indexToRowCol(index);
      getCandidates(index).forEach((candidate) => {
        const positions = candidateMap.get(candidate) || [];
        positions.push({ index, row, col });
        candidateMap.set(candidate, positions);
      });
    });

    return candidateMap;
  }

  function findPointingPairsHint() {
    for (let boxRow = 0; boxRow < 9; boxRow += 3) {
      for (let boxCol = 0; boxCol < 9; boxCol += 3) {
        const candidateMap = buildBoxCandidateMap(boxRow, boxCol);

        for (const [value, positions] of candidateMap.entries()) {
          if (positions.length < 2 || positions.length > 3) {
            continue;
          }

          const uniqueRows = [...new Set(positions.map((entry) => entry.row))];
          const uniqueCols = [...new Set(positions.map((entry) => entry.col))];
          const boxLabel = `${Math.floor(boxRow / 3) + 1},${Math.floor(boxCol / 3) + 1}`;

          if (uniqueRows.length === 1) {
            const lockedRow = uniqueRows[0];
            const eliminations = [];
            for (let col = 0; col < 9; col += 1) {
              if (col >= boxCol && col < boxCol + 3) {
                continue;
              }
              const index = SudokuCore.rowColToIndex(lockedRow, col);
              if (state.board[index] === 0 && getCandidates(index).includes(value)) {
                eliminations.push({ index, row: lockedRow, col });
              }
            }

            if (eliminations.length) {
              const source = positions[0];
              const affectedCols = eliminations.map((entry) => entry.col + 1).join(", ");
              return {
                index: source.index,
                value,
                type: "pointing-pairs",
                messages: [
                  `Hint ✦ Pointing pair: in box ${boxLabel}, every ${formatDisplayValueLabel(value)} candidate sits on row ${lockedRow + 1}.`,
                  `Hint ✦ That means row ${lockedRow + 1} cannot place ${formatDisplayValueLabel(value)} outside this box.`,
                  `Hint ✦ Remove ${formatDisplayValueLabel(value)} from row ${lockedRow + 1}, columns ${affectedCols}, then rescan the row and box.`
                ]
              };
            }
          }

          if (uniqueCols.length === 1) {
            const lockedCol = uniqueCols[0];
            const eliminations = [];
            for (let row = 0; row < 9; row += 1) {
              if (row >= boxRow && row < boxRow + 3) {
                continue;
              }
              const index = SudokuCore.rowColToIndex(row, lockedCol);
              if (state.board[index] === 0 && getCandidates(index).includes(value)) {
                eliminations.push({ index, row, col: lockedCol });
              }
            }

            if (eliminations.length) {
              const source = positions[0];
              const affectedRows = eliminations.map((entry) => entry.row + 1).join(", ");
              return {
                index: source.index,
                value,
                type: "pointing-pairs",
                messages: [
                  `Hint ✦ Pointing pair: in box ${boxLabel}, every ${formatDisplayValueLabel(value)} candidate sits on column ${lockedCol + 1}.`,
                  `Hint ✦ That means column ${lockedCol + 1} cannot place ${formatDisplayValueLabel(value)} outside this box.`,
                  `Hint ✦ Remove ${formatDisplayValueLabel(value)} from column ${lockedCol + 1}, rows ${affectedRows}, then rescan the column and box.`
                ]
              };
            }
          }
        }
      }
    }

    return null;
  }

  function findClaimingPairsHint() {
    for (let row = 0; row < 9; row += 1) {
      const indexes = Array.from({ length: 9 }, (_, col) => SudokuCore.rowColToIndex(row, col));
      const candidateMap = buildUnitCandidateMap(indexes);

      for (const [value, positions] of candidateMap.entries()) {
        if (positions.length < 2 || positions.length > 3) {
          continue;
        }
        const boxRows = [...new Set(positions.map((entry) => Math.floor(entry.row / 3)))];
        const boxCols = [...new Set(positions.map((entry) => Math.floor(entry.col / 3)))];
        if (boxRows.length !== 1 || boxCols.length !== 1) {
          continue;
        }

        const boxRow = boxRows[0] * 3;
        const boxCol = boxCols[0] * 3;
        const eliminations = [];
        for (let r = boxRow; r < boxRow + 3; r += 1) {
          if (r === row) {
            continue;
          }
          for (let c = boxCol; c < boxCol + 3; c += 1) {
            const index = SudokuCore.rowColToIndex(r, c);
            if (state.board[index] === 0 && getCandidates(index).includes(value)) {
              eliminations.push({ row: r, col: c, index });
            }
          }
        }

        if (eliminations.length) {
          const source = positions[0];
          const boxLabel = `${Math.floor(boxRow / 3) + 1},${Math.floor(boxCol / 3) + 1}`;
          const affectedCells = eliminations.map((entry) => `r${entry.row + 1}c${entry.col + 1}`).join(", ");
          return {
            index: source.index,
            value,
            type: "claiming-pairs",
            messages: [
              `Hint ✦ Claiming pair: on row ${row + 1}, every ${formatDisplayValueLabel(value)} candidate sits inside box ${boxLabel}.`,
              `Hint ✦ That means box ${boxLabel} cannot place ${formatDisplayValueLabel(value)} outside row ${row + 1}.`,
              `Hint ✦ Remove ${formatDisplayValueLabel(value)} from ${affectedCells}, then rescan the row and box.`
            ]
          };
        }
      }
    }

    for (let col = 0; col < 9; col += 1) {
      const indexes = Array.from({ length: 9 }, (_, row) => SudokuCore.rowColToIndex(row, col));
      const candidateMap = buildUnitCandidateMap(indexes);

      for (const [value, positions] of candidateMap.entries()) {
        if (positions.length < 2 || positions.length > 3) {
          continue;
        }
        const boxRows = [...new Set(positions.map((entry) => Math.floor(entry.row / 3)))];
        const boxCols = [...new Set(positions.map((entry) => Math.floor(entry.col / 3)))];
        if (boxRows.length !== 1 || boxCols.length !== 1) {
          continue;
        }

        const boxRow = boxRows[0] * 3;
        const boxCol = boxCols[0] * 3;
        const eliminations = [];
        for (let r = boxRow; r < boxRow + 3; r += 1) {
          for (let c = boxCol; c < boxCol + 3; c += 1) {
            if (c === col) {
              continue;
            }
            const index = SudokuCore.rowColToIndex(r, c);
            if (state.board[index] === 0 && getCandidates(index).includes(value)) {
              eliminations.push({ row: r, col: c, index });
            }
          }
        }

        if (eliminations.length) {
          const source = positions[0];
          const boxLabel = `${Math.floor(boxRow / 3) + 1},${Math.floor(boxCol / 3) + 1}`;
          const affectedCells = eliminations.map((entry) => `r${entry.row + 1}c${entry.col + 1}`).join(", ");
          return {
            index: source.index,
            value,
            type: "claiming-pairs",
            messages: [
              `Hint ✦ Claiming pair: on column ${col + 1}, every ${formatDisplayValueLabel(value)} candidate sits inside box ${boxLabel}.`,
              `Hint ✦ That means box ${boxLabel} cannot place ${formatDisplayValueLabel(value)} outside column ${col + 1}.`,
              `Hint ✦ Remove ${formatDisplayValueLabel(value)} from ${affectedCells}, then rescan the column and box.`
            ]
          };
        }
      }
    }

    return null;
  }

  function findNakedPairsHint() {
    const units = [];
    for (let row = 0; row < 9; row += 1) {
      units.push({
        label: `row ${row + 1}`,
        indexes: Array.from({ length: 9 }, (_, col) => SudokuCore.rowColToIndex(row, col))
      });
    }
    for (let col = 0; col < 9; col += 1) {
      units.push({
        label: `column ${col + 1}`,
        indexes: Array.from({ length: 9 }, (_, row) => SudokuCore.rowColToIndex(row, col))
      });
    }
    for (let boxRow = 0; boxRow < 9; boxRow += 3) {
      for (let boxCol = 0; boxCol < 9; boxCol += 3) {
        const indexes = [];
        for (let row = boxRow; row < boxRow + 3; row += 1) {
          for (let col = boxCol; col < boxCol + 3; col += 1) {
            indexes.push(SudokuCore.rowColToIndex(row, col));
          }
        }
        units.push({ label: `box ${Math.floor(boxRow / 3) + 1},${Math.floor(boxCol / 3) + 1}`, indexes });
      }
    }

    for (const unit of units) {
      const pairMap = new Map();
      unit.indexes.forEach((index) => {
        if (state.board[index] !== 0) {
          return;
        }
        const candidates = getCandidates(index);
        if (candidates.length !== 2) {
          return;
        }
        const key = candidates.join(",");
        const positions = pairMap.get(key) || [];
        positions.push({ index, candidates });
        pairMap.set(key, positions);
      });

      for (const [key, positions] of pairMap.entries()) {
        if (positions.length !== 2) {
          continue;
        }
        const pairValues = key.split(",").map(Number);
        const eliminations = unit.indexes.filter((index) => !positions.some((entry) => entry.index === index) && state.board[index] === 0)
          .map((index) => ({ index, candidates: getCandidates(index), ...SudokuCore.indexToRowCol(index) }))
          .filter((entry) => pairValues.some((value) => entry.candidates.includes(value)));

        if (eliminations.length) {
          const source = positions[0];
          const pairLabel = pairValues.join(" and ");
          const cells = positions.map((entry) => {
            const { row, col } = SudokuCore.indexToRowCol(entry.index);
            return `r${row + 1}c${col + 1}`;
          }).join(" + ");
          const affectedCells = eliminations.map((entry) => `r${entry.row + 1}c${entry.col + 1}`).join(", ");
          return {
            index: source.index,
            value: pairValues[0],
            type: "naked-pairs",
            messages: [
            `Hint ✦ Naked pair: in ${unit.label}, cells ${cells} can only be ${pairValues.map((value) => formatDisplayValueLabel(value)).join(" and ")}.`,
            `Hint ✦ That pair locks ${pairValues.map((value) => formatDisplayValueLabel(value)).join(" and ")} into those two cells.`,
            `Hint ✦ Remove ${pairValues.map((value) => formatDisplayValueLabel(value)).join(" and ")} from ${affectedCells}, then rescan ${unit.label}.`
            ]
          };
        }
      }
    }

    return null;
  }

  function buildHint() {
    const preferredIndexes = state.selectedIndex !== null ? [state.selectedIndex] : [];
    const emptyIndexes = state.board.map((value, index) => ({ value, index })).filter(({ value }) => value === 0).map(({ index }) => index);
    const candidateOrder = [...preferredIndexes, ...emptyIndexes.filter((index) => !preferredIndexes.includes(index))];

    for (const index of candidateOrder) {
      const candidates = getCandidates(index);
      if (candidates.length === 1) {
        const { row, col } = SudokuCore.indexToRowCol(index);
        return {
          index,
          value: candidates[0],
          messages: [
            `Hint ✦ Naked single: row ${row + 1}, column ${col + 1} is forced once you scan its peers.`,
            `Hint ✦ Row ${row + 1}, column ${col + 1} only allows ${formatDisplayValueLabel(candidates[0])}.`,
            `Hint ✦ You can safely place ${formatDisplayValueLabel(candidates[0])} at row ${row + 1}, column ${col + 1}.`
          ],
          type: "single"
        };
      }
    }

    for (let row = 0; row < 9; row += 1) {
      const hint = findHiddenSingleHintForIndexes(
        Array.from({ length: 9 }, (_, col) => SudokuCore.rowColToIndex(row, col)),
        `row ${row + 1}`,
        "hidden-row"
      );
      if (hint) {
        return hint;
      }
    }

    for (let col = 0; col < 9; col += 1) {
      const hint = findHiddenSingleHintForIndexes(
        Array.from({ length: 9 }, (_, row) => SudokuCore.rowColToIndex(row, col)),
        `column ${col + 1}`,
        "hidden-column"
      );
      if (hint) {
        return hint;
      }
    }

    for (let boxRow = 0; boxRow < 9; boxRow += 3) {
      for (let boxCol = 0; boxCol < 9; boxCol += 3) {
        const indexes = [];
        for (let row = boxRow; row < boxRow + 3; row += 1) {
          for (let col = boxCol; col < boxCol + 3; col += 1) {
            indexes.push(SudokuCore.rowColToIndex(row, col));
          }
        }

        const hint = findHiddenSingleHintForIndexes(
          indexes,
          `box ${Math.floor(boxRow / 3) + 1},${Math.floor(boxCol / 3) + 1}`,
          "hidden-box"
        );
        if (hint) {
          return hint;
        }
      }
    }

    const pointingPairsHint = findPointingPairsHint();
    if (pointingPairsHint) {
      return pointingPairsHint;
    }

    const claimingPairsHint = findClaimingPairsHint();
    if (claimingPairsHint) {
      return claimingPairsHint;
    }

    const nakedPairsHint = findNakedPairsHint();
    if (nakedPairsHint) {
      return nakedPairsHint;
    }

    for (let row = 0; row < 9; row += 1) {
      const rowIndexes = Array.from({ length: 9 }, (_, col) => SudokuCore.rowColToIndex(row, col)).filter((index) => state.board[index] === 0);
      if (rowIndexes.length === 1) {
        const index = rowIndexes[0];
        const { col } = SudokuCore.indexToRowCol(index);
        const candidates = getCandidates(index);
        if (candidates.length !== 1) {
          continue;
        }
        const value = candidates[0];
        return {
          index,
          value,
          messages: [
            `Hint ✦ Row ${row + 1} has one empty cell left.`,
            `Hint ✦ The last empty cell in row ${row + 1} is column ${col + 1}.`,
            `Hint ✦ Place ${formatDisplayValueLabel(value)} in row ${row + 1}, column ${col + 1}.`
          ],
          type: "row"
        };
      }
    }

    for (let col = 0; col < 9; col += 1) {
      const colIndexes = Array.from({ length: 9 }, (_, row) => SudokuCore.rowColToIndex(row, col)).filter((index) => state.board[index] === 0);
      if (colIndexes.length === 1) {
        const index = colIndexes[0];
        const { row } = SudokuCore.indexToRowCol(index);
        const candidates = getCandidates(index);
        if (candidates.length !== 1) {
          continue;
        }
        const value = candidates[0];
        return {
          index,
          value,
          messages: [
            `Hint ✦ Column ${col + 1} has one empty cell left.`,
            `Hint ✦ The last empty cell in column ${col + 1} is row ${row + 1}.`,
            `Hint ✦ Place ${formatDisplayValueLabel(value)} in row ${row + 1}, column ${col + 1}.`
          ],
          type: "column"
        };
      }
    }

    for (let boxRow = 0; boxRow < 9; boxRow += 3) {
      for (let boxCol = 0; boxCol < 9; boxCol += 3) {
        const boxIndexes = [];
        for (let row = boxRow; row < boxRow + 3; row += 1) {
          for (let col = boxCol; col < boxCol + 3; col += 1) {
            const index = SudokuCore.rowColToIndex(row, col);
            if (state.board[index] === 0) {
              boxIndexes.push(index);
            }
          }
        }
        if (boxIndexes.length === 1) {
          const index = boxIndexes[0];
          const { row, col } = SudokuCore.indexToRowCol(index);
          const candidates = getCandidates(index);
          if (candidates.length !== 1) {
            continue;
          }
          const value = candidates[0];
          const boxLabel = `${Math.floor(boxRow / 3) + 1},${Math.floor(boxCol / 3) + 1}`;
          return {
            index,
            value,
            messages: [
              `Hint ✦ One cell is left in the ${boxLabel} box.`,
              `Hint ✦ The open cell in that box is row ${row + 1}, column ${col + 1}.`,
              `Hint ✦ Place ${formatDisplayValueLabel(value)} in row ${row + 1}, column ${col + 1}.`
            ],
            type: "box"
          };
        }
      }
    }

    return null;
  }

  function renderOnboarding() {
    const shouldAutoShow = !state.onboardingDismissed && state.stats.overall.solved < 2;
    elements.onboardingCard.hidden = !(shouldAutoShow || state.onboardingPeekOpen);
  }

  function buildSymbolTutorialQueue() {
    const picks = [1, 4, 7];
    return picks.map((value) => ({ value, symbol: getDisplaySymbol(value) }));
  }

  function openSymbolTutorial() {
    state.symbolTutorialSnoozed = false;
    saveSymbolTutorialSnoozePreference();
    state.symbolTutorialActive = true;
    state.symbolTutorialQueue = buildSymbolTutorialQueue();
    state.symbolTutorialStep = 0;
    renderSymbolTutorial();
  }

  function closeSymbolTutorial(markDone = false) {
    state.symbolTutorialActive = false;
    state.symbolTutorialQueue = [];
    state.symbolTutorialStep = 0;
    if (markDone) {
      state.symbolTutorialDone = true;
      saveSymbolTutorialPreference();
    }
    renderSymbolTutorial();
  }

  function maybeStartSymbolTutorial() {
    if (state.symbolPlayEnabled && !state.symbolTutorialDone && !state.symbolTutorialSnoozed && !state.symbolTutorialActive) {
      openSymbolTutorial();
    }
  }

  function answerSymbolTutorial(value) {
    const current = state.symbolTutorialQueue[state.symbolTutorialStep];
    if (!current) {
      return;
    }
    if (value !== current.value) {
      setMessage(`Try again — ${current.symbol} maps to another digit.`);
      playSound("error");
      return;
    }
    playSound("place");
    state.symbolTutorialStep += 1;
    if (state.symbolTutorialStep >= state.symbolTutorialQueue.length) {
      closeSymbolTutorial(true);
      setMessage("Symbol lesson complete. Type digits 1–9 as usual and let the symbols settle in naturally.");
      return;
    }
    renderSymbolTutorial();
    setMessage("Nice. Keep going — one more mapping to lock in.");
  }

  function renderSymbolTutorial() {
    const show = state.symbolPlayEnabled && state.symbolTutorialActive && !state.symbolTutorialDone;
    elements.symbolTutorialCard.hidden = !show;
    if (!show) {
      elements.symbolTutorialOptions.innerHTML = "";
      return;
    }
    const current = state.symbolTutorialQueue[state.symbolTutorialStep];
    elements.symbolTutorialTitle.textContent = `${getActiveSymbolTheme().label} lesson`;
    elements.symbolTutorialText.textContent = "Tap the digit or press the key that matches this symbol. The full puzzle still uses the normal numeric keyboard.";
    elements.symbolTutorialSymbol.textContent = current.symbol;
    elements.symbolTutorialProgress.textContent = `${state.symbolTutorialStep + 1} / ${state.symbolTutorialQueue.length}`;
    elements.symbolTutorialOptions.innerHTML = [current.value, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => value !== current.value).slice(0, 2)]
      .sort((a, b) => a - b)
      .map((value) => `<button class="action-button" type="button" data-symbol-tutorial-value="${value}">${value}</button>`)
      .join("");
    elements.symbolTutorialOptions.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => answerSymbolTutorial(Number(button.dataset.symbolTutorialValue)));
    });
  }

  function renderModeDescription() {
    const symbolTag = state.symbolPlayEnabled ? ` Symbol Play: ${getActiveSymbolTheme().label}.` : "";
    elements.modeDescription.textContent = `${MODES[state.mode].label} · ${MODES[state.mode].description} Best for a ${getDifficultyLabel(state.difficulty).toLowerCase()} run when you want ${state.mode === "daily" ? "a shared ritual" : state.mode === "sprint" ? "a faster tempo" : "a balanced solve"}.${symbolTag}`;
  }

  function renderHeroStatsSummary() {
    const bestLabel = elements.bestTimeOverview.textContent || "—";
    const streakLabel = elements.streakOverview.textContent || "0 days";
    const returningPlayer = state.stats.overall.started > 0 || state.stats.overall.solved > 0;

    document.body.classList.toggle("is-returning-player", returningPlayer);
    elements.heroStatsSummary.hidden = !returningPlayer;
    elements.heroStatsSummary.textContent = `${getDifficultyLabel(state.difficulty)} · ${MODES[state.mode].label} · Best ${bestLabel} · ${streakLabel} streak`;
  }

  function renderPuzzleInsights() {
    if (!state.puzzleMeta) {
      elements.puzzleInsights.innerHTML = "";
      return;
    }

    const chips = [
      `Target ${state.puzzleMeta.estimatedMinutes} min`,
      `${state.puzzleMeta.clueCount} clues`,
      `Logic ${state.puzzleMeta.difficultyScore}/10`,
      buildTechniqueLabel(state.puzzleMeta)
    ];

    elements.puzzleInsights.innerHTML = chips.map((chip) => `<span class="chip">${chip}</span>`).join("");
  }

  function refreshSymbolUi() {
    elements.symbolPlayToggle.checked = state.symbolPlayEnabled;
    elements.symbolThemeSelect.value = state.symbolTheme;
    elements.legendModeSelect.value = state.legendMode;
    renderSymbolLegend();
    renderSymbolTutorial();
    renderBoard();
    renderNumberPad();
    renderSelectionSummary();
  }

  function getSessionRitual() {
    const dailySpecial = getDailySpecial(state.difficulty);
    if (state.mode !== "daily" && dailySpecial && !state.dailyResults[`${getCurrentDateKey()}-${state.difficulty}`]) {
      return {
        title: `${dailySpecial.title} is waiting`,
        text: `Today’s shared board is dressed in ${capitalize(dailySpecial.symbolTheme)} symbols with a ${dailySpecial.legendMode} legend for a ${dailySpecial.focus.toLowerCase()} run.`,
        label: "Play special daily ↗",
        run: () => newGame(state.difficulty, "daily")
      };
    }

    const legendUpgrade = state.symbolPlayEnabled ? getNextLegendModeUpgrade() : null;
    if (legendUpgrade) {
      return {
        title: legendUpgrade === "faded" ? "Your legend can soften now" : "Your legend can disappear now",
        text: legendUpgrade === "faded"
          ? "You have enough visible-legend symbol clears to move into a lighter memory challenge."
          : "You have enough faded-legend clears to try a pure memory symbol run with the legend hidden.",
        label: legendUpgrade === "faded" ? "Try faded legend ↗" : "Try hidden legend ↗",
        run: () => {
          state.legendMode = legendUpgrade;
          saveLegendModePreference();
          refreshSymbolUi();
          syncUrl();
          saveResumeState();
          newGame(state.difficulty, state.mode);
        }
      };
    }

    const weeklyEntry = getWeeklyPathEntry();
    const nextWeeklyStep = getNextWeeklyStep(weeklyEntry);
    if (nextWeeklyStep && Object.keys(weeklyEntry.result.completedSteps).length > 0) {
      return {
        title: `${weeklyEntry.path.title} is still in motion`,
        text: `Your next weekly step is ${getDifficultyLabel(nextWeeklyStep.difficulty)} ${MODES[nextWeeklyStep.mode].label}. Keep the arc going before the rhythm breaks.`,
        label: `Play ${nextWeeklyStep.label.toLowerCase()} ↗`,
        run: () => playWeeklyChallengeStep(nextWeeklyStep)
      };
    }

    if (nextWeeklyStep && state.stats.overall.solved >= 2) {
      return {
        title: `${weeklyEntry.path.title} is ready`,
        text: weeklyEntry.path.text,
        label: "Start weekly path ↗",
        run: () => playWeeklyChallengeStep(nextWeeklyStep)
      };
    }

    const todayKey = `${getCurrentDateKey()}-${state.difficulty}`;
    if (state.mode !== "daily" && !state.dailyResults[todayKey]) {
      return {
        title: "Today’s shared board is waiting",
        text: `Take your ${getDifficultyLabel(state.difficulty)} rhythm into Daily mode and stack your streak with one shared puzzle.`,
        label: "Play daily ↗",
        run: () => newGame(state.difficulty, "daily")
      };
    }

    if (isReadyForAdvancedPush()) {
      return {
        title: "Bridge the gap with Advanced",
        text: "Advanced sits between Medium and Hard: more satisfying breakthroughs, more candidate work, and no sudden difficulty cliff.",
        label: "Try Advanced ✦",
        run: () => newGame("advanced", "classic")
      };
    }

    if (prefersGuidedPractice()) {
      return {
        title: "Stay close to the pattern",
        text: "You are still using hints often here. Another Classic board at this level will turn named techniques into instinct faster than jumping too soon.",
        label: `Replay ${getDifficultyLabel(state.difficulty)} ↗`,
        run: () => newGame(state.difficulty, "classic")
      };
    }

    if (state.stats.overall.perfectRuns === 0 && state.stats.overall.solved >= 3) {
      return {
        title: "Chase a pure solve",
        text: "Try a calmer Zen run, keep hints untouched, and aim for a zero-mistake finish to unlock a cleaner medal.",
        label: "Play pure ✦",
        run: () => newGame(state.difficulty, "zen")
      };
    }

    const noveltyDifficulty = state.stats.difficulties.advanced.solved ? "hard" : "advanced";
    return {
      title: "Featured technique journey",
      text: `This board leans toward ${buildTechniqueLabel(state.puzzleMeta).toLowerCase()}. Use Hint ✦ once if you want a named logic nudge instead of a blunt reveal.`,
      label: `Play ${getDifficultyLabel(noveltyDifficulty)} ↗`,
      run: () => newGame(noveltyDifficulty, "classic")
    };
  }

  function renderSessionRitual() {
    const ritual = getSessionRitual();
    elements.sessionRitualTitle.textContent = ritual.title;
    elements.sessionRitualText.textContent = ritual.text;
    elements.sessionRitualButton.textContent = ritual.label;
    elements.sessionRitualButton.onclick = ritual.run;
  }

  function getFeaturedChallenge() {
    const weeklyEntry = getWeeklyPathEntry();
    const nextWeeklyStep = getNextWeeklyStep(weeklyEntry);
    const dailySpecial = getDailySpecial(state.difficulty);
    const featuredOptions = [
      {
        title: "Advanced bridge ritual",
        text: "Move into the bridge tier for a longer solve that still rewards clean scanning before deeper chains.",
        tag: "Advanced",
        focus: "Bridge tier",
        label: "Play Advanced ↗",
        run: () => newGame("advanced", "classic")
      },
      {
        title: "Shared daily rhythm",
        text: "Take today’s deterministic board for a communal challenge and use it as your anchor solve.",
        tag: "Daily",
        focus: "Shared ritual",
        label: "Play Daily ↗",
        run: () => newGame(state.difficulty, "daily")
      },
      ...(dailySpecial ? [{
        title: dailySpecial.title,
        text: `Today’s daily board uses ${capitalize(dailySpecial.symbolTheme)} symbols with a ${dailySpecial.legendMode} legend for a ${dailySpecial.focus.toLowerCase()}.`,
        tag: "Symbol Daily",
        focus: dailySpecial.focus,
        label: "Play Symbol Daily ↗",
        run: () => newGame(state.difficulty, "daily")
      }] : []),
      {
        title: weeklyEntry.path.title,
        text: nextWeeklyStep
          ? `This week’s path is part-finished. Your next step is ${getDifficultyLabel(nextWeeklyStep.difficulty)} ${MODES[nextWeeklyStep.mode].label}.`
          : `${weeklyEntry.path.title} is complete. Replay it for a cleaner medal or a faster line through the same arc.`,
        tag: "Weekly",
        focus: weeklyEntry.path.focus,
        label: nextWeeklyStep ? `Play ${nextWeeklyStep.label.toLowerCase()} ↗` : "Replay weekly path ↗",
        run: () => playWeeklyChallengeStep(nextWeeklyStep || weeklyEntry.path.steps[0])
      },
      {
        title: "Technique spotlight",
        text: `Today's featured pattern leans toward ${buildTechniqueLabel(state.puzzleMeta).toLowerCase()}. Try to spot it before asking for a hint.`,
        tag: "Technique",
        focus: buildTechniqueLabel(state.puzzleMeta),
        label: `Play ${getDifficultyLabel(state.difficulty)} ↗`,
        run: () => newGame(state.difficulty, "classic")
      },
      {
        title: "Pure-focus challenge",
        text: "Drop into No check when you want the classic grid to feel a little riskier without changing the underlying rules.",
        tag: "No check",
        focus: "Trust the grid",
        label: "Play No check ↗",
        run: () => newGame(state.difficulty, "nocheck")
      },
      {
        title: "Tempo switch",
        text: "Use Sprint for a shorter, sharper session when you want momentum instead of ceremony.",
        tag: "Sprint",
        focus: "Fast tempo",
        label: "Play Sprint ↗",
        run: () => newGame(state.difficulty, "sprint")
      }
    ];

    const seed = hashText(`${getCurrentDateKey()}-${state.stats.overall.solved}-${state.difficulty}-${hasWeeklyStepWaiting()}`);
    return featuredOptions[seed % featuredOptions.length];
  }

  function renderFeaturedChallenge() {
    const featured = getFeaturedChallenge();
    elements.featuredChallengeTitle.textContent = featured.title;
    elements.featuredChallengeText.textContent = featured.text;
    elements.featuredChallengeTag.textContent = featured.tag;
    elements.featuredChallengeFocus.textContent = featured.focus;
    elements.featuredChallengeButton.textContent = featured.label;
    elements.featuredChallengeButton.onclick = featured.run;
  }

  function renderWeeklyChallenge() {
    const entry = getWeeklyPathEntry();
    const completedCount = Object.keys(entry.result.completedSteps).length;
    const nextStep = getNextWeeklyStep(entry);

    elements.weeklyChallengeTitle.textContent = entry.path.title;
    elements.weeklyChallengeText.textContent = entry.path.text;
    elements.weeklyChallengeTag.textContent = `${completedCount}/${entry.path.steps.length} steps`;
    elements.weeklyChallengeFocus.textContent = entry.path.focus;
    elements.weeklyChallengeSteps.innerHTML = entry.path.steps.map((step) => {
      const result = entry.result.completedSteps[step.id];
      const symbolBits = step.symbolTheme ? ` · ${capitalize(step.symbolTheme)} · ${step.legendMode}` : "";
      return `<div class="achievement-item"><strong>${step.label} · ${getDifficultyLabel(step.difficulty)} · ${MODES[step.mode].label}${symbolBits}</strong><span>${result ? `Complete in ${SudokuCore.formatTime(result.time)} with ${result.mistakes} mistake${result.mistakes === 1 ? "" : "s"}.` : step.focus}</span></div>`;
    }).join("");

    if (nextStep) {
      elements.weeklyChallengeButton.textContent = completedCount === 0 ? "Start weekly path ↗" : `Play ${nextStep.label.toLowerCase()} ↗`;
      elements.weeklyChallengeButton.onclick = () => playWeeklyChallengeStep(nextStep);
    } else {
      elements.weeklyChallengeButton.textContent = "Weekly path complete ✨";
      elements.weeklyChallengeButton.onclick = () => playWeeklyChallengeStep(entry.path.steps[0]);
    }
  }

  function renderTechniqueJournal() {
    const techniques = state.stats.techniques;
    const advancedNoHint = state.stats.difficulties.advanced.noHintSolves;
    const pointingHints = techniques.pointingHints + techniques.lockedCandidatesHints;
    const entries = [
      {
        title: "Naked singles",
        text: techniques.nakedSingleHints > 0
          ? `Named by Hint ✦ ${techniques.nakedSingleHints} time${techniques.nakedSingleHints === 1 ? "" : "s"}.`
          : "Still waiting for your first clearly forced cell."
      },
      {
        title: "Hidden singles",
        text: techniques.hiddenSingleHints > 0
          ? `Spotted through rows, columns, or boxes ${techniques.hiddenSingleHints} time${techniques.hiddenSingleHints === 1 ? "" : "s"}.`
          : "You have not surfaced a hidden single hint yet."
      },
      {
        title: "Locked candidates",
        text: pointingHints > 0
          ? `Pointing pairs or triples named ${pointingHints} time${pointingHints === 1 ? "" : "s"}.`
          : "No pointing pair or triple has shown up in your journal yet."
      },
      {
        title: "Claiming pairs",
        text: techniques.claimingHints > 0
          ? `Claiming eliminations named ${techniques.claimingHints} time${techniques.claimingHints === 1 ? "" : "s"}.`
          : "No claiming pair has appeared in your journal yet."
      },
      {
        title: "Naked pairs",
        text: techniques.nakedPairsHints > 0
          ? `Candidate-pair locks named ${techniques.nakedPairsHints} time${techniques.nakedPairsHints === 1 ? "" : "s"}.`
          : "No naked pair has been surfaced by Hint ✦ yet."
      },
      {
        title: "Advanced clears",
        text: state.stats.difficulties.advanced.solved > 0
          ? `${state.stats.difficulties.advanced.solved} Advanced clear${state.stats.difficulties.advanced.solved === 1 ? "" : "s"}, including ${advancedNoHint} without hints.`
          : "No Advanced clears yet. Use the bridge tier when Medium starts feeling too light."
      },
      {
        title: "Symbol ladder",
        text: techniques.symbolClears > 0
          ? `${techniques.symbolClears} Symbol Play clear${techniques.symbolClears === 1 ? "" : "s"}: ${techniques.symbolVisibleClears} visible, ${techniques.symbolFadedClears} faded, ${techniques.symbolHiddenClears} hidden.`
          : "No Symbol Play clears yet. Start with a visible legend, then climb toward hidden-memory runs."
      }
    ];

    elements.techniqueJournalList.innerHTML = entries
      .map((entry) => `<div class="achievement-item"><strong>${entry.title}</strong><span>${entry.text}</span></div>`)
      .join("");
  }

  function renderSymbolMastery() {
    const techniques = state.stats.techniques;
    const entries = [
      {
        title: "Petals mastery",
        text: techniques.petalsClears > 0
          ? `${techniques.petalsClears} Petals clear${techniques.petalsClears === 1 ? "" : "s"}.`
          : "No Petals clears yet."
      },
      {
        title: "Moon mastery",
        text: techniques.moonClears > 0
          ? `${techniques.moonClears} Moon clear${techniques.moonClears === 1 ? "" : "s"}.`
          : "No Moon clears yet."
      },
      {
        title: "Pure vs assisted",
        text: techniques.symbolClears > 0
          ? `${techniques.symbolPureClears} pure Symbol Play clear${techniques.symbolPureClears === 1 ? "" : "s"}, ${techniques.symbolAssistedClears} assisted.`
          : "No Symbol Play results logged yet."
      },
      {
        title: "Legend mastery",
        text: techniques.symbolClears > 0
          ? `${techniques.symbolVisibleClears} visible, ${techniques.symbolFadedClears} faded, ${techniques.symbolHiddenClears} hidden clears.`
          : "Climb from visible to faded to hidden legend to build memory confidence."
      }
    ];

    elements.symbolMasteryList.innerHTML = entries
      .map((entry) => `<div class="achievement-item"><strong>${entry.title}</strong><span>${entry.text}</span></div>`)
      .join("");
  }

  function renderDailyResult() {
    if (state.mode !== "daily") {
      elements.dailyResultCard.hidden = true;
      elements.dailyResultList.innerHTML = "";
      return;
    }

    const key = `${getCurrentDateKey()}-${state.difficulty}`;
    const result = state.dailyResults[key];
    elements.dailyResultCard.hidden = !result;
    if (!result) {
      elements.dailyResultList.innerHTML = "";
      elements.dailyShareCard.innerHTML = "";
      elements.dailyResultShareText.textContent = "";
      return;
    }

    elements.dailyResultList.innerHTML = [
      statRow("Difficulty", getDifficultyLabel(state.difficulty)),
      ...(result.dailySpecialTitle ? [statRow("Special", result.dailySpecialTitle)] : []),
      statRow("Time", SudokuCore.formatTime(result.time)),
      statRow("Mistakes", String(result.mistakes)),
      statRow("Medal", result.medal || "✨ Steady finish"),
      statRow("Technique", result.technique || buildTechniqueLabel(state.puzzleMeta)),
      statRow("Solved on", result.date),
      statRow("Daily streak", `${state.stats.overall.streak} day${state.stats.overall.streak === 1 ? "" : "s"}`)
    ].join("");
    renderDailyShareCard(result);
    elements.dailyResultShareText.textContent = buildDailyShareText(result);
  }

  function buildDailyShareText(result) {
    const medal = result.medal || "✨ steady finish";
    const technique = result.technique || "classic logic";
    const symbolTag = result.symbolTheme ? ` · Symbol Play ${capitalize(result.symbolTheme)}` : "";
    const assistedTag = result.assisted ? " · Assisted run" : "";
    const specialTag = result.dailySpecialTitle ? ` · ${result.dailySpecialTitle}` : "";
    return `Sudoku Sakura daily ${getDifficultyLabel(result.difficulty)}${specialTag}${symbolTag}${assistedTag} · ${SudokuCore.formatTime(result.time)} · ${result.mistakes} mistake${result.mistakes === 1 ? "" : "s"} · ${medal} · ${technique} · ${state.stats.overall.streak} day streak. Come back tomorrow 🌸`;
  }

  function buildShareMetaChips(parts) {
    return parts.map((part) => `<span class="chip">${part}</span>`).join("");
  }

  function renderDailyShareCard(result) {
    elements.dailyShareCard.innerHTML = `
      <p class="share-card-kicker">Sudoku Sakura daily</p>
      <h3>${getDifficultyLabel(result.difficulty)} · Daily${result.dailySpecialTitle ? ` · ${result.dailySpecialTitle}` : ""}${result.symbolTheme ? ` · ${capitalize(result.symbolTheme)}` : ""}${result.assisted ? ` · Assisted` : ""}</h3>
      <p class="board-caption">${result.medal || "✨ Steady finish"}</p>
      <div class="featured-challenge-meta">
        ${buildShareMetaChips([
          SudokuCore.formatTime(result.time),
          `${result.mistakes} mistake${result.mistakes === 1 ? "" : "s"}`,
          result.technique || "Classic logic",
          `${state.stats.overall.streak} day streak`
        ])}
      </div>
    `;
  }

  function renderVictoryShareCard(medalLabel) {
    elements.victoryShareTitle.textContent = `${getDifficultyLabel(state.difficulty)} · ${MODES[state.mode].label}${state.symbolPlayEnabled ? ` · ${getActiveSymbolTheme().label}` : ""}`;
    elements.victoryShareMedal.textContent = medalLabel;
    elements.victoryShareMeta.innerHTML = buildShareMetaChips([
      SudokuCore.formatTime(state.secondsElapsed),
      `${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}`,
      buildTechniqueLabel(state.puzzleMeta),
      getRankInfo().currentRank.name
    ]);
  }

  function shareText(text, successMessage) {
    return (async () => {
      try {
        if (navigator.share) {
          await navigator.share({ text, url: window.location.href });
          setMessage(successMessage);
          return true;
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(`${text} ${window.location.href}`);
          setMessage(`${successMessage.replace("shared", "copied to clipboard")}`);
          return true;
        }
      } catch (error) {
        setMessage("Sharing was cancelled.");
        return true;
      }

      setMessage("Sharing is unavailable in this browser.");
      return false;
    })();
  }

  function buildVictoryShareText() {
    const medalLabel = getSolveMedal();
    const weeklyEntry = getWeeklyPathEntry();
    const completedWeeklySteps = Object.keys(weeklyEntry.result.completedSteps).length;
    const weeklyTag = state.currentWeeklyStepId ? ` · ${weeklyEntry.path.title} ${completedWeeklySteps}/${weeklyEntry.path.steps.length}` : "";
    const symbolTag = state.symbolPlayEnabled ? ` · Symbol Play ${getActiveSymbolTheme().label}` : "";
    const assistedTag = state.assistedRun ? " · Assisted run" : "";
    return `Sudoku Sakura ${getDifficultyLabel(state.difficulty)} ${MODES[state.mode].label}${symbolTag}${assistedTag} · ${SudokuCore.formatTime(state.secondsElapsed)} · ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"} · ${medalLabel} · ${buildTechniqueLabel(state.puzzleMeta)} · ${getRankInfo().currentRank.name}${weeklyTag}`;
  }

  async function shareDailyResult() {
    if (state.mode !== "daily") {
      setMessage("Open Daily puzzle mode to share today’s result.");
      return;
    }

    const key = `${getCurrentDateKey()}-${state.difficulty}`;
    const result = state.dailyResults[key];
    if (!result) {
      setMessage("Finish today’s daily puzzle first to share your result.");
      return;
    }

    await shareText(buildDailyShareText(result), "Daily result shared.");
  }

  async function shareVictoryResult() {
    if (!state.completed) {
      setMessage("Finish a board first to share the result.");
      return;
    }
    await shareText(buildVictoryShareText(), "Victory result shared.");
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
    clearResumeState();
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
    const pureRun = !state.assistedRun;
    const noHintSolve = pureRun && state.hintsUsed === 0;
    const perfectRun = pureRun && state.hintsUsed === 0 && state.checksUsed === 0 && state.mistakes === 0;

    [difficultyBucket, modeBucket, overallBucket].forEach((bucket) => {
      bucket.solved += 1;
      bucket.totalTime += state.secondsElapsed;
      bucket.mistakes += state.mistakes;
      bucket.hintsUsed += state.hintsUsed;
      bucket.checksUsed += state.checksUsed;
      if (!bucket.bestTime || state.secondsElapsed < bucket.bestTime) {
        bucket.bestTime = state.secondsElapsed;
      }
      if (noHintSolve) {
        bucket.noHintSolves += 1;
      }
      if (perfectRun) {
        bucket.perfectRuns += 1;
      }
    });

    if (state.difficulty === "advanced") {
      state.stats.techniques.advancedClears += 1;
      if (noHintSolve) {
        state.stats.techniques.advancedNoHintClears += 1;
      }
    }

    if (state.symbolPlayEnabled) {
      state.stats.techniques.symbolClears += 1;
      if (state.assistedRun) {
        state.stats.techniques.symbolAssistedClears += 1;
      } else {
        state.stats.techniques.symbolPureClears += 1;
      }
      if (state.symbolTheme === "petals") {
        state.stats.techniques.petalsClears += 1;
      }
      if (state.symbolTheme === "moon") {
        state.stats.techniques.moonClears += 1;
      }
      if (state.legendMode === "visible") {
        state.stats.techniques.symbolVisibleClears += 1;
      } else if (state.legendMode === "faded") {
        state.stats.techniques.symbolFadedClears += 1;
      } else if (state.legendMode === "hidden") {
        state.stats.techniques.symbolHiddenClears += 1;
      }
    }

    updateStreak();
    state.activeSessionRecorded = false;
    const medalLabel = getSolveMedal();
    state.sessionHistory.unshift({
      date: getCurrentDateKey(),
      timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      difficulty: state.difficulty,
      mode: state.mode,
      time: state.secondsElapsed,
      mistakes: state.mistakes,
      medal: medalLabel
    });
    state.sessionHistory = state.sessionHistory.slice(0, 12);
    saveSessionHistory();

    if (state.currentWeeklyStepId) {
      const entry = getWeeklyPathEntry();
      entry.result.completedSteps[state.currentWeeklyStepId] = {
        time: state.secondsElapsed,
        mistakes: state.mistakes,
        date: getCurrentDateKey(),
        difficulty: state.difficulty,
        mode: state.mode
      };
      state.weeklyResults[entry.weekKey] = entry.result;
      saveWeeklyResults();
    }

    [difficultyBucket, modeBucket, overallBucket].forEach((bucket) => {
      bucket.bloomTokensUsed += BLOOM_TOKENS_PER_RUN - state.bloomTokensRemaining;
      if (state.assistedRun) {
        bucket.assistedSolves += 1;
      }
    });

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
      applyDailySpecialPresentation(getDailySpecial(difficulty));
      const puzzle = getDailyPuzzle(difficulty);
      state.lastPuzzleKey = `${difficulty}:${mode}:${puzzle.id}`;
      return puzzle;
    }
    clearDailySpecialPresentation();
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
      saveResumeState();
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
      hasGameplayParams: ["difficulty", "mode", "mistakes", "notes"].some((key) => params.has(key)),
      hasDisplayParams: ["symbols", "symbolTheme", "legend"].some((key) => params.has(key)),
      difficulty: DIFFICULTY_ORDER.includes(difficulty) ? difficulty : "easy",
      mode: Object.prototype.hasOwnProperty.call(MODES, mode) ? mode : "classic",
      showMistakes: params.has("mistakes") ? params.get("mistakes") !== "off" : undefined,
      notesMode: params.has("notes") ? params.get("notes") === "on" : undefined,
      symbolPlayEnabled: params.has("symbols") ? params.get("symbols") === "on" : undefined,
      symbolTheme: Object.prototype.hasOwnProperty.call(SYMBOL_THEMES, params.get("symbolTheme")) ? params.get("symbolTheme") : undefined,
      legendMode: LEGEND_MODES.includes(params.get("legend")) ? params.get("legend") : undefined
    };
  }

  function syncUrl() {
    const params = new URLSearchParams(window.location.search);
    params.set("difficulty", state.difficulty);
    params.set("mode", state.mode);
    params.set("mistakes", state.showMistakes ? "on" : "off");
    params.set("notes", state.notesMode ? "on" : "off");
    params.set("symbols", state.symbolPlayEnabled ? "on" : "off");
    params.set("symbolTheme", state.symbolTheme);
    params.set("legend", state.legendMode);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }

  function updateOverview() {
    const modeBucket = state.stats.modes[state.mode];
    const rankInfo = getRankInfo();
    elements.currentDifficultyLabel.textContent = getDifficultyLabel(state.difficulty);
    elements.currentModeLabel.textContent = MODES[state.mode].label;
    elements.statusModeLabel.textContent = MODES[state.mode].label;
    elements.bestTimeOverview.textContent = modeBucket.bestTime ? SudokuCore.formatTime(modeBucket.bestTime) : "—";
    elements.streakOverview.textContent = `${state.stats.overall.streak} day${state.stats.overall.streak === 1 ? "" : "s"}`;
    elements.rankOverview.textContent = rankInfo.currentRank.name;
    renderHeroStatsSummary();
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
    if (state.stats.difficulties.advanced.solved >= 2) achievements.push({ title: "🌉 Bridge Walker", text: "Use Advanced difficulty as your smooth path between Medium and Hard." });
    if (state.stats.difficulties.hard.solved >= 3 || state.stats.difficulties.expert.solved >= 1) achievements.push({ title: "⚔️ Challenge Spirit", text: "Win on hard or expert and prove your logic under pressure." });
    if (state.stats.modes.daily.solved >= 2) achievements.push({ title: "☀️ Daily Devotee", text: "Return for the daily puzzle more than once." });
    if (overall.abandoned === 0 && overall.solved >= 3) achievements.push({ title: "🪷 Clean Focus", text: "Finish multiple boards without recording an abandon." });
    if (overall.noHintSolves >= 3) achievements.push({ title: "🪷 Trust the Grid", text: "Complete three boards without using Hint ✦." });
    if (overall.perfectRuns >= 1) achievements.push({ title: "🌸 Pure Solve", text: "Finish a board with no hints, no checks, and no mistakes." });
    if (state.stats.techniques.symbolClears >= 1) achievements.push({ title: "🔣 Symbol starter", text: "Complete your first Symbol Play board with the legend guiding the mapping." });
    if (state.stats.techniques.symbolVisibleClears >= 2) achievements.push({ title: "🌫 Fading recall", text: "Earn the move from a visible legend into a faded Symbol Play memory run." });
    if (state.stats.techniques.symbolHiddenClears >= 1) achievements.push({ title: "🧠 Memory bloom", text: "Finish a hidden-legend Symbol Play board and trust the mapping from memory." });

    elements.achievementList.innerHTML = achievements.length
      ? achievements.map((entry) => `<div class="achievement-item"><strong>${entry.title}</strong><span>${entry.text}</span></div>`).join("")
      : `<div class="achievement-item"><strong>🌱 Budding player</strong><span>Solve a few boards and your local achievements will blossom here.</span></div>`;
  }

  function renderLearningSurfaces() {
    renderAchievements();
    renderTechniqueJournal();
    renderSymbolMastery();
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
      statRow(`Best ${getDifficultyLabel(state.difficulty)}`, difficultyBucket.bestTime ? SudokuCore.formatTime(difficultyBucket.bestTime) : "No record yet"),
      statRow(`Avg ${MODES[state.mode].label}`, formatAverage(modeBucket)),
      statRow("Solved total", `${overallBucket.solved} completed`),
      statRow("Current mode", `${modeBucket.solved} solved`)
    ].join("");

    elements.analyticsList.innerHTML = [
      statRow("Starts", `${overallBucket.started} sessions`),
      statRow("Abandoned", `${overallBucket.abandoned} exits`),
      statRow("Perfect runs", `${overallBucket.perfectRuns} medals`),
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
    state.hintsUsed = 0;
    state.checksUsed = 0;
    state.secondsElapsed = 0;
    state.completed = false;
    state.paused = false;
    state.pauseReason = null;
    clearBloomPeek();
    state.bloomTokensRemaining = state.symbolPlayEnabled ? BLOOM_TOKENS_PER_RUN : 0;
    state.assistedRun = false;
    state.onboardingPeekOpen = false;
    state.currentWeeklyStepId = options.weeklyStepId || null;
    clearHint();
    elements.victoryOverlay.hidden = true;

    elements.timer.textContent = "00:00";
    elements.mistakeCount.textContent = "0";
    elements.challengeLabel.textContent = `${getDifficultyLabel(state.difficulty)} · ${MODES[state.mode].label} · ${puzzle.label}`;
    setMessage(MODES[state.mode].description);
    updatePauseUi();
    recordStart();
    startTimer();
    updateOverview();
    renderStats();
    renderLearningSurfaces();
    renderRankPanel();
    renderModeDescription();
    renderSymbolLegend();
    renderBloomTokens();
    renderPuzzleInsights();
    renderSessionRitual();
    renderFeaturedChallenge();
    renderWeeklyChallenge();
    renderSessionHistory();
    renderDailyResult();
    syncUrl();
    saveResumeState();
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
    }

    refreshMistakeToggleUi();
    refreshNotesUi();

    resetStateForPuzzle(options.forcedPuzzle || getSelectedPuzzle(difficulty, mode), { countAbandon: options.countAbandon, weeklyStepId: options.weeklyStepId });
    renderBoard();
    renderNumberPad();
    renderLearningSurfaces();
    saveResumeState();
  }

  function refreshMistakeToggleUi() {
    const locked = state.mode === "nomistakes";
    elements.mistakeToggle.checked = locked ? true : state.showMistakes;
    elements.mistakeToggle.disabled = locked;
    elements.mistakeToggle.closest("label")?.classList.toggle("is-disabled", locked);
    elements.mistakeToggleLabel.textContent = locked ? "Wrong moves rejected instantly" : "Show wrong guesses";
    refreshOptionsSummary();
  }

  function refreshCheckUi() {
    const locked = state.mode === "nocheck";
    elements.checkButton.disabled = locked;
    elements.checkButton.classList.toggle('subtle', locked);
  }

  function refreshNotesUi() {
    const locked = state.mode === "nonotes";
    elements.notesToggle.checked = locked ? false : state.notesMode;
    elements.notesToggle.disabled = locked;
    elements.notesToggle.closest("label")?.classList.toggle("is-disabled", locked);
    elements.notesStatusChip.hidden = !state.notesMode;
    elements.valueModeButton.classList.toggle('is-active', locked ? true : !state.notesMode);
    elements.noteModeButton.classList.toggle('is-active', !locked && state.notesMode);
    elements.noteModeButton.disabled = locked;
    elements.noteModeButton.classList.toggle('is-disabled', locked);
    elements.valueModeButton.setAttribute('aria-pressed', String(locked ? true : !state.notesMode));
    elements.noteModeButton.setAttribute('aria-pressed', String(!locked && state.notesMode));
    elements.entryModeHint.textContent = locked
      ? 'Notes are disabled in this mode.'
      : state.notesMode
      ? 'Tap to add or remove notes. Shortcut: X.'
      : 'Tap to place final values.';
    refreshOptionsSummary();
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function getActiveSymbolTheme() {
    return SYMBOL_THEMES[state.symbolTheme] || SYMBOL_THEMES.petals;
  }

  function getDisplaySymbol(value) {
    if (!state.symbolPlayEnabled || !Number.isInteger(value) || value < 1 || value > 9) {
      return String(value ?? "");
    }
    return getActiveSymbolTheme().symbols[value - 1];
  }

  function shouldShowDigitHint() {
    return state.symbolPlayEnabled && (state.legendMode !== "hidden" || state.bloomPeekActive);
  }

  function formatDisplayValue(value) {
    if (!Number.isInteger(value) || value < 1 || value > 9) {
      return "";
    }
    return state.symbolPlayEnabled ? getDisplaySymbol(value) : String(value);
  }

  function formatDisplayValueLabel(value) {
    if (!Number.isInteger(value) || value < 1 || value > 9) {
      return "";
    }
    return state.symbolPlayEnabled ? `${getDisplaySymbol(value)} (${value})` : String(value);
  }

  function buildCellValueMarkup(value) {
    if (!state.symbolPlayEnabled) {
      return String(value);
    }
    return `<span class="cell-symbol-wrap"><span class="cell-symbol">${getDisplaySymbol(value)}</span>${shouldShowDigitHint() ? `<span class="cell-digit-hint">${value}</span>` : ""}</span>`;
  }

  function renderSymbolLegend() {
    const active = state.symbolPlayEnabled;
    elements.symbolLegendCard.hidden = !active || (state.legendMode === "hidden" && !state.bloomPeekActive);
    elements.symbolPlayToggle.checked = state.symbolPlayEnabled;
    elements.symbolThemeSelect.value = state.symbolTheme;
    elements.legendModeSelect.value = state.legendMode;
    elements.symbolThemeSelect.disabled = !active;
    elements.legendModeSelect.disabled = !active;
    if (!active || (state.legendMode === "hidden" && !state.bloomPeekActive)) {
      return;
    }
    elements.symbolLegendCard.classList.toggle("is-faded", state.legendMode === "faded" && !state.bloomPeekActive);
    elements.symbolLegendTitle.textContent = `${getActiveSymbolTheme().label} mapping`;
    const recommended = getRecommendedLegendMode();
    const currentLabel = state.legendMode === "visible" ? "visible" : state.legendMode === "faded" ? "faded" : "hidden";
    elements.symbolLegendText.textContent = recommended === state.legendMode
      ? `Type digits 1–9 as usual. The board shows symbols, the logic stays classic, and your current memory tier is ${currentLabel}.`
      : `Type digits 1–9 as usual. The board shows symbols, the logic stays classic, your current memory tier is ${currentLabel}, and the guided next tier is ${recommended}.`;
    elements.symbolLegendGrid.innerHTML = getActiveSymbolTheme().symbols
      .map((symbol, index) => `<div class="legend-chip"><span class="legend-digit">${index + 1}</span><span class="legend-symbol">${symbol}</span></div>`)
      .join("");
  }

  function clearBloomPeek() {
    if (state.bloomPeekTimeoutId) {
      window.clearTimeout(state.bloomPeekTimeoutId);
      state.bloomPeekTimeoutId = null;
    }
    state.bloomPeekActive = false;
  }

  function getSolveMedal() {
    if (state.assistedRun) {
      return "🌼 Bloom-assisted";
    }
    if (state.hintsUsed === 0 && state.checksUsed === 0 && state.mistakes === 0) {
      return "🌸 Pure solve";
    }
    if (state.hintsUsed === 0) {
      return "🪷 Trust the grid";
    }
    return "✨ Steady finish";
  }

  function renderBloomTokens() {
    const active = state.symbolPlayEnabled;
    elements.bloomTokenCard.hidden = !active;
    if (!active) {
      return;
    }
    const used = BLOOM_TOKENS_PER_RUN - state.bloomTokensRemaining;
    elements.bloomTokenTitle.textContent = `${state.bloomTokensRemaining} assist${state.bloomTokensRemaining === 1 ? "" : "s"} remaining`;
    elements.bloomTokenText.textContent = state.assistedRun
      ? `Bloom Tokens used: ${used}/${BLOOM_TOKENS_PER_RUN}. This run will be marked assisted in results and shares.`
      : `Use up to ${BLOOM_TOKENS_PER_RUN} assists for reveal, verify, or a short legend peek. Pure runs stay separate.`;
    const disabled = state.paused || state.completed || state.bloomTokensRemaining <= 0;
    elements.bloomRevealButton.disabled = disabled;
    elements.bloomVerifyButton.disabled = disabled;
    elements.bloomPeekButton.disabled = disabled || state.legendMode === "visible" || state.bloomPeekActive;
  }

  function spendBloomToken(actionLabel) {
    if (!state.symbolPlayEnabled) {
      setMessage("Bloom Tokens are only available in Symbol Play.");
      return false;
    }
    if (state.completed || state.paused) {
      return false;
    }
    if (state.bloomTokensRemaining <= 0) {
      setMessage("No Bloom Tokens remain in this run.");
      return false;
    }
    state.bloomTokensRemaining -= 1;
    state.assistedRun = true;
    renderBloomTokens();
    saveResumeState();
    setMessage(actionLabel);
    return true;
  }

  function useBloomReveal() {
    if (state.selectedIndex === null || state.puzzle[state.selectedIndex] !== 0 || state.board[state.selectedIndex] !== 0) {
      setMessage("Select an empty non-given cell to use Reveal cell.");
      return;
    }
    if (!spendBloomToken("Bloom Token used: revealed the selected cell.")) {
      return;
    }
    clearHint();
    clearTransientFeedback();
    state.board[state.selectedIndex] = state.solution[state.selectedIndex];
    state.notes[state.selectedIndex].clear();
    triggerFeedback(state.selectedIndex, 'value');
    renderBoard();
    renderNumberPad();
    saveResumeState();
    checkWin();
  }

  function useBloomVerify() {
    if (state.selectedIndex === null || state.puzzle[state.selectedIndex] !== 0 || state.board[state.selectedIndex] === 0) {
      setMessage("Select a filled non-given cell to use Verify cell.");
      return;
    }
    if (!spendBloomToken("Bloom Token used: verified the selected cell.")) {
      return;
    }
    const correct = state.board[state.selectedIndex] === state.solution[state.selectedIndex];
    triggerFeedback(state.selectedIndex, 'value');
    if (!correct) {
      revealIndices([state.selectedIndex]);
      setMessage("Bloom Token check: that cell is incorrect.");
    } else {
      setMessage("Bloom Token check: that cell is correct.");
    }
    renderBoard();
    saveResumeState();
  }

  function useBloomPeek() {
    if (state.legendMode === "visible") {
      setMessage("Legend Peek is most useful once the legend has faded or hidden.");
      return;
    }
    if (!spendBloomToken(`Bloom Token used: legend visible for ${Math.round(BLOOM_PEEK_DURATION / 1000)} seconds.`)) {
      return;
    }
    state.bloomPeekActive = true;
    renderSymbolLegend();
    renderBoard();
    renderNumberPad();
    saveResumeState();
    state.bloomPeekTimeoutId = window.setTimeout(() => {
      clearBloomPeek();
      renderSymbolLegend();
      renderBoard();
      renderNumberPad();
      saveResumeState();
    }, BLOOM_PEEK_DURATION);
  }

  function renderBoard() {
    elements.board.innerHTML = "";
    elements.board.classList.toggle("is-paused", state.paused);
    elements.board.setAttribute("aria-disabled", String(state.paused));
    elements.board.inert = state.paused || state.completed;

    state.board.forEach((value, index) => {
      const cell = document.createElement("button");
      const { row, col } = SudokuCore.indexToRowCol(index);
      const related = state.scopeHighlightEnabled && state.selectedIndex !== null && SudokuCore.getPeers(state.selectedIndex).has(index);
      const sameNumber = state.selectedIndex !== null && value !== 0 && value === state.board[state.selectedIndex];
      const revealMistakes = shouldRevealMistakes(index);
      const invalid = revealMistakes && value !== 0 && value !== state.solution[index];
      const conflicts = revealMistakes ? SudokuCore.collectConflicts(state.board, index) : [];
      const isSelected = state.selectedIndex === index;
      const hinted = state.hintIndex === index;
      const feedbackType = state.feedbackIndex === index ? state.feedbackType : null;

      cell.type = "button";
      cell.className = [
        "cell",
        state.puzzle[index] !== 0 ? "given" : "",
        isSelected ? "selected" : "",
        related ? "related" : "",
        hinted ? "hinted" : "",
        feedbackType === 'value' ? 'pulse-value' : '',
        feedbackType === 'note' ? 'pulse-note' : '',
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
        cell.innerHTML = buildCellValueMarkup(value);
      }

      cell.addEventListener("click", () => selectCell(index));
      elements.board.appendChild(cell);
    });

    updatePauseUi();
    renderSelectionSummary();
    renderOnboarding();
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
    elements.selectedDigitLabel.textContent = selectedDigit ? formatDisplayValueLabel(selectedDigit) : "—";
    elements.selectedRemainingLabel.textContent = selectedDigit ? String(Math.max(0, 9 - placedCount)) : "9";
    elements.focusRibbon.hidden = state.selectedIndex === null;
  }

  function buildCellLabel(index, value, row, col, hasConflict) {
    const parts = [`Row ${row + 1}, column ${col + 1}`];
    if (state.puzzle[index] !== 0) {
      parts.push(`given ${formatDisplayValueLabel(value)}`);
    } else if (value !== 0) {
      parts.push(`value ${formatDisplayValueLabel(value)}`);
    } else if (state.notes[index].size) {
      parts.push(`notes ${Array.from(state.notes[index]).map((entry) => formatDisplayValueLabel(entry)).join(", ")}`);
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
      note.textContent = state.notes[index].has(value) ? formatDisplayValue(value) : "";
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
      button.innerHTML = state.symbolPlayEnabled
        ? state.padTipsEnabled
          ? `<span class="digit-stack"><span class="symbol">${getDisplaySymbol(value)}</span>${shouldShowDigitHint() ? `<span class="digit-hint">${value}</span>` : ""}</span><span class="remaining">${remaining} left</span>`
          : `<span class="digit-stack"><span class="symbol">${getDisplaySymbol(value)}</span>${shouldShowDigitHint() ? `<span class="digit-hint">${value}</span>` : ""}</span>`
        : state.padTipsEnabled
          ? `<span class="digit">${value}</span><span class="remaining">${remaining} left</span>`
          : `<span class="digit">${value}</span>`;
      button.disabled = state.paused;
      button.setAttribute("aria-pressed", String(selectedDigit === value));
      button.setAttribute("aria-label", remaining === 0 ? `${formatDisplayValueLabel(value)}, complete` : `${formatDisplayValueLabel(value)}, ${remaining} left`);
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
    clearHint();
    state.selectedIndex = index;
    renderBoard();
    renderNumberPad();
    saveResumeState();
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
    clearHint();

    if (state.puzzle[state.selectedIndex] !== 0) {
      setMessage("That cell is fixed. Choose an empty square.");
      return;
    }

    if (state.notesMode) {
      toggleNote(state.selectedIndex, value);
      pulseCell(state.selectedIndex, 'note');
      renderBoard();
      renderNumberPad();
      playSound("note");
      saveResumeState();
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
      saveResumeState();
      return;
    }

    state.board[state.selectedIndex] = value;

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
    pulseCell(state.selectedIndex, 'value');
    saveResumeState();
    checkWin();
  }

  function toggleNote(index, value) {
    if (state.notes[index].has(value)) {
      state.notes[index].delete(value);
      setMessage(`Removed note ${formatDisplayValueLabel(value)}.`);
    } else {
      state.notes[index].add(value);
      setMessage(`Added note ${formatDisplayValueLabel(value)}. Tap it again to place it, or turn Notes mode off to enter final values.`);
    }
    saveResumeState();
  }

  function eraseSelected() {
    if (state.selectedIndex === null || state.completed || state.paused) {
      return;
    }
    clearTransientFeedback();
    clearHint();
    if (state.puzzle[state.selectedIndex] !== 0) {
      setMessage("Given clues cannot be erased.");
      return;
    }
    state.board[state.selectedIndex] = 0;
    setMessage("Cell cleared.");
    renderBoard();
    renderNumberPad();
    saveResumeState();
  }

  function restartPuzzle() {
    resetStateForPuzzle(state.puzzleMeta, { countAbandon: false });
    renderBoard();
    renderNumberPad();
  }

  function requestHint() {
    if (state.completed || state.paused) {
      return;
    }

    const hint = buildHint();
    if (!hint) {
      clearHint();
      setMessage("Hint ✦ No clear single, pair, or candidate-line pattern is visible right now. Try scanning another row, column, or box.");
      renderBoard();
      return;
    }

    const hintKey = `${hint.type}:${hint.index}:${hint.value ?? ""}`;
    if (state.lastHintKey !== hintKey) {
      state.hintsUsed += 1;
      recordHintTechnique(hint.type);
      renderTechniqueJournal();
      saveStats();
      state.hintStage = 0;
      state.lastHintKey = hintKey;
    }

    const stage = Math.min(state.hintStage, hint.messages.length - 1);

    state.selectedIndex = hint.index;
    state.hintIndex = hint.index;
    setMessage(hint.messages[stage]);
    state.hintStage = Math.min(hint.messages.length - 1, stage + 1);
    renderBoard();
    renderNumberPad();
    saveResumeState();
  }

  function checkBoard() {
    if (state.mode === "nocheck") {
      setMessage("No check mode disables board review. Trust your logic to the end.");
      return;
    }

    if (state.paused) {
      setMessage("Resume the game before checking the board.");
      return;
    }

    state.checksUsed += 1;
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
    renderSessionHistory();
    updateOverview();
    renderSessionRitual();
    renderFeaturedChallenge();
    renderWeeklyChallenge();
    renderBloomTokens();
    updatePauseUi();
    if (state.mode === "daily") {
      const dailyDateKey = state.currentDailyDateKey || getCurrentDateKey();
      const key = `${dailyDateKey}-${state.difficulty}`;
      const medalLabel = state.hintsUsed === 0 && state.checksUsed === 0 && state.mistakes === 0
        ? "🌸 Pure solve"
        : state.hintsUsed === 0
          ? "🪷 Trust the grid"
          : "✨ Steady finish";
      state.dailyResults[key] = {
        date: dailyDateKey,
        difficulty: state.difficulty,
        time: state.secondsElapsed,
        mistakes: state.mistakes,
        medal: getSolveMedal(),
        technique: buildTechniqueLabel(state.puzzleMeta),
        symbolTheme: state.symbolPlayEnabled ? state.symbolTheme : null,
        assisted: state.assistedRun,
        dailySpecialTitle: state.currentDailySpecial?.title || null,
        dailySpecialFocus: state.currentDailySpecial?.focus || null
      };
      saveDailyResults();
      renderDailyResult();
    }
    const nextAction = getVictoryNextAction();
    const medalLabel = getSolveMedal();
    elements.victorySummary.textContent = `Solved ${getDifficultyLabel(state.difficulty)} · ${MODES[state.mode].label} in ${SudokuCore.formatTime(state.secondsElapsed)} with ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}. ${medalLabel}.`;
    renderVictoryShareCard(medalLabel);
    elements.victoryProgressList.innerHTML = [
      statRow("Current rank", getRankInfo().currentRank.name),
      statRow("Streak", `${state.stats.overall.streak} day${state.stats.overall.streak === 1 ? "" : "s"}`),
      statRow("Best in mode", state.stats.modes[state.mode].bestTime ? SudokuCore.formatTime(state.stats.modes[state.mode].bestTime) : "New baseline"),
      statRow("Technique", buildTechniqueLabel(state.puzzleMeta)),
      statRow("Medal", medalLabel)
    ].join("");
    elements.victoryNextLabel.textContent = nextAction.description;
    elements.victorySecondaryButton.textContent = nextAction.label;
    elements.victorySecondaryButton.onclick = nextAction.run;
    if (state.mode === "daily") {
      elements.victoryNewGameButton.textContent = "Replay daily ↺";
      elements.victoryNewGameButton.onclick = () => newGame(state.difficulty, state.mode);
    } else {
      elements.victoryNewGameButton.textContent = "Play another ✨";
      elements.victoryNewGameButton.onclick = () => newGame(state.difficulty, state.mode);
    }
    elements.victoryOverlay.hidden = false;
    clearResumeState();
    setMessage(`🎉 Puzzle solved in ${SudokuCore.formatTime(state.secondsElapsed)}. Beautiful work.`);
    renderBoard();
    renderNumberPad();
    playSound("win");
    elements.victorySecondaryButton.focus();
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
    renderBloomTokens();
    setMessage(reason === "hidden" ? "Game auto-paused while the tab was hidden." : "Game paused.");
    playSound("pause");
    saveResumeState();
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
    renderBloomTokens();
    setMessage("Back in focus. Continue your solve.");
    playSound("resume");
    saveResumeState();
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
    saveResumeState();
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

    if (state.symbolTutorialActive && /^[1-9]$/.test(key)) {
      event.preventDefault();
      answerSymbolTutorial(Number(key));
      return;
    }

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

    if (key.toLowerCase() === 'x') {
      event.preventDefault();
      if (state.mode === 'nonotes') {
        state.notesMode = false;
        refreshNotesUi();
        setMessage('No notes mode keeps pencil marks disabled.');
        return;
      }
      state.notesMode = !state.notesMode;
      refreshNotesUi();
      syncUrl();
      setMessage(state.notesMode ? 'Notes mode on. Tap to add candidates.' : 'Value mode on. Tap to place final values.');
      saveResumeState();
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

    clearHint();
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
      saveResumeState();
    });

    elements.notesToggle.addEventListener("change", (event) => {
      if (state.mode === "nonotes") {
        refreshNotesUi();
        setMessage("No notes mode keeps pencil marks disabled.");
        return;
      }
      state.notesMode = event.target.checked;
      refreshNotesUi();
      syncUrl();
      setMessage(state.notesMode ? "Notes mode on. Tap to add candidates." : "Notes mode off. Tap to place values.");
      saveResumeState();
    });

    elements.valueModeButton.addEventListener('click', () => {
      state.notesMode = false;
      refreshNotesUi();
      syncUrl();
      setMessage('Value mode on. Tap to place final values.');
      saveResumeState();
    });

    elements.noteModeButton.addEventListener('click', () => {
      if (state.mode === "nonotes") {
        refreshNotesUi();
        setMessage('No notes mode keeps pencil marks disabled.');
        return;
      }
      state.notesMode = true;
      refreshNotesUi();
      syncUrl();
      setMessage('Notes mode on. Tap to add candidates.');
      saveResumeState();
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
      refreshOptionsSummary();
    });

    elements.padTipsToggle.checked = state.padTipsEnabled;
    elements.padTipsToggle.addEventListener("change", (event) => {
      state.padTipsEnabled = event.target.checked;
      savePadTipsPreference();
      renderNumberPad();
      setMessage(state.padTipsEnabled ? "Number pad tips on." : "Number pad tips off.");
      saveResumeState();
      refreshOptionsSummary();
    });

    elements.scopeHighlightToggle.checked = state.scopeHighlightEnabled;
    elements.scopeHighlightToggle.addEventListener("change", (event) => {
      state.scopeHighlightEnabled = event.target.checked;
      saveScopeHighlightPreference();
      renderBoard();
      setMessage(state.scopeHighlightEnabled ? "Selection scope highlight on." : "Selection scope highlight off.");
      saveResumeState();
      refreshOptionsSummary();
    });

    elements.contrastToggle.checked = state.highContrastEnabled;
    elements.contrastToggle.addEventListener("change", (event) => {
      state.highContrastEnabled = event.target.checked;
      saveHighContrastPreference();
      applyHighContrastTheme();
      setMessage(state.highContrastEnabled ? "High contrast mode on." : "High contrast mode off.");
      refreshOptionsSummary();
    });

    elements.themeSelect.value = state.theme;
    elements.themeSelect.addEventListener("change", (event) => {
      state.theme = event.target.value;
      saveThemePreference();
      applyThemePreset();
      setMessage(`Theme changed to ${capitalize(state.theme === 'night' ? 'Sakura Night' : state.theme)}.`);
    });

    elements.symbolPlayToggle.checked = state.symbolPlayEnabled;
    elements.symbolPlayToggle.addEventListener("change", (event) => {
      const wasEnabled = state.symbolPlayEnabled;
      state.symbolPlayEnabled = event.target.checked;
      saveSymbolPlayPreference();
      if (!wasEnabled && state.symbolPlayEnabled && !state.symbolTutorialDone) {
        openSymbolTutorial();
      }
      if (!state.symbolPlayEnabled) {
        closeSymbolTutorial(false);
      }
      refreshSymbolUi();
      syncUrl();
      saveResumeState();
      setMessage(state.symbolPlayEnabled ? "Symbol Play on. Type digits 1–9 as usual and read the symbols through the legend." : "Symbol Play off. Digits are shown directly again.");
      refreshOptionsSummary();
    });

    elements.symbolThemeSelect.value = state.symbolTheme;
    elements.symbolThemeSelect.addEventListener("change", (event) => {
      state.symbolTheme = event.target.value;
      saveSymbolThemePreference();
      if (state.symbolTutorialActive) {
        state.symbolTutorialQueue = buildSymbolTutorialQueue();
        state.symbolTutorialStep = 0;
      }
      refreshSymbolUi();
      syncUrl();
      saveResumeState();
      setMessage(`Symbol theme changed to ${getActiveSymbolTheme().label}.`);
    });

    elements.legendModeSelect.value = state.legendMode;
    elements.legendModeSelect.addEventListener("change", (event) => {
      state.legendMode = event.target.value;
      saveLegendModePreference();
      refreshSymbolUi();
      syncUrl();
      saveResumeState();
      setMessage(state.legendMode === "visible" ? "Symbol legend visible." : state.legendMode === "faded" ? "Symbol legend faded for a stronger memory challenge." : "Symbol legend hidden. Trust the mapping from memory.");
    });

    elements.newGameButton.addEventListener("click", () => newGame(state.difficulty, state.mode));
    elements.hintButton.addEventListener("click", requestHint);
    elements.bloomRevealButton.addEventListener("click", useBloomReveal);
    elements.bloomVerifyButton.addEventListener("click", useBloomVerify);
    elements.bloomPeekButton.addEventListener("click", useBloomPeek);
    elements.shareDailyButton.addEventListener("click", shareDailyResult);
    elements.shareVictoryButton.addEventListener("click", shareVictoryResult);
    elements.showOnboardingButton.addEventListener("click", () => {
      state.onboardingPeekOpen = true;
      renderOnboarding();
      saveResumeState();
    });
    elements.symbolTutorialDismiss.addEventListener("click", () => {
      state.symbolTutorialSnoozed = true;
      saveSymbolTutorialSnoozePreference();
      closeSymbolTutorial(false);
      setMessage("You can reopen Symbol Play later and learn the mapping when you are ready.");
    });
    elements.pauseButton.addEventListener("click", togglePause);
    elements.resumeButton.addEventListener("click", resumeGame);
    elements.eraseButton.addEventListener("click", eraseSelected);
    elements.resetButton.addEventListener("click", restartPuzzle);
    elements.checkButton.addEventListener("click", checkBoard);
    elements.dismissOnboardingButton.addEventListener("click", () => {
      state.onboardingDismissed = true;
      state.onboardingPeekOpen = false;
      saveOnboardingPreference();
      renderOnboarding();
      saveResumeState();
    });
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  function initialize() {
    const settings = readSettingsFromUrl();
    const hasGameplayOverrides = settings.hasGameplayParams;
    if (settings.symbolPlayEnabled !== undefined) {
      state.symbolPlayEnabled = settings.symbolPlayEnabled;
    }
    if (settings.symbolTheme) {
      state.symbolTheme = settings.symbolTheme;
    }
    if (settings.legendMode) {
      state.legendMode = settings.legendMode;
    }
    applyThemePreset();
    applyHighContrastTheme();
    wireEvents();
    const resume = hasGameplayOverrides ? { restored: false, invalid: false } : restoreSavedGame();
    if (resume.restored && settings.hasDisplayParams) {
      if (settings.symbolPlayEnabled !== undefined) {
        state.symbolPlayEnabled = settings.symbolPlayEnabled;
      }
      if (settings.symbolTheme) {
        state.symbolTheme = settings.symbolTheme;
      }
      if (settings.legendMode) {
        state.legendMode = settings.legendMode;
      }
      renderSymbolLegend();
      renderBloomTokens();
      renderBoard();
      renderNumberPad();
      renderSelectionSummary();
      maybeStartSymbolTutorial();
      syncUrl();
      saveResumeState();
    }
    if (!resume.restored) {
      newGame(settings.difficulty, settings.mode, {
        countAbandon: false,
        overrideShowMistakes: settings.showMistakes,
        overrideNotesMode: settings.notesMode
      });
      refreshNotesUi();
      renderLearningSurfaces();
      renderRankPanel();
      renderDailyResult();
      renderOnboarding();
      renderSymbolLegend();
      maybeStartSymbolTutorial();
      renderSymbolTutorial();
      renderBloomTokens();
      if (resume.invalid) {
        setMessage("Your previous saved game could not be restored, so a fresh puzzle was started.");
      }
    }
  }

  initialize();
})();
