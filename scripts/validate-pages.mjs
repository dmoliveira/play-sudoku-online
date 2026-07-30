import fs from "node:fs";

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const suguruHtml = fs.readFileSync(new URL("../suguru.html", import.meta.url), "utf8");
const appJs = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const suguruAppJs = fs.readFileSync(new URL("../suguru-app.js", import.meta.url), "utf8");

function expectIncludes(source, snippet, label) {
  ensure(source.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function expectDiscardMarker(source, id, kind, label) {
  const tag = source.match(new RegExp(`<button\\b[^>]*\\bid="${id}"[^>]*>`))?.[0] || "";
  ensure(tag.includes(`data-discard-kind="${kind}"`), `${label} ${id} must declare ${kind} replacement semantics`);
}

function validateStaticAccessibility(source, label, boardId) {
  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  ensure(duplicates.length === 0, `${label} has duplicate ids: ${[...new Set(duplicates)].join(", ")}`);

  const idSet = new Set([...ids, "daily-share-title"]);
  for (const match of source.matchAll(/\s(?:aria-controls|aria-describedby|aria-labelledby)="([^"]+)"/g)) {
    for (const reference of match[1].split(/\s+/).filter(Boolean)) {
      ensure(idSet.has(reference), `${label} references missing id: ${reference}`);
    }
  }

  ensure(!/<a class="brand"[^>]*aria-label=/.test(source), `${label} brand should use its visible accessible name`);
  expectIncludes(source, 'id="game-title" tabindex="-1"', label);
  expectIncludes(source, `id="${boardId}"`, label);
  expectIncludes(source, 'role="grid"', label);
  expectIncludes(source, `id="victory-review-button" class="action-button" type="button" aria-controls="${boardId}"`, label);
  expectIncludes(source, 'id="view-result-button" class="action-button primary" type="button" aria-controls="victory-overlay" aria-haspopup="dialog" hidden', label);
  expectIncludes(source, 'id="victory-share-status" class="board-caption victory-share-status" role="status" aria-live="polite" aria-atomic="true"', label);
  expectIncludes(source, 'id="local-save-status" class="board-caption save-health-status local-save-status" role="status" aria-live="polite" aria-atomic="true"', label);
  expectIncludes(source, 'id="victory-save-status" class="board-caption save-health-status victory-save-status"', label);
  expectIncludes(source, 'id="victory-overlay" class="victory-overlay" role="dialog" aria-modal="true" aria-labelledby="victory-title" aria-describedby="victory-summary victory-save-status" hidden', label);
  const victorySaveTag = source.match(/<p\b[^>]*\bid="victory-save-status"[^>]*>/)?.[0] || "";
  ensure(!/\b(?:role|aria-live|tabindex)=/.test(victorySaveTag), `${label} victory save status must stay dormant, non-live, and non-focusable`);
  expectIncludes(source, 'id="discard-dialog" class="discard-dialog" aria-modal="true" aria-labelledby="discard-dialog-title" aria-describedby="discard-dialog-description"', label);
  expectIncludes(source, 'id="discard-keep-button" class="action-button primary" type="button" autofocus', label);
  expectIncludes(source, 'id="discard-confirm-button" class="action-button" type="button"', label);
  expectIncludes(source, 'id="reset-button" class="action-button subtle" type="button" data-discard-kind="restart"', label);
  for (const id of ["new-game-button", "victory-new-game-button", "victory-secondary-button"]) {
    expectDiscardMarker(source, id, "replace", label);
  }
  ensure(!/<div class="focus-ribbon"[^>]*\shidden(?:\s|>)/.test(source), `${label} focus ribbon must reserve first-paint layout space`);

  const gameHeaderIndex = source.indexOf('class="game-header"');
  const localSaveIndex = source.indexOf('id="local-save-status"');
  const controlsIndex = source.indexOf('class="controls-row"');
  const victorySummaryIndex = source.indexOf('id="victory-summary"');
  const victorySaveIndex = source.indexOf('id="victory-save-status"');
  const victoryShareCardIndex = source.indexOf('id="victory-share-card"');
  ensure(gameHeaderIndex < localSaveIndex && localSaveIndex < controlsIndex, `${label} save health must directly follow the game header and precede setup controls`);
  ensure(victorySummaryIndex < victorySaveIndex && victorySaveIndex < victoryShareCardIndex, `${label} victory save status must directly follow the victory summary`);

  const boardIndex = source.indexOf(`id="${boardId}"`);
  const entryModeIndex = source.indexOf('class="entry-mode-bar"');
  const padIndex = source.indexOf('id="number-pad"');
  const messageIndex = source.indexOf('id="game-message"');
  const actionsIndex = source.indexOf('class="actions-bar"');
  const inlineHelpIndex = source.indexOf('class="support-links inline-help-actions"');
  const setupHelpIndex = source.indexOf('id="setup-help-panel"');
  ensure(boardIndex < entryModeIndex && entryModeIndex < padIndex && padIndex < messageIndex && messageIndex < actionsIndex, `${label} must use board → entry mode → keypad → feedback → actions DOM order`);
  ensure(padIndex < inlineHelpIndex && inlineHelpIndex < setupHelpIndex, `${label} help action must follow the keypad and precede help content`);
}


function validateDailySurface(source, label, followingSurfaceId) {
  for (const id of [
    "daily-edition-card",
    "daily-edition-title",
    "daily-edition-status",
    "daily-result-list",
    "daily-edition-streak",
    "daily-result-share-text",
    "daily-edition-primary-button",
    "share-daily-button"
  ]) {
    expectIncludes(source, `id="${id}"`, label);
  }
  expectIncludes(source, 'aria-labelledby="daily-edition-title"', label);
  expectIncludes(source, 'aria-describedby="daily-edition-status daily-result-share-text"', label);
  expectIncludes(source, 'When browser storage is available, results stay here.', label);
  expectIncludes(source, 'local Daily streak', label);
  expectIncludes(source, '⤴ Share result', label);
  expectIncludes(source, 'id="victory-title" tabindex="-1"', label);
  const nextStepIndex = source.indexOf('id="rail-next-step-button"');
  const dailyCardIndex = source.indexOf('id="daily-edition-card"');
  const followingIndex = source.indexOf(`id="${followingSurfaceId}"`);
  ensure(nextStepIndex < dailyCardIndex && dailyCardIndex < followingIndex, `${label} Daily edition card must follow the next step and precede ${followingSurfaceId}`);
}

function validateDailyScriptOrder(source, label, appScript) {
  const gamesIndex = source.indexOf('<script src="games.js"></script>');
  const dailyIndex = source.indexOf('<script src="daily-editions.js"></script>');
  const switcherIndex = source.indexOf('<script src="game-switcher.js"></script>');
  const appIndex = source.indexOf(`<script src="${appScript}"></script>`);
  ensure(gamesIndex < dailyIndex && dailyIndex < switcherIndex && switcherIndex < appIndex, `${label} must load Daily editions before navigation and runtime`);
}

function validateContentScriptOrder(source, label, puzzleScript, appScript) {
  const generatedIndex = source.indexOf('<script src="generated-content.js"></script>');
  const puzzleIndex = source.indexOf(`<script src="${puzzleScript}"></script>`);
  const practiceIndex = source.indexOf('<script src="practice-selection.js"></script>');
  const compassIndex = source.indexOf('<script src="challenge-compass.js"></script>');
  const replacementIndex = source.indexOf('<script src="board-replacement.js"></script>');
  const appIndex = source.indexOf(`<script src="${appScript}"></script>`);
  ensure(generatedIndex >= 0 && generatedIndex < puzzleIndex, `${label} must load generated content before its puzzle registry`);
  ensure(practiceIndex >= 0 && practiceIndex < compassIndex && compassIndex < replacementIndex && replacementIndex < appIndex, `${label} must load selection, Compass, and replacement guard before its runtime`);
}

expectIncludes(indexHtml, 'id="game-select"', 'index.html');
expectIncludes(indexHtml, 'id="difficulty-select"', 'index.html');
expectIncludes(indexHtml, '<script src="games.js"></script>', 'index.html');
expectIncludes(indexHtml, '<script src="game-switcher.js"></script>', 'index.html');
expectIncludes(indexHtml, '<script src="challenge-compass.js"></script>', 'index.html');
expectIncludes(indexHtml, '<script src="board-replacement.js"></script>', 'index.html');
expectIncludes(indexHtml, '<script src="app.js"></script>', 'index.html');
expectIncludes(indexHtml, 'Easy · Classic · Mode best — · 0 days streak · Petal novice', 'index.html');
expectIncludes(indexHtml, '>Start Easy · Classic puzzle</button>', 'index.html');
expectDiscardMarker(indexHtml, "hero-secondary-button", "replace", "index.html");
expectDiscardMarker(indexHtml, "weekly-challenge-button", "replace", "index.html");

expectIncludes(suguruHtml, 'id="game-select"', 'suguru.html');
expectIncludes(suguruHtml, 'id="level-select"', 'suguru.html');
expectIncludes(suguruHtml, 'id="suguru-board"', 'suguru.html');
expectIncludes(suguruHtml, '<script src="suguru-puzzles.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="suguru.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="games.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="game-switcher.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="challenge-compass.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="board-replacement.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="suguru-app.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, 'id="cage-garden-panel"', 'suguru.html');
expectIncludes(suguruHtml, 'id="cage-garden-steps"', 'suguru.html');
expectIncludes(suguruHtml, 'id="cage-garden-guide-title"', 'suguru.html');
expectIncludes(suguruHtml, 'aria-labelledby="cage-garden-guide-title"', 'suguru.html');
expectIncludes(suguruHtml, '26 clue variants across six named layouts and four structural families', 'suguru.html');
expectIncludes(indexHtml, '🧭 Challenge Compass', 'index.html');
expectIncludes(suguruHtml, '🧭 Challenge Compass', 'suguru.html');
ensure(!indexHtml.includes('A rotating challenge, technique, or pace recommendation appears here each day.'), 'index.html must not describe deterministic Compass output as rotating');
expectIncludes(suguruHtml, 'Two rules, then one calm deduction loop', 'suguru.html');

for (const [source, label] of [[appJs, "app.js"], [suguruAppJs, "suguru-app.js"]]) {
  for (const snippet of [
    "function persistJson(domain, key, value)",
    "function removeStored(domain, key)",
    'write: "unobserved"',
    'cleanup: "unobserved"',
    'return persistJson("stats", STORAGE_KEY, state.stats);',
    'updateSaveHealth("practice-rotation", "write", result.persisted ? "saved" : "session-only");',
    "pendingDailyResults: new Map()",
    "function commitDailyResult(identity, attemptedResult)",
    'return persistJson("daily-result", DAILY_RESULTS_KEY, candidate);',
    'Session-only — not saved in this browser',
    'Saved Daily streak:'
  ]) expectIncludes(source, snippet, label);
}
expectIncludes(appJs, 'return persistJson("recent-solves", SESSION_HISTORY_KEY, state.sessionHistory);', "app.js");
ensure(!appJs.includes("Solved, but browser storage is unavailable for saving stats."), "app.js generic stats writer must not overwrite gameplay feedback");
for (const [source, label] of [[appJs, "app.js"], [suguruAppJs, "suguru-app.js"]]) {
  ensure(!source.includes("state.dailyResults.entries[key] = nextResult") && !source.includes("state.dailyResults.entries[dailyKey] = nextResult"), `${label} Daily completion must not mutate the durable ledger before verified persistence`);
}

for (const snippet of [
  "setDiscardKind(elements.sessionRitualButton, ritual.discardKind);",
  "setDiscardKind(elements.railNextStepButton, featured.discardKind);",
  "setDiscardKind(elements.featuredChallengeButton, featured.discardKind);",
  'setDiscardKind(elements.dailyEditionPrimaryButton, preservesCurrentBoard ? null : "replace");'
]) expectIncludes(appJs, snippet, "app.js");
for (const snippet of [
  "setDiscardKind(elements.heroChallengeButton, \"replace\");",
  "setDiscardKind(elements.ritualButton, nextAction.discardKind);",
  "setDiscardKind(elements.railNextStepButton, nextAction.discardKind);",
  'setDiscardKind(elements.dailyEditionPrimaryButton, preservesCurrentBoard ? null : "replace");',
  'data-cage-garden-step-action="${step.id}" data-discard-kind="replace"'
]) expectIncludes(suguruAppJs, snippet, "suguru-app.js");

validateStaticAccessibility(indexHtml, "index.html", "sudoku-board");
validateStaticAccessibility(suguruHtml, "suguru.html", "suguru-board");
validateDailyScriptOrder(indexHtml, "index.html", "app.js");
validateDailyScriptOrder(suguruHtml, "suguru.html", "suguru-app.js");
validateContentScriptOrder(indexHtml, "index.html", "puzzles.js", "app.js");
validateContentScriptOrder(suguruHtml, "suguru.html", "suguru-puzzles.js", "suguru-app.js");
validateDailySurface(indexHtml, "index.html", "rail-extras-panel");
validateDailySurface(suguruHtml, "suguru.html", "cage-garden-panel");

console.log("Page wiring and static accessibility validation passed for index.html and suguru.html");
