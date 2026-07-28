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
      await sleep(25);
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
      const paused = {
        overlay: !document.getElementById("pause-overlay").hidden,
        inert: document.querySelector(".sudoku-board").inert,
        activeId: document.activeElement?.id
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
      primary.click();
      await wait(80);
      const afterPrimary = snapshot();
      const primaryFocus = document.activeElement?.id;
      const secondary = document.querySelector(".hero-cta-row .action-button:not(.primary)");
      secondary.click();
      await wait(100);
      const afterSecondary = snapshot();
      return { before, afterPrimary, afterSecondary, primaryFocus, secondaryFocus: document.activeElement?.id };
    })()`);
    check(hero.before.board === hero.afterPrimary.board && hero.before.challenge === hero.afterPrimary.challenge && hero.before.stats === hero.afterPrimary.stats, `${game.name} current-board hero action preserves active state`, JSON.stringify(hero));
    check(hero.primaryFocus === "game-title", `${game.name} current-board hero action focuses the board heading`, JSON.stringify(hero));
    check(hero.afterSecondary.mode === "daily" && hero.secondaryFocus === "game-title", `${game.name} secondary hero action enters daily play`, JSON.stringify(hero));
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

  const sudoku = GAMES[0];
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
