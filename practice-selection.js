(function () {
  "use strict";

  const VERSION = 1;
  const STORAGE_KEY = "sudoku-sakura-practice-rotation";
  const memoryState = { version: VERSION, bands: {} };
  const unavailableStorages = new WeakSet();

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function hashText(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function normalizeBranch(value) {
    if (!isPlainObject(value) || typeof value.inventory !== "string" || !Array.isArray(value.remaining)) return null;
    if (!value.remaining.every((entry) => typeof entry === "string" && entry)) return null;
    const remaining = [...new Set(value.remaining)];
    const last = typeof value.last === "string" && value.last ? value.last : null;
    return { inventory: value.inventory, remaining, last };
  }

  function normalizeState(value) {
    const state = { version: VERSION, bands: {} };
    if (!isPlainObject(value) || value.version !== VERSION || !isPlainObject(value.bands)) return state;
    Object.entries(value.bands).forEach(([key, branch]) => {
      if (typeof key !== "string" || !key.includes("|")) return;
      const normalized = normalizeBranch(branch);
      if (normalized) state.bands[key] = normalized;
    });
    return state;
  }

  function cloneState(value) {
    const normalized = normalizeState(value);
    return {
      version: VERSION,
      bands: Object.fromEntries(Object.entries(normalized.bands).map(([key, branch]) => [key, { inventory: branch.inventory, remaining: [...branch.remaining], last: branch.last }]))
    };
  }

  function getGroupField(gameId) {
    if (gameId === "sudoku") return "familyId";
    if (gameId === "suguru") return "layoutFamilyId";
    return null;
  }

  function buildGroups(gameId, entries) {
    const field = getGroupField(gameId);
    if (!field || !Array.isArray(entries)) return null;
    const groups = new Map();
    entries.filter((entry) => entry?.selectable !== false).forEach((entry) => {
      const groupId = entry?.[field];
      if (typeof groupId !== "string" || !groupId || typeof entry.id !== "string" || !entry.id) return;
      const values = groups.get(groupId) || [];
      values.push(entry);
      groups.set(groupId, values);
    });
    groups.forEach((values) => values.sort((left, right) => left.id.localeCompare(right.id)));
    return groups;
  }

  function getInventorySignature(groupIds) {
    const sorted = [...groupIds].sort();
    return `v${VERSION}-${sorted.length}-${hashText(sorted.join("\u001f"))}`;
  }

  function getRandomValue(random) {
    try {
      const value = Number(random());
      return Number.isFinite(value) && value >= 0 && value < 1 ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function shuffle(values, random) {
    const output = [...values];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(getRandomValue(random) * (index + 1));
      [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
    }
    return output;
  }

  function select({ gameId, band, entries, state, random = Math.random }) {
    if (typeof band !== "string" || !band) return { ok: false, reason: "invalid-band" };
    const groups = buildGroups(gameId, entries);
    if (!groups || !groups.size) return { ok: false, reason: "no-selectable-groups" };
    const groupIds = [...groups.keys()].sort();
    const inventory = getInventorySignature(groupIds);
    const branchKey = `${gameId}|${band}`;
    const nextState = cloneState(state);
    const current = nextState.bands[branchKey];
    const currentLast = current?.inventory === inventory && groupIds.includes(current.last) ? current.last : null;
    let remaining = current?.inventory === inventory
      ? current.remaining.filter((groupId, index, values) => groupIds.includes(groupId) && groupId !== currentLast && values.indexOf(groupId) === index)
      : [];
    if (!remaining.length) {
      remaining = shuffle(groupIds, random);
      if (remaining.length > 1 && remaining[0] === currentLast) {
        const swapIndex = remaining.findIndex((groupId) => groupId !== currentLast);
        [remaining[0], remaining[swapIndex]] = [remaining[swapIndex], remaining[0]];
      }
    }
    const groupId = remaining.shift();
    const variants = groups.get(groupId);
    const puzzle = variants[Math.floor(getRandomValue(random) * variants.length)] || variants[0];
    nextState.bands[branchKey] = { inventory, remaining, last: groupId };
    return { ok: true, reason: null, puzzle, groupId, branchKey, inventory, nextState };
  }

  function getStorage(storage) {
    if (storage) return storage;
    try {
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  function readState(storage = null) {
    const target = getStorage(storage);
    if (!target || unavailableStorages.has(target)) return cloneState(memoryState);

    let raw;
    try {
      raw = target.getItem(STORAGE_KEY);
    } catch (error) {
      unavailableStorages.add(target);
      return cloneState(memoryState);
    }
    if (!raw) return { version: VERSION, bands: {} };
    try {
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      return { version: VERSION, bands: {} };
    }
  }

  function writeState(state, storage = null) {
    const normalized = cloneState(state);
    memoryState.version = VERSION;
    memoryState.bands = cloneState(normalized).bands;
    const target = getStorage(storage);
    if (!target) return { persisted: false, state: normalized };
    try {
      target.setItem(STORAGE_KEY, JSON.stringify(normalized));
      unavailableStorages.delete(target);
      return { persisted: true, state: normalized };
    } catch (error) {
      unavailableStorages.add(target);
      return { persisted: false, state: normalized };
    }
  }

  function commitSelection({ launchKind, gameId, band, entries, storage = null, random = Math.random }) {
    if (launchKind !== "ordinary-practice") return { ok: false, reason: "launch-kind-not-eligible" };
    const currentState = readState(storage);
    const selected = select({ gameId, band, entries, state: currentState, random });
    if (!selected.ok) return selected;
    const written = writeState(selected.nextState, storage);
    return { ...selected, persisted: written.persisted, nextState: written.state };
  }

  window.PracticeSelection = Object.freeze({
    version: VERSION,
    storageKey: STORAGE_KEY,
    hashText,
    normalizeState,
    getInventorySignature,
    select,
    readState,
    writeState,
    commitSelection
  });
})();
