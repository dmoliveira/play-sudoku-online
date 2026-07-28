import fs from "node:fs";

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const suguruHtml = fs.readFileSync(new URL("../suguru.html", import.meta.url), "utf8");

function expectIncludes(source, snippet, label) {
  ensure(source.includes(snippet), `${label} missing snippet: ${snippet}`);
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

  const padIndex = source.indexOf('id="number-pad"');
  const inlineHelpIndex = source.indexOf('class="support-links inline-help-actions"');
  const setupHelpIndex = source.indexOf('id="setup-help-panel"');
  ensure(padIndex < inlineHelpIndex && inlineHelpIndex < setupHelpIndex, `${label} help action must follow the keypad and precede help content`);
}

expectIncludes(indexHtml, 'id="game-select"', 'index.html');
expectIncludes(indexHtml, 'id="difficulty-select"', 'index.html');
expectIncludes(indexHtml, '<script src="games.js"></script>', 'index.html');
expectIncludes(indexHtml, '<script src="game-switcher.js"></script>', 'index.html');
expectIncludes(indexHtml, '<script src="app.js"></script>', 'index.html');

expectIncludes(suguruHtml, 'id="game-select"', 'suguru.html');
expectIncludes(suguruHtml, 'id="level-select"', 'suguru.html');
expectIncludes(suguruHtml, 'id="suguru-board"', 'suguru.html');
expectIncludes(suguruHtml, '<script src="suguru-puzzles.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="suguru.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="games.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="game-switcher.js"></script>', 'suguru.html');
expectIncludes(suguruHtml, '<script src="suguru-app.js"></script>', 'suguru.html');

validateStaticAccessibility(indexHtml, "index.html", "sudoku-board");
validateStaticAccessibility(suguruHtml, "suguru.html", "suguru-board");

console.log("Page wiring and static accessibility validation passed for index.html and suguru.html");
