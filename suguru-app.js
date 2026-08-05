(function () {
  const STORAGE_KEY = "sudoku-sakura-suguru-stats";
  const RESUME_KEY = "sudoku-sakura-suguru-resume";
  const AUDIO_KEY = "sudoku-sakura-audio";
  const PAD_TIPS_KEY = "sudoku-sakura-pad-tips";
  const CONTRAST_KEY = "sudoku-sakura-high-contrast";
  const THEME_KEY = "sudoku-sakura-theme";
  const ONBOARDING_KEY = "sudoku-sakura-suguru-onboarding";
  const CAGE_GARDEN_KEY = "sudoku-sakura-suguru-cage-garden";
  const DAILY_RESULTS_KEY = "sudoku-sakura-suguru-daily-results";
  const DAILY_RESULTS_VERSION = 1;
  const CAGE_GARDEN_ID = "cage-garden-v1";
  const RESUME_VERSION = 3;
  const LEGACY_RESUME_VERSION = 2;
  const SAVE_HEALTH_DOMAINS = Object.freeze([
    { id: "board-recovery", label: "board recovery" },
    { id: "stats", label: "stats" },
    { id: "daily-result", label: "Daily result" },
    { id: "cage-garden", label: "Cage Garden" },
    { id: "focus-completion", label: "Pair Focus completion" },
    { id: "practice-rotation", label: "practice rotation" }
  ]);
  const BOARD_RECOVERY_DOMAIN = "board-recovery";
  const MAX_COUNTED_PROOFS = 2000;
  const MAX_PROOF_KEY_LENGTH = 4096;
  const DailyEditions = window.DailyEditions;
  const PracticeSelection = window.PracticeSelection;
  const ChallengeCompass = window.ChallengeCompass;
  const BoardReplacementGuard = window.BoardReplacementGuard;
  const LogicCoach = window.LogicCoach;
  let memoryFocusResults = ChallengeCompass.normalizeFocusResults(null);
  let discardGuard = null;
  let freshChallengePreview = null;
  let freshChallengeLaunching = false;
  const MAX_UNDO_STEPS = 100;
  const CAGE_GARDEN_STEPS = [
    {
      id: "garden-gate",
      label: "Garden Gate",
      puzzleId: "suguru-size5-garden-path",
      level: "size5-easy",
      mode: "classic",
      focus: "Cage range",
      description: "Use each cage's 1–N range before checking its neighbors."
    },
    {
      id: "lantern-walk",
      label: "Lantern Walk",
      puzzleId: "suguru-size5-morning-rhythm",
      level: "size5-easy",
      mode: "classic",
      focus: "Eight directions",
      description: "Include horizontal, vertical, and diagonal neighbors in every scan."
    },
    {
      id: "brook-crossing",
      label: "Brook Crossing",
      puzzleId: "suguru-size5-brook-bridge",
      level: "size5-medium",
      mode: "classic",
      focus: "Candidate cross-check",
      description: "Cross-check each cage's remaining values against touching cells."
    },
    {
      id: "cascade-finale",
      label: "Cascade Finale",
      puzzleId: "suguru-size5-cascade-midnight-path",
      level: "size5-challenge",
      mode: "classic",
      focus: "Combined deduction",
      description: "Combine cage range, touching-neighbor pressure, and careful notes."
    }
  ];
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

  function createSaveHealthState() {
    return {
      domains: Object.fromEntries(SAVE_HEALTH_DOMAINS.map(({ id }) => [id, {
        write: "unobserved",
        cleanup: "unobserved"
      }])),
      renderedFailureSignature: "",
      renderedPresentationSignature: "",
      flushScheduled: false,
      deferred: false,
      deferredFailureSignature: ""
    };
  }

  const state = {
    gameId: "suguru",
    level: "size5-easy",
    mode: "classic",
    pendingLevel: "size5-easy",
    pendingMode: "classic",
    puzzleMeta: null,
    puzzle: [],
    solution: [],
    board: [],
    notes: [],
    selectedIndex: null,
    notesMode: false,
    showMistakes: true,
    mistakes: 0,
    nudgesUsed: 0,
    hasDiscardableInteraction: false,
    nudgeStage: 0,
    lastNudgeKey: null,
    nudgeFocusIndexes: [],
    nudgeSourceIndexes: [],
    nudgeTargetIndexes: [],
    nudgeCoachState: null,
    nudgeCountedKeys: new Set(),
    secondsElapsed: 0,
    paused: false,
    pauseReason: null,
    completed: false,
    resultView: "none",
    revealIndices: new Set(),
    revealTimeoutId: null,
    intervalId: null,
    lastPuzzleKey: null,
    activeJourneyStepId: null,
    runSource: "ordinary",
    dailyEdition: null,
    dailyResults: loadDailyResults(),
    pendingDailyResults: new Map(),
    dailyFallbackMessage: null,
    sourceDifficultyHint: null,
    sourceModeHint: null,
    bootDisposition: "ordinary-untouched",
    isNewcomerSession: true,
    journeyProgress: loadCageGardenProgress(),
    unsavedCageGardenStepIds: new Set(),
    undoStack: [],
    redoStack: [],
    highContrastEnabled: loadHighContrastPreference(),
    theme: loadThemePreference(),
    onboardingDismissed: loadOnboardingPreference(),
    onboardingPeekOpen: false,
    padTipsEnabled: loadPadTipsPreference(),
    audioEnabled: loadAudioPreference(),
    audioContext: null,
    stats: loadStats(),
    focusResults: loadFocusResults(),
    focusLaunchId: null,
    saveHealth: createSaveHealthState()
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
    freshChallengeButton: document.getElementById("fresh-challenge-button"),
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
    victoryTitle: document.getElementById("victory-title"),
    victorySummary: document.getElementById("victory-summary"),
    victorySaveStatus: document.getElementById("victory-save-status"),
    victoryShareTitle: document.getElementById("victory-share-title"),
    victoryShareMeta: document.getElementById("victory-share-meta"),
    victoryShareFacts: document.getElementById("victory-share-facts"),
    victoryProgressList: document.getElementById("victory-progress-list"),
    victoryNextLabel: document.getElementById("victory-next-label"),
    victoryNewGameButton: document.getElementById("victory-new-game-button"),
    victorySecondaryButton: document.getElementById("victory-secondary-button"),
    victoryReviewButton: document.getElementById("victory-review-button"),
    shareVictoryButton: document.getElementById("share-victory-button"),
    victoryShareStatus: document.getElementById("victory-share-status"),
    viewResultButton: document.getElementById("view-result-button"),
    discardDialog: document.getElementById("discard-dialog"),
    discardDialogTitle: document.getElementById("discard-dialog-title"),
    discardDialogDescription: document.getElementById("discard-dialog-description"),
    discardKeepButton: document.getElementById("discard-keep-button"),
    discardConfirmButton: document.getElementById("discard-confirm-button"),
    board: document.getElementById("suguru-board"),
    timer: document.getElementById("timer"),
    mistakeCount: document.getElementById("mistake-count"),
    message: document.getElementById("game-message"),
    localSaveStatus: document.getElementById("local-save-status"),
    challengeLabel: document.getElementById("challenge-label"),
    cageGardenPanel: document.getElementById("cage-garden-panel"),
    cageGardenText: document.getElementById("cage-garden-text"),
    cageGardenProgress: document.getElementById("cage-garden-progress"),
    cageGardenFocus: document.getElementById("cage-garden-focus"),
    cageGardenSteps: document.getElementById("cage-garden-steps"),
    cageGardenButton: document.getElementById("cage-garden-button"),
    cageGardenGuideTitle: document.getElementById("cage-garden-guide-title"),
    railNextStepTitle: document.getElementById("rail-next-step-title"),
    railNextStepText: document.getElementById("rail-next-step-text"),
    railNextStepTag: document.getElementById("rail-next-step-tag"),
    railNextStepFocus: document.getElementById("rail-next-step-focus"),
    railNextStepButton: document.getElementById("rail-next-step-button"),
    dailyResultCard: document.getElementById("daily-edition-card"),
    dailyEditionTitle: document.getElementById("daily-edition-title"),
    dailyEditionStatus: document.getElementById("daily-edition-status"),
    dailyResultList: document.getElementById("daily-result-list"),
    dailyEditionStreak: document.getElementById("daily-edition-streak"),
    dailyResultShareText: document.getElementById("daily-result-share-text"),
    dailyEditionPrimaryButton: document.getElementById("daily-edition-primary-button"),
    shareDailyButton: document.getElementById("share-daily-button"),
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
    nudgeButton: document.getElementById("nudge-button"),
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
    onboardingCard: document.getElementById("onboarding-card"),
    entryModeHint: document.getElementById("entry-mode-hint"),
    topbar: document.querySelector(".topbar"),
    hero: document.querySelector(".hero"),
    controlsRow: document.querySelector(".controls-row"),
    gameHeader: document.querySelector(".game-header"),
    gameTitle: document.getElementById("game-title"),
    actionsBar: document.querySelector(".actions-bar"),
    entryModeBar: document.querySelector(".entry-mode-bar"),
    optionsPanel: document.querySelector(".options-panel"),
    sidebar: document.querySelector(".sidebar"),
    siteFooter: document.querySelector(".site-footer")
  };

  // Keep modals outside board and page surfaces so fixed positioning uses the viewport.
  document.body.append(elements.pauseOverlay, elements.victoryOverlay);

  function formatSaveHealthDomains(domains) {
    const labels = domains.map(({ label }) => label);
    if (labels.length < 2) return labels[0] || "";
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
  }

  function getSaveHealthFailure() {
    const writeFailures = SAVE_HEALTH_DOMAINS.filter(({ id }) => state.saveHealth.domains[id].write === "session-only");
    const cleanupFailures = SAVE_HEALTH_DOMAINS.filter(({ id }) => state.saveHealth.domains[id].cleanup === "cleanup-failed");
    if (!writeFailures.length && !cleanupFailures.length) {
      return { signature: "", text: "", writeFailures, cleanupFailures };
    }
    const clauses = [];
    if (writeFailures.length) {
      clauses.push(`Session-only: ${formatSaveHealthDomains(writeFailures)} could not be saved in this browser. Keep this tab open.`);
    }
    if (cleanupFailures.length) {
      clauses.push("Old board recovery data could not be cleared; completed snapshots will still be ignored.");
    }
    return {
      signature: `write:${writeFailures.map(({ id }) => id).join(",")}|cleanup:${cleanupFailures.map(({ id }) => id).join(",")}`,
      text: clauses.join(" "),
      writeFailures,
      cleanupFailures
    };
  }

  function getVictorySaveHealth(isDailyCompletion) {
    const { writeFailures, cleanupFailures } = getSaveHealthFailure();
    const clauses = [];
    if (writeFailures.length) {
      const verb = writeFailures.length === 1 ? "was" : "were";
      clauses.push(`Session-only: ${formatSaveHealthDomains(writeFailures)} ${verb} not saved in this browser. Other successful saves are unchanged. Keep this tab open.`);
    } else {
      clauses.push(isDailyCompletion
        ? "Daily result and progress saved in this browser."
        : "Progress saved in this browser.");
    }
    if (cleanupFailures.length) {
      clauses.push("Old board recovery data could not be cleared; completed snapshots will still be ignored.");
    }
    return {
      text: clauses.join(" "),
      tone: writeFailures.length || cleanupFailures.length ? "failure" : "recovery"
    };
  }

  function renderVictorySaveHealth(isDailyCompletion) {
    if (!elements.victorySaveStatus) return;
    const { text, tone } = getVictorySaveHealth(isDailyCompletion);
    const message = document.createElement("span");
    message.className = `save-health-message is-${tone}`;
    const icon = document.createElement("span");
    icon.className = "save-health-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = tone === "failure" ? "⚠" : "✓";
    const copy = document.createElement("span");
    copy.textContent = text;
    message.append(icon, copy);
    elements.victorySaveStatus.replaceChildren(message);
  }

  function isSaveHealthPresentationMuted() {
    return state.paused || state.resultView !== "none";
  }

  function renderLocalSaveHealth(text, tone, signature) {
    if (!elements.localSaveStatus || state.saveHealth.renderedPresentationSignature === signature) {
      return;
    }
    const message = document.createElement("span");
    message.className = `save-health-message is-${tone}`;
    const icon = document.createElement("span");
    icon.className = "save-health-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = tone === "failure" ? "⚠" : "✓";
    const copy = document.createElement("span");
    copy.textContent = text;
    message.append(icon, copy);
    elements.localSaveStatus.replaceChildren(message);
    state.saveHealth.renderedPresentationSignature = signature;
  }

  function flushSaveHealthPresentation() {
    const failure = getSaveHealthFailure();
    if (isSaveHealthPresentationMuted()) {
      state.saveHealth.deferred = true;
      if (failure.signature) state.saveHealth.deferredFailureSignature = failure.signature;
      return;
    }
    state.saveHealth.deferred = false;
    if (failure.signature) {
      renderLocalSaveHealth(failure.text, "failure", `failure:${failure.signature}`);
      state.saveHealth.renderedFailureSignature = failure.signature;
      state.saveHealth.deferredFailureSignature = "";
      return;
    }
    if (state.saveHealth.renderedFailureSignature || state.saveHealth.deferredFailureSignature) {
      renderLocalSaveHealth("Local saving restored.", "recovery", "recovery");
      state.saveHealth.renderedFailureSignature = "";
      state.saveHealth.deferredFailureSignature = "";
    }
  }

  function scheduleSaveHealthPresentation() {
    if (state.saveHealth.flushScheduled) return;
    state.saveHealth.flushScheduled = true;
    Promise.resolve().then(() => {
      state.saveHealth.flushScheduled = false;
      flushSaveHealthPresentation();
    });
  }

  function updateSaveHealth(domain, axis, outcome) {
    const domainState = state.saveHealth.domains[domain];
    if (!domainState || domainState[axis] === outcome) return;
    domainState[axis] = outcome;
    scheduleSaveHealthPresentation();
  }

  function persistJson(domain, key, value) {
    try {
      const serialized = JSON.stringify(value);
      if (typeof serialized !== "string") throw new Error("Storage payload could not be serialized");
      localStorage.setItem(key, serialized);
      if (localStorage.getItem(key) !== serialized) throw new Error("Storage write could not be verified");
      updateSaveHealth(domain, "write", "saved");
      return "saved";
    } catch (error) {
      updateSaveHealth(domain, "write", "session-only");
      return "failed";
    }
  }

  function removeStored(domain, key) {
    try {
      localStorage.removeItem(key);
      if (localStorage.getItem(key) !== null) throw new Error("Storage cleanup could not be verified");
      updateSaveHealth(domain, "write", "saved");
      updateSaveHealth(domain, "cleanup", "cleared");
      return "cleared";
    } catch (error) {
      updateSaveHealth(domain, "cleanup", "cleanup-failed");
      return "failed";
    }
  }

  function loadStats() {
    const defaults = { solved: 0, bestTimes: {}, streak: 0, lastSolvedOn: null };
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return defaults;
      }
      return {
        solved: Number.isInteger(parsed.solved) && parsed.solved >= 0 ? parsed.solved : 0,
        bestTimes: parsed.bestTimes && typeof parsed.bestTimes === "object" && !Array.isArray(parsed.bestTimes)
          ? parsed.bestTimes
          : {},
        streak: Number.isInteger(parsed.streak) && parsed.streak >= 0 ? parsed.streak : 0,
        lastSolvedOn: typeof parsed.lastSolvedOn === "string" ? parsed.lastSolvedOn : null
      };
    } catch (error) {
      return defaults;
    }
  }

  function saveStats() {
    return persistJson("stats", STORAGE_KEY, state.stats);
  }

  function loadFocusResults() {
    try {
      const raw = localStorage.getItem(ChallengeCompass.storageKey);
      memoryFocusResults = ChallengeCompass.normalizeFocusResults(raw ? JSON.parse(raw) : null);
    } catch (error) {
      // Keep the last valid in-memory focus result when storage is unavailable.
    }
    return memoryFocusResults;
  }

  function saveFocusResults() {
    memoryFocusResults = ChallengeCompass.normalizeFocusResults(state.focusResults);
    return persistJson("focus-completion", ChallengeCompass.storageKey, memoryFocusResults);
  }

  function recordChallengeFocusCompletion() {
    if (!state.puzzleMeta?.logicFocus || state.focusLaunchId !== state.puzzleMeta.id) return false;
    state.focusResults = ChallengeCompass.completeFocus(state.focusResults, "suguru", state.puzzleMeta.id);
    memoryFocusResults = ChallengeCompass.normalizeFocusResults(state.focusResults);
    return true;
  }

  function getDailyResultKey(identity) {
    return identity ? `${identity.corpus}|${identity.edition}|${identity.band}` : null;
  }

  function normalizeUsageCount(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  function normalizeCountedProofKeys(value) {
    if (!Array.isArray(value)) return new Set();
    return new Set(value
      .filter((entry) => typeof entry === "string" && entry.length > 0 && entry.length <= MAX_PROOF_KEY_LENGTH)
      .slice(-MAX_COUNTED_PROOFS));
  }

  function normalizeDailyResult(key, value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const identity = {
      version: DailyEditions.version,
      gameId: "suguru",
      corpus: value.corpus,
      edition: value.edition,
      band: value.band,
      puzzleId: value.puzzleId
    };
    const resolved = DailyEditions.validateEditionIdentity(identity, {
      puzzleLibrary: window.SUGURU_PUZZLES,
      today: DailyEditions.getLocalDateKey()
    });
    if (!resolved.ok || key !== getDailyResultKey(identity)) return null;
    if (!Number.isInteger(value.seconds) || value.seconds < 0) return null;
    if (!Number.isInteger(value.mistakes) || value.mistakes < 0) return null;
    if (typeof value.completedAt !== "string" || !Number.isFinite(Date.parse(value.completedAt))) return null;
    return {
      edition: identity.edition,
      corpus: identity.corpus,
      band: identity.band,
      puzzleId: identity.puzzleId,
      seconds: value.seconds,
      mistakes: value.mistakes,
      nudgesUsed: normalizeUsageCount(value.nudgesUsed),
      completedAt: value.completedAt
    };
  }

  function loadDailyResults() {
    const ledger = { version: DAILY_RESULTS_VERSION, entries: {} };
    try {
      const parsed = JSON.parse(localStorage.getItem(DAILY_RESULTS_KEY));
      if (!parsed || parsed.version !== DAILY_RESULTS_VERSION || !parsed.entries || typeof parsed.entries !== "object" || Array.isArray(parsed.entries)) return ledger;
      Object.entries(parsed.entries).forEach(([key, value]) => {
        const normalized = normalizeDailyResult(key, value);
        if (normalized) ledger.entries[key] = normalized;
      });
    } catch (error) {
      // Malformed or unavailable history starts empty.
    }
    return ledger;
  }

  function persistDailyResults(candidate) {
    return persistJson("daily-result", DAILY_RESULTS_KEY, candidate);
  }

  function getEffectiveDailyResultByKey(key) {
    return key ? state.pendingDailyResults.get(key) ?? state.dailyResults.entries[key] ?? null : null;
  }

  function getDailyResult(identity = state.dailyEdition) {
    return getEffectiveDailyResultByKey(getDailyResultKey(identity));
  }

  function isPendingDailyResult(identity) {
    const key = getDailyResultKey(identity);
    return Boolean(key && state.pendingDailyResults.has(key));
  }

  function stageDailyResult(identity, attemptedResult) {
    const key = getDailyResultKey(identity);
    if (!key) return { accepted: false, key: null, result: null };
    const prior = getEffectiveDailyResultByKey(key);
    const accepted = !prior || attemptedResult.seconds < prior.seconds;
    if (accepted) {
      state.pendingDailyResults.set(key, {
        ...attemptedResult,
        completedAt: prior?.completedAt || attemptedResult.completedAt
      });
    }
    return { accepted, key, result: getEffectiveDailyResultByKey(key) };
  }

  function commitPendingDailyResults() {
    if (state.pendingDailyResults.size === 0) return "skipped";
    const included = new Map(state.pendingDailyResults);
    const candidate = {
      version: DAILY_RESULTS_VERSION,
      entries: { ...state.dailyResults.entries }
    };
    included.forEach((result, pendingKey) => {
      candidate.entries[pendingKey] = result;
    });
    const outcome = persistDailyResults(candidate);
    if (outcome === "saved") {
      state.dailyResults = candidate;
      included.forEach((result, pendingKey) => {
        if (state.pendingDailyResults.get(pendingKey) === result) state.pendingDailyResults.delete(pendingKey);
      });
    }
    return outcome;
  }

  function getVerifiedDailyStreak() {
    return DailyEditions.getDailyStreak(state.dailyResults.entries, DailyEditions.getLocalDateKey());
  }

  function createEmptyCageGardenProgress() {
    return {
      version: 1,
      journeyId: CAGE_GARDEN_ID,
      completedSteps: {}
    };
  }

  function isValidCompletionDate(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
  }

  function normalizeCageGardenProgress(value) {
    const normalized = createEmptyCageGardenProgress();
    if (!value || typeof value !== "object" || Array.isArray(value)
      || value.version !== 1 || value.journeyId !== CAGE_GARDEN_ID
      || !value.completedSteps || typeof value.completedSteps !== "object" || Array.isArray(value.completedSteps)) {
      return normalized;
    }

    for (const step of CAGE_GARDEN_STEPS) {
      const result = value.completedSteps[step.id];
      const valid = result
        && typeof result === "object"
        && !Array.isArray(result)
        && result.puzzleId === step.puzzleId
        && result.level === step.level
        && result.mode === step.mode
        && Number.isInteger(result.seconds)
        && result.seconds >= 0
        && Number.isInteger(result.mistakes)
        && result.mistakes >= 0
        && isValidCompletionDate(result.completedAt);
      if (!valid) {
        break;
      }
      normalized.completedSteps[step.id] = {
        puzzleId: step.puzzleId,
        level: step.level,
        mode: step.mode,
        seconds: result.seconds,
        mistakes: result.mistakes,
        nudgesUsed: normalizeUsageCount(result.nudgesUsed),
        completedAt: result.completedAt
      };
    }
    return normalized;
  }

  function loadCageGardenProgress() {
    try {
      return normalizeCageGardenProgress(JSON.parse(localStorage.getItem(CAGE_GARDEN_KEY)));
    } catch (error) {
      return createEmptyCageGardenProgress();
    }
  }

  function getCageGardenStepIdentity(stepId) {
    return `${CAGE_GARDEN_ID}|${stepId}`;
  }

  function saveCageGardenProgress() {
    if (state.unsavedCageGardenStepIds.size === 0) return "skipped";
    const included = new Set(state.unsavedCageGardenStepIds);
    const outcome = persistJson("cage-garden", CAGE_GARDEN_KEY, state.journeyProgress);
    if (outcome === "saved") {
      included.forEach((identity) => state.unsavedCageGardenStepIds.delete(identity));
    }
    return outcome;
  }

  function getCageGardenStep(stepId) {
    return CAGE_GARDEN_STEPS.find((step) => step.id === stepId) || null;
  }

  function getCageGardenPuzzle(step) {
    return step ? getPuzzles(step.level).find((puzzle) => puzzle.id === step.puzzleId) || null : null;
  }

  function getCompletedCageGardenCount() {
    return CAGE_GARDEN_STEPS.filter((step) => Boolean(state.journeyProgress.completedSteps[step.id])).length;
  }

  function getNextCageGardenStep() {
    return CAGE_GARDEN_STEPS.find((step) => !state.journeyProgress.completedSteps[step.id]) || null;
  }

  function isCageGardenStepAvailable(step) {
    if (!step) {
      return false;
    }
    return Boolean(state.journeyProgress.completedSteps[step.id]) || getNextCageGardenStep()?.id === step.id;
  }

  function getValidResumeJourneyStep(saved, puzzle, level, mode) {
    if (![LEGACY_RESUME_VERSION, RESUME_VERSION].includes(saved?.version)
      || (saved.version === RESUME_VERSION && saved.runSource !== "cage-garden")
      || saved.journeyId !== CAGE_GARDEN_ID
      || typeof saved.journeyStepId !== "string") {
      return null;
    }
    const step = getCageGardenStep(saved.journeyStepId);
    if (!step
      || step.puzzleId !== puzzle.id
      || step.level !== level
      || step.mode !== mode
      || !isCageGardenStepAvailable(step)) {
      return null;
    }
    return step;
  }

  function recordCageGardenCompletion() {
    const step = getCageGardenStep(state.activeJourneyStepId);
    if (state.runSource !== "cage-garden"
      || !step
      || step.puzzleId !== state.puzzleMeta?.id
      || step.level !== state.level
      || step.mode !== state.mode) {
      return null;
    }
    const newlyCompleted = !state.journeyProgress.completedSteps[step.id];
    if (newlyCompleted) {
      state.journeyProgress.completedSteps[step.id] = {
        puzzleId: step.puzzleId,
        level: step.level,
        mode: step.mode,
        seconds: state.secondsElapsed,
        mistakes: state.mistakes,
        nudgesUsed: state.nudgesUsed,
        completedAt: new Date().toISOString()
      };
      state.journeyProgress = normalizeCageGardenProgress(state.journeyProgress);
      state.unsavedCageGardenStepIds.add(getCageGardenStepIdentity(step.id));
    }
    return { step, newlyCompleted };
  }

  function hasDurablePlayerHistory() {
    return state.stats.solved > 0
      || Object.keys(state.stats.bestTimes || {}).length > 0
      || getCompletedCageGardenCount() > 0
      || Object.keys(state.dailyResults.entries).length > 0;
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
    return removeStored(BOARD_RECOVERY_DOMAIN, RESUME_KEY);
  }

  function saveResume() {
    if (!state.puzzleMeta || state.completed) {
      const cleanup = clearResume();
      return cleanup === "failed" ? "failed" : "skipped";
    }
    const journeyStep = getCageGardenStep(state.activeJourneyStepId);
    return persistJson(BOARD_RECOVERY_DOMAIN, RESUME_KEY, {
      version: RESUME_VERSION,
      runSource: state.runSource,
      level: state.level,
      mode: state.mode,
      puzzleId: state.puzzleMeta.id,
      board: state.board,
      notes: state.notes.map((entry) => Array.from(entry)),
      selectedIndex: state.selectedIndex,
      mistakes: state.mistakes,
      nudgesUsed: state.nudgesUsed,
      nudgeCountedKeys: [...state.nudgeCountedKeys].slice(-MAX_COUNTED_PROOFS),
      ...(state.focusLaunchId === state.puzzleMeta.id && state.puzzleMeta.logicFocus ? { focusLaunchId: state.focusLaunchId } : {}),
      notesMode: state.notesMode,
      showMistakes: state.showMistakes,
      secondsElapsed: state.secondsElapsed,
      paused: state.paused,
      pauseReason: state.pauseReason,
      lastUpdatedAt: new Date().toISOString(),
      ...(state.runSource === "cage-garden" && journeyStep ? { journeyId: CAGE_GARDEN_ID, journeyStepId: journeyStep.id } : {}),
      ...(state.runSource === "daily-edition" && state.dailyEdition ? { dailyEdition: state.dailyEdition } : {})
    });
  }

  function getCurrentDateKey() {
    return DailyEditions.getLocalDateKey();
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

  function resolveDailyEdition(level, edition = getCurrentDateKey(), corpus = DailyEditions.getCurrentCorpusId("suguru")) {
    return DailyEditions.resolveEdition({
      gameId: "suguru",
      band: level,
      edition,
      corpus,
      puzzleLibrary: window.SUGURU_PUZZLES,
      today: getCurrentDateKey()
    });
  }

  function resolveDailyRouteRequest(level, edition, corpus, requestKind) {
    const today = getCurrentDateKey();
    const requestedEdition = requestKind === "shorthand" ? today : edition;
    const requestedCorpus = requestKind === "shorthand" ? DailyEditions.getCurrentCorpusId("suguru") : corpus;
    let resolution = resolveDailyEdition(level, requestedEdition, requestedCorpus);
    if (resolution.ok) return { resolution, message: null, unavailable: false };
    if (resolution.reason === "corpus-unavailable") {
      return { resolution: null, unavailable: true, message: "The verified Daily corpus is unavailable, so an ordinary Classic clue variant was opened instead." };
    }
    const rejectedReason = resolution.reason;
    resolution = resolveDailyEdition(level, today, DailyEditions.getCurrentCorpusId("suguru"));
    if (!resolution.ok) {
      return { resolution: null, unavailable: true, message: "The verified Daily corpus is unavailable, so an ordinary Classic clue variant was opened instead." };
    }
    return {
      resolution,
      unavailable: false,
      message: rejectedReason === "future-edition"
        ? "That future Daily edition is unavailable, so today's verified edition was opened."
        : "That Daily edition link was invalid or unavailable, so today's verified edition was opened."
    };
  }

  function readSettingsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const level = params.get("level");
    const mode = params.get("mode");
    const normalizedLevel = LEVELS.some((entry) => entry.id === level) ? level : DEFAULT_LEVEL;
    const normalizedMode = Object.prototype.hasOwnProperty.call(MODES, mode) ? mode : DEFAULT_MODE;
    const hasEdition = params.has("edition");
    const hasCorpus = params.has("corpus");
    const dailyRequestKind = normalizedMode !== "daily"
      ? null
      : !hasEdition && !hasCorpus
        ? "shorthand"
        : hasEdition && hasCorpus
          ? "explicit"
          : "invalid";
    const dailyRoute = normalizedMode === "daily"
      ? resolveDailyRouteRequest(normalizedLevel, params.get("edition"), params.get("corpus"), dailyRequestKind)
      : { resolution: null, message: null, unavailable: false };
    return {
      hasIdentityParams: ["game", "level", "mode", "edition", "corpus"].some((key) => params.has(key)),
      hasDisplayParams: ["notes", "mistakes"].some((key) => params.has(key)),
      level: normalizedLevel,
      mode: normalizedMode,
      dailyRequestKind,
      dailyResolution: dailyRoute.resolution,
      dailyFallbackMessage: dailyRoute.message,
      dailyUnavailable: dailyRoute.unavailable,
      notesMode: params.has("notes") ? params.get("notes") === "on" : undefined,
      showMistakes: params.has("mistakes") ? params.get("mistakes") !== "off" : undefined,
      sourceDifficulty: ["medium", "advanced", "hard", "expert"].includes(params.get("sourceDifficulty")) ? params.get("sourceDifficulty") : null,
      sourceMode: ["sprint", "nocheck", "zen"].includes(params.get("sourceMode")) ? params.get("sourceMode") : null
    };
  }

  function syncUrl() {
    const params = new URLSearchParams();
    params.set("game", "suguru");
    params.set("level", state.level);
    params.set("mode", state.mode);
    if (state.runSource === "daily-edition" && state.dailyEdition) {
      params.set("edition", state.dailyEdition.edition);
      params.set("corpus", state.dailyEdition.corpus);
    } else {
      if (state.sourceDifficultyHint) params.set("sourceDifficulty", state.sourceDifficultyHint);
      if (state.sourceModeHint) params.set("sourceMode", state.sourceModeHint);
    }
    params.set("notes", state.notesMode ? "on" : "off");
    params.set("mistakes", state.showMistakes ? "on" : "off");
    window.history.replaceState({}, "", `${getCurrentPageName()}?${params.toString()}`);
    if (typeof window.setGameNavigationContext === "function") {
      window.setGameNavigationContext({ runSource: state.runSource, dailyEdition: state.dailyEdition });
    } else if (typeof window.updateGameNavLinks === "function") {
      window.updateGameNavLinks();
    }
  }

  function shouldIgnoreKeydown() {
    const activeElement = document.activeElement;
    return !(activeElement === elements.board || elements.board.contains(activeElement));
  }


  function getFallbackPuzzle(level, mode) {
    const pool = getPuzzles(level).filter((entry) => entry.selectable !== false);
    if (!pool.length) {
      return null;
    }
    const filtered = pool.filter((entry) => `${level}:${entry.id}` !== state.lastPuzzleKey);
    const source = filtered.length ? filtered : pool;
    const puzzle = source[Math.floor(Math.random() * source.length)];
    state.lastPuzzleKey = `${level}:${puzzle.id}`;
    return puzzle;
  }

  function getPracticePuzzle(level, mode) {
    const result = PracticeSelection.commitSelection({
      launchKind: "ordinary-practice",
      gameId: "suguru",
      band: level,
      entries: getPuzzles(level),
      random: Math.random
    });
    if (!result.ok) return getFallbackPuzzle(level, mode);
    updateSaveHealth("practice-rotation", "write", result.persisted ? "saved" : "session-only");
    state.lastPuzzleKey = `${level}:${result.puzzle.id}`;
    return result.puzzle;
  }

  function startPracticePuzzle(level, mode, options = {}) {
    startNewPuzzle(level, mode, { ...options, launchKind: "ordinary-practice" });
  }

  function clearFreshChallengePreview() {
    freshChallengePreview = null;
  }

  function prepareFreshChallengePreview() {
    if (freshChallengeLaunching) return freshChallengePreview;
    const level = LEVELS.some((entry) => entry.id === state.pendingLevel) ? state.pendingLevel : state.level;
    const requestedMode = Object.prototype.hasOwnProperty.call(MODES, state.pendingMode) ? state.pendingMode : state.mode;
    const mode = requestedMode === "daily" ? "classic" : requestedMode;
    const selected = PracticeSelection.select({
      gameId: "suguru",
      band: level,
      entries: getPuzzles(level),
      state: PracticeSelection.readState(),
      random: Math.random
    });
    if (!selected.ok) {
      freshChallengePreview = null;
      setMessage("A fresh challenge is unavailable for that level right now. Your current board is unchanged.");
      return null;
    }
    freshChallengePreview = { level, mode, puzzle: selected.puzzle, nextState: selected.nextState };
    return freshChallengePreview;
  }

  function launchFreshChallenge() {
    if (freshChallengeLaunching) return;
    const preview = freshChallengePreview || prepareFreshChallengePreview();
    if (!preview) return;
    freshChallengePreview = null;
    freshChallengeLaunching = true;
    elements.freshChallengeButton.disabled = true;
    try {
      const written = PracticeSelection.writeState(preview.nextState);
      updateSaveHealth("practice-rotation", "write", written.persisted ? "saved" : "session-only");
      state.lastPuzzleKey = `${preview.level}:${preview.puzzle.id}`;
      startNewPuzzle(preview.level, preview.mode, {
        forcedPuzzle: preview.puzzle,
        runSource: "ordinary",
        announcement: `Fresh challenge opened: ${getLevelMeta(preview.level).label} · ${MODES[preview.mode].label}.`
      });
      window.requestAnimationFrame(enterCurrentBoard);
    } finally {
      window.requestAnimationFrame(() => {
        freshChallengeLaunching = false;
        elements.freshChallengeButton.disabled = false;
      });
    }
  }

  function launchPendingPuzzle() {
    const replaysActiveDaily = state.runSource === "daily-edition"
      && state.dailyEdition
      && state.pendingLevel === state.level
      && state.pendingMode === state.mode;
    if (replaysActiveDaily) {
      startNewPuzzle(state.level, "daily", { dailyEdition: state.dailyEdition });
      return;
    }
    startPracticePuzzle(state.pendingLevel, state.pendingMode);
  }

  function setMessage(message) {
    elements.message.textContent = message;
  }

  function statListRow(label, value) {
    return `<div class="stats-item" role="listitem"><span>${label}</span><strong>${value}</strong></div>`;
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

  function getDailyRelationLabel(identity = state.dailyEdition) {
    if (!identity) return "Daily";
    return identity.edition === getCurrentDateKey() ? "Today's Daily" : "Past Daily";
  }

  function setRunSource(runSource, { dailyEdition = null, journeyStepId = null } = {}) {
    state.runSource = runSource;
    state.dailyEdition = runSource === "daily-edition" ? dailyEdition : null;
    state.activeJourneyStepId = runSource === "cage-garden" ? getCageGardenStep(journeyStepId)?.id || null : null;
  }

  function getDailyCardIdentity() {
    if (state.runSource === "daily-edition" && state.dailyEdition) return state.dailyEdition;
    const result = getEffectiveDailyResultByKey(`${DailyEditions.getCurrentCorpusId("suguru")}|${getCurrentDateKey()}|${state.level}`);
    return result ? {
      version: DailyEditions.version,
      gameId: "suguru",
      corpus: result.corpus,
      edition: result.edition,
      band: result.band,
      puzzleId: result.puzzleId
    } : null;
  }

  function setTextIfChanged(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function renderDailyResult() {
    const identity = getDailyCardIdentity();
    const activeIdentity = state.runSource === "daily-edition" && dailyIdentitiesMatch(identity, state.dailyEdition);
    elements.dailyResultCard.hidden = !identity;
    if (!identity) {
      elements.dailyResultList.innerHTML = "";
      setTextIfChanged(elements.dailyEditionStatus, "Unsolved");
      elements.dailyEditionStreak.textContent = `${getVerifiedDailyStreak()} day local Daily streak`;
      elements.shareDailyButton.hidden = true;
      setDiscardKind(elements.dailyEditionPrimaryButton, null);
      return;
    }
    const result = getDailyResult(identity);
    const pending = isPendingDailyResult(identity);
    const progress = activeIdentity && hasCurrentBoardProgress();
    elements.dailyEditionTitle.textContent = `${getDailyRelationLabel(identity)} · ${DailyEditions.formatEditionDate(identity.edition)}`;
    setTextIfChanged(elements.dailyEditionStatus, result
      ? `${pending ? "Solved this session — not saved" : "Solved locally"} · ${result.nudgesUsed} nudge${result.nudgesUsed === 1 ? "" : "s"}.`
      : progress ? "In progress." : "Unsolved.");
    elements.dailyResultList.innerHTML = [
      statListRow("Edition", identity.edition),
      statListRow("Level", getLevelMeta(identity.band).label),
      ...(result ? [
        statListRow("Time", window.SuguruCore.formatTime(result.seconds)),
        statListRow("Mistakes", String(result.mistakes))
      ] : [])
    ].join("");
    const streak = getVerifiedDailyStreak();
    elements.dailyEditionStreak.textContent = `${streak} day${streak === 1 ? "" : "s"} local Daily streak`;
    elements.dailyResultShareText.textContent = pending
      ? "This result is available only in this tab and is not saved. Sharing sends only the edition and result."
      : "When browser storage is available, results stay here. Sharing sends only this edition and result.";
    elements.dailyEditionPrimaryButton.textContent = activeIdentity
      ? result && state.completed ? "Replay this edition ↺" : "Continue on board"
      : "Open this edition ↗";
    const preservesCurrentBoard = activeIdentity && !(result && state.completed);
    elements.dailyEditionPrimaryButton.onclick = preservesCurrentBoard
      ? enterCurrentBoard
      : () => runHeroAction(() => startNewPuzzle(identity.band, "daily", { dailyEdition: identity }));
    setDiscardKind(elements.dailyEditionPrimaryButton, preservesCurrentBoard ? null : "replace");
    elements.shareDailyButton.hidden = !result;
  }

  function buildDailyShareText(result, identity = state.dailyEdition) {
    const streak = getVerifiedDailyStreak();
    const streakTag = isPendingDailyResult(identity || result)
      ? `Session-only — not saved in this browser · Saved Daily streak: ${streak} day${streak === 1 ? "" : "s"}`
      : formatDayStreak(streak);
    return `Sudoku Sakura Suguru Daily ${DailyEditions.formatEditionDate(result.edition)} · ${getLevelMeta(result.band).label} · ${window.SuguruCore.formatTime(result.seconds)} · ${result.mistakes} mistake${result.mistakes === 1 ? "" : "s"} · ${result.nudgesUsed} nudge${result.nudgesUsed === 1 ? "" : "s"} · ${streakTag}.`;
  }

  function buildShareMetaChips(parts) {
    return parts.map((part) => `<span class="chip" role="listitem">${part}</span>`).join("");
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

  function renderLaunchButton() {
    if (!elements.newGameButton) {
      return;
    }
    const pendingLevel = LEVELS.some((entry) => entry.id === state.pendingLevel) ? state.pendingLevel : state.level;
    const pendingMode = Object.prototype.hasOwnProperty.call(MODES, state.pendingMode) ? state.pendingMode : state.mode;
    const levelLabel = getLevelMeta(pendingLevel).label.replace(/^Size 5 · /, "");
    const modeLabel = MODES[pendingMode].label;
    const settingsChanged = pendingLevel !== state.level || pendingMode !== state.mode;
    const label = settingsChanged
      ? `Start ${levelLabel} · ${modeLabel} clue variant`
      : state.runSource === "daily-edition"
        ? `Replay this ${levelLabel} Daily edition`
        : `Another ${levelLabel} · ${modeLabel} clue variant`;
    elements.newGameButton.textContent = label;
    elements.newGameButton.setAttribute("aria-label", `${label}. This replaces the current board.`);
  }

  function renderHeroSummary() {
    const key = `${state.level}:${state.mode}`;
    const best = state.stats.bestTimes[key];
    const bestLabel = best ? window.SuguruCore.formatTime(best) : "—";
    const returningPlayer = hasReturningPlayerState();
    document.body.classList.toggle("is-returning-player", returningPlayer);
    const activeJourneyStep = getCageGardenStep(state.activeJourneyStepId);
    const journeyPrefix = activeJourneyStep
      ? `Cage Garden ${getCompletedCageGardenCount()}/4 · ${activeJourneyStep.label} · `
      : "";
    elements.heroSummary.hidden = false;
    const sourceLabel = state.runSource === "daily-edition" ? getDailyRelationLabel() : state.runSource === "cage-garden" ? "Cage Garden" : MODES[state.mode].label;
    elements.heroSummary.textContent = `${journeyPrefix}${getLevelMeta(state.level).label} · ${sourceLabel} · Best ${bestLabel} · ${formatDayStreak(state.stats.streak)}`;
  }

  function hasReturningPlayerState() {
    return !state.isNewcomerSession;
  }

  function renderOnboardingCard() {
    if (!elements.onboardingCard) {
      return;
    }
    const shouldAutoShow = !state.onboardingDismissed && !hasReturningPlayerState();
    elements.onboardingCard.hidden = !(shouldAutoShow || state.onboardingPeekOpen);
  }

  function getHeroDailyAction() {
    if (state.runSource === "daily-edition" && state.dailyEdition) {
      const identity = state.dailyEdition;
      return {
        label: "Replay this Daily edition",
        run: () => startNewPuzzle(identity.band, "daily", { dailyEdition: identity })
      };
    }
    return {
      label: "Start today's clue variant",
      run: () => startNewPuzzle(state.level, "daily")
    };
  }

  function hasCurrentBoardProgress() {
    return state.secondsElapsed > 0
      || state.board.some((value, index) => value !== state.puzzle[index])
      || state.notes.some((entry) => entry.size > 0);
  }

  function enterCurrentBoard() {
    if (!elements.gameTitle) {
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elements.gameTitle.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start"
    });
    window.requestAnimationFrame(() => elements.gameTitle.focus({ preventScroll: true }));
  }

  function runHeroAction(action) {
    action();
    window.requestAnimationFrame(enterCurrentBoard);
  }

  function getHeroBoardActionLabel() {
    if (state.bootDisposition === "restored-resume" && state.puzzleMeta) {
      return `Continue ${state.puzzleMeta.label}`;
    }
    const activeStep = getCageGardenStep(state.activeJourneyStepId);
    if (activeStep) {
      return hasCurrentBoardProgress() ? `Continue ${activeStep.label}` : `Enter ${activeStep.label}`;
    }
    return hasCurrentBoardProgress() ? "Continue current board" : "Go to current board";
  }

  function setDiscardKind(button, kind) {
    if (!button) return;
    if (kind) button.dataset.discardKind = kind;
    else delete button.dataset.discardKind;
  }

  function renderHeroActions() {
    if (!elements.heroDailyButton || !elements.heroChallengeButton) {
      return;
    }

    elements.heroDailyButton.textContent = getHeroBoardActionLabel();
    elements.heroDailyButton.onclick = enterCurrentBoard;
    if (state.isNewcomerSession) {
      elements.heroChallengeButton.textContent = "Learn the two rules";
      elements.heroChallengeButton.onclick = openCageGardenGuide;
      setDiscardKind(elements.heroChallengeButton, null);
      return;
    }
    const dailyAction = getHeroDailyAction();
    elements.heroChallengeButton.textContent = dailyAction.label;
    elements.heroChallengeButton.onclick = () => runHeroAction(dailyAction.run);
    setDiscardKind(elements.heroChallengeButton, "replace");
  }

  function getCageGardenAction() {
    const completedCount = getCompletedCageGardenCount();
    const activeStep = !state.completed ? getCageGardenStep(state.activeJourneyStepId) : null;
    if (activeStep) {
      return {
        label: hasCurrentBoardProgress() ? `Continue ${activeStep.label}` : `Go to ${activeStep.label}`,
        description: `${activeStep.description} This action keeps the current board intact.`,
        run: enterCurrentBoard,
        discardKind: null,
        targetLevel: activeStep.level,
        focus: `Cage Garden ${completedCount}/4`
      };
    }
    const nextStep = getNextCageGardenStep();
    if (nextStep) {
      return {
        label: `Start ${nextStep.label}`,
        description: nextStep.description,
        run: () => startCageGardenStep(nextStep),
        discardKind: "replace",
        targetLevel: nextStep.level,
        focus: `Cage Garden ${completedCount}/4`
      };
    }
    return {
      label: "Play today's clue variant",
      description: "Cage Garden is complete. Keep the rhythm with today's deterministic clue variant.",
      run: () => startNewPuzzle(state.level, "daily"),
      discardKind: "replace",
      targetLevel: state.level,
      focus: "Cage Garden 4/4"
    };
  }

  function renderRitualCard() {
    if (!elements.ritualTitle || !elements.ritualText || !elements.ritualButton) {
      return;
    }

    const nextAction = getCageGardenAction();
    elements.ritualTitle.textContent = nextAction.label;
    elements.ritualText.textContent = nextAction.description;
    elements.ritualButton.textContent = nextAction.label;
    elements.ritualButton.onclick = nextAction.run;
    setDiscardKind(elements.ritualButton, nextAction.discardKind);
  }

  function getProfileCapabilityLabel(meta) {
    const profile = meta?.logicProfile;
    if (!profile) return "Profile pending";
    const capability = {
      local: "Local logic",
      interaction: "Interaction logic",
      subset: "Subset logic"
    }[profile.hardestBand] || "Opening profile";
    return profile.status === "stalled" ? `${capability} · stalls honestly` : capability;
  }

  function getProfileWorkloadLabel(meta) {
    const profile = meta?.logicProfile;
    if (!profile) return Number.isFinite(meta?.estimatedMinutes) ? `Target ${meta.estimatedMinutes} min` : "Workload pending";
    return `${profile.logicalSteps} steps · ${profile.placementSteps} placements`;
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
      elements.puzzleTimeChip.textContent = getProfileWorkloadLabel(state.puzzleMeta);
      elements.puzzleScoreChip.textContent = state.puzzleMeta.logicFocus
        ? `LogicCoach v${state.puzzleMeta.logicFocus.profileVersion} pair · ${state.puzzleMeta.logicFocus.candidateEliminations} eliminations`
        : getProfileCapabilityLabel(state.puzzleMeta);
    }
    if (elements.boardPuzzleCluesChip) {
      elements.boardPuzzleCluesChip.textContent = `${state.puzzleMeta.clueCount} clues`;
      elements.boardPuzzleTimeChip.textContent = getProfileWorkloadLabel(state.puzzleMeta);
      elements.boardPuzzleScoreChip.textContent = state.puzzleMeta.logicFocus
        ? `LogicCoach v${state.puzzleMeta.logicFocus.profileVersion} pair · ${state.puzzleMeta.logicFocus.candidateEliminations} eliminations`
        : getProfileCapabilityLabel(state.puzzleMeta);
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

  function getPairFocusPuzzle() {
    return (window.SUGURU_PUZZLES["size5-challenge"] || []).find((entry) => entry.id === "suguru-size5-mist-pair-current" && entry.selectable !== false && entry.logicFocus) || null;
  }

  function qualifiesForPairFocus() {
    const bridgeBest = Object.entries(state.stats.bestTimes || {}).some(([key, seconds]) => /^(size5-medium|size5-challenge):/.test(key) && Number.isFinite(seconds) && seconds >= 0);
    const bridgeJourney = ["brook-crossing", "cascade-finale"].some((stepId) => Boolean(state.journeyProgress.completedSteps[stepId]));
    return bridgeBest || bridgeJourney;
  }

  function hasMeaningfulCompassProgress() {
    return state.mistakes > 0
      || state.nudgesUsed > 0
      || state.board.some((value, index) => value !== state.puzzle[index])
      || state.notes.some((entry) => entry.size > 0);
  }

  function currentCompassDescriptor() {
    if (state.completed || !state.puzzleMeta) return null;
    const specialSource = state.runSource === "daily-edition" || state.runSource === "cage-garden";
    if (!specialSource && !state.puzzleMeta.logicFocus && !hasMeaningfulCompassProgress()) return null;
    const sourceLabel = state.runSource === "daily-edition"
      ? getDailyRelationLabel()
      : state.runSource === "cage-garden"
        ? "Cage Garden"
        : state.puzzleMeta.logicFocus ? "Pair Focus" : "In progress";
    return {
      actionId: "current-board",
      title: `Continue ${state.puzzleMeta.label}`,
      text: `${sourceLabel} is already open. Keep your entries, notes, and source identity on this board.`,
      label: "Continue current board",
      tag: sourceLabel,
      focus: "Keep progress",
      discardKind: null
    };
  }

  function cageGardenCompassDescriptor() {
    const completedCount = getCompletedCageGardenCount();
    const nextStep = getNextCageGardenStep();
    if (!nextStep || completedCount < 1) return null;
    return {
      actionId: "cage-garden-continuation",
      title: `Continue to ${nextStep.label}`,
      text: `${completedCount}/4 Cage Garden steps are complete. ${nextStep.description}`,
      label: `Start ${nextStep.label}`,
      tag: getLevelMeta(nextStep.level).label,
      focus: `Cage Garden ${completedCount}/4`,
      discardKind: "replace"
    };
  }

  function pairFocusCompassDescriptor() {
    const puzzle = getPairFocusPuzzle();
    if (!puzzle || !qualifiesForPairFocus() || ChallengeCompass.isFocusComplete(state.focusResults, "suguru", puzzle.id)) return null;
    const evidence = puzzle.logicFocus;
    return {
      actionId: "pair-focus",
      title: "Pair Focus: unlock the cage",
      text: `Two cells in one cage share the same two candidates; remove those values from the cage’s other cells. LogicCoach v${evidence.profileVersion} removes ${evidence.candidateEliminations} candidates here; the same trace later records ${evidence.downstreamPlacements} placements.`,
      label: "Open Pair Focus ✦",
      tag: "Challenge · Classic",
      focus: "Cage naked pair",
      discardKind: "replace"
    };
  }

  function hasEffectiveDailyResult() {
    const key = `${DailyEditions.getCurrentCorpusId("suguru")}|${getCurrentDateKey()}|${state.level}`;
    return Boolean(getEffectiveDailyResultByKey(key));
  }

  function dailyCompassDescriptor() {
    if (state.runSource === "daily-edition" || hasEffectiveDailyResult()) return null;
    return {
      actionId: "daily",
      title: "Today’s verified clue variant is waiting",
      text: `Open the shared ${getLevelMeta(state.level).label} board for today. Its identity is fixed by the verified Daily corpus.`,
      label: "Play Daily",
      tag: "Daily",
      focus: "Shared cages",
      discardKind: "replace"
    };
  }

  function fallbackCompassDescriptor() {
    return {
      actionId: "ordinary-practice",
      title: `Another ${getLevelMeta(state.level).label} board`,
      text: "Continue ordinary practice with structural rotation across selectable cage families.",
      label: `Play ${getLevelMeta(state.level).label.replace(/^Size 5 · /, "")}`,
      tag: MODES[state.mode].label,
      focus: "Fresh cage family",
      discardKind: "replace"
    };
  }

  function getChallengeCompass() {
    return ChallengeCompass.choose({
      current: currentCompassDescriptor(),
      continuation: cageGardenCompassDescriptor(),
      focus: pairFocusCompassDescriptor(),
      daily: dailyCompassDescriptor(),
      fallback: fallbackCompassDescriptor()
    });
  }

  function runChallengeCompass(recommendation) {
    if (!recommendation) return;
    if (recommendation.actionId === "current-board") {
      enterCurrentBoard();
      return;
    }
    if (recommendation.actionId === "cage-garden-continuation") {
      const nextStep = getNextCageGardenStep();
      if (nextStep) startCageGardenStep(nextStep);
      return;
    }
    if (recommendation.actionId === "pair-focus") {
      const puzzle = getPairFocusPuzzle();
      if (!puzzle) {
        setMessage("Pair Focus is unavailable, so your current board was left unchanged.");
        renderRailNextStep();
        return;
      }
      startNewPuzzle("size5-challenge", "classic", { forcedPuzzle: puzzle, launchKind: "technique-focus" });
      return;
    }
    if (recommendation.actionId === "daily") {
      startNewPuzzle(state.level, "daily");
      return;
    }
    startPracticePuzzle(state.level, state.mode);
  }

  function renderRailNextStep() {
    if (!elements.railNextStepButton) return;
    const nextAction = getChallengeCompass();
    if (!nextAction) return;
    elements.railNextStepTitle.textContent = nextAction.title;
    elements.railNextStepText.textContent = nextAction.text;
    elements.railNextStepTag.textContent = nextAction.tag;
    elements.railNextStepFocus.textContent = nextAction.focus;
    elements.railNextStepButton.textContent = nextAction.label;
    elements.railNextStepButton.onclick = () => runChallengeCompass(nextAction);
    setDiscardKind(elements.railNextStepButton, nextAction.discardKind);
  }

  function getCageGardenStepState(step) {
    if (!state.completed && state.activeJourneyStepId === step.id) {
      return "active";
    }
    if (state.journeyProgress.completedSteps[step.id]) {
      return "complete";
    }
    if (getNextCageGardenStep()?.id === step.id) {
      return "ready";
    }
    return "locked";
  }

  function runCageGardenStepAction(step, stepState) {
    if (stepState === "active") {
      enterCurrentBoard();
      return;
    }
    if (stepState === "complete" || stepState === "ready") {
      startCageGardenStep(step);
    }
  }

  function renderCageGarden() {
    if (!elements.cageGardenButton || !elements.cageGardenSteps) {
      return;
    }
    const completedCount = getCompletedCageGardenCount();
    const nextStep = getNextCageGardenStep();
    const activeStep = !state.completed ? getCageGardenStep(state.activeJourneyStepId) : null;
    elements.cageGardenProgress.textContent = `Cage Garden ${completedCount}/4`;
    elements.cageGardenFocus.textContent = activeStep?.focus || nextStep?.focus || "Journey complete";
    elements.cageGardenText.textContent = completedCount === CAGE_GARDEN_STEPS.length
      ? "All four Cage Garden layouts are complete. Daily clue variants and completed-step replays stay available."
      : activeStep
        ? `${activeStep.description} Finish this exact clue variant to earn the next step.`
        : `${nextStep.description} Completed steps remain replayable.`;
    elements.cageGardenSteps.innerHTML = CAGE_GARDEN_STEPS.map((step) => {
      const stepState = getCageGardenStepState(step);
      const sessionOnly = stepState === "complete" && state.unsavedCageGardenStepIds.has(getCageGardenStepIdentity(step.id));
      const statusLabel = stepState === "complete"
        ? sessionOnly ? "Complete this session" : "Complete"
        : stepState === "active"
          ? "Active"
          : stepState === "ready"
            ? "Ready"
            : "Locked";
      const actionLabel = stepState === "complete" ? `Replay ${step.label}` : null;
      return `<div class="achievement-item cage-garden-step" role="listitem" data-step-id="${step.id}" data-step-state="${stepState}"><strong>${step.label} · ${statusLabel}</strong><span>${step.description}</span>${actionLabel ? `<button class="action-button subtle cage-garden-step-action" type="button" data-cage-garden-step-action="${step.id}" data-discard-kind="replace">${actionLabel}</button>` : ""}</div>`;
    }).join("");
    elements.cageGardenSteps.querySelectorAll("[data-cage-garden-step-action]").forEach((button) => {
      const step = getCageGardenStep(button.dataset.cageGardenStepAction);
      button.addEventListener("click", () => runCageGardenStepAction(step, getCageGardenStepState(step)));
    });

    if (completedCount === CAGE_GARDEN_STEPS.length) {
      elements.cageGardenButton.textContent = "Play today's clue variant";
      elements.cageGardenButton.onclick = () => startNewPuzzle(state.level, "daily");
      setDiscardKind(elements.cageGardenButton, "replace");
    } else if (activeStep) {
      elements.cageGardenButton.textContent = `Go to ${activeStep.label} ↑`;
      elements.cageGardenButton.onclick = enterCurrentBoard;
      setDiscardKind(elements.cageGardenButton, null);
    } else {
      elements.cageGardenButton.textContent = `Start ${nextStep.label}`;
      elements.cageGardenButton.onclick = () => startCageGardenStep(nextStep);
      setDiscardKind(elements.cageGardenButton, "replace");
    }
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
    elements.nudgeButton.disabled = inactive || state.paused;
    elements.nudgeButton.classList.toggle("is-disabled", inactive || state.paused);
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
    elements.entryModeBar?.setAttribute("aria-disabled", String(inactive));
  }

  function getActiveOverlayControls() {
    if (state.paused && !elements.pauseOverlay.hidden) {
      return [elements.resumeButton];
    }

    if (state.resultView === "dialog" && !elements.victoryOverlay.hidden) {
      return [elements.victoryNewGameButton, elements.victorySecondaryButton, elements.victoryReviewButton, elements.shareVictoryButton].filter(Boolean);
    }

    return [];
  }

  function updateModalInertState() {
    const overlayActive = state.paused || state.resultView === "dialog";
    const saveHealthMuted = state.paused || state.resultView !== "none";
    document.documentElement.classList.toggle("modal-open", overlayActive);
    [elements.topbar, elements.hero, elements.gameHeader, elements.controlsRow, elements.focusRibbon, elements.actionsBar, elements.entryModeBar, elements.optionsPanel, elements.sidebar, elements.siteFooter, elements.numberPad, elements.setupHelpPanel, elements.message]
      .filter(Boolean)
      .forEach((section) => {
        section.inert = overlayActive;
        section.setAttribute("aria-hidden", String(overlayActive));
      });
    const overlayRoots = [elements.pauseOverlay, elements.victoryOverlay].filter(Boolean);
    document.querySelectorAll("a[href], button, input, select, summary, [tabindex]").forEach((control) => {
      if (overlayRoots.some((overlay) => overlay.contains(control))) {
        return;
      }
      control.inert = overlayActive;
    });
    if (elements.localSaveStatus) {
      elements.localSaveStatus.inert = saveHealthMuted;
      elements.localSaveStatus.setAttribute("aria-hidden", String(saveHealthMuted));
    }
    if (!saveHealthMuted && state.saveHealth.deferred) {
      scheduleSaveHealthPresentation();
    }
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

  function getVictoryActions(journeyCompletion) {
    if (journeyCompletion?.newlyCompleted) {
      const completedJourneyStep = journeyCompletion.step;
      const nextStep = getNextCageGardenStep();
      if (nextStep) {
        return {
          primary: {
            label: `Continue to ${nextStep.label}`,
            description: `${completedJourneyStep.label} is complete. ${nextStep.label} is now ready.`,
            run: () => startCageGardenStep(nextStep)
          },
          secondary: {
            label: `Replay ${completedJourneyStep.label}`,
            description: `Replay ${completedJourneyStep.label} without changing earned progress.`,
            run: () => startCageGardenStep(completedJourneyStep)
          }
        };
      }
      const firstStep = CAGE_GARDEN_STEPS[0];
      return {
        primary: {
          label: "Play today's clue variant",
          description: "Cage Garden complete · 4/4. Continue with today's deterministic clue variant.",
          run: () => startNewPuzzle(state.level, "daily")
        },
        secondary: {
          label: "Replay Garden Gate",
          description: "Replay the opening step without changing your completed journey.",
          run: () => startCageGardenStep(firstStep)
        }
      };
    }

    if (journeyCompletion?.step) {
      const replayedStep = journeyCompletion.step;
      const nextStep = getNextCageGardenStep();
      return {
        primary: {
          label: `Replay ${replayedStep.label}`,
          description: `${replayedStep.label} was already complete. Replay it without changing your progress.`,
          run: () => startCageGardenStep(replayedStep)
        },
        secondary: nextStep
          ? {
              label: `Continue to ${nextStep.label}`,
              description: `Your Cage Garden progress is unchanged; ${nextStep.label} remains ready.`,
              run: () => startCageGardenStep(nextStep)
            }
          : {
              label: "Play today's clue variant",
              description: "Cage Garden remains complete · 4/4. Play today's deterministic clue variant.",
              run: () => startNewPuzzle(state.level, "daily")
            }
      };
    }

    const levelLabel = getLevelMeta(state.level).label;
    if (state.runSource === "daily-edition" && state.dailyEdition) {
      const identity = state.dailyEdition;
      const pastEdition = identity.edition !== getCurrentDateKey();
      return {
        primary: {
          label: "Replay this Daily edition",
          description: `Replay the ${DailyEditions.formatEditionDate(identity.edition)} ${levelLabel} edition.`,
          run: () => startNewPuzzle(identity.band, "daily", { dailyEdition: identity })
        },
        secondary: pastEdition
          ? {
              label: "Play today's clue variant",
              description: "Keep this past result and open today's verified Daily edition.",
              run: () => startNewPuzzle(state.level, "daily")
            }
          : {
              label: `Another ${levelLabel} classic clue variant`,
              description: "Switch to a fresh Classic clue variant at the same level.",
              run: () => startPracticePuzzle(state.level, "classic")
            }
      };
    }
    return {
      primary: {
        label: `Another ${levelLabel} clue variant`,
        description: `Start another curated ${levelLabel} clue variant in ${MODES[state.mode].label}.`,
        run: () => startPracticePuzzle(state.level, state.mode)
      },
      secondary: {
        label: "Start today's clue variant",
        description: `Replace this board with today's deterministic ${levelLabel} clue variant.`,
        run: () => startNewPuzzle(state.level, "daily")
      }
    };
  }

  function renderVictoryShareCard() {
    const sourceLabel = state.runSource === "daily-edition" ? getDailyRelationLabel() : state.runSource === "cage-garden" ? "Cage Garden" : MODES[state.mode].label;
    elements.victoryShareTitle.textContent = `${getLevelMeta(state.level).label} · ${sourceLabel}`;
    elements.victoryShareMeta.innerHTML = buildShareMetaChips([
      window.SuguruCore.formatTime(state.secondsElapsed),
      `${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}`,
      `${state.nudgesUsed} nudge${state.nudgesUsed === 1 ? "" : "s"}`,
      formatDayStreak(state.stats.streak)
    ]);
    elements.victoryShareFacts.innerHTML = buildShareMetaChips([
      `${state.puzzleMeta.clueCount} clues`,
      getProfileWorkloadLabel(state.puzzleMeta),
      getProfileCapabilityLabel(state.puzzleMeta)
    ]);
  }

  function updateVictoryUi() {
    elements.victoryOverlay.hidden = state.resultView !== "dialog";
    elements.viewResultButton.hidden = state.resultView !== "review";
    elements.actionsBar.setAttribute("aria-label", state.resultView === "review" ? "Solved board actions" : "Board actions");
    updateModalInertState();
  }

  function buildVictoryShareText() {
    if (state.runSource === "daily-edition") {
      const result = getDailyResult();
      if (result) return buildDailyShareText(result, state.dailyEdition);
    }
    const sourceLabel = state.runSource === "cage-garden" ? "Cage Garden" : MODES[state.mode].label;
    return `Sudoku Sakura Suguru ${getLevelMeta(state.level).label} · ${sourceLabel} · ${window.SuguruCore.formatTime(state.secondsElapsed)} · ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"} · ${state.nudgesUsed} nudge${state.nudgesUsed === 1 ? "" : "s"} · ${formatDayStreak(state.stats.streak)}`;
  }

  function shareText(text, successMessage, shareUrl = buildShareUrl(), liveRegion = null) {
    const publishFeedback = (message) => {
      setMessage(message);
      if (liveRegion) liveRegion.textContent = message;
    };
    return (async () => {
      if (navigator.share) {
        try {
          await navigator.share({ text, url: shareUrl });
          publishFeedback(successMessage);
          return true;
        } catch (error) {
          if (error?.name === "AbortError") {
            publishFeedback("Sharing was cancelled.");
            return true;
          }
        }
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(`${text} ${shareUrl}`);
          publishFeedback(successMessage.replace("shared", "copied to clipboard"));
          return true;
        }
      } catch (error) {
        publishFeedback("Sharing is unavailable in this browser.");
        return false;
      }

      publishFeedback("Sharing is unavailable in this browser.");
      return false;
    })();
  }

  function buildShareUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("game", "suguru");
    url.searchParams.set("level", state.level);
    url.searchParams.set("mode", state.mode);
    if (state.runSource === "daily-edition" && state.dailyEdition) {
      url.searchParams.set("edition", state.dailyEdition.edition);
      url.searchParams.set("corpus", state.dailyEdition.corpus);
    }
    return url.toString();
  }

  function buildDailyShareUrl(identity) {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("game", "suguru");
    url.searchParams.set("level", identity.band);
    url.searchParams.set("mode", "daily");
    url.searchParams.set("edition", identity.edition);
    url.searchParams.set("corpus", identity.corpus);
    return url.toString();
  }

  async function shareVictoryResult() {
    if (!state.completed) {
      setMessage("Finish a Suguru board first to share the result.");
      return;
    }
    await shareText(buildVictoryShareText(), "Victory result shared.", buildShareUrl(), elements.victoryShareStatus);
  }

  async function shareDailyResult() {
    const identity = getDailyCardIdentity();
    const result = identity ? getDailyResult(identity) : null;
    if (!result) {
      setMessage("Finish this verified Daily edition first to share your result.");
      return;
    }
    await shareText(buildDailyShareText(result, identity), "Daily result shared.", buildDailyShareUrl(identity));
  }

  function buildCageRangeHint(selectedCageSize) {
    return `${selectedCageSize}-cell cage · use 1–${selectedCageSize}`;
  }

  function refreshModeUi() {
    elements.notesToggle.checked = state.notesMode;
    elements.mistakeToggle.checked = state.showMistakes;
    elements.notesToggle.disabled = state.completed || state.mode === "nonotes";
    elements.mistakeToggle.disabled = state.completed || state.mode === "nomistakes";
    elements.notesToggleCard.classList.toggle("is-disabled", state.completed || state.mode === "nonotes");
    elements.mistakeToggleCard.classList.toggle("is-disabled", state.completed || state.mode === "nomistakes");
    elements.statusModeLabel.textContent = state.runSource === "daily-edition"
      ? getDailyRelationLabel()
      : state.runSource === "cage-garden"
        ? "Cage Garden"
        : MODES[state.mode].label;
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

  function clearNudge() {
    state.nudgeStage = 0;
    state.lastNudgeKey = null;
    state.nudgeFocusIndexes = [];
    state.nudgeSourceIndexes = [];
    state.nudgeTargetIndexes = [];
    state.nudgeCoachState = null;
  }

  function resetNudgeRun() {
    clearNudge();
    state.nudgeCountedKeys = new Set();
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
    clearNudge();
    elements.mistakeCount.textContent = String(state.mistakes);
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    renderDailyResult();
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

  function hasMeaningfulDiscardProgress() {
    return Boolean(state.puzzleMeta && !state.completed && (
      state.hasDiscardableInteraction
      || state.mistakes > 0
      || state.nudgesUsed > 0
      || state.board.some((value, index) => value !== state.puzzle[index])
      || state.notes.some((entry) => entry.size > 0)
    ));
  }

  function getDiscardBoardIdentity() {
    if (!state.puzzleMeta) return "none";
    const sourceIdentity = state.runSource === "daily-edition"
      ? state.dailyEdition?.edition || "daily"
      : state.runSource === "cage-garden"
        ? state.activeJourneyStepId || "journey"
        : state.focusLaunchId || "ordinary";
    return [state.gameId, state.level, state.mode, state.puzzleMeta.id, state.runSource, sourceIdentity].join("|");
  }

  function installDiscardGuard() {
    discardGuard = BoardReplacementGuard.install({
      root: document,
      dialog: elements.discardDialog,
      title: elements.discardDialogTitle,
      description: elements.discardDialogDescription,
      keepButton: elements.discardKeepButton,
      confirmButton: elements.discardConfirmButton,
      adapter: {
        prepareDecision: (kind, trigger) => {
          if (kind === "replace" && trigger === elements.freshChallengeButton) prepareFreshChallengePreview();
          else clearFreshChallengePreview();
        },
        cancelDecision: (kind, trigger) => {
          if (kind === "replace" && trigger === elements.freshChallengeButton) clearFreshChallengePreview();
        },
        shouldConfirm: (kind, trigger) => !state.paused
          && (trigger !== elements.freshChallengeButton || Boolean(freshChallengePreview))
          && hasMeaningfulDiscardProgress(),
        getBoardIdentity: getDiscardBoardIdentity,
        isTimerRunning: () => Boolean(state.intervalId),
        suspendTimer: stopTimer,
        resumeTimer: startTimer,
        canResumeTimer: () => Boolean(state.puzzleMeta && !state.paused && !state.completed)
      }
    });
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
    resetForPuzzle(state.puzzleMeta, {
      disposition: state.runSource === "cage-garden" ? "preloaded-journey" : state.bootDisposition,
      focusLaunchId: state.focusLaunchId
    });
    setMessage(`Restarted ${state.puzzleMeta.label}.`);
  }

  function resetForPuzzle(puzzle, options = {}) {
    state.bootDisposition = options.disposition || (state.activeJourneyStepId ? "preloaded-journey" : "ordinary-untouched");
    state.pendingLevel = state.level;
    state.pendingMode = state.mode;
    elements.levelSelect.value = state.level;
    elements.modeSelect.value = state.mode;
    state.puzzleMeta = puzzle;
    state.focusLaunchId = options.focusLaunchId === puzzle.id && puzzle.logicFocus ? puzzle.id : null;
    state.puzzle = window.SuguruCore.parseGrid(puzzle.puzzle);
    state.solution = window.SuguruCore.parseGrid(puzzle.solution);
    state.board = [...state.puzzle];
    state.notes = createEmptyNotes(puzzle);
    state.selectedIndex = state.puzzle.findIndex((value) => value === 0);
    state.mistakes = 0;
    state.nudgesUsed = 0;
    state.hasDiscardableInteraction = false;
    resetNudgeRun();
    state.secondsElapsed = 0;
    state.paused = false;
    state.pauseReason = null;
    state.completed = false;
    state.resultView = "none";
    state.onboardingPeekOpen = false;
    clearReveal();
    state.undoStack = [];
    state.redoStack = [];
    elements.challengeLabel.textContent = `${puzzle.label} · ${LEVELS.find((entry) => entry.id === state.level)?.label || state.level}`;
    elements.timer.textContent = "00:00";
    elements.mistakeCount.textContent = "0";
    setMessage(MODES[state.mode].label + ": fill each cage with 1 up to its size and use touching-neighbor elimination to narrow the board.");
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    renderHeroSummary();
    renderHeroActions();
    renderLaunchButton();
    renderRitualCard();
    renderRailNextStep();
    renderCageGarden();
    renderDailyResult();
    renderPuzzleFacts();
    renderOnboardingCard();
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

  function getIncorrectIndexes() {
    return state.board
      .map((value, index) => ({ value, index }))
      .filter(({ value, index }) => state.puzzle[index] === 0 && value !== 0 && value !== state.solution[index])
      .map(({ index }) => index);
  }

  function formatNudgeCell(index) {
    const { row, col } = window.SuguruCore.indexToRowCol(index, state.puzzleMeta);
    return `row ${row + 1}, column ${col + 1}`;
  }

  function formatNudgeCells(indexes, limit = 3) {
    const unique = [...new Set(indexes)].filter((index) => Number.isInteger(index));
    const labels = unique.slice(0, limit).map(formatNudgeCell);
    if (unique.length > limit) labels.push(`${unique.length - limit} more highlighted cells`);
    return labels.join("; ");
  }

  function formatNudgeValues(values) {
    const labels = [...new Set(values)].map(String);
    if (labels.length <= 1) return labels[0] || "that value";
    return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
  }

  function withNudgeStages(messages) {
    return messages.map((message, index) => `Nudge ${index + 1} of 3 · ${message}`);
  }

  function getNudgeCageLabel(cageIndex) {
    const cage = state.puzzleMeta.cages[cageIndex] || [];
    return `cage ${cageIndex + 1} (${cage.length}-cell range 1–${cage.length})`;
  }

  function buildIncorrectNudge() {
    const incorrect = getIncorrectIndexes();
    if (!incorrect.length) return null;
    const index = incorrect.includes(state.selectedIndex) ? state.selectedIndex : incorrect[0];
    const actual = state.board[index];
    const expected = state.solution[index];
    const cell = formatNudgeCell(index);
    return {
      key: `correction:${index}:${actual}:${expected}`,
      countable: false,
      kind: "correction",
      focusIndexes: [...incorrect],
      sourceIndexes: [...incorrect],
      targetIndexes: [index],
      messages: withNudgeStages([
        `Correction first: inspect the highlighted entry at ${cell}.`,
        `${actual} conflicts with this puzzle's unique solution at ${cell}.`,
        `${cell} must be ${expected}, not ${actual}. Correct it, then ask for a fresh deduction.`
      ])
    };
  }

  function buildContradictionNudge(contradiction) {
    const indexes = [...(contradiction?.indexes || [])];
    const index = indexes.find((entry) => state.puzzle[entry] === 0) ?? indexes[0] ?? state.selectedIndex ?? 0;
    const expected = Number.isSafeInteger(contradiction?.expected) ? contradiction.expected : null;
    const detail = {
      duplicate: `The value ${contradiction.value} repeats inside a cage or across touching neighbors.`,
      "dead-cell": "The highlighted empty cell has no legal value under the current cage and neighbor constraints.",
      "missing-support": `${contradiction.label || "The highlighted cage"} has no remaining place for ${contradiction.value}.`,
      "given-mismatch": "A fixed clue no longer matches the puzzle definition.",
      "solution-eliminated": "The current entries eliminate the unique solution value from the highlighted cell.",
      "wrong-entry": "The highlighted value conflicts with this puzzle's unique solution."
    }[contradiction?.type] || "The highlighted cells contain a contradiction that blocks a safe deduction.";
    return {
      key: `contradiction:${JSON.stringify(contradiction || {})}`,
      countable: false,
      kind: "correction",
      focusIndexes: indexes,
      sourceIndexes: indexes,
      targetIndexes: [index],
      messages: withNudgeStages([
        `Correction first: inspect ${formatNudgeCells(indexes) || formatNudgeCell(index)}.`,
        detail,
        expected
          ? `Restore ${expected} at ${formatNudgeCell(index)}, then ask again.`
          : "Resolve the highlighted conflict before asking for another deduction."
      ])
    };
  }

  function buildLogicNudge(step) {
    const values = formatNudgeValues(step.values);
    const sources = formatNudgeCells(step.sourceIndexes);
    const targets = formatNudgeCells(step.targetIndexes);
    const cage = getNudgeCageLabel(step.context?.cageIndex ?? state.puzzleMeta.cageMap[step.targetIndexes[0]]);
    let messages;

    if (step.technique === "cage-full-house") {
      messages = [
        `Cage full house: scan the highlighted ${cage}.`,
        `${values} is the one value missing from that cage.`,
        `Place ${values} at ${targets}.`
      ];
    } else if (step.technique === "cell-single") {
      messages = [
        `Cell single: inspect ${targets} and all eight touching directions.`,
        `Its cage range and touching neighbors rule out every value except ${values}.`,
        `Place ${values} at ${targets}.`
      ];
    } else if (step.technique === "cage-hidden-single") {
      messages = [
        `Cage hidden single: track ${values} across the highlighted ${cage}.`,
        `Only ${targets} can still hold ${values} in that cage.`,
        `Place ${values} at ${targets}.`
      ];
    } else if (step.technique === "cross-cage") {
      messages = [
        `Cross-cage support: track ${values} inside the highlighted ${cage}.`,
        `Every support cell for ${values} in that cage touches ${targets}.`,
        `Remove ${values} from ${targets}, then rescan both cages.`
      ];
    } else if (step.technique === "cage-naked-pair") {
      messages = [
        `Cage naked pair: inspect the two source cells in the highlighted ${cage}.`,
        `${sources} are limited to ${values}, locking both values into that pair.`,
        `Remove ${values} from ${targets}, then rescan the cage.`
      ];
    } else {
      messages = [
        `Inspect the highlighted cage and touching neighbors for a safe ${step.kind}.`,
        `The highlighted evidence supports ${values} at or around ${targets}.`,
        step.kind === "placement" ? `Place ${values} at ${targets}.` : `Remove ${values} from ${targets}.`
      ];
    }

    return {
      key: step.canonicalKey,
      countable: true,
      kind: step.kind,
      focusIndexes: [...step.focusIndexes],
      sourceIndexes: [...step.sourceIndexes],
      targetIndexes: [...step.targetIndexes],
      messages: withNudgeStages(messages)
    };
  }

  function buildNudge() {
    const correction = buildIncorrectNudge();
    if (correction) {
      state.nudgeCoachState = null;
      return correction;
    }
    if (!state.nudgeCoachState) {
      try {
        state.nudgeCoachState = LogicCoach.createState({
          game: "suguru",
          board: state.board,
          puzzle: state.puzzle,
          solution: state.solution,
          meta: state.puzzleMeta
        });
      } catch (error) {
        return null;
      }
    }
    const contradiction = LogicCoach.getContradiction(state.nudgeCoachState);
    if (contradiction) return buildContradictionNudge(contradiction);

    let step = LogicCoach.getNextStep(state.nudgeCoachState);
    if (step && step.canonicalKey === state.lastNudgeKey && state.nudgeStage === 3 && step.kind === "elimination") {
      const nextCoachState = LogicCoach.applyStep(state.nudgeCoachState, step);
      const nextStep = LogicCoach.getNextStep(nextCoachState);
      if (nextStep) {
        state.nudgeCoachState = nextCoachState;
        step = nextStep;
      }
    }
    return step ? buildLogicNudge(step) : null;
  }

  function requestNudge() {
    if (state.completed || state.paused || !state.puzzleMeta) return;
    const restoreButtonFocus = document.activeElement === elements.nudgeButton;
    const nudge = buildNudge();
    if (!nudge) {
      clearNudge();
      setMessage("Nudge ✦ No supported single-step deduction is clear yet. Compare another cage's range with all eight touching neighbors.");
      renderBoard();
      if (restoreButtonFocus) elements.nudgeButton.focus({ preventScroll: true });
      return;
    }
    if (state.lastNudgeKey !== nudge.key) {
      if (nudge.countable && !state.nudgeCountedKeys.has(nudge.key)) {
        state.nudgesUsed += 1;
        state.nudgeCountedKeys.add(nudge.key);
      }
      state.nudgeStage = 1;
      state.lastNudgeKey = nudge.key;
    } else {
      state.nudgeStage = Math.min(3, state.nudgeStage + 1);
    }
    state.hasDiscardableInteraction = true;
    state.nudgeFocusIndexes = [...nudge.focusIndexes];
    state.nudgeSourceIndexes = [...nudge.sourceIndexes];
    state.nudgeTargetIndexes = [...nudge.targetIndexes];
    setMessage(nudge.messages[state.nudgeStage - 1]);
    renderBoard();
    if (restoreButtonFocus) elements.nudgeButton.focus({ preventScroll: true });
    renderRailNextStep();
    saveResume();
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
    if (state.nudgeStage >= 1 && state.nudgeFocusIndexes.includes(index)) {
      parts.push("nudge focus area");
    }
    if (state.nudgeStage >= 2 && state.nudgeSourceIndexes.includes(index)) {
      parts.push("nudge evidence");
    }
    if (state.nudgeStage >= 3 && state.nudgeTargetIndexes.includes(index)) {
      parts.push("nudge target");
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
    if (state.completed) {
      elements.board.focus({ preventScroll: true });
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
    const shouldRestoreCellFocus = elements.board.contains(document.activeElement);
    const resultDialogOpen = state.resultView === "dialog";
    elements.board.innerHTML = "";
    elements.board.setAttribute("aria-disabled", String(state.paused || resultDialogOpen || !state.puzzleMeta));
    elements.board.setAttribute("aria-readonly", String(state.completed));
    elements.board.setAttribute("aria-rowcount", String(meta.size));
    elements.board.setAttribute("aria-colcount", String(meta.size));
    elements.board.inert = state.paused || resultDialogOpen || !state.puzzleMeta;
    elements.board.style.setProperty("--board-size", String(meta.size));
    elements.board.classList.add("is-suguru");
    elements.board.classList.toggle("is-paused", state.paused);
    const rowElements = Array.from({ length: meta.size }, (_, rowIndex) => {
      const rowElement = document.createElement("div");
      rowElement.className = "board-row";
      rowElement.setAttribute("role", "row");
      rowElement.setAttribute("aria-rowindex", String(rowIndex + 1));
      elements.board.appendChild(rowElement);
      return rowElement;
    });

    state.board.forEach((value, index) => {
      const cell = document.createElement("button");
      const { row, col } = window.SuguruCore.indexToRowCol(index, meta);
      const conflicts = value !== 0 ? window.SuguruCore.collectConflicts(state.board, index, meta) : [];
      const invalid = (state.showMistakes || state.revealIndices.has(index)) && value !== 0 && value !== state.solution[index];
      const nudgeFocus = state.nudgeStage >= 1 && state.nudgeFocusIndexes.includes(index);
      const nudgeSource = state.nudgeStage >= 2 && state.nudgeSourceIndexes.includes(index);
      const nudgeTarget = state.nudgeStage >= 3 && state.nudgeTargetIndexes.includes(index);
      cell.type = "button";
      cell.className = [
        "cell",
        state.puzzle[index] !== 0 ? "given" : "",
        state.selectedIndex === index ? "selected" : "",
        nudgeFocus ? "coach-focus" : "",
        nudgeSource ? "coach-source" : "",
        nudgeTarget ? "coach-target" : "",
        conflicts.length ? "conflict" : "",
        invalid ? "invalid" : ""
      ].filter(Boolean).join(" ");
      cell.dataset.index = String(index);
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.tabIndex = state.selectedIndex === index ? 0 : -1;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-rowindex", String(row + 1));
      cell.setAttribute("aria-colindex", String(col + 1));
      cell.setAttribute("aria-selected", String(state.selectedIndex === index));
      cell.setAttribute("aria-readonly", String(state.completed || state.puzzle[index] !== 0));
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
        clearNudge();
        state.selectedIndex = index;
        renderBoard();
        renderNumberPad();
        refreshModeUi();
        saveResume();
        syncUrl();
      });
      rowElements[row].appendChild(cell);
    });
    if (shouldRestoreCellFocus) {
      focusSelectedCell();
    }
  }

  function renderNumberPad() {
    const focusedValue = elements.numberPad.contains(document.activeElement)
      ? document.activeElement.dataset.value
      : null;
    elements.numberPad.innerHTML = "";
    const hasSelection = Number.isInteger(state.selectedIndex);
    const selectedCageSize = hasSelection ? getSelectedCageSize() : null;
    const selectedValue = hasSelection ? state.board[state.selectedIndex] : 0;
    elements.numberPad.setAttribute(
      "aria-disabled",
      String(state.paused || state.completed || !state.puzzleMeta || !hasSelection)
    );
    for (let value = 1; value <= getMaxValue(); value += 1) {
      const button = document.createElement("button");
      const allowed = hasSelection && value <= selectedCageSize;
      const noted = hasSelection && state.notes[state.selectedIndex].has(value);
      const isCurrentValue = hasSelection && selectedValue === value;
      button.type = "button";
      button.dataset.value = String(value);
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
        "aria-pressed",
        String(isCurrentValue || noted)
      );
      button.addEventListener("click", () => handleDigit(value));
      elements.numberPad.appendChild(button);
    }
    if (focusedValue) {
      elements.numberPad.querySelector(`[data-value="${focusedValue}"]`)?.focus({ preventScroll: true });
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
    clearNudge();
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
      renderDailyResult();
      renderRailNextStep();
      saveResume();
      syncUrl();
      return;
    }
    if (state.mode === "nomistakes" && value !== state.solution[state.selectedIndex]) {
      state.mistakes += 1;
      elements.mistakeCount.textContent = String(state.mistakes);
      setMessage("No mistakes mode rejected that value.");
      playSound("error");
      renderRailNextStep();
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
    renderDailyResult();
    renderRailNextStep();
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
    clearNudge();
    pushUndoCheckpoint();
    state.board[state.selectedIndex] = 0;
    state.notes[state.selectedIndex].clear();
    setMessage("Cleared the selected cell.");
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    renderDailyResult();
    renderRailNextStep();
    saveResume();
  }

  function checkBoard() {
    state.hasDiscardableInteraction = true;
    renderRailNextStep();
    const wrong = getIncorrectIndexes();
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
    state.paused = false;
    state.isNewcomerSession = false;
    stopTimer();

    state.stats.solved += 1;
    updateStreak();
    const key = `${state.level}:${state.mode}`;
    const best = state.stats.bestTimes[key];
    if (!best || state.secondsElapsed < best) {
      state.stats.bestTimes[key] = state.secondsElapsed;
    }
    const completedJourneyStep = recordCageGardenCompletion();
    const focusCompletion = recordChallengeFocusCompletion();
    let dailyCompletion = null;
    if (state.runSource === "daily-edition" && state.dailyEdition) {
      const verified = DailyEditions.validateEditionIdentity(state.dailyEdition, {
        puzzleLibrary: window.SUGURU_PUZZLES,
        today: getCurrentDateKey()
      });
      if (verified.ok && verified.identity.puzzleId === state.puzzleMeta.id) {
        const existing = getDailyResult(verified.identity);
        const nextResult = {
          edition: verified.identity.edition,
          corpus: verified.identity.corpus,
          band: verified.identity.band,
          puzzleId: verified.identity.puzzleId,
          seconds: state.secondsElapsed,
          mistakes: state.mistakes,
          nudgesUsed: state.nudgesUsed,
          completedAt: existing?.completedAt || new Date().toISOString()
        };
        dailyCompletion = {
          identity: verified.identity,
          staged: stageDailyResult(verified.identity, nextResult)
        };
      }
    }

    saveStats();
    if (dailyCompletion) dailyCompletion.outcome = commitPendingDailyResults();
    if (completedJourneyStep) saveCageGardenProgress();
    if (focusCompletion) saveFocusResults();
    clearResume();

    const victoryActions = getVictoryActions(completedJourneyStep);
    const journeyCount = getCompletedCageGardenCount();
    const victorySourceLabel = state.runSource === "daily-edition" ? getDailyRelationLabel() : state.runSource === "cage-garden" ? "Cage Garden" : MODES[state.mode].label;
    elements.victorySummary.textContent = `Solved ${getLevelMeta(state.level).label} · ${victorySourceLabel} in ${window.SuguruCore.formatTime(state.secondsElapsed)} with ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"} and ${state.nudgesUsed} nudge${state.nudgesUsed === 1 ? "" : "s"}.`;
    renderVictorySaveHealth(dailyCompletion?.outcome === "saved");
    renderVictoryShareCard();
    elements.victoryProgressList.innerHTML = [
      statListRow("Cage Garden", `${journeyCount}/4`),
      statListRow("Streak", `${state.stats.streak} day${state.stats.streak === 1 ? "" : "s"}`),
      statListRow("Nudges", String(state.nudgesUsed)),
      statListRow("Best in mode", state.stats.bestTimes[`${state.level}:${state.mode}`] ? window.SuguruCore.formatTime(state.stats.bestTimes[`${state.level}:${state.mode}`]) : "New baseline"),
      statListRow("Solved total", String(state.stats.solved))
    ].join("");
    elements.victoryNextLabel.textContent = victoryActions.primary.description;
    elements.victoryNewGameButton.textContent = victoryActions.primary.label;
    elements.victoryNewGameButton.setAttribute("aria-label", `Next Suguru action: ${victoryActions.primary.description}`);
    elements.victoryNewGameButton.onclick = () => runHeroAction(victoryActions.primary.run);
    elements.victorySecondaryButton.textContent = victoryActions.secondary.label;
    elements.victorySecondaryButton.setAttribute("aria-label", `Secondary Suguru action: ${victoryActions.secondary.description}`);
    elements.victorySecondaryButton.onclick = () => runHeroAction(victoryActions.secondary.run);
    elements.shareVictoryButton.setAttribute("aria-label", "Share your Suguru result");
    elements.victoryShareStatus.textContent = "";

    renderBoard();
    renderNumberPad();
    refreshModeUi();
    renderHeroSummary();
    renderHeroActions();
    renderLaunchButton();
    renderRitualCard();
    renderRailNextStep();
    renderCageGarden();
    renderDailyResult();
    syncUrl();

    state.resultView = "dialog";
    updateVictoryUi();
    setMessage(`Solved ${LEVELS.find((entry) => entry.id === state.level)?.label || state.level} in ${window.SuguruCore.formatTime(state.secondsElapsed)} with ${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"} and ${state.nudgesUsed} nudge${state.nudgesUsed === 1 ? "" : "s"}. Cage Garden: ${journeyCount}/4.`);
    playSound("win");
    elements.victoryTitle.focus({ preventScroll: true });
  }

  function focusSolvedBoard() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elements.board.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center"
    });
    window.requestAnimationFrame(() => elements.board.focus({ preventScroll: true }));
  }

  function reviewSolvedBoard() {
    if (!state.completed || state.resultView !== "dialog") {
      return;
    }
    state.resultView = "review";
    updateVictoryUi();
    setMessage("Solved board review. Values are read-only; choose View result to reopen your summary.");
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    focusSolvedBoard();
  }

  function openResultDialog() {
    if (!state.completed || state.resultView !== "review") {
      return;
    }
    state.resultView = "dialog";
    updateVictoryUi();
    renderBoard();
    renderNumberPad();
    refreshModeUi();
    window.requestAnimationFrame(() => elements.victoryTitle.focus({ preventScroll: true }));
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
    focusSelectedCell();
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

  function startCageGardenStep(step) {
    if (!isCageGardenStepAvailable(step)) {
      setMessage("Finish the ready Cage Garden step before opening that one.");
      return;
    }
    const puzzle = getCageGardenPuzzle(step);
    if (!puzzle) {
      setMessage(`${step.label} is unavailable right now.`);
      return;
    }
    saveCageGardenProgress();
    startNewPuzzle(step.level, step.mode, {
      forcedPuzzle: puzzle,
      runSource: "cage-garden",
      journeyStepId: step.id,
      disposition: "preloaded-journey"
    });
  }

  function startBareRouteBoard() {
    const nextStep = getNextCageGardenStep();
    if (nextStep) {
      startCageGardenStep(nextStep);
      return;
    }
    startNewPuzzle(DEFAULT_LEVEL, DEFAULT_MODE, { disposition: "ordinary-untouched" });
  }

  function startNewPuzzle(level = state.level, mode = state.mode, options = {}) {
    state.level = LEVELS.some((entry) => entry.id === level) ? level : DEFAULT_LEVEL;
    state.mode = Object.prototype.hasOwnProperty.call(MODES, mode) ? mode : DEFAULT_MODE;
    state.pendingLevel = state.level;
    state.pendingMode = state.mode;
    state.dailyFallbackMessage = options.announcement || null;
    const requestedSource = options.runSource || (options.journeyStepId ? "cage-garden" : state.mode === "daily" && !options.forcedPuzzle ? "daily-edition" : "ordinary");
    let puzzle = options.forcedPuzzle || null;
    if (requestedSource === "daily-edition") {
      const resolution = options.dailyResolution?.ok
        ? options.dailyResolution
        : options.dailyEdition
          ? DailyEditions.validateEditionIdentity(options.dailyEdition, { puzzleLibrary: window.SUGURU_PUZZLES, today: getCurrentDateKey() })
          : resolveDailyEdition(state.level);
      if (resolution.ok) {
        setRunSource("daily-edition", { dailyEdition: resolution.identity });
        puzzle = resolution.puzzle;
        state.lastPuzzleKey = `${state.level}:${puzzle.id}`;
        state.sourceDifficultyHint = null;
        state.sourceModeHint = null;
      } else {
        state.mode = "classic";
        state.pendingMode = "classic";
        setRunSource("ordinary");
        puzzle = getFallbackPuzzle(state.level, "classic");
        state.dailyFallbackMessage = "The verified Daily corpus is unavailable, so an ordinary Classic clue variant was opened instead.";
      }
    } else if (requestedSource === "cage-garden") {
      setRunSource("cage-garden", { journeyStepId: options.journeyStepId });
      state.sourceDifficultyHint = null;
      state.sourceModeHint = null;
      puzzle = puzzle || getFallbackPuzzle(state.level, state.mode);
    } else {
      setRunSource("ordinary");
      puzzle = puzzle || (options.launchKind === "ordinary-practice"
        ? getPracticePuzzle(state.level, state.mode)
        : getFallbackPuzzle(state.level, state.mode));
    }
    state.bootDisposition = options.disposition || (state.runSource === "cage-garden" ? "preloaded-journey" : "ordinary-untouched");
    elements.levelSelect.value = state.level;
    elements.modeSelect.value = state.mode;
    applyModeDefaults();
    if (options.overrideNotesMode !== undefined) state.notesMode = options.overrideNotesMode;
    if (options.overrideShowMistakes !== undefined) state.showMistakes = options.overrideShowMistakes;
    sanitizeModeState();
    refreshModeUi();
    if (!puzzle) {
      stopTimer();
      state.puzzleMeta = null;
      state.focusLaunchId = null;
      setRunSource("ordinary");
      state.bootDisposition = "ordinary-untouched";
      state.puzzle = [];
      state.solution = [];
      state.board = [];
      state.notes = [];
      state.selectedIndex = null;
      state.paused = false;
      state.pauseReason = null;
      state.completed = true;
      state.resultView = "none";
      state.undoStack = [];
      state.redoStack = [];
      elements.challengeLabel.textContent = `${getLevelMeta(state.level).label} unavailable`;
      elements.pauseOverlay.hidden = true;
      elements.notesToggle.checked = false;
      elements.mistakeToggle.checked = state.showMistakes;
      elements.audioToggle.checked = state.audioEnabled;
      state.notesMode = false;
      elements.timer.textContent = "00:00";
      elements.mistakeCount.textContent = "0";
      elements.board.innerHTML = "";
      elements.board.inert = true;
      elements.numberPad.innerHTML = "";
      clearResume();
      refreshModeUi();
      renderHeroSummary();
      renderHeroActions();
      renderRitualCard();
      renderRailNextStep();
      renderCageGarden();
      renderDailyResult();
      renderPuzzleFacts();
      updateVictoryUi();
      setMessage(`No Suguru puzzles are available for ${getLevelMeta(state.level).label} right now.`);
      syncUrl();
      return;
    }
    resetForPuzzle(puzzle, {
      disposition: state.bootDisposition,
      focusLaunchId: options.launchKind === "technique-focus" ? puzzle.id : null
    });
    if (state.dailyFallbackMessage) setMessage(state.dailyFallbackMessage);
  }

  function inspectSavedResume(saved = loadResume()) {
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return { valid: false, invalidCore: Boolean(saved) };
    const level = LEVELS.some((entry) => entry.id === saved.level) ? saved.level : null;
    const savedMode = Object.prototype.hasOwnProperty.call(MODES, saved.mode) ? saved.mode : null;
    const puzzle = level ? getPuzzles(level).find((entry) => entry.id === saved.puzzleId) : null;
    const validBoard = puzzle && isValidBoardSnapshot(saved.board, puzzle, window.SuguruCore.parseGrid(puzzle.puzzle));
    const validNotes = Array.isArray(saved.notes) && puzzle && saved.notes.length === puzzle.size * puzzle.size;
    if (!level || !savedMode || !puzzle || !validBoard || !validNotes) return { valid: false, invalidCore: true };
    if (window.SuguruCore.isSolved(saved.board, window.SuguruCore.parseGrid(puzzle.solution))) {
      return { valid: false, invalidCore: true, reason: "completed-snapshot" };
    }

    let mode = savedMode;
    let runSource = "ordinary";
    let dailyEdition = null;
    const journeyStep = getValidResumeJourneyStep(saved, puzzle, level, savedMode);
    if (journeyStep) {
      runSource = "cage-garden";
    } else if (savedMode === "daily") {
      const daily = saved.version === RESUME_VERSION && saved.runSource === "daily-edition"
        ? DailyEditions.validateEditionIdentity(saved.dailyEdition, { puzzleLibrary: window.SUGURU_PUZZLES, today: getCurrentDateKey() })
        : { ok: false };
      if (daily.ok && daily.identity.puzzleId === puzzle.id) {
        runSource = "daily-edition";
        dailyEdition = daily.identity;
      } else {
        mode = "classic";
      }
    }
    return { valid: true, invalidCore: false, saved, level, mode, puzzle, runSource, dailyEdition, journeyStep };
  }

  function dailyIdentitiesMatch(left, right) {
    return Boolean(left && right)
      && ["version", "gameId", "corpus", "edition", "band", "puzzleId"].every((key) => left[key] === right[key]);
  }

  function resumeMatchesSettings(descriptor, settings) {
    if (!descriptor?.valid) return false;
    if (!settings.hasIdentityParams) return true;
    if (descriptor.level !== settings.level) return false;
    if (settings.mode === "daily") {
      return descriptor.runSource === "daily-edition"
        && settings.dailyResolution?.ok
        && dailyIdentitiesMatch(descriptor.dailyEdition, settings.dailyResolution.identity);
    }
    return descriptor.mode === settings.mode && descriptor.runSource !== "daily-edition";
  }

  function restoreResumeDescriptor(descriptor) {
    const { saved, puzzle } = descriptor;
    state.level = descriptor.level;
    state.mode = descriptor.mode;
    state.pendingLevel = descriptor.level;
    state.pendingMode = descriptor.mode;
    setRunSource(descriptor.runSource, {
      dailyEdition: descriptor.dailyEdition,
      journeyStepId: descriptor.journeyStep?.id
    });
    state.bootDisposition = "restored-resume";
    state.isNewcomerSession = false;
    state.puzzleMeta = puzzle;
    state.focusLaunchId = descriptor.runSource === "ordinary" && puzzle.logicFocus && saved.focusLaunchId === puzzle.id ? puzzle.id : null;
    state.puzzle = window.SuguruCore.parseGrid(puzzle.puzzle);
    state.solution = window.SuguruCore.parseGrid(puzzle.solution);
    state.board = [...saved.board];
    state.notes = createEmptyNotes(puzzle);
    saved.notes.forEach((values, index) => {
      const cageSize = window.SuguruCore.getCageSize(index, puzzle);
      state.notes[index] = new Set(Array.isArray(values) ? values.filter((value) => Number.isInteger(value) && value >= 1 && value <= cageSize) : []);
    });
    state.selectedIndex = Number.isInteger(saved.selectedIndex) && saved.selectedIndex >= 0 && saved.selectedIndex < puzzle.size * puzzle.size
      ? saved.selectedIndex
      : state.puzzle.findIndex((value) => value === 0);
    state.mistakes = Number.isInteger(saved.mistakes) && saved.mistakes >= 0 ? saved.mistakes : 0;
    state.nudgesUsed = normalizeUsageCount(saved.nudgesUsed);
    state.hasDiscardableInteraction = state.nudgesUsed > 0 || state.mistakes > 0;
    state.nudgeCountedKeys = normalizeCountedProofKeys(saved.nudgeCountedKeys);
    clearNudge();
    state.notesMode = Boolean(saved.notesMode);
    state.showMistakes = saved.showMistakes !== undefined ? Boolean(saved.showMistakes) : MODES[state.mode].showMistakes;
    state.secondsElapsed = Number.isInteger(saved.secondsElapsed) && saved.secondsElapsed >= 0 ? saved.secondsElapsed : 0;
    state.paused = Boolean(saved.paused);
    state.pauseReason = typeof saved.pauseReason === "string" ? saved.pauseReason : null;
    state.completed = false;
    state.resultView = "none";
    clearReveal();
    state.undoStack = [];
    state.redoStack = [];
    sanitizeModeState();
    refreshModeUi();
    elements.levelSelect.value = state.level;
    elements.modeSelect.value = state.mode;
    elements.timer.textContent = window.SuguruCore.formatTime(state.secondsElapsed);
    elements.mistakeCount.textContent = String(state.mistakes);
    elements.challengeLabel.textContent = `${puzzle.label} · ${getLevelMeta(state.level).label}`;
    renderHeroSummary();
    renderHeroActions();
    renderLaunchButton();
    renderRitualCard();
    renderRailNextStep();
    renderCageGarden();
    renderDailyResult();
    renderPuzzleFacts();
    renderOnboardingCard();
    renderBoard();
    renderNumberPad();
    if (!state.paused) startTimer();
    elements.audioToggle.checked = state.audioEnabled;
    updatePauseButton();
    updateVictoryUi();
    syncUrl();
    saveResume();
    setMessage(state.runSource === "daily-edition"
      ? `${getDailyRelationLabel()} restored with your unfinished progress.`
      : state.runSource === "cage-garden"
        ? `Resumed ${descriptor.journeyStep.label}.`
        : saved.mode === "daily" && state.mode === "classic"
          ? "Restored your earlier board as Classic because its Daily edition could not be verified."
          : state.paused ? "Restored your paused Suguru run." : "Resumed your Suguru run.");
    if (state.paused) window.requestAnimationFrame(() => elements.resumeButton.focus({ preventScroll: true }));
  }

  function restoreOrStart(settings) {
    const descriptor = inspectSavedResume();
    const completedSnapshotNotice = descriptor.reason === "completed-snapshot"
      ? "A completed recovery snapshot was ignored; a fresh board was opened and no solve was counted again."
      : null;
    const announceCompletedSnapshot = () => {
      if (!completedSnapshotNotice) return;
      setMessage(settings.dailyFallbackMessage
        ? `${settings.dailyFallbackMessage} ${completedSnapshotNotice}`
        : completedSnapshotNotice);
    };
    if (descriptor.invalidCore) clearResume();
    if (resumeMatchesSettings(descriptor, settings)) {
      restoreResumeDescriptor(descriptor);
      if (settings.hasDisplayParams) {
        if (settings.notesMode !== undefined) state.notesMode = settings.notesMode;
        if (settings.showMistakes !== undefined) state.showMistakes = settings.showMistakes;
        sanitizeModeState();
        refreshModeUi();
        renderBoard();
        renderNumberPad();
        renderDailyResult();
        syncUrl();
        saveResume();
      }
      return;
    }

    if (settings.hasIdentityParams) {
      const launchMode = settings.dailyUnavailable ? "classic" : settings.mode;
      startNewPuzzle(settings.level, launchMode, {
        runSource: launchMode === "daily" ? "daily-edition" : "ordinary",
        dailyResolution: settings.dailyResolution,
        announcement: settings.dailyFallbackMessage,
        overrideNotesMode: settings.notesMode,
        overrideShowMistakes: settings.showMistakes
      });
      announceCompletedSnapshot();
      return;
    }
    if (descriptor.valid) {
      restoreResumeDescriptor(descriptor);
      if (settings.hasDisplayParams) {
        if (settings.notesMode !== undefined) state.notesMode = settings.notesMode;
        if (settings.showMistakes !== undefined) state.showMistakes = settings.showMistakes;
        sanitizeModeState();
        refreshModeUi();
        renderBoard();
        renderNumberPad();
        saveResume();
        syncUrl();
      }
      return;
    }
    startBareRouteBoard();
    announceCompletedSnapshot();
  }

  function cycleOverlayFocus(event) {
    const controls = getActiveOverlayControls();
    if (!controls.length || event.key !== "Tab") {
      return false;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!controls.includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
      return true;
    }
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

  function openCageGardenGuide() {
    if (!elements.setupHelpPanel || !elements.cageGardenGuideTitle) {
      return;
    }
    state.onboardingPeekOpen = true;
    renderOnboardingCard();
    elements.setupHelpPanel.open = true;
    renderSetupHelpTrigger();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elements.cageGardenGuideTitle.scrollIntoView({
      block: "start",
      behavior: reducedMotion ? "auto" : "smooth"
    });
    window.requestAnimationFrame(() => elements.cageGardenGuideTitle.focus({ preventScroll: true }));
  }

  function toggleSetupHelp() {
    if (elements.setupHelpPanel?.open) {
      elements.setupHelpPanel.open = false;
      renderSetupHelpTrigger();
      return;
    }
    openSetupHelp();
    renderSetupHelpTrigger();
  }

  function renderSetupHelpTrigger() {
    if (!elements.setupHelpPanel) {
      return;
    }
    const isOpen = elements.setupHelpPanel.open;
    if (elements.showSetupHelpInlineButton) {
      elements.showSetupHelpInlineButton.textContent = isOpen ? "☰ Close help" : "☰ Open help";
      elements.showSetupHelpInlineButton.setAttribute("aria-expanded", String(isOpen));
    }
    if (elements.showSetupHelpButton) {
      elements.showSetupHelpButton.textContent = isOpen ? "☰ Close help" : "☰ Tips";
      elements.showSetupHelpButton.setAttribute("aria-expanded", String(isOpen));
    }
  }

  function handleKeydown(event) {
    if (discardGuard?.isActive()) return;
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
    if (state.resultView === "dialog") {
      if (key === "Escape") {
        event.preventDefault();
        reviewSolvedBoard();
      }
      return;
    }
    if (state.completed) {
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
    if (key.toLowerCase() === "h") {
      event.preventDefault();
      requestNudge();
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
      clearNudge();
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
    clearNudge();
    state.selectedIndex = window.SuguruCore.rowColToIndex(nextRow, nextCol, state.puzzleMeta);
    renderBoard();
    renderNumberPad();
    refreshModeUi();
  }

  function wireEvents() {
    elements.levelSelect.addEventListener("change", (event) => {
      clearFreshChallengePreview();
      state.pendingLevel = LEVELS.some((entry) => entry.id === event.target.value) ? event.target.value : state.level;
      renderLaunchButton();
      setMessage(`Ready to start ${getLevelMeta(state.pendingLevel).label} · ${MODES[state.pendingMode].label}. Your current board is unchanged.`);
    });
    elements.modeSelect.addEventListener("change", (event) => {
      clearFreshChallengePreview();
      state.pendingMode = Object.prototype.hasOwnProperty.call(MODES, event.target.value) ? event.target.value : state.mode;
      renderLaunchButton();
      setMessage(`Ready to start ${getLevelMeta(state.pendingLevel).label} · ${MODES[state.pendingMode].label}. Your current board is unchanged.`);
    });
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
    elements.newGameButton.addEventListener("click", launchPendingPuzzle);
    elements.freshChallengeButton.addEventListener("click", launchFreshChallenge);
    elements.pauseButton.addEventListener("click", togglePause);
    elements.nudgeButton.addEventListener("click", requestNudge);
    elements.checkButton.addEventListener("click", checkBoard);
    elements.undoButton.addEventListener("click", undoLastAction);
    elements.redoButton.addEventListener("click", redoLastAction);
    elements.resetButton?.addEventListener("click", restartCurrentPuzzle);
    elements.eraseButton.addEventListener("click", eraseSelected);
    elements.showSetupHelpButton?.addEventListener("click", toggleSetupHelp);
    elements.showSetupHelpInlineButton?.addEventListener("click", toggleSetupHelp);
    elements.setupHelpPanel?.addEventListener("toggle", renderSetupHelpTrigger);
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
    elements.victoryReviewButton.addEventListener("click", reviewSolvedBoard);
    elements.viewResultButton.addEventListener("click", openResultDialog);
    elements.shareDailyButton.addEventListener("click", shareDailyResult);
    document.addEventListener("visibilitychange", () => {
      if (discardGuard?.isActive()) return;
      if (document.hidden && !state.paused && !state.completed) {
        togglePause("hidden");
      }
    });
    window.addEventListener("beforeunload", () => {
      if (!discardGuard?.isActive()) saveResume();
    });
  }

  function initialize() {
    const settings = readSettingsFromUrl();
    state.level = settings.level;
    state.mode = settings.mode;
    state.pendingLevel = settings.level;
    state.pendingMode = settings.mode;
    state.sourceDifficultyHint = settings.sourceDifficulty;
    state.sourceModeHint = settings.sourceMode;
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
    installDiscardGuard();
    applyThemePreset();
    applyHighContrastTheme();
    state.isNewcomerSession = !hasDurablePlayerHistory();
    renderSetupHelpTrigger();
    elements.audioToggle.checked = state.audioEnabled;
    restoreOrStart(settings);
    syncUrl();
  }

  initialize();
})();
