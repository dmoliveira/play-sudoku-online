import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../challenge-compass.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "challenge-compass.js" });
const Compass = sandbox.window.ChallengeCompass;
let assertions = 0;

function equal(actual, expected, message) {
  assertions += 1;
  const normalize = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(normalize(actual), normalize(expected), message);
}

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function descriptor(actionId) {
  return { actionId, title: `${actionId} title`, text: `${actionId} text`, label: `${actionId} label`, tag: `${actionId} tag`, focus: `${actionId} focus`, discardKind: actionId === "current" ? null : "replace" };
}

const candidates = Object.fromEntries(Compass.slots.map((slot) => [slot, descriptor(slot)]));
const snapshot = JSON.stringify(candidates);
equal(Compass.choose(candidates).actionId, "current", "current board must have first priority");
equal(Compass.choose({ ...candidates, current: null }).actionId, "continuation", "started source continuation must precede new content");
equal(Compass.choose({ ...candidates, current: null, continuation: null }).actionId, "focus", "eligible unfinished focus must precede Daily");
equal(Compass.choose({ daily: descriptor("daily"), fallback: descriptor("fallback") }).actionId, "daily", "Daily must precede fallback");
equal(Compass.choose({ fallback: descriptor("fallback") }).actionId, "fallback", "fallback must remain reachable");
equal(Compass.choose({ current: { actionId: "bad" }, fallback: descriptor("fallback") }).actionId, "fallback", "malformed descriptors must fail closed per branch");
equal(Compass.choose(null), null, "invalid candidate input must fail closed");
check(JSON.stringify(candidates) === snapshot, "selection must not mutate input");
check(JSON.stringify(Compass.choose(candidates)) === JSON.stringify(Compass.choose(candidates)), "equal context must produce byte-equivalent output");
check(Object.isFrozen(Compass.choose(candidates)), "issued descriptors must be frozen");

const empty = Compass.normalizeFocusResults(null);
equal(empty, { version: 1, completed: {} }, "missing focus results must normalize empty");
equal(Compass.normalizeFocusResults({ version: 2, completed: { "sudoku|hard-pair-current-a-r0": true } }), { version: 1, completed: {} }, "unknown focus result versions must fail closed");
const normalized = Compass.normalizeFocusResults({ version: 1, completed: { "sudoku|hard-pair-current-a-r0": true, "suguru|valid": false, "bad": true, "suguru|mist-pair": true } });
equal(normalized, { version: 1, completed: { "sudoku|hard-pair-current-a-r0": true, "suguru|mist-pair": true } }, "focus result branches must normalize independently");
check(Object.isFrozen(normalized) && Object.isFrozen(normalized.completed), "focus result graph must be frozen");
const completed = Compass.completeFocus(normalized, "suguru", "second-pair");
check(Compass.isFocusComplete(completed, "suguru", "second-pair"), "completed focus must be queryable");
check(!Compass.isFocusComplete(completed, "sudoku", "second-pair"), "focus completion must remain game-specific");
equal(Compass.completeFocus(completed, "suguru", "second-pair"), completed, "focus completion must be idempotent");
equal(Compass.completeFocus(completed, "bad", "id"), completed, "invalid focus identities must not mutate results");
check(!/localStorage|sessionStorage|Math\.random|Date\s*\(/.test(source), "pure Compass must not access storage, randomness, or time");

console.log(`Challenge Compass validation passed: ${assertions} assertions across priority, purity, and focus results`);
