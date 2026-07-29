import fs from "node:fs";
import vm from "node:vm";

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of ["generated-content.js", "puzzles.js", "suguru-puzzles.js", "daily-editions.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), sandbox, { filename: file });
}

const { DailyEditions, SUDOKU_PUZZLES, SUGURU_PUZZLES } = sandbox.window;
ensure(DailyEditions && DailyEditions.version === 1, "Daily edition API v1 must be available");
ensure(DailyEditions.getCurrentCorpusId("sudoku") === "sudoku-daily-v1", "Sudoku corpus id must be stable");
ensure(DailyEditions.getCurrentCorpusId("suguru") === "suguru-daily-v1", "Suguru corpus id must be stable");
ensure(DailyEditions.hashText("easy-2026-07-29") === 1105275373, "hashText signed-32 behavior must remain frozen");
ensure(DailyEditions.hashText("size5-easy-2026-07-29") === 695721356, "Suguru hash vector must remain frozen");

for (const [value, valid] of [
  ["2024-02-29", true],
  ["2026-02-29", false],
  ["2026-2-09", false],
  ["2026-07-29", true],
  ["2026-13-01", false],
  ["not-a-date", false]
]) {
  ensure(DailyEditions.isValidEditionDate(value) === valid, `date validation mismatch for ${value}`);
}
ensure(DailyEditions.isFutureEdition("2026-07-30", "2026-07-29"), "future edition comparison must be literal");
ensure(!DailyEditions.isFutureEdition("2026-07-29", "2026-07-29"), "today must not be future");

const sudokuCorpus = DailyEditions.validateCorpus("sudoku", SUDOKU_PUZZLES);
const suguruCorpus = DailyEditions.validateCorpus("suguru", SUGURU_PUZZLES);
ensure(sudokuCorpus.ok, `Sudoku v1 corpus must validate: ${sudokuCorpus.reason || "unknown"}`);
ensure(suguruCorpus.ok, `Suguru v1 corpus must validate: ${suguruCorpus.reason || "unknown"}`);
ensure(sudokuCorpus.memberCount === 162, "Sudoku v1 corpus must freeze 162 generated puzzles");
ensure(suguruCorpus.memberCount === 19, "Suguru v1 corpus must freeze 19 clue variants");

const goldenVectors = [
  ["sudoku", "easy", "easy-garden-path-c-r1"],
  ["sudoku", "medium", "medium-paper-lantern-a-r0"],
  ["sudoku", "advanced", "advanced-cedar-path-c-r1"],
  ["sudoku", "hard", "hard-winter-ink-c-r2"],
  ["sudoku", "expert", "expert-no-mercy-a-r0"],
  ["suguru", "size5-easy", "suguru-size5-garden-path"],
  ["suguru", "size5-medium", "suguru-size5-cascade-bridge"],
  ["suguru", "size5-challenge", "suguru-size5-lantern-deep-night"]
];
for (const [gameId, band, puzzleId] of goldenVectors) {
  const puzzleLibrary = gameId === "sudoku" ? SUDOKU_PUZZLES : SUGURU_PUZZLES;
  const result = DailyEditions.resolveEdition({
    gameId,
    band,
    edition: "2026-07-29",
    corpus: DailyEditions.getCurrentCorpusId(gameId),
    puzzleLibrary,
    today: "2026-07-29"
  });
  ensure(result.ok && result.puzzle?.id === puzzleId, `${gameId} ${band} golden edition mismatch: ${result.puzzle?.id || result.reason}`);
  ensure(DailyEditions.validateEditionIdentity(result.identity, { puzzleLibrary, today: "2026-07-29" }).ok, `${gameId} ${band} identity must revalidate`);
}

ensure(DailyEditions.getSudokuSpecial("easy", "2026-01-05")?.id === "moon-memory-daily", "Easy Moon special vector must remain stable");
ensure(DailyEditions.getSudokuSpecial("advanced", "2026-01-01")?.id === "petal-daily", "Advanced Petal special vector must remain stable");
ensure(DailyEditions.getSudokuSpecial("easy", "2026-07-29") === null, "Easy no-special vector must remain stable");

const reversedSudoku = Object.fromEntries(Object.entries(SUDOKU_PUZZLES).map(([band, entries]) => [band, [...entries].reverse()]));
const reordered = DailyEditions.resolveEdition({
  gameId: "sudoku",
  band: "easy",
  edition: "2026-07-29",
  corpus: "sudoku-daily-v1",
  puzzleLibrary: reversedSudoku,
  today: "2026-07-29"
});
ensure(reordered.ok && reordered.puzzle.id === "easy-garden-path-c-r1", "Runtime pool order must not change edition identity");

const clone = (value) => JSON.parse(JSON.stringify(value));
const mutatedSudoku = clone(SUDOKU_PUZZLES);
mutatedSudoku.easy[0].puzzle = `${mutatedSudoku.easy[0].puzzle.slice(0, -1)}0`;
ensure(!DailyEditions.validateCorpus("sudoku", mutatedSudoku).ok, "Fingerprint drift must make the Sudoku corpus unavailable");
const missingSuguru = clone(SUGURU_PUZZLES);
missingSuguru["size5-easy"] = missingSuguru["size5-easy"].filter((entry) => entry.id !== "suguru-size5-garden-path");
ensure(!DailyEditions.validateCorpus("suguru", missingSuguru).ok, "Missing Suguru member must make the corpus unavailable");
const duplicateSuguru = clone(SUGURU_PUZZLES);
duplicateSuguru["size5-easy"].push(clone(duplicateSuguru["size5-easy"][0]));
ensure(!DailyEditions.validateCorpus("suguru", duplicateSuguru).ok, "Duplicate Suguru member must make the corpus unavailable");

for (const [label, request, reason] of [
  ["unknown corpus", { corpus: "sudoku-daily-v9", edition: "2026-07-29" }, "unknown-corpus"],
  ["invalid date", { corpus: "sudoku-daily-v1", edition: "2026-02-29" }, "invalid-edition"],
  ["future date", { corpus: "sudoku-daily-v1", edition: "2026-07-30" }, "future-edition"]
]) {
  const result = DailyEditions.resolveEdition({
    gameId: "sudoku",
    band: "easy",
    puzzleLibrary: SUDOKU_PUZZLES,
    today: "2026-07-29",
    ...request
  });
  ensure(!result.ok && result.reason === reason, `${label} must fail without verified provenance`);
}

const validEntry = (edition, band, puzzleId, seconds = 120) => ({
  edition,
  corpus: "sudoku-daily-v1",
  band,
  puzzleId,
  seconds,
  mistakes: 0,
  assisted: false,
  completedAt: `${edition}T12:00:00.000Z`
});
const streakEntries = {
  "sudoku-daily-v1|2026-07-27|easy": validEntry("2026-07-27", "easy", "easy-garden-path-b-r2"),
  "sudoku-daily-v1|2026-07-28|easy": validEntry("2026-07-28", "easy", "easy-garden-path-c-r0"),
  "sudoku-daily-v1|2026-07-28|medium": validEntry("2026-07-28", "medium", "medium-paper-lantern-a-r1")
};
ensure(DailyEditions.getDailyStreak(streakEntries, "2026-07-29") === 2, "same-day multi-band results must count once and yesterday may hold the active streak");
ensure(DailyEditions.getDailyStreak({
  "sudoku-daily-v1|2026-07-26|easy": validEntry("2026-07-26", "easy", "easy-garden-path-b-r1")
}, "2026-07-29") === 0, "a real date gap must reset the Daily streak");

console.log("Verified Daily edition contract validation passed");
