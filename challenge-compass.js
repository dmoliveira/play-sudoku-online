(function () {
  const VERSION = 1;
  const RESULTS_VERSION = 1;
  const STORAGE_KEY = "sudoku-sakura-challenge-focus-results";
  const SLOT_ORDER = Object.freeze(["current", "continuation", "focus", "daily", "fallback"]);
  const DISCARD_KINDS = new Set([null, "replace", "restart"]);
  const FOCUS_KEY_PATTERN = /^(sudoku|suguru)\|[a-z0-9][a-z0-9-]*$/;

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function cleanText(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function normalizeDescriptor(value, slot) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const actionId = cleanText(value.actionId);
    const title = cleanText(value.title);
    const text = cleanText(value.text);
    const label = cleanText(value.label);
    const tag = cleanText(value.tag);
    const focus = cleanText(value.focus);
    const discardKind = value.discardKind === undefined ? null : value.discardKind;
    if (!actionId || !title || !text || !label || !tag || !focus || !DISCARD_KINDS.has(discardKind)) return null;
    return deepFreeze({ version: VERSION, slot, actionId, title, text, label, tag, focus, discardKind });
  }

  function choose(candidates) {
    if (!candidates || typeof candidates !== "object" || Array.isArray(candidates)) return null;
    for (const slot of SLOT_ORDER) {
      const descriptor = normalizeDescriptor(candidates[slot], slot);
      if (descriptor) return descriptor;
    }
    return null;
  }

  function focusKey(gameId, focusId) {
    const key = `${gameId}|${focusId}`;
    return FOCUS_KEY_PATTERN.test(key) ? key : null;
  }

  function normalizeFocusResults(value) {
    const completed = {};
    if (value && typeof value === "object" && !Array.isArray(value) && value.version === RESULTS_VERSION
      && value.completed && typeof value.completed === "object" && !Array.isArray(value.completed)) {
      Object.entries(value.completed).forEach(([key, result]) => {
        if (FOCUS_KEY_PATTERN.test(key) && result === true) completed[key] = true;
      });
    }
    return deepFreeze({ version: RESULTS_VERSION, completed });
  }

  function isFocusComplete(results, gameId, focusId) {
    const key = focusKey(gameId, focusId);
    if (!key) return false;
    return normalizeFocusResults(results).completed[key] === true;
  }

  function completeFocus(results, gameId, focusId) {
    const key = focusKey(gameId, focusId);
    const normalized = normalizeFocusResults(results);
    if (!key || normalized.completed[key] === true) return normalized;
    return deepFreeze({
      version: RESULTS_VERSION,
      completed: { ...normalized.completed, [key]: true }
    });
  }

  window.ChallengeCompass = deepFreeze({
    version: VERSION,
    resultsVersion: RESULTS_VERSION,
    storageKey: STORAGE_KEY,
    slots: SLOT_ORDER,
    choose,
    normalizeFocusResults,
    isFocusComplete,
    completeFocus
  });
})();
