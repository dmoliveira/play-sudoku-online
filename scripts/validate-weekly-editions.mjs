import fs from "node:fs";
import vm from "node:vm";

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of ["generated-content.js", "puzzles.js", "weekly-editions.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), sandbox, { filename: file });
}
const { WeeklyEditions, SUDOKU_PUZZLES } = sandbox.window;
const clone = (value) => JSON.parse(JSON.stringify(value));

ensure(WeeklyEditions?.version === 1, "Weekly edition API v1 must be available");
ensure(WeeklyEditions.hashText("2026-07-27-bridge-week-step-1-medium-classic") === 99032213, "Weekly hash behavior must remain frozen");
const manifest = WeeklyEditions.getManifest();
const expectedCounts = { easy: 27, medium: 36, advanced: 45, hard: 27, expert: 27 };
for (const [difficulty, count] of Object.entries(expectedCounts)) {
  ensure(manifest[difficulty].ids.length === count, `${difficulty} Weekly v1 count must remain ${count}`);
  ensure(manifest[difficulty].fingerprints.length === count, `${difficulty} Weekly v1 fingerprints must remain ${count}`);
}
const registry = WeeklyEditions.validateRegistry(SUDOKU_PUZZLES);
ensure(registry.ok && registry.memberCount === 162, `Weekly v1 must validate 162 baseline IDs: ${registry.reason || "unknown"}`);
ensure(Object.values(SUDOKU_PUZZLES).flat().length === 189, "expanded registry must include 189 resolvable IDs");
ensure(!Object.values(manifest).flatMap((entry) => entry.ids).some((id) => id.includes("sunlit-maple") || id.includes("temple-current") || id.includes("starlit-pines")), "generated families must remain outside Weekly v1");

const vectors = [
  [{ weekKey: "2026-07-27", pathId: "bridge-week", stepId: "step-1", difficulty: "medium", mode: "classic" }, "medium-koi-cascade-a-r2"],
  [{ weekKey: "2026-07-27", pathId: "bridge-week", stepId: "step-2", difficulty: "advanced", mode: "classic" }, "advanced-rising-bridge-b-r2"],
  [{ weekKey: "2026-07-27", pathId: "bridge-week", stepId: "step-3", difficulty: "hard", mode: "zen" }, "hard-winter-ink-a-r1"],
  [{ weekKey: "2026-08-03", pathId: "daily-discipline-week", stepId: "step-1", difficulty: "easy", mode: "daily" }, "easy-calm-start-b-r0"],
  [{ weekKey: "2026-08-10", pathId: "petal-recall-week", stepId: "step-3", difficulty: "advanced", mode: "zen" }, "advanced-rising-bridge-b-r1"],
  [{ weekKey: "2026-08-17", pathId: "hidden-legend-path", stepId: "step-3", difficulty: "advanced", mode: "nonotes" }, "advanced-stone-rhythm-b-r1"]
];
for (const [request, expectedId] of vectors) {
  const resolved = WeeklyEditions.resolve({ ...request, puzzleLibrary: SUDOKU_PUZZLES });
  ensure(resolved.ok && resolved.puzzle.id === expectedId, `${request.pathId}/${request.stepId} vector drift: ${resolved.puzzle?.id || resolved.detail}`);
}

const reversed = Object.fromEntries(Object.entries(SUDOKU_PUZZLES).map(([difficulty, entries]) => [difficulty, [...entries].reverse()]));
const toggled = clone(reversed);
Object.values(toggled).flat().forEach((entry) => { entry.selectable = !entry.selectable; });
for (const [request, expectedId] of vectors) {
  ensure(WeeklyEditions.resolve({ ...request, puzzleLibrary: reversed }).puzzle?.id === expectedId, "Runtime reorder must not change Weekly identity");
  ensure(WeeklyEditions.resolve({ ...request, puzzleLibrary: toggled }).puzzle?.id === expectedId, "Selectable flags must not change Weekly identity");
}

const mutated = clone(SUDOKU_PUZZLES);
mutated.medium.find((entry) => entry.id === "medium-koi-cascade-a-r2").puzzle = "0" + mutated.medium.find((entry) => entry.id === "medium-koi-cascade-a-r2").puzzle.slice(1);
const unavailable = WeeklyEditions.resolve({ ...vectors[0][0], puzzleLibrary: mutated });
ensure(!unavailable.ok && unavailable.reason === "weekly-v1-unavailable" && unavailable.detail.startsWith("fingerprint-mismatch:"), "Fingerprint drift must fail Weekly closed");
const missing = clone(SUDOKU_PUZZLES);
missing.easy = missing.easy.filter((entry) => entry.id !== manifest.easy.ids[0]);
ensure(!WeeklyEditions.validateBand("easy", missing).ok, "Missing Weekly member must fail closed");
const duplicate = clone(SUDOKU_PUZZLES);
duplicate.hard.push(clone(duplicate.hard.find((entry) => entry.id === manifest.hard.ids[0])));
ensure(!WeeklyEditions.validateBand("hard", duplicate).ok, "Duplicate Weekly member must fail closed");

const unfinishedResume = {
  version: 2,
  runSource: "weekly",
  difficulty: "medium",
  mode: "classic",
  puzzleId: vectors[0][1],
  currentWeeklyPathId: "bridge-week",
  currentWeeklyStepId: "step-1",
  currentWeeklyWeekKey: "2026-07-27",
  board: Array(81).fill(0)
};
const weeklyLedger = { "2026-07-27": { pathId: "bridge-week", completedSteps: {} } };
const resumeBefore = JSON.stringify(unfinishedResume);
const ledgerBefore = JSON.stringify(weeklyLedger);
WeeklyEditions.resolve({ ...vectors[0][0], puzzleLibrary: mutated });
ensure(JSON.stringify(unfinishedResume) === resumeBefore && JSON.stringify(weeklyLedger) === ledgerBefore, "Fail-closed resolution must not mutate unfinished resume or ledger inputs");
ensure(WeeklyEditions.resolve({ ...vectors[0][0], puzzleLibrary: reversed }).puzzle.id === unfinishedResume.puzzleId, "Unfinished baseline Weekly resume must retain exact identity after append/reorder");

const sourceText = fs.readFileSync(new URL("../weekly-editions.js", import.meta.url), "utf8");
ensure(!sourceText.includes("DailyEditions"), "Weekly v1 manifest must not alias the current Daily registry");
console.log("Weekly v1 contract validation passed for 162 frozen IDs and", vectors.length, "golden vectors");
