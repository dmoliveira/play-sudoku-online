import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of ["practice-selection.js", "generated-content.js", "puzzles.js", "suguru-puzzles.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), sandbox, { filename: file });
}
const { PracticeSelection, SUDOKU_PUZZLES, SUGURU_PUZZLES } = sandbox.window;
let assertions = 0;
function check(condition, message) { assertions += 1; assert.ok(condition, message); }
function equal(actual, expected, message) { assertions += 1; assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), message); }

class FakeStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); this.reads = 0; this.writes = 0; }
  getItem(key) { this.reads += 1; return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.writes += 1; this.values.set(key, String(value)); }
}
class ThrowingStorage {
  getItem() { throw new Error("unavailable"); }
  setItem() { throw new Error("unavailable"); }
}
class WriteThrowingStorage {
  getItem() { return null; }
  setItem() { throw new Error("unavailable"); }
}
class RecoveringStorage extends FakeStorage {
  constructor(initial = {}) { super(initial); this.failWrites = true; }
  setItem(key, value) {
    this.writes += 1;
    if (this.failWrites) throw new Error("unavailable");
    this.values.set(key, String(value));
  }
}

check(PracticeSelection.version === 1 && PracticeSelection.storageKey === "sudoku-sakura-practice-rotation", "practice rotation identity must be stable");
const entries = [
  { id: "a-1", familyId: "a", selectable: true },
  { id: "a-2", familyId: "a", selectable: true },
  { id: "b-1", familyId: "b", selectable: true },
  { id: "c-1", familyId: "c", selectable: true },
  { id: "d-disabled", familyId: "d", selectable: false }
];
let state = { version: 1, bands: {} };
const original = JSON.stringify(state);
const groups = [];
const puzzles = [];
for (let index = 0; index < 6; index += 1) {
  const result = PracticeSelection.select({ gameId: "sudoku", band: "easy", entries, state, random: () => 0 });
  check(result.ok, "pure selection must succeed");
  groups.push(result.groupId);
  puzzles.push(result.puzzle.id);
  state = result.nextState;
}
check(original === JSON.stringify({ version: 1, bands: {} }), "selection fixture input baseline must stay stable");
check(new Set(groups.slice(0, 3)).size === 3, "every selectable family must appear before reuse");
check(groups[2] !== groups[3], "shuffle bag must prevent a boundary repeat");
check(!groups.includes("d"), "disabled families must not enter rotation");
check(puzzles.some((id) => id.startsWith("a-")), "variant selection must resolve a puzzle inside the chosen family");

const stateBeforePure = JSON.stringify(state);
PracticeSelection.select({ gameId: "sudoku", band: "easy", entries, state, random: () => 0.5 });
check(JSON.stringify(state) === stateBeforePure, "pure select must not mutate its input state");

const storage = new FakeStorage();
const ineligible = PracticeSelection.commitSelection({ launchKind: "daily-edition", gameId: "sudoku", band: "easy", entries, storage, random: () => 0 });
check(!ineligible.ok && storage.reads === 0 && storage.writes === 0, "non-practice launch must not read or write rotation storage");
const firstCommit = PracticeSelection.commitSelection({ launchKind: "ordinary-practice", gameId: "sudoku", band: "easy", entries, storage, random: () => 0 });
const secondCommit = PracticeSelection.commitSelection({ launchKind: "ordinary-practice", gameId: "sudoku", band: "easy", entries, storage, random: () => 0 });
check(firstCommit.ok && secondCommit.ok && firstCommit.groupId !== secondCommit.groupId, "committed launches must advance the persisted family bag");
check(storage.writes === 2, "each committed ordinary-practice launch must write once");
const persisted = JSON.parse(storage.values.get(PracticeSelection.storageKey));
check(persisted.version === 1 && persisted.bands["sudoku|easy"].last === secondCommit.groupId, "persisted branch must record inventory, remaining groups, and last group");

const malformed = PracticeSelection.normalizeState({
  version: 1,
  bands: {
    "sudoku|easy": { inventory: 7, remaining: "bad", last: [] },
    "suguru|size5-easy": { inventory: "ok", remaining: ["one", "one", "two"], last: "three" },
    bad: { inventory: "ignored", remaining: [] }
  }
});
check(!malformed.bands["sudoku|easy"] && !malformed.bands.bad, "malformed branches must normalize independently");
equal(malformed.bands["suguru|size5-easy"].remaining, ["one", "two"], "valid sibling branch must survive corruption elsewhere");

const inventoryState = { version: 1, bands: {
  "sudoku|easy": { inventory: "stale", remaining: ["ghost"], last: "ghost" },
  "suguru|size5-easy": { inventory: "keep", remaining: ["layout"], last: null }
} };
const inventoryResult = PracticeSelection.select({ gameId: "sudoku", band: "easy", entries, state: inventoryState, random: () => 0 });
check(inventoryResult.ok && inventoryResult.inventory !== "stale" && inventoryResult.groupId !== "ghost", "inventory changes must reset only the selected branch");
equal(inventoryResult.nextState.bands["suguru|size5-easy"], inventoryState.bands["suguru|size5-easy"], "inventory reset must preserve sibling game/band state");

const throwing = new ThrowingStorage();
const memoryFirst = PracticeSelection.commitSelection({ launchKind: "ordinary-practice", gameId: "suguru", band: "fallback", entries: entries.map((entry) => ({ ...entry, layoutFamilyId: entry.familyId })), storage: throwing, random: () => 0 });
const memorySecond = PracticeSelection.commitSelection({ launchKind: "ordinary-practice", gameId: "suguru", band: "fallback", entries: entries.map((entry) => ({ ...entry, layoutFamilyId: entry.familyId })), storage: throwing, random: () => 0 });
check(memoryFirst.ok && memorySecond.ok && !memoryFirst.persisted && memoryFirst.groupId !== memorySecond.groupId, "unavailable storage must retain a safe in-memory rotation");
const writeThrowing = new WriteThrowingStorage();
const writeFallbackFirst = PracticeSelection.commitSelection({ launchKind: "ordinary-practice", gameId: "sudoku", band: "write-fallback", entries, storage: writeThrowing, random: () => 0 });
const writeFallbackSecond = PracticeSelection.commitSelection({ launchKind: "ordinary-practice", gameId: "sudoku", band: "write-fallback", entries, storage: writeThrowing, random: () => 0 });
check(writeFallbackFirst.ok && writeFallbackSecond.ok && writeFallbackFirst.groupId !== writeFallbackSecond.groupId, "write-only storage failure must continue through the in-memory bag");
equal(PracticeSelection.readState(new FakeStorage()), { version: 1, bands: {} }, "an available empty storage must not inherit another adapter's in-memory state");
equal(PracticeSelection.readState(new FakeStorage({ [PracticeSelection.storageKey]: "{bad" })), { version: 1, bands: {} }, "malformed serialized storage must reset safely instead of leaking in-memory state");
const recovering = new RecoveringStorage();
const recoveryFirst = PracticeSelection.commitSelection({ launchKind: "ordinary-practice", gameId: "sudoku", band: "recovering", entries, storage: recovering, random: () => 0 });
const recoverySecond = PracticeSelection.commitSelection({ launchKind: "ordinary-practice", gameId: "sudoku", band: "recovering", entries, storage: recovering, random: () => 0 });
recovering.failWrites = false;
const recoveryThird = PracticeSelection.commitSelection({ launchKind: "ordinary-practice", gameId: "sudoku", band: "recovering", entries, storage: recovering, random: () => 0 });
check([recoveryFirst.persisted, recoverySecond.persisted, recoveryThird.persisted].join(",") === "false,false,true", "practice commits must expose failure, repeat failure, and later recovery outcomes");
check(new Set([recoveryFirst.groupId, recoverySecond.groupId, recoveryThird.groupId]).size === 3, "session-memory rotation must avoid repeats across failed writes and recovery");
equal(JSON.parse(recovering.values.get(PracticeSelection.storageKey)), recoveryThird.nextState, "recovery must persist the complete in-memory rotation state");

const sudokuEntries = Object.values(SUDOKU_PUZZLES).flat();
const suguruEntries = Object.values(SUGURU_PUZZLES).flat();
check(sudokuEntries.filter((entry) => entry.selectable !== false).length === 198, "all 198 validated Sudoku IDs must be enabled for practice rotation");
check(new Set(sudokuEntries.map((entry) => entry.familyId)).size === 22, "Sudoku practice inventory must expose 22 stable families");
check(suguruEntries.filter((entry) => entry.selectable !== false).length === 26, "all 26 validated Suguru entries must be enabled for practice rotation");
check(new Set(suguruEntries.map((entry) => entry.layoutFamilyId)).size === 4, "Suguru practice inventory must group six names into four structural families");
const gardenFamily = new Set(suguruEntries.filter((entry) => ["garden", "brook", "cascade"].includes(entry.layout)).map((entry) => entry.layoutFamilyId));
check(gardenFamily.size === 1, "Garden, Brook, and Cascade must rotate as one dihedral family");

console.log(`Practice selection validation passed: ${assertions} assertions across pure, persisted, corrupt, and fallback states`);
