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

console.log('Page wiring validation passed for index.html and suguru.html');
