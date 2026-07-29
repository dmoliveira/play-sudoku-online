import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createNetServer } from "node:net";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN_HOST = "127.0.0.1";
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 500, height: 900 },
  { width: 720, height: 900 },
  { width: 1440, height: 1000 }
];
const GAMES = [
  { name: "Sudoku", path: "/index.html", size: 9, boardId: "sudoku-board" },
  { name: "Suguru", path: "/suguru.html", size: 5, boardId: "suguru-board" }
];
const SUGURU_RESUME_KEY = "sudoku-sakura-suguru-resume";
const SUGURU_JOURNEY_KEY = "sudoku-sakura-suguru-cage-garden";
const SUGURU_FIXTURES = {
  garden: {
    id: "suguru-size5-garden-path",
    level: "size5-easy",
    puzzle: "1212334000100003000020000",
    solution: "1212334341121523434321212"
  },
  brook: {
    id: "suguru-size5-brook-bridge",
    level: "size5-medium",
    puzzle: "3212000043000010000300002",
    solution: "3212114343251213434321212"
  },
  cascade: {
    id: "suguru-size5-cascade-midnight-path",
    level: "size5-challenge",
    puzzle: "0001000000000010000223100",
    solution: "2321314542231311424223131"
  }
};

function createSuguruResume(fixture, overrides = {}) {
  const board = fixture.puzzle.split("").map(Number);
  return JSON.stringify({
    version: 2,
    level: fixture.level,
    mode: "classic",
    puzzleId: fixture.id,
    board,
    notes: Array.from({ length: 25 }, () => []),
    selectedIndex: board.findIndex((value) => value === 0),
    mistakes: 0,
    notesMode: false,
    showMistakes: true,
    secondsElapsed: 0,
    paused: false,
    pauseReason: null,
    ...overrides
  });
}
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};
const failures = [];
let assertionCount = 0;

function check(condition, message, detail = "") {
  assertionCount += 1;
  if (!condition) {
    failures.push(detail ? `${message}: ${detail}` : message);
  }
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

async function findExecutable(candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next supported browser location.
    }
  }
  return null;
}

async function getFreePort() {
  const server = createNetServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, ORIGIN_HOST, resolveListen);
  });
  const { port } = server.address();
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", `http://${ORIGIN_HOST}`);
      const pathname = requestUrl.pathname === "/" ? "/index.html" : decodeURIComponent(requestUrl.pathname);
      const relativePath = normalize(pathname).replace(/^([/\\])+/, "");
      const filePath = resolve(ROOT, relativePath);
      if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const content = await readFile(filePath);
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": MIME_TYPES[extname(filePath)] || "application/octet-stream"
      });
      response.end(content);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
}

class CdpClient {
  constructor(webSocketUrl) {
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
    this.socket = new WebSocket(webSocketUrl);
  }

  rejectPending(error) {
    for (const { rejectMessage, timer } of this.pending.values()) {
      clearTimeout(timer);
      rejectMessage(error);
    }
    this.pending.clear();
  }

  async connect() {
    await new Promise((resolveOpen, rejectOpen) => {
      this.socket.addEventListener("open", resolveOpen, { once: true });
      this.socket.addEventListener("error", rejectOpen, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolveMessage, rejectMessage, timer } = this.pending.get(message.id);
        clearTimeout(timer);
        this.pending.delete(message.id);
        if (message.error) rejectMessage(new Error(message.error.message));
        else resolveMessage(message.result);
        return;
      }
      if (message.method) this.events.push(message);
    });
    this.socket.addEventListener("close", () => this.rejectPending(new Error("Chrome DevTools connection closed")));
    this.socket.addEventListener("error", () => this.rejectPending(new Error("Chrome DevTools connection failed")));
  }

  send(method, params = {}, timeoutMs = 10000) {
    const id = ++this.nextId;
    return new Promise((resolveMessage, rejectMessage) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectMessage(new Error(`Timed out waiting for CDP method ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolveMessage, rejectMessage, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description || exceptionDetails.text || "Browser evaluation failed");
    }
    return result.value;
  }

  close() {
    this.socket.close();
  }
}
async function waitForJson(url, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForDocument(client, game, token, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const ready = await client.evaluate(`document.readyState === "complete"
        && location.pathname.endsWith(${JSON.stringify(game.path)})
        && window.__SUDOKU_VALIDATION_TOKEN === ${JSON.stringify(token)}`);
      if (ready) {
        await client.evaluate(`document.fonts?.ready || Promise.resolve()`);
        return;
      }
    } catch {
      // The target may still be navigating.
    }
    await sleep(50);
  }
  throw new Error(`Timed out waiting for ${game.name} document token ${token}`);
}

async function terminateProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.kill("SIGTERM");
  const stopped = await Promise.race([exited.then(() => true), sleep(3000).then(() => false)]);
  if (!stopped) {
    child.kill("SIGKILL");
    await exited;
  }
}

function runtimeErrors(events) {
  return events
    .filter((event) => event.method === "Runtime.exceptionThrown")
    .map((event) => event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text || "Unknown runtime exception");
}

const chromePath = await findExecutable([
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
]);

if (!chromePath) {
  throw new Error("Chrome or Chromium is required. Set CHROME_PATH to its executable.");
}
if (typeof WebSocket === "undefined") {
  throw new Error("This browser validator requires a Node release with the built-in WebSocket client (Node 22+).");
}

const staticServer = createStaticServer();
await new Promise((resolveListen, rejectListen) => {
  staticServer.once("error", rejectListen);
  staticServer.listen(0, ORIGIN_HOST, resolveListen);
});
const staticPort = staticServer.address().port;
const debugPort = await getFreePort();
const profilePath = await mkdtemp(join(tmpdir(), "sudoku-sakura-browser-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--disable-background-networking",
  "--no-default-browser-check",
  "--no-first-run",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profilePath}`,
  "about:blank"
], { stdio: "ignore" });

let client;
try {
  const targets = await waitForJson(`http://${ORIGIN_HOST}:${debugPort}/json/list`);
  const pageTarget = targets.find((target) => target.type === "page");
  if (!pageTarget) throw new Error("Chrome did not expose a page target");
  client = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");
  await client.send("Network.setBlockedURLs", { urls: ["https://fonts.googleapis.com/*", "https://fonts.gstatic.com/*"] });
  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });

  const origin = `http://${ORIGIN_HOST}:${staticPort}`;

  async function navigate(game, viewport, { query = "", storageEntries = {} } = {}) {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: viewport.width,
      screenHeight: viewport.height
    });
    const token = `${game.name}-${viewport.width}-${Date.now()}-${Math.random()}`;
    const seedSource = `(() => {
      window.__SUDOKU_VALIDATION_TOKEN = ${JSON.stringify(token)};
      window.__SUDOKU_VALIDATION_CLS = 0;
      window.__SUDOKU_VALIDATION_LAYOUT_SHIFTS = [];
      if (typeof PerformanceObserver !== "undefined") {
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                window.__SUDOKU_VALIDATION_CLS += entry.value;
                window.__SUDOKU_VALIDATION_LAYOUT_SHIFTS.push(entry.value);
              }
            }
          }).observe({ type: "layout-shift", buffered: true });
        } catch {}
      }
      if (location.origin === ${JSON.stringify(origin)}) {
        localStorage.clear();
        const entries = ${JSON.stringify(storageEntries)};
        Object.entries(entries).forEach(([key, value]) => localStorage.setItem(key, value));
      }
    })();`;
    const { identifier } = await client.send("Page.addScriptToEvaluateOnNewDocument", { source: seedSource });
    client.events = [];
    try {
      const navigation = await client.send("Page.navigate", { url: `${origin}${game.path}${query}` });
      if (navigation.errorText) throw new Error(navigation.errorText);
      await waitForDocument(client, game, token);
      await client.evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 100))))`);
    } finally {
      await client.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
    }
  }

  async function reloadPreservingStorage(game) {
    const token = `${game.name}-reload-${Date.now()}-${Math.random()}`;
    const { identifier } = await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `window.__SUDOKU_VALIDATION_TOKEN = ${JSON.stringify(token)};`
    });
    client.events = [];
    try {
      await client.send("Page.reload", { ignoreCache: true });
      await waitForDocument(client, game, token);
      await sleep(25);
    } finally {
      await client.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
    }
  }

  for (const game of GAMES) {
    for (const viewport of VIEWPORTS) {
      await navigate(game, viewport);
      const layout = await client.evaluate(`(() => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
        };
        const intersects = (left, right) => left.x < right.right && left.right > right.x && left.y < right.bottom && left.bottom > right.y;
        const board = document.getElementById(${JSON.stringify(game.boardId)});
        const rows = [...board.querySelectorAll(":scope > [role=row]")];
        const pad = document.getElementById("number-pad");
        const header = document.querySelector(".game-header");
        const controls = document.querySelector(".controls-row");
        const status = document.querySelector(".status-chips");
        const directChildren = [...document.querySelector(".game-panel").children]
          .filter((element) => !element.hidden && getComputedStyle(element).display !== "none")
          .map((element) => ({ id: element.id, className: element.className, order: getComputedStyle(element).order, y: rect(element).y }));
        const boardRect = rect(board);
        const padRect = rect(pad);
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          padPosition: getComputedStyle(pad).position,
          directChildren,
          overlapHeader: intersects(padRect, rect(header)),
          overlapControls: intersects(padRect, rect(controls)),
          overlapStatus: intersects(padRect, rect(status)),
          rowCount: rows.length,
          rowCellCounts: rows.map((row) => row.querySelectorAll(":scope > [role=gridcell]").length),
          boardDifference: Math.abs(boardRect.width - boardRect.height),
          rowWidths: rows.map((row) => Math.abs(rect(row).width - board.clientWidth)),
          activeTag: document.activeElement?.tagName,
          cls: window.__SUDOKU_VALIDATION_CLS || 0,
          layoutShifts: window.__SUDOKU_VALIDATION_LAYOUT_SHIFTS || [],
          setupOpen: document.getElementById("setup-help-panel")?.open,
          brandOverride: document.querySelector("a.brand")?.hasAttribute("aria-label"),
          padNameOverrides: [...pad.querySelectorAll("button")].filter((button) => button.hasAttribute("aria-label")).length
        };
      })()`);
      const label = `${game.name} ${viewport.width}x${viewport.height}`;
      check(layout.scrollWidth <= layout.clientWidth, `${label} has no horizontal overflow`, `${layout.scrollWidth} > ${layout.clientWidth}`);
      check(layout.rowCount === game.size, `${label} exposes ${game.size} ARIA rows`, `found ${layout.rowCount}`);
      check(layout.rowCellCounts.every((count) => count === game.size), `${label} rows expose ${game.size} cells`, JSON.stringify(layout.rowCellCounts));
      check(layout.boardDifference <= 1.5, `${label} board stays square`, `difference ${layout.boardDifference}`);
      check(layout.rowWidths.every((difference) => difference <= 1.5), `${label} rows span the board`, JSON.stringify(layout.rowWidths));
      check(layout.activeTag === "BODY", `${label} does not steal focus on load`, `active ${layout.activeTag}`);
      check(layout.setupOpen === false, `${label} setup help starts closed`);
      check(layout.brandOverride === false, `${label} brand uses visible accessible name`);
      check(layout.padNameOverrides === 0, `${label} keypad uses visible-first accessible names`, `${layout.padNameOverrides} overrides`);
      if (game.name === "Suguru") {
        check(layout.cls <= 0.02, `${label} startup CLS stays within 0.02`, JSON.stringify({ cls: layout.cls, shifts: layout.layoutShifts }));
      }
      if (viewport.width <= 720) {
        check(layout.padPosition === "static", `${label} keypad is in normal flow`, `position ${layout.padPosition}`);
        check(layout.directChildren.every((child) => child.order === "0"), `${label} uses natural game-panel order`, JSON.stringify(layout.directChildren));
        check(!layout.overlapHeader && !layout.overlapControls && !layout.overlapStatus, `${label} keypad does not cover setup/status`);
      }
      check(runtimeErrors(client.events).length === 0, `${label} loads without runtime exceptions`, runtimeErrors(client.events).join(" | "));
    }
  }

  for (const game of GAMES) {
    const viewport = { width: 390, height: 844 };
    await navigate(game, viewport);
    const interaction = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const firstCell = [...document.querySelectorAll(".cell")].find((cell) => !cell.classList.contains("given"));
      if (!firstCell) throw new Error("No editable cell found");
      const index = firstCell.dataset.index;
      firstCell.focus();
      firstCell.click();
      await wait(20);
      const selectedAfterClick = document.activeElement?.dataset?.index;
      const freshBefore = document.querySelector(".cell[data-index='" + index + "']").textContent;
      const digitButtons = [...document.querySelectorAll(".number-button")];
      const digitButton = digitButtons.find((button) => !button.disabled);
      if (!digitButton) throw new Error("No enabled number button found");
      const digitIndex = digitButtons.indexOf(digitButton);
      const digitText = digitButton.querySelector(".digit, .digit-hint")?.textContent?.trim() || digitButton.textContent.trim().split(/\\s+/)[0];
      digitButton.focus();
      digitButton.click();
      await wait(30);
      const freshAfter = document.querySelector(".cell[data-index='" + index + "']").textContent;
      const activePadButton = document.activeElement;
      const rerenderedButtons = [...document.querySelectorAll(".number-button")];
      const keypadFocus = {
        isButton: activePadButton?.matches?.(".number-button") || false,
        digitIndex: rerenderedButtons.indexOf(activePadButton)
      };
      const undoButton = document.getElementById("undo-button");
      const undoEnabled = !undoButton.disabled;
      undoButton.focus();
      undoButton.click();
      await wait(30);
      const freshUndone = document.querySelector(".cell[data-index='" + index + "']").textContent;
      const selectedCell = document.querySelector(".cell.selected");
      if (!selectedCell) throw new Error("No selected cell before arrow navigation");
      const selectedBeforeArrow = Number(selectedCell.dataset.index);
      const column = selectedBeforeArrow % ${game.size};
      const arrowKey = column === ${game.size - 1} ? "ArrowLeft" : "ArrowRight";
      const expectedArrow = selectedBeforeArrow + (arrowKey === "ArrowRight" ? 1 : -1);
      selectedCell.focus();
      selectedCell.dispatchEvent(new KeyboardEvent("keydown", { key: arrowKey, bubbles: true, cancelable: true }));
      await wait(30);
      const selectedAfterArrow = Number(document.querySelector(".cell.selected")?.dataset.index);
      const focusedAfterArrow = Number(document.activeElement?.dataset?.index);
      const pauseButton = document.getElementById("pause-button");
      pauseButton.focus();
      pauseButton.click();
      await wait(30);
      const pauseOverlay = document.getElementById("pause-overlay");
      const backgroundFocusableCount = [...document.querySelectorAll("a[href], button, input, select, summary, [tabindex]")]
        .filter((element) => !pauseOverlay.contains(element)
          && !element.disabled
          && element.tabIndex >= 0
          && !element.closest("[inert]")
          && !element.closest("[hidden]")
          && element.getClientRects().length > 0)
        .length;
      const paused = {
        overlay: !pauseOverlay.hidden,
        inert: document.querySelector(".sudoku-board").inert,
        activeId: document.activeElement?.id,
        backgroundFocusableCount
      };
      document.getElementById("resume-button").click();
      await wait(30);
      return {
        index,
        digitIndex,
        digitText,
        selectedAfterClick,
        changed: freshAfter !== freshBefore && freshAfter.includes(digitText),
        keypadFocus,
        undoEnabled,
        undoRestored: freshUndone === freshBefore,
        selectedBeforeArrow,
        selectedAfterArrow,
        focusedAfterArrow,
        expectedArrow,
        paused,
        resumed: document.getElementById("pause-overlay").hidden
      };
    })()`);
    check(interaction.selectedAfterClick === interaction.index, `${game.name} board click preserves cell focus`, JSON.stringify(interaction));
    check(interaction.changed, `${game.name} keypad changes the selected cell`, JSON.stringify(interaction));
    check(interaction.keypadFocus.isButton && interaction.keypadFocus.digitIndex === interaction.digitIndex, `${game.name} keypad rerender preserves digit focus`, JSON.stringify(interaction));
    check(interaction.undoEnabled && interaction.undoRestored, `${game.name} undo restores the fresh cell`, JSON.stringify(interaction));
    check(interaction.selectedAfterArrow === interaction.expectedArrow && interaction.focusedAfterArrow === interaction.expectedArrow, `${game.name} arrow navigation moves and focuses the expected cell`, JSON.stringify(interaction));
    check(interaction.paused.overlay && interaction.paused.inert && interaction.paused.activeId === "resume-button", `${game.name} pause focuses its inert-board modal`, JSON.stringify(interaction.paused));
    check(interaction.paused.backgroundFocusableCount === 0, `${game.name} pause removes every background control from focus navigation`, JSON.stringify(interaction.paused));
    check(interaction.resumed, `${game.name} resumes from pause`);
    check(runtimeErrors(client.events).length === 0, `${game.name} interaction flow has no runtime exception`, runtimeErrors(client.events).join(" | "));

    await navigate(game, viewport);
    const hero = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const statsKey = ${JSON.stringify(game.name === "Sudoku" ? "sudoku-sakura-stats" : "sudoku-sakura-suguru-stats")};
      const snapshot = () => ({
        board: [...document.querySelectorAll(".cell")].map((cell) => cell.textContent).join("|"),
        challenge: document.getElementById("challenge-label")?.textContent,
        timer: document.getElementById("timer")?.textContent,
        stats: localStorage.getItem(statsKey),
        mode: document.querySelector("#mode-select")?.value
      });
      const before = snapshot();
      const primary = document.querySelector(".hero-cta-row .action-button.primary");
      const secondary = document.querySelector(".hero-cta-row .action-button:not(.primary)");
      const primaryLabel = primary?.textContent.trim();
      const secondaryLabel = secondary?.textContent.trim();
      primary.click();
      await wait(80);
      const afterPrimary = snapshot();
      const primaryFocus = document.activeElement?.id;
      const primaryGeometry = {
        headerBottom: document.querySelector(".topbar")?.getBoundingClientRect().bottom,
        titleTop: document.getElementById("game-title")?.getBoundingClientRect().top,
        firstRowTop: document.querySelector(".sudoku-board > [role=row]")?.getBoundingClientRect().top,
        firstRowBottom: document.querySelector(".sudoku-board > [role=row]")?.getBoundingClientRect().bottom,
        viewportHeight: window.innerHeight
      };
      secondary.click();
      await wait(100);
      const afterSecondary = snapshot();
      const guideGeometry = {
        headerBottom: document.querySelector(".topbar")?.getBoundingClientRect().bottom,
        titleTop: document.getElementById("cage-garden-guide-title")?.getBoundingClientRect().top
      };
      return {
        before,
        afterPrimary,
        afterSecondary,
        primaryFocus,
        primaryLabel,
        secondaryLabel,
        secondaryFocus: document.activeElement?.id,
        primaryGeometry,
        guideGeometry,
        setupOpen: document.getElementById("setup-help-panel")?.open
      };
    })()`);
    check(hero.before.board === hero.afterPrimary.board && hero.before.challenge === hero.afterPrimary.challenge && hero.before.stats === hero.afterPrimary.stats, `${game.name} current-board hero action preserves active state`, JSON.stringify(hero));
    check(hero.primaryFocus === "game-title", `${game.name} current-board hero action focuses the board heading`, JSON.stringify(hero));
    if (game.name === "Suguru") {
      check(hero.primaryLabel === "Enter Garden Gate", "Suguru newcomer hero names its preloaded journey step", JSON.stringify(hero));
      check(hero.secondaryLabel === "Learn the three rules", "Suguru newcomer hero offers the internal guide", JSON.stringify(hero));
      check(hero.before.board === hero.afterSecondary.board && hero.afterSecondary.mode === hero.before.mode && hero.setupOpen && hero.secondaryFocus === "cage-garden-guide-title", "Suguru guide action preserves the board and focuses its internal heading", JSON.stringify(hero));
      check(hero.primaryGeometry.titleTop >= hero.primaryGeometry.headerBottom + 8 && hero.primaryGeometry.firstRowBottom <= hero.primaryGeometry.viewportHeight - 8, "Suguru board-entry hero action clears the sticky header and reveals one complete board row", JSON.stringify(hero.primaryGeometry));
      check(hero.guideGeometry.titleTop >= hero.guideGeometry.headerBottom + 8, "Suguru guide action clears the sticky header", JSON.stringify(hero.guideGeometry));
    } else {
      check(hero.afterSecondary.mode === "daily" && hero.secondaryFocus === "game-title", `${game.name} secondary hero action enters daily play`, JSON.stringify(hero));
    }
    check(runtimeErrors(client.events).length === 0, `${game.name} hero flow has no runtime exception`, runtimeErrors(client.events).join(" | "));

    await navigate(game, viewport);
    await client.evaluate(`document.getElementById("pause-button").click()`);
    await sleep(40);
    client.events = [];
    await reloadPreservingStorage(game);
    await sleep(25);
    const pausedRestore = await client.evaluate(`({ overlay: !document.getElementById("pause-overlay").hidden, activeId: document.activeElement?.id })`);
    check(pausedRestore.overlay && pausedRestore.activeId === "resume-button", `${game.name} paused restore focuses Resume`, JSON.stringify(pausedRestore));
    check(runtimeErrors(client.events).length === 0, `${game.name} paused restore has no runtime exception`, runtimeErrors(client.events).join(" | "));

    const storageFixtures = game.name === "Sudoku"
      ? [
          ["stats object", { "sudoku-sakura-stats": "{}" }],
          ["history object", { "sudoku-sakura-session-history": "{}" }],
          ["daily array", { "sudoku-sakura-daily-results": "[]" }],
          ["weekly array", { "sudoku-sakura-weekly-paths": "[]" }],
          ["malformed resume", { "sudoku-sakura-active-game": "{bad" }]
        ]
      : [
          ["stats object", { "sudoku-sakura-suguru-stats": "{}" }],
          ["resume object", { "sudoku-sakura-suguru-resume": "{}" }],
          ["malformed resume", { "sudoku-sakura-suguru-resume": "{bad" }]
        ];
    for (const [fixtureName, storageEntries] of storageFixtures) {
      try {
        await navigate(game, viewport, { storageEntries });
        check((await client.evaluate(`document.querySelectorAll(".cell").length`)) === game.size * game.size, `${game.name} tolerates ${fixtureName} saved data`);
        check(runtimeErrors(client.events).length === 0, `${game.name} ${fixtureName} causes no runtime exception`, runtimeErrors(client.events).join(" | "));
      } catch (error) {
        check(false, `${game.name} tolerates ${fixtureName} saved data`, error.message);
      }
    }
  }

  const suguru = GAMES[1];
  const longLabelResume = createSuguruResume(SUGURU_FIXTURES.cascade);
  for (const viewport of VIEWPORTS) {
    await navigate(suguru, viewport, { storageEntries: { [SUGURU_RESUME_KEY]: longLabelResume } });
    const restoredLayout = await client.evaluate(`({
      cls: window.__SUDOKU_VALIDATION_CLS || 0,
      shifts: window.__SUDOKU_VALIDATION_LAYOUT_SHIFTS || [],
      puzzleLabel: document.getElementById("challenge-label")?.textContent,
      heroLabel: document.getElementById("hero-daily-button")?.textContent.trim()
    })`);
    const label = `Suguru restored ${viewport.width}x${viewport.height}`;
    check(restoredLayout.cls <= 0.02, `${label} startup CLS stays within 0.02`, JSON.stringify(restoredLayout));
    check(restoredLayout.puzzleLabel?.includes("Cascade midnight path"), `${label} keeps the long-label resume`, JSON.stringify(restoredLayout));
    check(restoredLayout.heroLabel === "Continue Cascade midnight path", `${label} identifies a zero-second restored run`, JSON.stringify(restoredLayout));
    check(runtimeErrors(client.events).length === 0, `${label} loads without runtime exceptions`, runtimeErrors(client.events).join(" | "));
  }

  await navigate(suguru, { width: 390, height: 844 });
  const newcomerJourney = await client.evaluate(`(() => {
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return {
      resume,
      heroPrimary: document.getElementById("hero-daily-button")?.textContent.trim(),
      heroSecondary: document.getElementById("hero-challenge-button")?.textContent.trim(),
      progress: document.getElementById("cage-garden-progress")?.textContent.trim(),
      stepStates: [...document.querySelectorAll("#cage-garden-steps [data-step-state]")].map((item) => item.dataset.stepState),
      stepLabels: [...document.querySelectorAll("#cage-garden-steps [data-step-id]")].map((item) => item.dataset.stepId)
    };
  })()`);
  check(newcomerJourney.resume?.version === 2 && newcomerJourney.resume?.puzzleId === SUGURU_FIXTURES.garden.id && newcomerJourney.resume?.journeyId === "cage-garden-v1" && newcomerJourney.resume?.journeyStepId === "garden-gate", "Suguru newcomer preloads Garden Gate with versioned journey recovery", JSON.stringify(newcomerJourney));
  check(newcomerJourney.heroPrimary === "Enter Garden Gate" && newcomerJourney.heroSecondary === "Learn the three rules", "Suguru newcomer receives truthful journey and learning actions", JSON.stringify(newcomerJourney));
  check(newcomerJourney.progress === "Cage Garden 0/4" && newcomerJourney.stepStates.join(",") === "active,locked,locked,locked", "Suguru newcomer ledger exposes one active step and three locked steps", JSON.stringify(newcomerJourney));
  check(newcomerJourney.stepLabels.join(",") === "garden-gate,lantern-walk,brook-crossing,cascade-finale", "Suguru ledger renders the exact finite journey order", JSON.stringify(newcomerJourney));

  await navigate(suguru, { width: 1440, height: 1000 });
  const desktopGuideGeometry = await client.evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
    document.getElementById("hero-challenge-button")?.click();
    await wait(100);
    return {
      activeId: document.activeElement?.id,
      headerBottom: document.querySelector(".topbar")?.getBoundingClientRect().bottom,
      titleTop: document.getElementById("cage-garden-guide-title")?.getBoundingClientRect().top
    };
  })()`);
  check(desktopGuideGeometry.activeId === "cage-garden-guide-title" && desktopGuideGeometry.titleTop >= desktopGuideGeometry.headerBottom + 8, "Suguru desktop guide action clears the sticky header", JSON.stringify(desktopGuideGeometry));

  await navigate(suguru, { width: 390, height: 844 });
  const activeBeforeReload = await client.evaluate(`(() => {
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return { puzzleId: resume?.puzzleId, journeyStepId: resume?.journeyStepId, board: resume?.board };
  })()`);
  await reloadPreservingStorage(suguru);
  const activeAfterReload = await client.evaluate(`(() => {
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return {
      puzzleId: resume?.puzzleId,
      journeyStepId: resume?.journeyStepId,
      board: resume?.board,
      heroLabel: document.getElementById("hero-daily-button")?.textContent.trim()
    };
  })()`);
  check(JSON.stringify(activeBeforeReload) === JSON.stringify({ puzzleId: activeAfterReload.puzzleId, journeyStepId: activeAfterReload.journeyStepId, board: activeAfterReload.board }), "Suguru reload preserves the active journey board and credit context", JSON.stringify({ activeBeforeReload, activeAfterReload }));
  check(activeAfterReload.heroLabel === "Continue Garden path", "Suguru reload labels even a zero-second resume as Continue", JSON.stringify(activeAfterReload));
  const restartedJourney = await client.evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
    document.getElementById("reset-button")?.click();
    await wait(30);
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return { puzzleId: resume?.puzzleId, journeyId: resume?.journeyId, journeyStepId: resume?.journeyStepId };
  })()`);
  check(restartedJourney.puzzleId === SUGURU_FIXTURES.garden.id && restartedJourney.journeyId === "cage-garden-v1" && restartedJourney.journeyStepId === "garden-gate", "Restart preserves valid Suguru journey credit context", JSON.stringify(restartedJourney));

  const legacyResumeData = JSON.parse(createSuguruResume(SUGURU_FIXTURES.garden));
  delete legacyResumeData.version;
  await navigate(suguru, { width: 390, height: 844 }, { storageEntries: { [SUGURU_RESUME_KEY]: JSON.stringify(legacyResumeData) } });
  const legacyRestore = await client.evaluate(`(() => {
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return {
      puzzleId: resume?.puzzleId,
      heroLabel: document.getElementById("hero-daily-button")?.textContent.trim(),
      challenge: document.getElementById("challenge-label")?.textContent
    };
  })()`);
  check(legacyRestore.puzzleId === SUGURU_FIXTURES.garden.id && legacyRestore.challenge?.includes("Garden path"), "Suguru restores a valid legacy unversioned board", JSON.stringify(legacyRestore));
  check(legacyRestore.heroLabel === "Continue Garden path", "Suguru legacy zero-second restore gets truthful Continue copy", JSON.stringify(legacyRestore));

  const validGardenCompletion = { puzzleId: "suguru-size5-garden-path", level: "size5-easy", mode: "classic", seconds: 60, mistakes: 0, completedAt: "2026-07-28T12:00:00.000Z" };
  const validBrookCompletion = { puzzleId: "suguru-size5-brook-bridge", level: "size5-medium", mode: "classic", seconds: 120, mistakes: 0, completedAt: "2026-07-28T12:10:00.000Z" };
  const progressFixtures = [
    ["array-shaped progress", "[]", "suguru-size5-garden-path", "garden-gate", "Cage Garden 0/4"],
    ["orphan later step", JSON.stringify({ version: 1, journeyId: "cage-garden-v1", completedSteps: { "lantern-walk": { puzzleId: "suguru-size5-morning-rhythm", level: "size5-easy", mode: "classic", seconds: 90, mistakes: 0, completedAt: "2026-07-28T12:05:00.000Z" } } }), "suguru-size5-garden-path", "garden-gate", "Cage Garden 0/4"],
    ["noncontiguous prefix", JSON.stringify({ version: 1, journeyId: "cage-garden-v1", completedSteps: { "garden-gate": validGardenCompletion, "brook-crossing": validBrookCompletion } }), "suguru-size5-morning-rhythm", "lantern-walk", "Cage Garden 1/4"],
    ["unsupported progress version", JSON.stringify({ version: 99, journeyId: "cage-garden-v1", completedSteps: { "garden-gate": validGardenCompletion } }), "suguru-size5-garden-path", "garden-gate", "Cage Garden 0/4"]
  ];
  for (const [fixtureName, progressValue, expectedPuzzleId, expectedStepId, expectedLabel] of progressFixtures) {
    await navigate(suguru, { width: 390, height: 844 }, { storageEntries: { [SUGURU_JOURNEY_KEY]: progressValue } });
    const outcome = await client.evaluate(`(() => {
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      return {
        puzzleId: resume?.puzzleId,
        journeyStepId: resume?.journeyStepId,
        progressLabel: document.getElementById("cage-garden-progress")?.textContent.trim()
      };
    })()`);
    check(outcome.puzzleId === expectedPuzzleId && outcome.journeyStepId === expectedStepId && outcome.progressLabel === expectedLabel, `Suguru normalizes ${fixtureName} to a contiguous journey`, JSON.stringify(outcome));
    check(runtimeErrors(client.events).length === 0, `Suguru ${fixtureName} causes no runtime exception`, runtimeErrors(client.events).join(" | "));
  }

  for (const [fixtureName, resumeOverrides] of [
    ["invalid journey metadata", { journeyId: "wrong-journey", journeyStepId: "garden-gate" }],
    ["unsupported resume version", { version: 99, journeyId: "cage-garden-v1", journeyStepId: "garden-gate" }]
  ]) {
    await navigate(suguru, { width: 390, height: 844 }, {
      storageEntries: { [SUGURU_RESUME_KEY]: createSuguruResume(SUGURU_FIXTURES.garden, resumeOverrides) }
    });
    const outcome = await client.evaluate(`(() => {
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      return {
        version: resume?.version,
        puzzleId: resume?.puzzleId,
        journeyId: resume?.journeyId,
        journeyStepId: resume?.journeyStepId,
        heroLabel: document.getElementById("hero-daily-button")?.textContent.trim()
      };
    })()`);
    check(outcome.version === 2 && outcome.puzzleId === SUGURU_FIXTURES.garden.id && !outcome.journeyId && !outcome.journeyStepId && outcome.heroLabel === "Continue Garden path", `Suguru strips ${fixtureName} without losing a valid core board`, JSON.stringify(outcome));
  }

  const oneStepProgress = JSON.stringify({ version: 1, journeyId: "cage-garden-v1", completedSteps: { "garden-gate": validGardenCompletion } });
  await navigate(suguru, { width: 390, height: 844 }, {
    storageEntries: {
      [SUGURU_RESUME_KEY]: JSON.stringify({ level: "size5-easy", mode: "classic", puzzleId: "missing", board: [], notes: [] }),
      [SUGURU_JOURNEY_KEY]: oneStepProgress
    }
  });
  const bareInvalidResume = await client.evaluate(`(() => {
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return {
      puzzleId: resume?.puzzleId,
      journeyStepId: resume?.journeyStepId,
      progressLabel: document.getElementById("cage-garden-progress")?.textContent.trim()
    };
  })()`);
  check(bareInvalidResume.puzzleId === "suguru-size5-morning-rhythm" && bareInvalidResume.journeyStepId === "lantern-walk" && bareInvalidResume.progressLabel === "Cage Garden 1/4", "Bare invalid Suguru resume preserves journey progress and loads its next step", JSON.stringify(bareInvalidResume));

  const invalidExplicitResume = createSuguruResume(SUGURU_FIXTURES.brook, { mode: "daily", board: [], notes: [] });
  await navigate(suguru, { width: 390, height: 844 }, {
    query: "?level=size5-medium&mode=daily",
    storageEntries: { [SUGURU_RESUME_KEY]: invalidExplicitResume }
  });
  const explicitInvalidOutcome = await client.evaluate(`(() => {
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return { level: resume?.level, mode: resume?.mode, boardLength: resume?.board?.length, journeyStepId: resume?.journeyStepId };
  })()`);
  check(explicitInvalidOutcome.level === "size5-medium" && explicitInvalidOutcome.mode === "daily" && explicitInvalidOutcome.boardLength === 25 && !explicitInvalidOutcome.journeyStepId, "Explicit Suguru settings remain authoritative over an invalid matching resume", JSON.stringify(explicitInvalidOutcome));

  await navigate(suguru, { width: 390, height: 844 }, { query: "?level=size5-medium&mode=daily" });
  const explicitSettings = await client.evaluate(`(() => {
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return {
      level: resume?.level,
      mode: resume?.mode,
      journeyId: resume?.journeyId,
      journeyStepId: resume?.journeyStepId,
      heroLabel: document.getElementById("hero-daily-button")?.textContent.trim()
    };
  })()`);
  check(explicitSettings.level === "size5-medium" && explicitSettings.mode === "daily" && !explicitSettings.journeyId && !explicitSettings.journeyStepId, "Explicit Suguru URL settings override journey preload and clear journey context", JSON.stringify(explicitSettings));
  check(explicitSettings.heroLabel === "Go to current board", "Explicit untouched Suguru board uses truthful state-preserving copy", JSON.stringify(explicitSettings));

  await navigate(suguru, { width: 390, height: 844 }, { query: "?level=size5-medium&mode=classic&notes=on&mistakes=off" });
  const explicitAidBeforeReload = await client.evaluate(`(() => {
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return {
      puzzleId: resume?.puzzleId,
      board: resume?.board,
      notesMode: resume?.notesMode,
      showMistakes: resume?.showMistakes
    };
  })()`);
  await reloadPreservingStorage(suguru);
  const explicitAidAfterReload = await client.evaluate(`(() => {
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return {
      puzzleId: resume?.puzzleId,
      board: resume?.board,
      notesMode: resume?.notesMode,
      showMistakes: resume?.showMistakes,
      heroLabel: document.getElementById("hero-daily-button")?.textContent.trim()
    };
  })()`);
  check(explicitAidBeforeReload.notesMode === true && explicitAidBeforeReload.showMistakes === false, "Suguru explicit aid settings are persisted with the initial shared-link board", JSON.stringify(explicitAidBeforeReload));
  check(explicitAidAfterReload.puzzleId === explicitAidBeforeReload.puzzleId && JSON.stringify(explicitAidAfterReload.board) === JSON.stringify(explicitAidBeforeReload.board) && explicitAidAfterReload.notesMode === true && explicitAidAfterReload.showMistakes === false && explicitAidAfterReload.heroLabel?.startsWith("Continue "), "Suguru shared-link aid settings restore the same board after reload", JSON.stringify({ explicitAidBeforeReload, explicitAidAfterReload }));

  await navigate(suguru, { width: 390, height: 844 });
  const pendingSetup = await client.evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
    const snapshot = () => ({
      resume: localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}),
      board: [...document.querySelectorAll(".cell")].map((cell) => cell.textContent).join("|"),
      timer: document.getElementById("timer")?.textContent,
      url: location.search
    });
    const before = snapshot();
    const level = document.getElementById("level-select");
    level.value = "size5-medium";
    level.dispatchEvent(new Event("change", { bubbles: true }));
    const mode = document.getElementById("mode-select");
    mode.value = "challenge";
    mode.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(30);
    const pending = snapshot();
    const launchLabel = document.getElementById("new-game-button")?.textContent.trim();
    document.getElementById("new-game-button")?.click();
    await wait(30);
    const launchedResume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    return { before, pending, launchLabel, launchedResume };
  })()`);
  check(JSON.stringify(pendingSetup.before) === JSON.stringify(pendingSetup.pending), "Suguru level and mode choices remain pending until the named launch action", JSON.stringify(pendingSetup));
  check(pendingSetup.launchLabel === "Start Bridge · Challenge clue variant", "Suguru pending launch action names the replacement level and mode", JSON.stringify(pendingSetup));
  check(pendingSetup.launchedResume?.level === "size5-medium" && pendingSetup.launchedResume?.mode === "challenge" && !pendingSetup.launchedResume?.journeyStepId, "Suguru launch action commits pending setup and clears journey context", JSON.stringify(pendingSetup));

  await navigate(suguru, { width: 390, height: 844 });
  let journeyRun = null;
  try {
    journeyRun = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const parseStorage = (key) => {
        try { return JSON.parse(localStorage.getItem(key) || "null"); }
        catch { return null; }
      };
      const solveCurrent = async () => {
        const resume = parseStorage(${JSON.stringify(SUGURU_RESUME_KEY)});
        const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
        if (!puzzle) throw new Error("Active Suguru puzzle metadata not found");
        for (let index = 0; index < puzzle.puzzle.length; index += 1) {
          if (puzzle.puzzle[index] !== "0") continue;
          const cell = document.querySelector('.cell[data-index="' + index + '"]');
          cell?.click();
          const digit = [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled);
          if (!digit) throw new Error("No legal digit button for cell " + index);
          digit.click();
          await wait(0);
        }
        await wait(30);
      };
      const runs = [];
      for (let index = 0; index < 4; index += 1) {
        const before = parseStorage(${JSON.stringify(SUGURU_RESUME_KEY)});
        await solveCurrent();
        const progress = parseStorage(${JSON.stringify(SUGURU_JOURNEY_KEY)});
        const victoryOverlay = document.getElementById("victory-overlay");
        const backgroundFocusableCount = [...document.querySelectorAll("a[href], button, input, select, summary, [tabindex]")]
          .filter((element) => !victoryOverlay.contains(element)
            && !element.disabled
            && element.tabIndex >= 0
            && !element.closest("[inert]")
            && !element.closest("[hidden]")
            && element.getClientRects().length > 0)
          .length;
        runs.push({
          puzzleId: before?.puzzleId,
          completedCount: Object.keys(progress?.completedSteps || {}).length,
          progressLabel: document.getElementById("cage-garden-progress")?.textContent.trim(),
          primaryLabel: document.getElementById("victory-new-game-button")?.textContent.trim(),
          secondaryLabel: document.getElementById("victory-secondary-button")?.textContent.trim(),
          activeId: document.activeElement?.id,
          backgroundFocusableCount,
          nextBoardFocus: null
        });
        if (index < 3) {
          document.getElementById("victory-new-game-button")?.click();
          await wait(80);
          runs[runs.length - 1].nextBoardFocus = document.activeElement?.id;
        }
      }
      return runs;
    })()`);
  } catch (error) {
    check(false, "Suguru Cage Garden completion scenario runs to its terminal state", error.message);
  }
  if (journeyRun) {
    check(journeyRun.map((run) => run.puzzleId).join(",") === [
      "suguru-size5-garden-path",
      "suguru-size5-morning-rhythm",
      "suguru-size5-brook-bridge",
      "suguru-size5-cascade-midnight-path"
    ].join(","), "Suguru Cage Garden launches four deterministic layouts in order", JSON.stringify(journeyRun));
    check(journeyRun.map((run) => run.completedCount).join(",") === "1,2,3,4", "Suguru Cage Garden records one idempotent completion per step", JSON.stringify(journeyRun));
    check(journeyRun.slice(0, 3).map((run) => run.primaryLabel).join(",") === "Continue to Lantern Walk,Continue to Brook Crossing,Continue to Cascade Finale", "Suguru intermediate victories name the earned next step", JSON.stringify(journeyRun));
    check(journeyRun.every((run) => run.activeId === "victory-new-game-button"), "Suguru victories focus the explicit primary action", JSON.stringify(journeyRun));
    check(journeyRun.every((run) => run.backgroundFocusableCount === 0), "Suguru victories remove every background control from focus navigation", JSON.stringify(journeyRun));
    check(journeyRun.slice(0, 3).every((run) => run.nextBoardFocus === "game-title"), "Suguru victory actions move focus into the newly launched board", JSON.stringify(journeyRun));
    check(journeyRun[3].progressLabel === "Cage Garden 4/4" && journeyRun[3].primaryLabel === "Play today's clue variant" && journeyRun[3].secondaryLabel === "Replay Garden Gate", "Suguru final victory exposes a truthful terminal state", JSON.stringify(journeyRun[3]));
    const completedReplay = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      document.getElementById("victory-secondary-button")?.click();
      await wait(80);
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
      for (let index = 0; index < puzzle.puzzle.length; index += 1) {
        if (puzzle.puzzle[index] !== "0") continue;
        document.querySelector('.cell[data-index="' + index + '"]')?.click();
        const digit = [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled);
        digit?.click();
        await wait(0);
      }
      await wait(30);
      const progress = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_JOURNEY_KEY)}) || "null");
      return {
        completedCount: Object.keys(progress?.completedSteps || {}).length,
        primaryLabel: document.getElementById("victory-new-game-button")?.textContent.trim(),
        secondaryLabel: document.getElementById("victory-secondary-button")?.textContent.trim()
      };
    })()`);
    check(completedReplay.completedCount === 4 && completedReplay.primaryLabel === "Replay Garden Gate" && completedReplay.secondaryLabel === "Play today's clue variant", "Completed-step replay stays idempotent and uses replay-specific victory copy", JSON.stringify(completedReplay));
  }
  check(runtimeErrors(client.events).length === 0, "Suguru Cage Garden flow has no runtime exception", runtimeErrors(client.events).join(" | "));

  const prefixProgress = JSON.stringify({
    version: 1,
    journeyId: "cage-garden-v1",
    completedSteps: {
      "garden-gate": { puzzleId: "suguru-size5-garden-path", level: "size5-easy", mode: "classic", seconds: 60, mistakes: 0, completedAt: "2026-07-28T12:00:00.000Z" },
      "lantern-walk": { puzzleId: "suguru-size5-morning-rhythm", level: "size5-easy", mode: "classic", seconds: 90, mistakes: 0, completedAt: "2026-07-28T12:05:00.000Z" }
    }
  });
  const brookBoard = SUGURU_FIXTURES.brook.solution.split("").map(Number);
  const brookMissingIndex = SUGURU_FIXTURES.brook.puzzle.indexOf("0");
  brookBoard[brookMissingIndex] = 0;
  const ordinaryBrookResume = createSuguruResume(SUGURU_FIXTURES.brook, { board: brookBoard, selectedIndex: brookMissingIndex });
  await navigate(suguru, { width: 390, height: 844 }, {
    storageEntries: {
      [SUGURU_RESUME_KEY]: ordinaryBrookResume,
      [SUGURU_JOURNEY_KEY]: prefixProgress
    }
  });
  const ordinaryCompletion = await client.evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
    const index = resume?.selectedIndex;
    document.querySelector('.cell[data-index="' + index + '"]')?.click();
    [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle?.solution[index] && !button.disabled)?.click();
    await wait(30);
    const progress = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_JOURNEY_KEY)}) || "null");
    return {
      completedCount: Object.keys(progress?.completedSteps || {}).length,
      primaryLabel: document.getElementById("victory-new-game-button")?.textContent.trim(),
      activeId: document.activeElement?.id
    };
  })()`);
  check(ordinaryCompletion.completedCount === 2, "An identical Suguru puzzle restored without journey context earns no Cage Garden credit", JSON.stringify(ordinaryCompletion));
  check(ordinaryCompletion.primaryLabel === "Another Size 5 · Bridge clue variant" && ordinaryCompletion.activeId === "victory-new-game-button", "Ordinary Suguru victory offers a truthful clue-variant action", JSON.stringify(ordinaryCompletion));

  const sudoku = GAMES[0];
  await navigate(sudoku, { width: 390, height: 844 });
  const sudokuVictoryModal = await client.evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
    const resume = JSON.parse(localStorage.getItem("sudoku-sakura-active-game") || "null");
    const puzzle = Object.values(window.SUDOKU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
    if (!puzzle) throw new Error("Active Sudoku puzzle metadata not found");
    for (let index = 0; index < puzzle.puzzle.length; index += 1) {
      if (puzzle.puzzle[index] !== "0") continue;
      document.querySelector('.cell[data-index="' + index + '"]')?.click();
      const digit = [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled);
      if (!digit) throw new Error("No legal Sudoku digit button for cell " + index);
      digit.click();
      await wait(0);
    }
    await wait(30);
    const victoryOverlay = document.getElementById("victory-overlay");
    const backgroundFocusableCount = [...document.querySelectorAll("a[href], button, input, select, summary, [tabindex]")]
      .filter((element) => !victoryOverlay.contains(element)
        && !element.disabled
        && element.tabIndex >= 0
        && !element.closest("[inert]")
        && !element.closest("[hidden]")
        && element.getClientRects().length > 0)
      .length;
    const overlayVisible = !victoryOverlay.hidden;
    const activeId = document.activeElement?.id;
    document.getElementById("victory-new-game-button")?.click();
    await wait(80);
    return {
      overlay: overlayVisible,
      backgroundFocusableCount,
      activeId,
      nextBoardFocus: document.activeElement?.id,
      nextOverlayHidden: victoryOverlay.hidden
    };
  })()`);
  check(sudokuVictoryModal.overlay && sudokuVictoryModal.backgroundFocusableCount === 0, "Sudoku victory removes every background control from focus navigation", JSON.stringify(sudokuVictoryModal));
  check(sudokuVictoryModal.nextOverlayHidden && sudokuVictoryModal.nextBoardFocus === "game-title", "Sudoku victory action moves focus into the newly launched board", JSON.stringify(sudokuVictoryModal));
  check(runtimeErrors(client.events).length === 0, "Sudoku victory flow has no runtime exception", runtimeErrors(client.events).join(" | "));

  await navigate(sudoku, { width: 390, height: 844 }, { query: "?symbols=on&symbolTheme=petals&legend=visible" });
  const symbolLoad = await client.evaluate(`({ helpOpen: document.getElementById("setup-help-panel").open, tutorialHidden: document.getElementById("symbol-tutorial-card").hidden })`);
  check(!symbolLoad.helpOpen && symbolLoad.tutorialHidden, "URL-driven Symbol Play stays collapsed without a hidden tutorial", JSON.stringify(symbolLoad));
  await navigate(sudoku, { width: 390, height: 844 });
  const symbolToggle = await client.evaluate(`(() => {
    const toggle = document.getElementById("symbol-play-toggle");
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
    return { helpOpen: document.getElementById("setup-help-panel").open, tutorialHidden: document.getElementById("symbol-tutorial-card").hidden };
  })()`);
  check(symbolToggle.helpOpen && !symbolToggle.tutorialHidden, "Explicit Symbol Play opens its help tutorial", JSON.stringify(symbolToggle));
  check(runtimeErrors(client.events).length === 0, "Symbol Play flows have no runtime exception", runtimeErrors(client.events).join(" | "));
} catch (error) {
  check(false, "Browser harness completed every scenario", error.stack || error.message);
} finally {
  client?.close();
  await terminateProcess(chrome);
  await new Promise((resolveClose) => staticServer.close(resolveClose));
  await rm(profilePath, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`Browser validation failed: ${failures.length}/${assertionCount} assertions`);
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log(`Browser validation passed: ${assertionCount} assertions across Sudoku and Suguru`);
