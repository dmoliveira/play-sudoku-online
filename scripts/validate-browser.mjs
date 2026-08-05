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
const SUDOKU_RESUME_KEY = "sudoku-sakura-active-game";
const SUDOKU_STATS_KEY = "sudoku-sakura-stats";
const SUDOKU_SESSION_HISTORY_KEY = "sudoku-sakura-session-history";
const SUDOKU_LEGACY_DAILY_KEY = "sudoku-sakura-daily-results";
const SUDOKU_DAILY_KEY = "sudoku-sakura-verified-daily-results";
const SUDOKU_WEEKLY_KEY = "sudoku-sakura-weekly-paths";
const SUGURU_RESUME_KEY = "sudoku-sakura-suguru-resume";
const SUGURU_STATS_KEY = "sudoku-sakura-suguru-stats";
const SUGURU_JOURNEY_KEY = "sudoku-sakura-suguru-cage-garden";
const SUGURU_DAILY_KEY = "sudoku-sakura-suguru-daily-results";
const PRACTICE_ROTATION_KEY = "sudoku-sakura-practice-rotation";
const FOCUS_RESULTS_KEY = "sudoku-sakura-challenge-focus-results";
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

function practiceWriteProbeSource(extraSource = "") {
  return `
    window.__PRACTICE_ROTATION_WRITES = 0;
    const nativePracticeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === ${JSON.stringify(PRACTICE_ROTATION_KEY)}) window.__PRACTICE_ROTATION_WRITES += 1;
      return nativePracticeSetItem.call(this, key, value);
    };
    ${extraSource}
  `;
}

function disableLibraryEntrySource(globalName, puzzleId) {
  return `
    Object.defineProperty(window, ${JSON.stringify(globalName)}, {
      configurable: true,
      set(library) {
        Object.values(library || {}).flat().forEach((entry) => {
          if (entry?.id === ${JSON.stringify(puzzleId)}) entry.selectable = false;
        });
        Object.defineProperty(window, ${JSON.stringify(globalName)}, {
          configurable: true,
          writable: true,
          value: library
        });
      }
    });
  `;
}

function disableLibraryGroupSource(globalName, groupField, groupId) {
  return `
    Object.defineProperty(window, ${JSON.stringify(globalName)}, {
      configurable: true,
      set(library) {
        Object.values(library || {}).flat().forEach((entry) => {
          if (entry?.[${JSON.stringify(groupField)}] === ${JSON.stringify(groupId)}) entry.selectable = false;
        });
        Object.defineProperty(window, ${JSON.stringify(globalName)}, {
          configurable: true,
          writable: true,
          value: library
        });
      }
    });
  `;
}

function storageFaultSource(rules) {
  return `
    window.__STORAGE_FAULT_RULES = ${JSON.stringify(rules)};
    window.__STORAGE_FAULT_LOG = [];
    window.__STORAGE_FAULT_AFTER_REMOVE = Object.create(null);
    const nativeFaultGetItem = Storage.prototype.getItem;
    const nativeFaultSetItem = Storage.prototype.setItem;
    const nativeFaultRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.getItem = function (key) {
      const rule = window.__STORAGE_FAULT_RULES[key];
      window.__STORAGE_FAULT_LOG.push({ operation: "get", key });
      if (rule?.get === "throw") throw new Error("storage get unavailable for " + key);
      if (rule?.get === "throw-once-after-remove" && window.__STORAGE_FAULT_AFTER_REMOVE[key] > 0) {
        window.__STORAGE_FAULT_AFTER_REMOVE[key] -= 1;
        throw new Error("storage get uncertain after remove for " + key);
      }
      return nativeFaultGetItem.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      const rule = window.__STORAGE_FAULT_RULES[key];
      window.__STORAGE_FAULT_LOG.push({ operation: "set", key, value: String(value) });
      if (rule?.set === "throw") throw new Error("storage set unavailable for " + key);
      if (rule?.set === "silent") return;
      return nativeFaultSetItem.call(this, key, value);
    };
    Storage.prototype.removeItem = function (key) {
      const rule = window.__STORAGE_FAULT_RULES[key];
      window.__STORAGE_FAULT_LOG.push({ operation: "remove", key });
      if (rule?.remove === "throw") throw new Error("storage remove unavailable for " + key);
      if (rule?.remove === "silent") return;
      const outcome = nativeFaultRemoveItem.call(this, key);
      if (rule?.get === "throw-once-after-remove") window.__STORAGE_FAULT_AFTER_REMOVE[key] = 1;
      return outcome;
    };
  `;
}

function saveHealthMutationProbeSource() {
  return `
    window.__LOCAL_SAVE_STATUS_MUTATIONS = 0;
    window.__VICTORY_SAVE_STATUS_MUTATIONS = 0;
    window.__LOCAL_SAVE_STATUS_OBSERVER = new MutationObserver((records) => {
      window.__LOCAL_SAVE_STATUS_MUTATIONS += records.filter((record) => record.target?.id === "local-save-status" || record.target?.closest?.("#local-save-status")).length;
      window.__VICTORY_SAVE_STATUS_MUTATIONS += records.filter((record) => record.target?.id === "victory-save-status" || record.target?.closest?.("#victory-save-status")).length;
    });
    window.__LOCAL_SAVE_STATUS_OBSERVER.observe(document, { childList: true, characterData: true, subtree: true });
  `;
}

function stripStartedCounters(value) {
  if (Array.isArray(value)) return value.map(stripStartedCounters);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== "started")
    .map(([key, entry]) => [key, stripStartedCounters(entry)]));
}

function noSupportedAidSource() {
  return `
    Object.defineProperty(window, "LogicCoach", {
      configurable: true,
      set(api) {
        Object.defineProperty(window, "LogicCoach", {
          configurable: true,
          writable: true,
          value: Object.freeze({ ...api, getNextStep: () => null })
        });
      }
    });
  `;
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

  function fixedClockSource(fixedInstant) {
    if (!fixedInstant) return "";
    const timestamp = new Date(fixedInstant).getTime();
    if (!Number.isFinite(timestamp)) throw new Error(`Invalid fixed instant: ${fixedInstant}`);
    return `
      const NativeDate = Date;
      const fixedTimestamp = ${timestamp};
      class FixedDate extends NativeDate {
        constructor(...args) {
          super(...(args.length ? args : [fixedTimestamp]));
        }
        static now() { return fixedTimestamp; }
      }
      Object.setPrototypeOf(FixedDate, NativeDate);
      window.Date = FixedDate;
    `;
  }

  async function navigate(game, viewport, { query = "", storageEntries = {}, fixedInstant = null, timezoneId = "UTC", beforeLoadSource = "" } = {}) {
    await client.send("Emulation.setTimezoneOverride", { timezoneId });
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
      ${fixedClockSource(fixedInstant)}
      window.__SUDOKU_VALIDATION_TOKEN = ${JSON.stringify(token)};
      window.__SUDOKU_VALIDATION_CLS = 0;
      window.__SUDOKU_VALIDATION_LAYOUT_SHIFTS = [];
      if (typeof PerformanceObserver !== "undefined") {
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                window.__SUDOKU_VALIDATION_CLS += entry.value;
                const rect = (value) => value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null;
                window.__SUDOKU_VALIDATION_LAYOUT_SHIFTS.push({
                  value: entry.value,
                  sources: [...(entry.sources || [])].map((source) => ({
                    node: source.node?.id ? "#" + source.node.id : source.node?.tagName?.toLowerCase() || "unknown",
                    previousRect: rect(source.previousRect),
                    currentRect: rect(source.currentRect)
                  }))
                });
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
      ${beforeLoadSource}
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

  async function reloadPreservingStorage(game, { fixedInstant = null, timezoneId = "UTC" } = {}) {
    await client.send("Emulation.setTimezoneOverride", { timezoneId });
    const token = `${game.name}-reload-${Date.now()}-${Math.random()}`;
    const { identifier } = await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => { ${fixedClockSource(fixedInstant)} window.__SUDOKU_VALIDATION_TOKEN = ${JSON.stringify(token)}; })();`
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

  async function runScenario(label, callback) {
    try {
      await callback();
    } catch (error) {
      check(false, `${label} scenario executes`, error.stack || error.message);
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
        const entryMode = document.querySelector(".entry-mode-bar");
        const actions = document.querySelector(".actions-bar");
        const gamePanel = document.querySelector(".game-panel");
        const header = document.querySelector(".game-header");
        const controls = document.querySelector(".controls-row");
        const status = document.querySelector(".status-chips");
        const localSaveStatus = document.getElementById("local-save-status");
        const victorySaveStatus = document.getElementById("victory-save-status");
        const victoryOverlay = document.getElementById("victory-overlay");
        const directChildren = [...document.querySelector(".game-panel").children]
          .filter((element) => !element.hidden && getComputedStyle(element).display !== "none")
          .map((element) => ({ id: element.id, className: element.className, order: getComputedStyle(element).order, y: rect(element).y }));
        const boardRect = rect(board);
        const padRect = rect(pad);
        const gamePanelChildren = [...gamePanel.children];
        const boardWrapIndex = gamePanelChildren.indexOf(board.closest(".board-wrap"));
        const entryModeIndex = gamePanelChildren.indexOf(entryMode);
        const padIndex = gamePanelChildren.indexOf(pad);
        const targetRects = [...entryMode.querySelectorAll("button"), ...pad.querySelectorAll("button"), ...actions.querySelectorAll("button")]
          .filter((button) => !button.hidden && getComputedStyle(button).display !== "none")
          .map((button) => ({ id: button.id || button.dataset.value, width: rect(button).width, height: rect(button).height }));
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
          boardPadAdjacent: entryModeIndex === boardWrapIndex + 1 && padIndex === entryModeIndex + 1,
          boardPadGap: padRect.y - boardRect.bottom,
          targetRects,
          desktopViewportCap: innerWidth <= 720 || boardRect.width <= innerHeight - (12 * parseFloat(getComputedStyle(document.documentElement).fontSize)) + 1.5,
          activeTag: document.activeElement?.tagName,
          cls: window.__SUDOKU_VALIDATION_CLS || 0,
          layoutShifts: window.__SUDOKU_VALIDATION_LAYOUT_SHIFTS || [],
          setupOpen: document.getElementById("setup-help-panel")?.open,
          brandOverride: document.querySelector("a.brand")?.hasAttribute("aria-label"),
          padNameOverrides: [...pad.querySelectorAll("button")].filter((button) => button.hasAttribute("aria-label")).length,
          saveHealth: {
            localRole: localSaveStatus?.getAttribute("role"),
            localLive: localSaveStatus?.getAttribute("aria-live"),
            localAtomic: localSaveStatus?.getAttribute("aria-atomic"),
            localEmpty: localSaveStatus?.textContent.trim() === "",
            localDisplay: localSaveStatus ? getComputedStyle(localSaveStatus).display : null,
            localHeight: localSaveStatus ? rect(localSaveStatus).height : null,
            localAriaHidden: localSaveStatus?.getAttribute("aria-hidden"),
            localDirect: localSaveStatus?.parentElement === gamePanel,
            localFollowsHeader: gamePanelChildren.indexOf(localSaveStatus) === gamePanelChildren.indexOf(header) + 1,
            controlsFollowLocal: gamePanelChildren.indexOf(controls) === gamePanelChildren.indexOf(localSaveStatus) + 1,
            victoryLive: victorySaveStatus?.hasAttribute("role") || victorySaveStatus?.hasAttribute("aria-live"),
            victoryFocusable: victorySaveStatus?.hasAttribute("tabindex"),
            victoryFollowsSummary: victorySaveStatus?.previousElementSibling?.id === "victory-summary",
            victoryDescribed: (victoryOverlay?.getAttribute("aria-describedby") || "").split(/\\s+/).includes("victory-save-status")
          }
        };
      })()`);
      const label = `${game.name} ${viewport.width}x${viewport.height}`;
      check(layout.scrollWidth <= layout.clientWidth, `${label} has no horizontal overflow`, `${layout.scrollWidth} > ${layout.clientWidth}`);
      check(layout.rowCount === game.size, `${label} exposes ${game.size} ARIA rows`, `found ${layout.rowCount}`);
      check(layout.rowCellCounts.every((count) => count === game.size), `${label} rows expose ${game.size} cells`, JSON.stringify(layout.rowCellCounts));
      check(layout.boardDifference <= 1.5, `${label} board stays square`, `difference ${layout.boardDifference}`);
      check(layout.rowWidths.every((difference) => difference <= 1.5), `${label} rows span the board`, JSON.stringify(layout.rowWidths));
      check(layout.boardPadAdjacent, `${label} keeps board, entry mode, and keypad as adjacent game-panel siblings`, JSON.stringify(layout.directChildren));
      check(layout.targetRects.every((target) => target.width >= 43.5 && target.height >= 43.5), `${label} board controls keep 44px touch targets`, JSON.stringify(layout.targetRects));
      check(layout.desktopViewportCap, `${label} desktop board honors the viewport-aware cap`);
      check(layout.activeTag === "BODY", `${label} does not steal focus on load`, `active ${layout.activeTag}`);
      check(layout.setupOpen === false, `${label} setup help starts closed`);
      check(layout.brandOverride === false, `${label} brand uses visible accessible name`);
      check(layout.padNameOverrides === 0, `${label} keypad uses visible-first accessible names`, `${layout.padNameOverrides} overrides`);
      check(layout.saveHealth.localRole === "status"
        && layout.saveHealth.localLive === "polite"
        && layout.saveHealth.localAtomic === "true"
        && layout.saveHealth.localEmpty
        && layout.saveHealth.localDisplay !== "none"
        && layout.saveHealth.localHeight === 0
        && layout.saveHealth.localAriaHidden === "false",
      `${label} mounts one empty polite atomic active save-health region without reserving space`, JSON.stringify(layout.saveHealth));
      check(layout.saveHealth.localDirect && layout.saveHealth.localFollowsHeader && layout.saveHealth.controlsFollowLocal,
        `${label} places save health directly between board header and setup controls`, JSON.stringify(layout.saveHealth));
      check(!layout.saveHealth.victoryLive && !layout.saveHealth.victoryFocusable && layout.saveHealth.victoryFollowsSummary && layout.saveHealth.victoryDescribed,
        `${label} keeps the dormant victory save outcome non-live and in the dialog description`, JSON.stringify(layout.saveHealth));
      check(layout.cls <= 0.02, `${label} startup CLS stays within 0.02`, JSON.stringify({ cls: layout.cls, shifts: layout.layoutShifts }));
      if (viewport.width <= 720) {
        check(layout.padPosition === "static", `${label} keypad is in normal flow`, `position ${layout.padPosition}`);
        check(layout.directChildren.every((child) => child.order === "0"), `${label} uses natural game-panel order`, JSON.stringify(layout.directChildren));
        check(!layout.overlapHeader && !layout.overlapControls && !layout.overlapStatus, `${label} keypad does not cover setup/status`);
        check(layout.boardPadGap >= 0 && layout.boardPadGap <= 160, `${label} keeps board-to-keypad gap within 160px`, `gap ${layout.boardPadGap}`);
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
      check(hero.secondaryLabel === "Learn the two rules", "Suguru newcomer hero offers the internal guide", JSON.stringify(hero));
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
          ["history malformed entries", { "sudoku-sakura-session-history": JSON.stringify([
            null,
            {},
            { difficulty: "easy", mode: "classic", date: "2026-07-29", time: 12, mistakes: 0, timeLabel: "<b>12:00</b>", medal: "<img id=history-injection>" }
          ]) }],
          ["daily array", { "sudoku-sakura-daily-results": "[]" }],
          ["weekly array", { "sudoku-sakura-weekly-paths": "[]" }],
          ["weekly missing steps", { "sudoku-sakura-weekly-paths": JSON.stringify({ "2026-07-27": { pathId: "bridge-week" } }) }],
          ["weekly steps array", { "sudoku-sakura-weekly-paths": JSON.stringify({ "2026-07-27": { pathId: "bridge-week", completedSteps: [] } }) }],
          ["weekly bad path", { "sudoku-sakura-weekly-paths": JSON.stringify({ "2026-07-27": { pathId: "unknown", completedSteps: {} } }) }],
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
        if (fixtureName === "history malformed entries") {
          const historySafety = await client.evaluate(`({
            injectedNode: Boolean(document.getElementById("history-injection")),
            itemCount: document.querySelectorAll("#session-history-list [role=listitem]").length,
            text: document.getElementById("session-history-list")?.textContent
          })`);
          check(!historySafety.injectedNode && historySafety.itemCount === 1 && historySafety.text?.includes("<img id=history-injection>"), "Sudoku normalizes malformed history entries and renders retained text without markup execution", JSON.stringify(historySafety));
        }
        check(runtimeErrors(client.events).length === 0, `${game.name} ${fixtureName} causes no runtime exception`, runtimeErrors(client.events).join(" | "));
      } catch (error) {
        check(false, `${game.name} tolerates ${fixtureName} saved data`, error.message);
      }
    }
  }

  await runScenario("viewport pause recovery", async () => {
    for (const game of GAMES) {
      for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
        await navigate(game, viewport);
        const pauseState = await client.evaluate(`(async () => {
          const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
          window.scrollTo(0, document.documentElement.scrollHeight);
          await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
          const scrollBeforePause = window.scrollY;
          document.getElementById("pause-button")?.click();
          await wait(40);
          const overlay = document.getElementById("pause-overlay");
          const resume = document.getElementById("resume-button");
          const overlayRect = overlay.getBoundingClientRect();
          const resumeRect = resume.getBoundingClientRect();
          const paused = {
            scrollBeforePause,
            overlayParentIsBody: overlay.parentElement === document.body,
            overlayPosition: getComputedStyle(overlay).position,
            overlayRect: { top: overlayRect.top, left: overlayRect.left, right: overlayRect.right, bottom: overlayRect.bottom },
            resumeRect: { top: resumeRect.top, left: resumeRect.left, right: resumeRect.right, bottom: resumeRect.bottom },
            viewport: { width: innerWidth, height: innerHeight },
            activeId: document.activeElement?.id,
            modalOpen: document.documentElement.classList.contains("modal-open"),
            overflow: getComputedStyle(document.documentElement).overflow,
            heroHidden: document.querySelector(".hero")?.getAttribute("aria-hidden"),
            boardInert: document.getElementById(${JSON.stringify(game.boardId)})?.inert
          };
          resume.click();
          await wait(40);
          return {
            paused,
            resumed: {
              overlayHidden: overlay.hidden,
              modalOpen: document.documentElement.classList.contains("modal-open"),
              heroHidden: document.querySelector(".hero")?.getAttribute("aria-hidden"),
              boardInert: document.getElementById(${JSON.stringify(game.boardId)})?.inert
            }
          };
        })()`);
        const label = `${game.name} ${viewport.width}px offscreen pause`;
        check(pauseState.paused.scrollBeforePause > 0
          && pauseState.paused.overlayParentIsBody
          && pauseState.paused.overlayPosition === "fixed"
          && pauseState.paused.overlayRect.top === 0
          && pauseState.paused.overlayRect.left === 0
          && Math.abs(pauseState.paused.overlayRect.right - pauseState.paused.viewport.width) <= 1
          && Math.abs(pauseState.paused.overlayRect.bottom - pauseState.paused.viewport.height) <= 1
          && pauseState.paused.resumeRect.top >= 0
          && pauseState.paused.resumeRect.bottom <= pauseState.paused.viewport.height
          && pauseState.paused.resumeRect.left >= 0
          && pauseState.paused.resumeRect.right <= pauseState.paused.viewport.width,
        `${label} keeps Resume visible and pointer-reachable after pausing below the board`, JSON.stringify(pauseState.paused));
        check(pauseState.paused.activeId === "resume-button"
          && pauseState.paused.modalOpen
          && pauseState.paused.overflow === "hidden"
          && pauseState.paused.heroHidden === "true"
          && pauseState.paused.boardInert
          && pauseState.resumed.overlayHidden
          && !pauseState.resumed.modalOpen
          && pauseState.resumed.heroHidden === "false"
          && !pauseState.resumed.boardInert,
        `${label} owns and restores modal inertness without stranding the page`, JSON.stringify(pauseState));
        check(runtimeErrors(client.events).length === 0, `${label} has no runtime exception`, runtimeErrors(client.events).join(" | "));
      }
    }
  });

  const suguru = GAMES[1];

  await runScenario("exact solved resume containment", async () => {
    const solvedSudoku = GAMES[0];
    const emptyDaily = JSON.stringify({ version: 1, entries: {} });
    const emptyFocus = JSON.stringify({ version: 1, completed: {} });
    const emptyWeekly = JSON.stringify({ "2026-07-27": { pathId: "bridge-week", completedSteps: {} } });
    const emptyJourney = JSON.stringify({ version: 1, journeyId: "cage-garden-v1", completedSteps: {} });
    const fixedOptions = { fixedInstant: "2026-07-29T12:00:00.000Z", timezoneId: "UTC" };

    await navigate(solvedSudoku, { width: 390, height: 844 }, { query: "?game=sudoku&difficulty=easy&mode=classic", ...fixedOptions });
    const sudokuSeeds = await client.evaluate(`(() => {
      const all = Object.values(window.SUDOKU_PUZZLES).flat();
      const ordinaryPuzzle = window.SUDOKU_PUZZLES.easy.find((entry) => entry.id === "easy-calm-start-a-r0") || window.SUDOKU_PUZZLES.easy[0];
      const dailyPuzzle = all.find((entry) => entry.id === "easy-garden-path-c-r1");
      const weeklyPuzzle = all.find((entry) => entry.id === "medium-koi-cascade-a-r2");
      const focusPuzzle = all.find((entry) => entry.id === "hard-pair-current-a-r0");
      const make = (puzzle, difficulty, mode, extra = {}) => JSON.stringify({
        version: 2,
        gameId: "sudoku",
        runSource: "ordinary",
        difficulty,
        mode,
        puzzleId: puzzle.id,
        board: puzzle.solution.split("").map(Number),
        notes: Array.from({ length: 81 }, () => []),
        selectedIndex: puzzle.puzzle.indexOf("0"),
        showMistakes: true,
        notesMode: false,
        mistakes: 0,
        hintsUsed: 0,
        hintCountedKeys: [],
        checksUsed: 0,
        guidedSymbolRunActive: false,
        symbolPlayEnabled: false,
        symbolTheme: "petals",
        legendMode: "visible",
        bloomTokensRemaining: 3,
        assistedRun: false,
        secondsElapsed: 12,
        paused: false,
        pauseReason: null,
        ...extra
      });
      const ordinary = JSON.parse(make(ordinaryPuzzle, "easy", "classic"));
      const editableIndex = ordinaryPuzzle.puzzle.indexOf("0");
      const near = structuredClone(ordinary);
      near.board[editableIndex] = 0;
      const wrongFull = structuredClone(ordinary);
      wrongFull.board[editableIndex] = ordinary.board[editableIndex] % 9 + 1;
      return {
        stats: localStorage.getItem(${JSON.stringify(SUDOKU_STATS_KEY)}),
        ordinary: JSON.stringify(ordinary),
        near: JSON.stringify(near),
        wrongFull: JSON.stringify(wrongFull),
        daily: make(dailyPuzzle, "easy", "daily", {
          runSource: "daily-edition",
          dailyEdition: { version: 1, gameId: "sudoku", corpus: "sudoku-daily-v1", edition: "2026-07-29", band: "easy", puzzleId: dailyPuzzle.id }
        }),
        weekly: make(weeklyPuzzle, "medium", "classic", {
          runSource: "weekly",
          currentWeeklyPathId: "bridge-week",
          currentWeeklyStepId: "step-1",
          currentWeeklyWeekKey: "2026-07-27"
        }),
        focus: make(focusPuzzle, "hard", "classic", { focusLaunchId: focusPuzzle.id })
      };
    })()`);

    await navigate(suguru, { width: 390, height: 844 }, { query: "?game=suguru&level=size5-easy&mode=classic", ...fixedOptions });
    const suguruSeeds = await client.evaluate(`(() => {
      const all = Object.values(window.SUGURU_PUZZLES).flat();
      const ordinaryPuzzle = window.SUGURU_PUZZLES["size5-easy"][0];
      const dailyPuzzle = all.find((entry) => entry.id === "suguru-size5-garden-path");
      const cagePuzzle = all.find((entry) => entry.id === "suguru-size5-garden-path");
      const focusPuzzle = all.find((entry) => entry.id === "suguru-size5-mist-pair-current");
      const make = (puzzle, level, mode, extra = {}) => JSON.stringify({
        version: 3,
        runSource: "ordinary",
        level,
        mode,
        puzzleId: puzzle.id,
        board: puzzle.solution.split("").map(Number),
        notes: Array.from({ length: puzzle.size ** 2 }, () => []),
        selectedIndex: puzzle.puzzle.indexOf("0"),
        mistakes: 0,
        nudgesUsed: 0,
        nudgeCountedKeys: [],
        notesMode: false,
        showMistakes: true,
        secondsElapsed: 12,
        paused: false,
        pauseReason: null,
        ...extra
      });
      const ordinary = JSON.parse(make(ordinaryPuzzle, "size5-easy", "classic"));
      const editableIndex = ordinaryPuzzle.puzzle.split("").findIndex((value, index) => value === "0" && window.SuguruCore.getCageSize(index, ordinaryPuzzle) > 1);
      const near = structuredClone(ordinary);
      near.board[editableIndex] = 0;
      const wrongFull = structuredClone(ordinary);
      const cageSize = window.SuguruCore.getCageSize(editableIndex, ordinaryPuzzle);
      wrongFull.board[editableIndex] = ordinary.board[editableIndex] % cageSize + 1;
      return {
        stats: localStorage.getItem(${JSON.stringify(SUGURU_STATS_KEY)}),
        ordinary: JSON.stringify(ordinary),
        near: JSON.stringify(near),
        wrongFull: JSON.stringify(wrongFull),
        daily: make(dailyPuzzle, "size5-easy", "daily", {
          runSource: "daily-edition",
          dailyEdition: { version: 1, gameId: "suguru", corpus: "suguru-daily-v1", edition: "2026-07-29", band: "size5-easy", puzzleId: dailyPuzzle.id }
        }),
        cage: make(cagePuzzle, "size5-easy", "classic", { runSource: "cage-garden", journeyId: "cage-garden-v1", journeyStepId: "garden-gate" }),
        focus: make(focusPuzzle, "size5-challenge", "classic", { focusLaunchId: focusPuzzle.id })
      };
    })()`);

    for (const fixture of [
      { game: solvedSudoku, name: "Sudoku", resumeKey: SUDOKU_RESUME_KEY, query: "?game=sudoku&difficulty=easy&mode=classic", near: sudokuSeeds.near, wrongFull: sudokuSeeds.wrongFull },
      { game: suguru, name: "Suguru", resumeKey: SUGURU_RESUME_KEY, query: "?game=suguru&level=size5-easy&mode=classic", near: suguruSeeds.near, wrongFull: suguruSeeds.wrongFull }
    ]) {
      for (const [kind, resumeValue] of [["near-solved", fixture.near], ["wrong-full", fixture.wrongFull]]) {
        await navigate(fixture.game, { width: 390, height: 844 }, { query: fixture.query, storageEntries: { [fixture.resumeKey]: resumeValue }, ...fixedOptions });
        const boundary = await client.evaluate(`(() => {
          const expected = JSON.parse(${JSON.stringify(resumeValue)});
          const actual = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
          return {
            samePuzzle: actual?.puzzleId === expected.puzzleId,
            sameBoard: JSON.stringify(actual?.board) === JSON.stringify(expected.board),
            victoryHidden: document.getElementById("victory-overlay")?.hidden,
            message: document.getElementById("game-message")?.textContent.trim()
          };
        })()`);
        check(boundary.samePuzzle && boundary.sameBoard && boundary.victoryHidden && /Resumed|restored/i.test(boundary.message || ""), `${fixture.name} ${kind} recovery boundary still restores`, JSON.stringify(boundary));
      }
    }

    const sudokuBaseStorage = {
      [SUDOKU_STATS_KEY]: sudokuSeeds.stats,
      [SUDOKU_SESSION_HISTORY_KEY]: "[]",
      [SUDOKU_DAILY_KEY]: emptyDaily,
      [SUDOKU_WEEKLY_KEY]: emptyWeekly,
      [FOCUS_RESULTS_KEY]: emptyFocus
    };
    const suguruBaseStorage = {
      [SUGURU_DAILY_KEY]: emptyDaily,
      [SUGURU_JOURNEY_KEY]: emptyJourney,
      [FOCUS_RESULTS_KEY]: emptyFocus
    };
    if (suguruSeeds.stats) suguruBaseStorage[SUGURU_STATS_KEY] = suguruSeeds.stats;

    for (const fixture of [
      { game: solvedSudoku, name: "Sudoku ordinary", resumeKey: SUDOKU_RESUME_KEY, resume: sudokuSeeds.ordinary, query: "?game=sudoku&difficulty=easy&mode=classic", statsKey: SUDOKU_STATS_KEY, historyKey: SUDOKU_SESSION_HISTORY_KEY, base: sudokuBaseStorage },
      { game: solvedSudoku, name: "Sudoku Daily", resumeKey: SUDOKU_RESUME_KEY, resume: sudokuSeeds.daily, query: "?game=sudoku&difficulty=easy&mode=daily&edition=2026-07-29&corpus=sudoku-daily-v1", statsKey: SUDOKU_STATS_KEY, historyKey: SUDOKU_SESSION_HISTORY_KEY, base: sudokuBaseStorage },
      { game: solvedSudoku, name: "Sudoku Weekly", resumeKey: SUDOKU_RESUME_KEY, resume: sudokuSeeds.weekly, query: "", statsKey: SUDOKU_STATS_KEY, historyKey: SUDOKU_SESSION_HISTORY_KEY, base: sudokuBaseStorage },
      { game: solvedSudoku, name: "Sudoku Focus", resumeKey: SUDOKU_RESUME_KEY, resume: sudokuSeeds.focus, query: "?game=sudoku&difficulty=hard&mode=classic", statsKey: SUDOKU_STATS_KEY, historyKey: SUDOKU_SESSION_HISTORY_KEY, base: sudokuBaseStorage },
      { game: suguru, name: "Suguru ordinary", resumeKey: SUGURU_RESUME_KEY, resume: suguruSeeds.ordinary, query: "?game=suguru&level=size5-easy&mode=classic", statsKey: SUGURU_STATS_KEY, historyKey: null, base: suguruBaseStorage },
      { game: suguru, name: "Suguru Daily", resumeKey: SUGURU_RESUME_KEY, resume: suguruSeeds.daily, query: "?game=suguru&level=size5-easy&mode=daily&edition=2026-07-29&corpus=suguru-daily-v1", statsKey: SUGURU_STATS_KEY, historyKey: null, base: suguruBaseStorage },
      { game: suguru, name: "Suguru Cage Garden", resumeKey: SUGURU_RESUME_KEY, resume: suguruSeeds.cage, query: "", statsKey: SUGURU_STATS_KEY, historyKey: null, base: suguruBaseStorage },
      { game: suguru, name: "Suguru Focus", resumeKey: SUGURU_RESUME_KEY, resume: suguruSeeds.focus, query: "?game=suguru&level=size5-challenge&mode=classic", statsKey: SUGURU_STATS_KEY, historyKey: null, base: suguruBaseStorage }
    ]) {
      const storageEntries = { ...fixture.base, [fixture.resumeKey]: fixture.resume };
      await navigate(fixture.game, { width: 390, height: 844 }, { query: fixture.query, storageEntries, ...fixedOptions });
      const outcome = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const message = document.getElementById("game-message")?.textContent.trim();
        document.getElementById("check-button")?.click();
        await wait(30);
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const pools = ${fixture.game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"};
        const puzzle = Object.values(pools).flat().find((entry) => entry.id === resume?.puzzleId);
        return {
          message,
          victoryHidden: document.getElementById("victory-overlay")?.hidden,
          freshUnsolved: Boolean(puzzle && JSON.stringify(resume.board) !== JSON.stringify(puzzle.solution.split("").map(Number))),
          stats: localStorage.getItem(${JSON.stringify(fixture.statsKey)}),
          history: ${fixture.historyKey ? `localStorage.getItem(${JSON.stringify(fixture.historyKey)})` : "null"},
          daily: localStorage.getItem(${JSON.stringify(fixture.game.name === "Sudoku" ? SUDOKU_DAILY_KEY : SUGURU_DAILY_KEY)}),
          source: localStorage.getItem(${JSON.stringify(fixture.game.name === "Sudoku" ? SUDOKU_WEEKLY_KEY : SUGURU_JOURNEY_KEY)}),
          focus: localStorage.getItem(${JSON.stringify(FOCUS_RESULTS_KEY)})
        };
      })()`);
      const beforeStats = fixture.base[fixture.statsKey] ? JSON.parse(fixture.base[fixture.statsKey]) : null;
      const afterStats = outcome.stats ? JSON.parse(outcome.stats) : null;
      const creditsStable = JSON.stringify(stripStartedCounters(afterStats)) === JSON.stringify(stripStartedCounters(beforeStats))
        && (!fixture.historyKey || outcome.history === fixture.base[fixture.historyKey])
        && outcome.daily === fixture.base[fixture.game.name === "Sudoku" ? SUDOKU_DAILY_KEY : SUGURU_DAILY_KEY]
        && outcome.source === fixture.base[fixture.game.name === "Sudoku" ? SUDOKU_WEEKLY_KEY : SUGURU_JOURNEY_KEY]
        && outcome.focus === fixture.base[FOCUS_RESULTS_KEY];
      check(/completed recovery snapshot was ignored/i.test(outcome.message || "") && outcome.victoryHidden && outcome.freshUnsolved && creditsStable, `${fixture.name} solved recovery is rejected without duplicate credit`, JSON.stringify(outcome));
      check(runtimeErrors(client.events).length === 0, `${fixture.name} solved recovery has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }

    for (const fixture of [
      { game: solvedSudoku, name: "Sudoku", resumeKey: SUDOKU_RESUME_KEY, resume: sudokuSeeds.ordinary, statsKey: SUDOKU_STATS_KEY, query: "?game=sudoku&difficulty=easy&mode=classic", base: sudokuBaseStorage },
      { game: suguru, name: "Suguru", resumeKey: SUGURU_RESUME_KEY, resume: suguruSeeds.ordinary, statsKey: SUGURU_STATS_KEY, query: "?game=suguru&level=size5-easy&mode=classic", base: suguruBaseStorage }
    ]) {
      for (const cleanupFault of [
        { name: "thrown remove", rule: { remove: "throw" } },
        { name: "silent remove", rule: { remove: "silent" } },
        { name: "uncertain read-back", rule: { get: "throw-once-after-remove" } }
      ]) {
        await navigate(fixture.game, { width: 390, height: 844 }, {
          query: fixture.query,
          storageEntries: { ...fixture.base, [fixture.resumeKey]: fixture.resume },
          beforeLoadSource: `${storageFaultSource({ [fixture.resumeKey]: cleanupFault.rule })}${saveHealthMutationProbeSource()}`,
          ...fixedOptions
        });
        const first = await client.evaluate(`(() => {
          const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
          return {
            message: document.getElementById("game-message")?.textContent.trim(),
            saveStatus: document.getElementById("local-save-status")?.textContent.trim(),
            saveMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
            resume,
            removeAttempts: window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "remove" && entry.key === ${JSON.stringify(fixture.resumeKey)}).length
          };
        })()`);
        await reloadPreservingStorage(fixture.game, fixedOptions);
        const second = await client.evaluate(`(() => {
          const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
          return { puzzleId: resume?.puzzleId, board: resume?.board, victoryHidden: document.getElementById("victory-overlay")?.hidden };
        })()`);
        check(/completed recovery snapshot was ignored/i.test(first.message || "")
          && /Old board recovery data could not be cleared; completed snapshots will still be ignored\./.test(first.saveStatus || "")
          && !/Session-only:/.test(first.saveStatus || "")
          && first.saveMutations === 1
          && first.removeAttempts === 1
          && first.resume?.puzzleId
          && JSON.stringify(first.resume.board) === JSON.stringify(second.board)
          && first.resume.puzzleId === second.puzzleId
          && second.victoryHidden,
        `${fixture.name} ${cleanupFault.name} is verified, disclosed, and overwritten by a fresh resumable board`, JSON.stringify({ first, second }));
      }

      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: fixture.query,
        storageEntries: { ...fixture.base, [fixture.resumeKey]: fixture.resume },
        beforeLoadSource: `${storageFaultSource({ [fixture.resumeKey]: { remove: "throw", set: "throw" } })}${saveHealthMutationProbeSource()}`,
        ...fixedOptions
      });
      const mixedFailure = await client.evaluate(`({
        message: document.getElementById("game-message")?.textContent.trim(),
        saveStatus: document.getElementById("local-save-status")?.textContent.trim(),
        saveMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
        resume: localStorage.getItem(${JSON.stringify(fixture.resumeKey)}),
        removeAttempts: window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "remove" && entry.key === ${JSON.stringify(fixture.resumeKey)}).length,
        setAttempts: window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(fixture.resumeKey)}).length,
        victoryHidden: document.getElementById("victory-overlay")?.hidden
      })`);
      check(/completed recovery snapshot was ignored/i.test(mixedFailure.message || "")
        && /Session-only: board recovery/.test(mixedFailure.saveStatus || "")
        && /Old board recovery data could not be cleared/.test(mixedFailure.saveStatus || "")
        && mixedFailure.saveMutations === 1
        && mixedFailure.resume === fixture.resume
        && mixedFailure.removeAttempts === 1
        && mixedFailure.setAttempts >= 1
        && mixedFailure.victoryHidden,
      `${fixture.name} coalesces mixed board-recovery write and cleanup failures without reopening the solved snapshot`, JSON.stringify(mixedFailure));
      check(runtimeErrors(client.events).length === 0, `${fixture.name} mixed save-health failure has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("key-specific active save health", async () => {
    const fixtures = [
      { game: GAMES[0], resumeKey: SUDOKU_RESUME_KEY, query: "?game=sudoku&difficulty=easy&mode=classic" },
      { game: GAMES[1], resumeKey: SUGURU_RESUME_KEY, query: "?game=suguru&level=size5-easy&mode=classic" }
    ];

    for (const fixture of fixtures) {
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: fixture.query,
        storageEntries: { "round-six-unrelated": "durable" },
        beforeLoadSource: `${storageFaultSource({ [fixture.resumeKey]: { set: "throw" } })}${saveHealthMutationProbeSource()}`
      });
      const transitions = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const status = document.getElementById("local-save-status");
        await wait(1150);
        const degraded = {
          text: status?.textContent.trim(),
          mutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          resume: localStorage.getItem(${JSON.stringify(fixture.resumeKey)}),
          unrelated: localStorage.getItem("round-six-unrelated"),
          setAttempts: window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(fixture.resumeKey)}).length
        };
        window.__STORAGE_FAULT_RULES[${JSON.stringify(fixture.resumeKey)}].set = null;
        await wait(1150);
        const recovered = {
          text: status?.textContent.trim(),
          mutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          resume: localStorage.getItem(${JSON.stringify(fixture.resumeKey)})
        };
        window.__STORAGE_FAULT_RULES[${JSON.stringify(fixture.resumeKey)}].set = "throw";
        await wait(1150);
        const regressed = {
          text: status?.textContent.trim(),
          mutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          resume: localStorage.getItem(${JSON.stringify(fixture.resumeKey)})
        };
        return { degraded, recovered, regressed };
      })()`);
      check(/Session-only: board recovery could not be saved in this browser\. Keep this tab open\./.test(transitions.degraded.text || "")
        && transitions.degraded.mutations === 1
        && transitions.degraded.resume === null
        && transitions.degraded.unrelated === "durable"
        && transitions.degraded.setAttempts >= 2,
      `${fixture.game.name} exact-key write failure is visible, isolated, and deduplicated across timer retries`, JSON.stringify(transitions));
      check(/Local saving restored\./.test(transitions.recovered.text || "")
        && transitions.recovered.mutations === 2
        && Boolean(transitions.recovered.resume),
      `${fixture.game.name} later complete resume write announces one recovery`, JSON.stringify(transitions));
      check(/Session-only: board recovery/.test(transitions.regressed.text || "")
        && transitions.regressed.mutations === 3
        && transitions.regressed.resume === transitions.recovered.resume,
      `${fixture.game.name} saved board recovery can regress to session-only without deleting durable bytes`, JSON.stringify(transitions));
      check(runtimeErrors(client.events).length === 0, `${fixture.game.name} save-health transitions have no runtime exception`, runtimeErrors(client.events).join(" | "));

      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: fixture.query,
        beforeLoadSource: `${storageFaultSource({ [fixture.resumeKey]: { set: "silent" } })}${saveHealthMutationProbeSource()}`
      });
      const silentWrite = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const status = document.getElementById("local-save-status");
        const initial = {
          text: status?.textContent.trim(),
          mutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          resume: localStorage.getItem(${JSON.stringify(fixture.resumeKey)}),
          attempts: window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(fixture.resumeKey)}).length
        };
        const board = [...document.querySelectorAll(".cell")].map((cell) => Number(cell.textContent.trim()) || 0).join("");
        const pools = ${fixture.game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"};
        const puzzle = Object.values(pools).flat().find((entry) => entry.puzzle === board);
        if (!puzzle) throw new Error("Silent board-write fixture could not resolve the active puzzle");
        document.getElementById("value-mode-button")?.click();
        for (let index = 0; index < puzzle.puzzle.length; index += 1) {
          if (puzzle.puzzle[index] !== "0") continue;
          document.querySelector('.cell[data-index="' + index + '"]')?.click();
          [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled)?.click();
          await wait(0);
        }
        await wait(60);
        return {
          initial,
          victory: document.querySelector("#victory-save-status .save-health-message > span:last-child")?.textContent.trim(),
          resumeAfter: localStorage.getItem(${JSON.stringify(fixture.resumeKey)}),
          removeAttempts: window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "remove" && entry.key === ${JSON.stringify(fixture.resumeKey)}).length
        };
      })()`);
      check(/Session-only: board recovery/.test(silentWrite.initial.text || "") && silentWrite.initial.mutations === 1 && silentWrite.initial.resume === null && silentWrite.initial.attempts >= 1,
        `${fixture.game.name} detects a silent resume write failure by exact read-back`, JSON.stringify(silentWrite));
      check(silentWrite.victory === "Progress saved in this browser." && silentWrite.resumeAfter === null && silentWrite.removeAttempts >= 1,
        `${fixture.game.name} verified completion cleanup resolves the prior board-write failure before victory disclosure`, JSON.stringify(silentWrite));

      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: fixture.query,
        beforeLoadSource: `${storageFaultSource({ [fixture.resumeKey]: {} })}${saveHealthMutationProbeSource()}`
      });
      const pauseDeferral = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const key = ${JSON.stringify(fixture.resumeKey)};
        const status = document.getElementById("local-save-status");
        window.__STORAGE_FAULT_RULES[key].set = "throw";
        document.getElementById("pause-button")?.click();
        await wait(40);
        const paused = {
          text: status?.textContent.trim(),
          mutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          ariaHidden: status?.getAttribute("aria-hidden")
        };
        document.getElementById("resume-button")?.click();
        await wait(40);
        const resumed = {
          text: status?.textContent.trim(),
          mutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          ariaHidden: status?.getAttribute("aria-hidden")
        };
        return { paused, resumed };
      })()`);
      check(pauseDeferral.paused.text === "" && pauseDeferral.paused.mutations === 0 && pauseDeferral.paused.ariaHidden === "true",
        `${fixture.game.name} queues save-health changes while pause makes play inert`, JSON.stringify(pauseDeferral));
      check(/Session-only: board recovery/.test(pauseDeferral.resumed.text || "") && pauseDeferral.resumed.mutations === 1 && pauseDeferral.resumed.ariaHidden === "false",
        `${fixture.game.name} announces the final queued save-health state once after resume`, JSON.stringify(pauseDeferral));
      check(runtimeErrors(client.events).length === 0, `${fixture.game.name} paused save-health deferral has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("save-health 200 percent text reflow", async () => {
    for (const fixture of [
      { game: GAMES[0], resumeKey: SUDOKU_RESUME_KEY, query: "?game=sudoku&difficulty=easy&mode=classic" },
      { game: GAMES[1], resumeKey: SUGURU_RESUME_KEY, query: "?game=suguru&level=size5-easy&mode=classic" }
    ]) {
      for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
        await navigate(fixture.game, viewport, {
          query: fixture.query,
          beforeLoadSource: storageFaultSource({ [fixture.resumeKey]: { set: "throw" } })
        });
        const geometry = await client.evaluate(`(async () => {
          const frame = () => new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
          document.documentElement.style.fontSize = "200%";
          await frame();
          await frame();
          const status = document.getElementById("local-save-status");
          if (${viewport.width <= 390}) {
            status.scrollIntoView({ block: "start" });
            await frame();
            await frame();
          }
          const message = status.querySelector(".save-health-message");
          const header = document.querySelector(".topbar");
          const rect = (element) => {
            const value = element.getBoundingClientRect();
            return { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height };
          };
          const statusRect = rect(status);
          const headerRect = rect(header);
          const overlaps = statusRect.left < headerRect.right && statusRect.right > headerRect.left && statusRect.top < headerRect.bottom && statusRect.bottom > headerRect.top;
          return {
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            statusRect,
            statusText: status.textContent.trim(),
            messageClientWidth: message?.clientWidth,
            messageScrollWidth: message?.scrollWidth,
            headerPosition: getComputedStyle(header).position,
            overlaps,
            overflowing: [...document.querySelectorAll("body *")]
              .filter((element) => {
                const value = element.getBoundingClientRect();
                return value.width > 0 && (value.right > document.documentElement.clientWidth + 1 || value.left < -1);
              })
              .slice(0, 12)
              .map((element) => {
                const value = element.getBoundingClientRect();
                return { tag: element.tagName, id: element.id, className: String(element.className || ""), left: value.left, right: value.right, width: value.width, scrollWidth: element.scrollWidth };
              })
          };
        })()`);
        const label = `${fixture.game.name} ${viewport.width}px at 200% text`;
        check(geometry.scrollWidth <= geometry.clientWidth
          && geometry.statusRect.left >= -0.5
          && geometry.statusRect.right <= geometry.clientWidth + 0.5
          && geometry.messageScrollWidth <= geometry.messageClientWidth + 1,
        `${label} keeps save-health copy inside the viewport without horizontal clipping`, JSON.stringify(geometry));
        if (viewport.width <= 390) {
          check(geometry.headerPosition === "static" && !geometry.overlaps, `${label} keeps the full warning clear of the narrow header`, JSON.stringify(geometry));
        }
        check(/Session-only: board recovery/.test(geometry.statusText || ""), `${label} keeps visible state words at text resize`, JSON.stringify(geometry));
        check(runtimeErrors(client.events).length === 0, `${label} has no runtime exception`, runtimeErrors(client.events).join(" | "));
      }
    }
  });

  await runScenario("stats and recent-solves isolation", async () => {
    const fixedOptions = { fixedInstant: "2026-07-29T12:00:00.000Z", timezoneId: "UTC" };
    const seeds = {};
    for (const fixture of [
      { game: GAMES[0], id: "sudoku", resumeKey: SUDOKU_RESUME_KEY, statsKey: SUDOKU_STATS_KEY, query: "?game=sudoku&difficulty=easy&mode=classic" },
      { game: GAMES[1], id: "suguru", resumeKey: SUGURU_RESUME_KEY, statsKey: SUGURU_STATS_KEY, query: "?game=suguru&level=size5-easy&mode=classic" }
    ]) {
      await navigate(fixture.game, { width: 390, height: 844 }, { query: fixture.query, ...fixedOptions });
      seeds[fixture.id] = await client.evaluate(`(() => {
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const pools = ${fixture.id === "sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"};
        const puzzle = Object.values(pools).flat().find((entry) => entry.id === resume?.puzzleId);
        const board = puzzle.solution.split("").map(Number);
        const editableIndex = puzzle.puzzle.indexOf("0");
        board[editableIndex] = 0;
        const near = { ...resume, runSource: "ordinary", mode: "classic", board, selectedIndex: editableIndex, secondsElapsed: 12, paused: false, pauseReason: null };
        delete near.dailyEdition;
        delete near.currentWeeklyStepId;
        delete near.currentWeeklyPathId;
        delete near.currentWeeklyWeekKey;
        delete near.journeyId;
        delete near.journeyStepId;
        delete near.focusLaunchId;
        return { resume: JSON.stringify(near), stats: localStorage.getItem(${JSON.stringify(fixture.statsKey)}) };
      })()`);
    }

    for (const fixture of [
      { game: GAMES[0], name: "Sudoku stats", id: "sudoku", query: "?game=sudoku&difficulty=easy&mode=classic", resumeKey: SUDOKU_RESUME_KEY, statsKey: SUDOKU_STATS_KEY, targetKey: SUDOKU_STATS_KEY, domain: "stats", historyKey: SUDOKU_SESSION_HISTORY_KEY },
      { game: GAMES[0], name: "Sudoku recent solves", id: "sudoku", query: "?game=sudoku&difficulty=easy&mode=classic", resumeKey: SUDOKU_RESUME_KEY, statsKey: SUDOKU_STATS_KEY, targetKey: SUDOKU_SESSION_HISTORY_KEY, domain: "recent solves", historyKey: SUDOKU_SESSION_HISTORY_KEY },
      { game: GAMES[1], name: "Suguru stats", id: "suguru", query: "?game=suguru&level=size5-easy&mode=classic", resumeKey: SUGURU_RESUME_KEY, statsKey: SUGURU_STATS_KEY, targetKey: SUGURU_STATS_KEY, domain: "stats", historyKey: null }
    ]) {
      const storageEntries = { [fixture.resumeKey]: seeds[fixture.id].resume };
      if (seeds[fixture.id].stats) storageEntries[fixture.statsKey] = seeds[fixture.id].stats;
      if (fixture.historyKey) storageEntries[fixture.historyKey] = "[]";
      const initialTarget = storageEntries[fixture.targetKey] || null;
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: fixture.query,
        storageEntries,
        beforeLoadSource: `${storageFaultSource({ [fixture.targetKey]: { set: "throw" } })}${saveHealthMutationProbeSource()}`,
        ...fixedOptions
      });
      const outcome = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const resumeKey = ${JSON.stringify(fixture.resumeKey)};
        const statsKey = ${JSON.stringify(fixture.statsKey)};
        const historyKey = ${JSON.stringify(fixture.historyKey)};
        const targetKey = ${JSON.stringify(fixture.targetKey)};
        const pools = ${fixture.id === "sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"};
        const solveCurrent = async () => {
          const saved = JSON.parse(localStorage.getItem(resumeKey) || "null");
          const puzzle = Object.values(pools).flat().find((entry) => entry.id === saved?.puzzleId);
          if (!saved || !puzzle) throw new Error("Generic save-health fixture has no resumable puzzle");
          for (let index = 0; index < saved.board.length; index += 1) {
            if (saved.board[index] !== 0) continue;
            document.querySelector('.cell[data-index="' + index + '"]')?.click();
            const digit = [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled);
            if (!digit) throw new Error("No enabled solution digit for cell " + index);
            digit.click();
            await wait(0);
          }
          await wait(50);
        };
        const solvedCount = () => {
          const parsed = JSON.parse(localStorage.getItem(statsKey) || "null");
          return ${fixture.id === "sudoku" ? "parsed?.overall?.solved ?? null" : "parsed?.solved ?? null"};
        };
        const historyLength = () => historyKey ? JSON.parse(localStorage.getItem(historyKey) || "[]").length : null;
        window.__STORAGE_FAULT_LOG.length = 0;
        await solveCurrent();
        const firstLog = window.__STORAGE_FAULT_LOG.slice();
        const first = {
          target: localStorage.getItem(targetKey),
          statsSolved: solvedCount(),
          historyLength: historyLength(),
          resume: localStorage.getItem(resumeKey),
          status: document.getElementById("local-save-status")?.textContent.trim(),
          statusHidden: document.getElementById("local-save-status")?.getAttribute("aria-hidden"),
          statusMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          gameMessage: document.getElementById("game-message")?.textContent.trim(),
          victoryStatus: document.getElementById("victory-save-status")?.textContent.trim(),
          victoryMutations: window.__VICTORY_SAVE_STATUS_MUTATIONS,
          targetBeforeCleanup: firstLog.findIndex((entry) => entry.operation === "set" && entry.key === targetKey),
          cleanupIndex: firstLog.findIndex((entry) => entry.operation === "remove" && entry.key === resumeKey),
          statsWriteIndex: firstLog.findIndex((entry) => entry.operation === "set" && entry.key === statsKey)
        };
        document.getElementById("victory-new-game-button")?.click();
        await wait(100);
        const degraded = {
          status: document.getElementById("local-save-status")?.textContent.trim(),
          statusMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          resume: localStorage.getItem(resumeKey)
        };
        window.__STORAGE_FAULT_RULES[targetKey].set = null;
        await solveCurrent();
        const recoveredWrite = {
          target: localStorage.getItem(targetKey),
          statsSolved: solvedCount(),
          historyLength: historyLength(),
          statusMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS
        };
        document.getElementById("victory-new-game-button")?.click();
        await wait(100);
        const recovered = {
          status: document.getElementById("local-save-status")?.textContent.trim(),
          statusMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          statsSolved: solvedCount(),
          historyLength: historyLength(),
          resume: localStorage.getItem(resumeKey)
        };
        return { first, degraded, recoveredWrite, recovered };
      })()`);
      const targetIsStats = fixture.targetKey === fixture.statsKey;
      check(outcome.first.target === initialTarget
        && outcome.first.resume === null
        && outcome.first.status === ""
        && outcome.first.statusHidden === "true"
        && outcome.first.statusMutations === 0
        && new RegExp(`Session-only: ${fixture.domain} was not saved in this browser`).test(outcome.first.victoryStatus || "")
        && /Other successful saves are unchanged/.test(outcome.first.victoryStatus || "")
        && outcome.first.victoryMutations === 1
        && !/Solved, but browser storage/i.test(outcome.first.gameMessage || "")
        && outcome.first.targetBeforeCleanup >= 0
        && outcome.first.cleanupIndex > outcome.first.targetBeforeCleanup,
      `${fixture.name} failure leaves target bytes unchanged, keeps the active region muted, and discloses once in the result dialog`, JSON.stringify(outcome));
      check(targetIsStats
        ? (outcome.first.statsSolved === (fixture.id === "sudoku" ? 0 : null) && (fixture.historyKey ? outcome.first.historyLength === 1 : true))
        : (outcome.first.statsSolved === 1 && outcome.first.historyLength === 0 && outcome.first.statsWriteIndex < outcome.first.targetBeforeCleanup),
      `${fixture.name} failure leaves unrelated progress durable`, JSON.stringify(outcome.first));
      check(new RegExp(`Session-only: ${fixture.domain} could not be saved in this browser`).test(outcome.degraded.status || "")
        && outcome.degraded.statusMutations === 1
        && Boolean(outcome.degraded.resume),
      `${fixture.name} exposes exactly one domain warning on the next active board`, JSON.stringify(outcome.degraded));
      check(outcome.recoveredWrite.statsSolved === 2
        && (fixture.historyKey ? outcome.recoveredWrite.historyLength === 2 : true)
        && outcome.recoveredWrite.statusMutations === 1,
      `${fixture.name} successful retry persists all accumulated in-memory progress while the result is muted`, JSON.stringify(outcome.recoveredWrite));
      check(/Local saving restored\./.test(outcome.recovered.status || "")
        && outcome.recovered.statusMutations === 2
        && outcome.recovered.statsSolved === 2
        && (fixture.historyKey ? outcome.recovered.historyLength === 2 : true)
        && Boolean(outcome.recovered.resume),
      `${fixture.name} announces one full recovery after returning to active play`, JSON.stringify(outcome.recovered));
      check(runtimeErrors(client.events).length === 0, `${fixture.name} isolation and recovery has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("practice rotation health recovery", async () => {
    for (const fixture of [
      { game: GAMES[0], name: "Sudoku", resumeKey: SUDOKU_RESUME_KEY, statsKey: SUDOKU_STATS_KEY, branchKey: "sudoku|easy", groupField: "familyId" },
      { game: GAMES[1], name: "Suguru", resumeKey: SUGURU_RESUME_KEY, statsKey: SUGURU_STATS_KEY, branchKey: "suguru|size5-easy", groupField: "layoutFamilyId" }
    ]) {
      await navigate(fixture.game, { width: 390, height: 844 }, {
        beforeLoadSource: `${storageFaultSource({ [PRACTICE_ROTATION_KEY]: { set: "throw" } })}${saveHealthMutationProbeSource()}Math.random = () => 0;`
      });
      const outcome = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const resumeKey = ${JSON.stringify(fixture.resumeKey)};
        const pools = ${fixture.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"};
        const capture = () => {
          const resume = JSON.parse(localStorage.getItem(resumeKey) || "null");
          const puzzle = Object.values(pools).flat().find((entry) => entry.id === resume?.puzzleId);
          return {
            group: puzzle?.[${JSON.stringify(fixture.groupField)}] || null,
            resume: localStorage.getItem(resumeKey),
            rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
            status: document.getElementById("local-save-status")?.textContent.trim(),
            mutations: window.__LOCAL_SAVE_STATUS_MUTATIONS
          };
        };
        document.getElementById("new-game-button")?.click();
        await wait(80);
        const first = capture();
        document.getElementById("new-game-button")?.click();
        await wait(80);
        const second = capture();
        window.__STORAGE_FAULT_RULES[${JSON.stringify(PRACTICE_ROTATION_KEY)}].set = null;
        document.getElementById("new-game-button")?.click();
        await wait(80);
        const third = capture();
        return {
          first,
          second,
          third,
          branch: JSON.parse(third.rotation || "null")?.bands?.[${JSON.stringify(fixture.branchKey)}] || null,
          attempts: window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(PRACTICE_ROTATION_KEY)}).length,
          stats: localStorage.getItem(${JSON.stringify(fixture.statsKey)})
        };
      })()`);
      check(outcome.first.rotation === null
        && outcome.second.rotation === null
        && outcome.first.resume
        && outcome.second.resume
        && /Session-only: practice rotation/.test(outcome.first.status || "")
        && outcome.first.mutations === 1
        && outcome.second.mutations === 1,
      `${fixture.name} keeps two failed practice launches session-only and deduplicated`, JSON.stringify(outcome));
      check(new Set([outcome.first.group, outcome.second.group, outcome.third.group]).size === 3,
        `${fixture.name} in-memory practice bag avoids repeats across failed writes and recovery`, JSON.stringify(outcome));
      check(Boolean(outcome.third.rotation)
        && outcome.branch?.last === outcome.third.group
        && /Local saving restored\./.test(outcome.third.status || "")
        && outcome.third.mutations === 2
        && outcome.attempts === 3
        && Boolean(outcome.third.resume)
        && (fixture.name === "Suguru" || Boolean(outcome.stats)),
      `${fixture.name} persists the complete practice branch and announces one recovery`, JSON.stringify(outcome));
      check(runtimeErrors(client.events).length === 0, `${fixture.name} practice rotation health has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

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
  check(newcomerJourney.resume?.version === 3 && newcomerJourney.resume?.puzzleId === SUGURU_FIXTURES.garden.id && newcomerJourney.resume?.journeyId === "cage-garden-v1" && newcomerJourney.resume?.journeyStepId === "garden-gate", "Suguru newcomer preloads Garden Gate with versioned journey recovery", JSON.stringify(newcomerJourney));
  check(newcomerJourney.heroPrimary === "Enter Garden Gate" && newcomerJourney.heroSecondary === "Learn the two rules", "Suguru newcomer receives truthful journey and learning actions", JSON.stringify(newcomerJourney));
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
      nudgesUsed: resume?.nudgesUsed,
      heroLabel: document.getElementById("hero-daily-button")?.textContent.trim(),
      challenge: document.getElementById("challenge-label")?.textContent
    };
  })()`);
  check(legacyRestore.puzzleId === SUGURU_FIXTURES.garden.id && legacyRestore.challenge?.includes("Garden path"), "Suguru restores a valid legacy unversioned board", JSON.stringify(legacyRestore));
  check(legacyRestore.heroLabel === "Continue Garden path" && legacyRestore.nudgesUsed === 0, "Suguru legacy zero-second restore gets truthful Continue copy and an additive zero Nudge count", JSON.stringify(legacyRestore));

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

  const unsafeGardenProgress = JSON.stringify({
    version: 1,
    journeyId: "cage-garden-v1",
    completedSteps: { "garden-gate": { ...validGardenCompletion, nudgesUsed: Number.MAX_SAFE_INTEGER + 1 } }
  });
  await navigate(suguru, { width: 390, height: 844 }, { storageEntries: { [SUGURU_JOURNEY_KEY]: unsafeGardenProgress } });
  const normalizedJourneyNudges = await client.evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
    const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
    const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
    document.getElementById("value-mode-button")?.click();
    for (let index = 0; index < puzzle.puzzle.length; index += 1) {
      if (puzzle.puzzle[index] !== "0") continue;
      document.querySelector('.cell[data-index="' + index + '"]')?.click();
      [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled)?.click();
      await wait(0);
    }
    await wait(30);
    const progress = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_JOURNEY_KEY)}) || "null");
    return {
      garden: progress?.completedSteps?.["garden-gate"]?.nudgesUsed,
      lantern: progress?.completedSteps?.["lantern-walk"]?.nudgesUsed
    };
  })()`);
  check(normalizedJourneyNudges.garden === 0 && normalizedJourneyNudges.lantern === 0, "Suguru Cage Garden normalizes unsafe additive counts and writes complete first-completion metrics", JSON.stringify(normalizedJourneyNudges));

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
    check(outcome.version === 3 && outcome.puzzleId === SUGURU_FIXTURES.garden.id && !outcome.journeyId && !outcome.journeyStepId && outcome.heroLabel === "Continue Garden path", `Suguru strips ${fixtureName} without losing a valid core board`, JSON.stringify(outcome));
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

  await navigate(suguru, { width: 390, height: 844 }, { beforeLoadSource: practiceWriteProbeSource() });
  const pendingSetup = await client.evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
    const snapshot = () => ({
      resume: localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}),
      board: [...document.querySelectorAll(".cell")].map((cell) => cell.textContent).join("|"),
      timer: document.getElementById("timer")?.textContent,
      url: location.search,
      rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
      rotationWrites: window.__PRACTICE_ROTATION_WRITES
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
    return {
      before,
      pending,
      launchLabel,
      launchedResume,
      launchedRotation: JSON.parse(localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}) || "null"),
      launchedWrites: window.__PRACTICE_ROTATION_WRITES
    };
  })()`);
  check(JSON.stringify(pendingSetup.before) === JSON.stringify(pendingSetup.pending), "Suguru level and mode choices remain pending until the named launch action", JSON.stringify(pendingSetup));
  check(pendingSetup.launchLabel === "Start Bridge · Challenge clue variant", "Suguru pending launch action names the replacement level and mode", JSON.stringify(pendingSetup));
  check(pendingSetup.launchedResume?.level === "size5-medium" && pendingSetup.launchedResume?.mode === "challenge" && !pendingSetup.launchedResume?.journeyStepId, "Suguru launch action commits pending setup and clears journey context", JSON.stringify(pendingSetup));
  check(pendingSetup.launchedWrites === 1 && pendingSetup.launchedRotation?.bands?.["suguru|size5-medium"], "Suguru named launch commits exactly one structural rotation update", JSON.stringify(pendingSetup));

  for (const unsafeNudges of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "2"]) {
    const unsafeResume = createSuguruResume(SUGURU_FIXTURES.garden, { version: 3, runSource: "ordinary", nudgesUsed: unsafeNudges, nudgeCountedKeys: [42, "x".repeat(5000)] });
    await navigate(suguru, { width: 390, height: 844 }, { storageEntries: { [SUGURU_RESUME_KEY]: unsafeResume } });
    const normalizedResume = await client.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null")`);
    check(normalizedResume?.nudgesUsed === 0 && normalizedResume?.nudgeCountedKeys?.length === 0, `Suguru resume normalizes unsafe Nudge count ${JSON.stringify(unsafeNudges)} and proof history`, JSON.stringify(normalizedResume));
  }

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
        if (index === 0) {
          document.getElementById("nudge-button")?.click();
          await wait(15);
        }
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
          nudgesUsed: progress?.completedSteps?.[before?.journeyStepId]?.nudgesUsed,
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
    check(journeyRun[0].nudgesUsed === 1 && journeyRun.slice(1).every((run) => run.nudgesUsed === 0), "Suguru Cage Garden keeps each first accepted completion's complete Nudge count", JSON.stringify(journeyRun));
    check(journeyRun.slice(0, 3).map((run) => run.primaryLabel).join(",") === "Continue to Lantern Walk,Continue to Brook Crossing,Continue to Cascade Finale", "Suguru intermediate victories name the earned next step", JSON.stringify(journeyRun));
    check(journeyRun.every((run) => run.activeId === "victory-title"), "Suguru victories focus the dialog title before its ordered actions", JSON.stringify(journeyRun));
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
        gardenNudges: progress?.completedSteps?.["garden-gate"]?.nudgesUsed,
        primaryLabel: document.getElementById("victory-new-game-button")?.textContent.trim(),
        secondaryLabel: document.getElementById("victory-secondary-button")?.textContent.trim()
      };
    })()`);
    check(completedReplay.completedCount === 4 && completedReplay.gardenNudges === 1 && completedReplay.primaryLabel === "Replay Garden Gate" && completedReplay.secondaryLabel === "Play today's clue variant", "Completed-step replay keeps first accepted metrics idempotent and uses replay-specific victory copy", JSON.stringify(completedReplay));
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
  check(ordinaryCompletion.primaryLabel === "Another Size 5 · Bridge clue variant" && ordinaryCompletion.activeId === "victory-title", "Ordinary Suguru victory offers a truthful clue-variant action after title focus", JSON.stringify(ordinaryCompletion));

  const sudoku = GAMES[0];
  await navigate(sudoku, { width: 390, height: 844 }, { beforeLoadSource: practiceWriteProbeSource() });
  const sudokuPendingSetup = await client.evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
    const snapshot = () => ({
      storage: Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])),
      board: [...document.querySelectorAll(".cell")].map((cell) => cell.textContent).join("|"),
      timer: document.getElementById("timer")?.textContent,
      url: location.search,
      challenge: document.getElementById("challenge-label")?.textContent,
      rotationWrites: window.__PRACTICE_ROTATION_WRITES
    });
    const before = snapshot();
    const difficulty = document.getElementById("difficulty-select");
    difficulty.value = "hard";
    difficulty.dispatchEvent(new Event("change", { bubbles: true }));
    const mode = document.getElementById("mode-select");
    mode.value = "nocheck";
    mode.dispatchEvent(new Event("change", { bubbles: true }));
    const pending = snapshot();
    const launchLabel = document.getElementById("new-game-button")?.textContent.trim();
    const message = document.getElementById("game-message")?.textContent.trim();
    document.getElementById("new-game-button")?.click();
    await wait(30);
    document.getElementById("sudoku-board")?.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true }));
    await wait(10);
    return {
      before,
      pending,
      launchLabel,
      message,
      launchedResume: JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null"),
      launchedRotation: JSON.parse(localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}) || "null"),
      launchedWrites: window.__PRACTICE_ROTATION_WRITES,
      noCheckMessage: document.getElementById("game-message")?.textContent.trim()
    };
  })()`);
  check(JSON.stringify(sudokuPendingSetup.before) === JSON.stringify(sudokuPendingSetup.pending), "Sudoku difficulty and mode choices leave board, timer, URL, storage, and provenance byte-identical", JSON.stringify(sudokuPendingSetup));
  check(sudokuPendingSetup.launchLabel === "Start Hard · No check" && sudokuPendingSetup.message?.includes("current board is unchanged"), "Sudoku pending setup names the replacement and announces that the active board is unchanged", JSON.stringify(sudokuPendingSetup));
  check(sudokuPendingSetup.launchedResume?.difficulty === "hard" && sudokuPendingSetup.launchedResume?.mode === "nocheck" && sudokuPendingSetup.launchedResume?.runSource === "ordinary", "Sudoku named launch atomically commits pending difficulty and mode", JSON.stringify(sudokuPendingSetup));
  check(sudokuPendingSetup.launchedWrites === 1 && sudokuPendingSetup.launchedRotation?.bands?.["sudoku|hard"], "Sudoku named launch commits exactly one family rotation update after setup", JSON.stringify(sudokuPendingSetup));
  check(sudokuPendingSetup.noCheckMessage === "No check mode disables checks during the solve. You can still review the completed board.", "Sudoku No check copy distinguishes in-solve checks from solved-board review", JSON.stringify(sudokuPendingSetup));

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

  const dailyRouteCases = [
    {
      game: sudoku,
      bandKey: "difficulty",
      band: "easy",
      corpus: "sudoku-daily-v1",
      expectedPuzzleId: "easy-garden-path-c-r1",
      resumeKey: SUDOKU_RESUME_KEY,
      dailyKey: SUDOKU_DAILY_KEY
    },
    {
      game: suguru,
      bandKey: "level",
      band: "size5-easy",
      corpus: "suguru-daily-v1",
      expectedPuzzleId: "suguru-size5-garden-path",
      resumeKey: SUGURU_RESUME_KEY,
      dailyKey: SUGURU_DAILY_KEY
    }
  ];

  await runScenario("fixed Daily clock", async () => {
    await navigate(sudoku, { width: 390, height: 844 }, {
      fixedInstant: "2026-07-29T12:34:56.000Z",
      timezoneId: "UTC"
    });
    const fixedClock = await client.evaluate(`({
      now: Date.now(),
      current: new Date().toISOString(),
      explicit: new Date("2000-01-02T03:04:05.000Z").toISOString()
    })`);
    check(fixedClock.now === 1785328496000 && fixedClock.current === "2026-07-29T12:34:56.000Z", "Fixed browser clock controls Date.now and zero-argument Date", JSON.stringify(fixedClock));
    check(fixedClock.explicit === "2000-01-02T03:04:05.000Z", "Fixed browser clock preserves explicit Date constructor arguments", JSON.stringify(fixedClock));
  });

  await runScenario("canonical Daily shorthand", async () => {
    for (const fixture of dailyRouteCases) {
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=daily`,
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC"
      });
      const snapshot = await client.evaluate(`(() => {
        const params = new URLSearchParams(location.search);
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        return {
          edition: params.get("edition"),
          corpus: params.get("corpus"),
          puzzleId: resume?.puzzleId,
          runSource: resume?.runSource,
          status: document.getElementById("status-mode-label")?.textContent.trim(),
          card: Boolean(document.getElementById("daily-edition-card")),
          cardStatus: document.getElementById("daily-edition-status")?.textContent.trim()
        };
      })()`);
      check(snapshot.edition === "2026-07-29" && snapshot.corpus === fixture.corpus, `${fixture.game.name} pairless Daily canonicalizes explicit provenance`, JSON.stringify(snapshot));
      check(snapshot.puzzleId === fixture.expectedPuzzleId && snapshot.runSource === "daily-edition", `${fixture.game.name} canonical Daily selects the frozen golden puzzle`, JSON.stringify(snapshot));
      check(snapshot.status === "Today's Daily" && snapshot.card, `${fixture.game.name} exposes one truthful Daily status surface`, JSON.stringify(snapshot));
      check(snapshot.cardStatus?.includes("Unsolved") || snapshot.cardStatus?.includes("In progress"), `${fixture.game.name} labels an unfinished edition locally`, JSON.stringify(snapshot));
      const progressTransition = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const puzzle = Object.values(${fixture.game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"}).flat().find((entry) => entry.id === resume?.puzzleId);
        const index = puzzle?.puzzle.indexOf("0");
        document.querySelector('.cell[data-index="' + index + '"]')?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle?.solution[index] && !button.disabled)?.click();
        await wait(20);
        const afterNote = document.getElementById("daily-edition-status")?.textContent.trim();
        document.getElementById("reset-button")?.click();
        await wait(10);
        document.getElementById("discard-confirm-button")?.click();
        await wait(20);
        return { afterNote, afterReset: document.getElementById("daily-edition-status")?.textContent.trim() };
      })()`);
      check(progressTransition.afterNote?.includes("In progress") && progressTransition.afterReset?.includes("Unsolved"), `${fixture.game.name} Daily status transitions on a first note and pristine reset`, JSON.stringify(progressTransition));
      check(runtimeErrors(client.events).length === 0, `${fixture.game.name} canonical Daily shorthand has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("literal Daily editions across timezones", async () => {
    const timezoneCases = [
      { ...dailyRouteCases[0], timezoneId: "Pacific/Kiritimati", expectedStatus: "Past Daily" },
      { ...dailyRouteCases[1], timezoneId: "America/Los_Angeles", expectedStatus: "Today's Daily" }
    ];
    for (const fixture of timezoneCases) {
      const query = `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=daily&edition=2026-07-29&corpus=${fixture.corpus}`;
      const clock = { fixedInstant: "2026-07-29T10:30:00.000Z", timezoneId: fixture.timezoneId };
      await navigate(fixture.game, { width: 390, height: 844 }, { query, ...clock });
      const before = await client.evaluate(`(() => {
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        return {
          puzzleId: resume?.puzzleId,
          status: document.getElementById("status-mode-label")?.textContent.trim(),
          edition: new URLSearchParams(location.search).get("edition")
        };
      })()`);
      await reloadPreservingStorage(fixture.game, clock);
      const after = await client.evaluate(`(() => {
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        return {
          puzzleId: resume?.puzzleId,
          status: document.getElementById("status-mode-label")?.textContent.trim(),
          edition: new URLSearchParams(location.search).get("edition")
        };
      })()`);
      check(before.puzzleId === fixture.expectedPuzzleId && after.puzzleId === fixture.expectedPuzzleId, `${fixture.game.name} literal edition ignores viewer-date rollover`, JSON.stringify({ before, after }));
      check(before.edition === "2026-07-29" && after.edition === "2026-07-29", `${fixture.game.name} literal edition survives reload`, JSON.stringify({ before, after }));
      check(before.status === fixture.expectedStatus && after.status === fixture.expectedStatus, `${fixture.game.name} distinguishes Today from Past in ${fixture.timezoneId}`, JSON.stringify({ before, after }));
      check(runtimeErrors(client.events).length === 0, `${fixture.game.name} timezone Daily flow has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("past Daily main-button replay", async () => {
    const rotationFixture = JSON.stringify({ version: 1, bands: { "sudoku|easy": { inventory: "fixture", remaining: ["garden-path"], last: "paper-lantern" } } });
    for (const fixture of dailyRouteCases) {
      const query = `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=daily&edition=2026-07-28&corpus=${fixture.corpus}`;
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query,
        storageEntries: { [PRACTICE_ROTATION_KEY]: rotationFixture },
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC",
        beforeLoadSource: practiceWriteProbeSource()
      });
      const replay = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const readResume = () => JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const before = readResume();
        const label = document.getElementById("new-game-button")?.textContent.trim();
        document.getElementById("new-game-button")?.click();
        await wait(30);
        const after = readResume();
        return {
          before: { puzzleId: before?.puzzleId, edition: before?.dailyEdition?.edition, runSource: before?.runSource },
          after: { puzzleId: after?.puzzleId, edition: after?.dailyEdition?.edition, runSource: after?.runSource },
          label,
          urlEdition: new URLSearchParams(location.search).get("edition"),
          rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
          rotationWrites: window.__PRACTICE_ROTATION_WRITES
        };
      })()`);
      check(replay.label?.startsWith("Replay this ") && replay.before.edition === "2026-07-28", `${fixture.game.name} past Daily main action promises an exact edition replay`, JSON.stringify(replay));
      check(replay.after.puzzleId === replay.before.puzzleId && replay.after.edition === replay.before.edition && replay.after.runSource === "daily-edition" && replay.urlEdition === "2026-07-28", `${fixture.game.name} past Daily main action replays the exact puzzle identity`, JSON.stringify(replay));
      check(replay.rotation === rotationFixture && replay.rotationWrites === 0, `${fixture.game.name} past Daily replay leaves practice rotation byte-identical`, JSON.stringify(replay));
      check(runtimeErrors(client.events).length === 0, `${fixture.game.name} past Daily replay has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("invalid Daily provenance fallback", async () => {
    for (const [label, edition, corpus] of [
      ["future", "2026-07-30", "sudoku-daily-v1"],
      ["unknown corpus", "2026-07-29", "sudoku-daily-v9"],
      ["invalid date", "2026-02-29", "sudoku-daily-v1"]
    ]) {
      await navigate(sudoku, { width: 390, height: 844 }, {
        query: `?game=sudoku&difficulty=easy&mode=daily&edition=${edition}&corpus=${corpus}`,
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC"
      });
      const fallback = await client.evaluate(`(() => {
        const params = new URLSearchParams(location.search);
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
        return {
          edition: params.get("edition"),
          corpus: params.get("corpus"),
          puzzleId: resume?.puzzleId,
          runSource: resume?.runSource,
          message: document.getElementById("game-message")?.textContent.trim()
        };
      })()`);
      check(fallback.edition === "2026-07-29" && fallback.corpus === "sudoku-daily-v1" && fallback.puzzleId === "easy-garden-path-c-r1", `Sudoku ${label} provenance falls back to today's verified edition`, JSON.stringify(fallback));
      check(fallback.runSource === "daily-edition" && /today|unavailable|invalid|future/i.test(fallback.message || ""), `Sudoku ${label} fallback is announced`, JSON.stringify(fallback));
    }
  });

  await runScenario("Daily game switching", async () => {
    await navigate(sudoku, { width: 390, height: 844 }, {
      query: "?game=sudoku&difficulty=easy&mode=daily&edition=2026-07-29&corpus=sudoku-daily-v1",
      fixedInstant: "2026-07-29T12:00:00.000Z",
      timezoneId: "UTC"
    });
    const suguruLink = await client.evaluate(`document.getElementById("topnav-suguru-link")?.href`);
    const suguruUrl = new URL(suguruLink);
    check(suguruUrl.searchParams.get("mode") === "daily" && suguruUrl.searchParams.get("edition") === "2026-07-29" && suguruUrl.searchParams.get("corpus") === "suguru-daily-v1", "Sudoku-to-Suguru switching preserves validated date with target corpus", suguruLink);

    await navigate(suguru, { width: 390, height: 844 }, {
      query: "?game=suguru&level=size5-easy&mode=daily&edition=2026-07-29&corpus=suguru-daily-v1",
      fixedInstant: "2026-07-29T12:00:00.000Z",
      timezoneId: "UTC"
    });
    const sudokuLink = await client.evaluate(`document.getElementById("topnav-sudoku-link")?.href`);
    const sudokuUrl = new URL(sudokuLink);
    check(sudokuUrl.searchParams.get("mode") === "daily" && sudokuUrl.searchParams.get("edition") === "2026-07-29" && sudokuUrl.searchParams.get("corpus") === "sudoku-daily-v1", "Suguru-to-Sudoku switching preserves validated date with target corpus", sudokuLink);
  });

  await runScenario("legacy ambiguous Daily recovery", async () => {
    for (const fixture of dailyRouteCases) {
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=daily`,
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC"
      });
      const legacy = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const key = ${JSON.stringify(fixture.resumeKey)};
        let resume = JSON.parse(localStorage.getItem(key) || "null");
        const pool = Object.values(${fixture.game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"}).flat();
        const puzzle = pool.find((entry) => entry.id === resume?.puzzleId);
        document.getElementById("value-mode-button")?.click();
        const index = puzzle?.puzzle.indexOf("0");
        document.querySelector('.cell[data-index="' + index + '"]')?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle?.solution[index] && !button.disabled)?.click();
        await wait(20);
        resume = JSON.parse(localStorage.getItem(key) || "null");
        resume.version = ${fixture.game.name === "Sudoku" ? 1 : 2};
        delete resume.runSource;
        delete resume.dailyEdition;
        delete resume.currentDailyDateKey;
        delete resume.currentDailySpecial;
        return { serialized: JSON.stringify(resume), puzzleId: resume.puzzleId, board: resume.board.join(",") };
      })()`);
      await navigate(fixture.game, { width: 390, height: 844 }, {
        storageEntries: { [fixture.resumeKey]: legacy.serialized },
        fixedInstant: "2026-07-30T12:00:00.000Z",
        timezoneId: "UTC"
      });
      const restored = await client.evaluate(`(() => {
        const params = new URLSearchParams(location.search);
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        return {
          puzzleId: resume?.puzzleId,
          board: resume?.board?.join(","),
          mode: params.get("mode"),
          edition: params.get("edition"),
          corpus: params.get("corpus"),
          runSource: resume?.runSource,
          status: document.getElementById("status-mode-label")?.textContent.trim()
        };
      })()`);
      check(restored.puzzleId === legacy.puzzleId && restored.board === legacy.board, `${fixture.game.name} preserves an ambiguous legacy Daily core`, JSON.stringify(restored));
      check(restored.mode === "classic" && !restored.edition && !restored.corpus && restored.runSource === "ordinary", `${fixture.game.name} downgrades ambiguous legacy Daily provenance to ordinary Classic`, JSON.stringify(restored));
      check(restored.status === "Classic", `${fixture.game.name} never labels downgraded legacy progress as today's Daily`, JSON.stringify(restored));
    }
  });

  await runScenario("Daily display-parameter precedence", async () => {
    for (const fixture of dailyRouteCases) {
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=daily&edition=2026-07-29&corpus=${fixture.corpus}`,
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC"
      });
      const active = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const key = ${JSON.stringify(fixture.resumeKey)};
        let resume = JSON.parse(localStorage.getItem(key) || "null");
        const pool = Object.values(${fixture.game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"}).flat();
        const puzzle = pool.find((entry) => entry.id === resume?.puzzleId);
        document.getElementById("value-mode-button")?.click();
        const index = puzzle?.puzzle.indexOf("0");
        document.querySelector('.cell[data-index="' + index + '"]')?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle?.solution[index] && !button.disabled)?.click();
        await wait(20);
        resume = JSON.parse(localStorage.getItem(key) || "null");
        return { serialized: JSON.stringify(resume), board: resume.board.join(",") };
      })()`);
      const query = `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=daily&edition=2026-07-29&corpus=${fixture.corpus}&notes=off&mistakes=on`;
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query,
        storageEntries: { [fixture.resumeKey]: active.serialized },
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC"
      });
      const restored = await client.evaluate(`(() => {
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        return { board: resume?.board?.join(","), notesMode: resume?.notesMode, showMistakes: resume?.showMistakes };
      })()`);
      check(restored.board === active.board, `${fixture.game.name} display preferences do not disqualify an exact Daily resume`, JSON.stringify(restored));
      check(restored.notesMode === false && restored.showMistakes === true, `${fixture.game.name} applies display preferences after Daily restoration`, JSON.stringify(restored));
    }
  });

  await runScenario("verified Daily completion and sharing", async () => {
    for (const fixture of dailyRouteCases) {
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=daily&edition=2026-07-29&corpus=${fixture.corpus}`,
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC"
      });
      const solved = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        window.__DAILY_SHARED_PAYLOAD = null;
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async (payload) => { window.__DAILY_SHARED_PAYLOAD = payload; }
        });
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const puzzle = Object.values(${fixture.game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"}).flat().find((entry) => entry.id === resume?.puzzleId);
        if (${fixture.game.name === "Suguru"}) {
          document.getElementById("nudge-button")?.click();
          await wait(10);
        }
        document.getElementById("value-mode-button")?.click();
        for (let index = 0; index < puzzle.puzzle.length; index += 1) {
          if (puzzle.puzzle[index] !== "0") continue;
          document.querySelector('.cell[data-index="' + index + '"]')?.click();
          const digit = [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled);
          if (!digit) throw new Error("No legal Daily digit for cell " + index);
          digit.click();
          await wait(0);
        }
        await wait(30);
        document.getElementById("share-victory-button")?.click();
        await wait(30);
        return {
          ledger: JSON.parse(localStorage.getItem(${JSON.stringify(fixture.dailyKey)}) || "null"),
          legacy: ${fixture.game.name === "Sudoku" ? `JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_LEGACY_DAILY_KEY)}) || "null")` : "null"},
          status: document.getElementById("daily-edition-status")?.textContent.trim(),
          streak: document.getElementById("daily-edition-streak")?.textContent.trim(),
          shared: window.__DAILY_SHARED_PAYLOAD,
          modeStatus: document.getElementById("status-mode-label")?.textContent.trim(),
          activeId: document.activeElement?.id,
          ledgerRaw: localStorage.getItem(${JSON.stringify(fixture.dailyKey)})
        };
      })()`);
      const resultKey = `${fixture.corpus}|2026-07-29|${fixture.band}`;
      const entry = solved.ledger?.entries?.[resultKey];
      check(solved.ledger?.version === 1 && entry?.puzzleId === fixture.expectedPuzzleId, `${fixture.game.name} writes one verified edition result`, JSON.stringify(solved));
      if (fixture.game.name === "Sudoku") {
        check(!solved.legacy || Object.keys(solved.legacy).length === 0, "Sudoku verified completion does not write the ambiguous legacy ledger", JSON.stringify(solved.legacy));
      } else {
        check(entry?.nudgesUsed === 1 && /1 nudge/.test(solved.shared?.text || ""), "Suguru Daily result and share retain the complete Nudge count", JSON.stringify(solved));
      }
      check(solved.status?.includes("Solved locally") && solved.streak?.includes("1 day"), `${fixture.game.name} renders local solved status and verified streak`, JSON.stringify(solved));
      const sharedUrl = new URL(solved.shared?.url || "http://invalid.local/");
      const expectedKeys = fixture.game.name === "Sudoku"
        ? ["corpus", "difficulty", "edition", "game", "mode"]
        : ["corpus", "edition", "game", "level", "mode"];
      check([...sharedUrl.searchParams.keys()].sort().join(",") === expectedKeys.join(","), `${fixture.game.name} Daily share URL is identity-only`, solved.shared?.url || "missing share URL");
      check(sharedUrl.searchParams.get("edition") === "2026-07-29" && sharedUrl.searchParams.get("corpus") === fixture.corpus, `${fixture.game.name} Daily share reproduces the exact edition`, solved.shared?.url || "missing share URL");
      check(solved.modeStatus === "Today's Daily", `${fixture.game.name} solved edition keeps truthful mode status`, JSON.stringify(solved));
      check(solved.activeId === "victory-title", `${fixture.game.name} victory begins at its dialog title`, JSON.stringify(solved));
      await navigate(fixture.game, { width: 320, height: 568 }, {
        query: `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=classic`,
        storageEntries: { [fixture.dailyKey]: solved.ledgerRaw },
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC"
      });
      const offDaily = await client.evaluate(`(() => {
        const card = document.getElementById("daily-edition-card");
        const board = document.getElementById(${JSON.stringify(fixture.game.boardId)});
        const cardRect = card?.getBoundingClientRect();
        const boardRect = board?.getBoundingClientRect();
        return {
          hidden: card?.hidden,
          status: document.getElementById("daily-edition-status")?.textContent.trim(),
          modeStatus: document.getElementById("status-mode-label")?.textContent.trim(),
          primary: document.getElementById("daily-edition-primary-button")?.textContent.trim(),
          shareHidden: document.getElementById("share-daily-button")?.hidden,
          privacy: document.getElementById("daily-result-share-text")?.textContent.trim(),
          cardHeight: cardRect?.height,
          boardHeight: boardRect?.height,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`);
      check(!offDaily.hidden && offDaily.status?.startsWith("Solved locally") && offDaily.modeStatus === "Classic" && !offDaily.shareHidden, `${fixture.game.name} keeps today's solved result available during Classic play`, JSON.stringify(offDaily));
      check(/open|replay/i.test(offDaily.primary || "") && /When browser storage is available/i.test(offDaily.privacy || "") && !offDaily.privacy?.includes(fixture.corpus), `${fixture.game.name} off-Daily result keeps a plain-language local action and privacy note`, JSON.stringify(offDaily));
      check(!offDaily.overflow && offDaily.cardHeight > 40 && offDaily.cardHeight <= offDaily.boardHeight * 1.6, `${fixture.game.name} solved Daily card stays visibly rendered and compact at 320px`, JSON.stringify(offDaily));
      check(runtimeErrors(client.events).length === 0, `${fixture.game.name} verified Daily solve has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("Suguru Daily additive metric replacement", async () => {
    const key = "suguru-daily-v1|2026-07-29|size5-easy";
    const completedAt = "2026-07-29T08:00:00.000Z";
    for (const fixture of [
      { label: "rejected slower replay", seconds: 0, expectedMistakes: 7, expectedNudges: 4 },
      { label: "accepted faster replay", seconds: 999, expectedMistakes: 0, expectedNudges: 1 }
    ]) {
      const ledger = {
        version: 1,
        entries: {
          [key]: {
            edition: "2026-07-29",
            corpus: "suguru-daily-v1",
            band: "size5-easy",
            puzzleId: "suguru-size5-garden-path",
            seconds: fixture.seconds,
            mistakes: 7,
            nudgesUsed: 4,
            completedAt
          }
        }
      };
      await navigate(suguru, { width: 390, height: 844 }, {
        query: "?game=suguru&level=size5-easy&mode=daily&edition=2026-07-29&corpus=suguru-daily-v1",
        storageEntries: { [SUGURU_DAILY_KEY]: JSON.stringify(ledger) },
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC"
      });
      const result = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
        const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
        document.getElementById("nudge-button")?.click();
        await wait(10);
        document.getElementById("value-mode-button")?.click();
        for (let index = 0; index < puzzle.puzzle.length; index += 1) {
          if (puzzle.puzzle[index] !== "0") continue;
          document.querySelector('.cell[data-index="' + index + '"]')?.click();
          [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled)?.click();
          await wait(0);
        }
        await wait(30);
        return {
          entry: JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_DAILY_KEY)}) || "null")?.entries?.[${JSON.stringify(key)}],
          summary: document.getElementById("victory-summary")?.textContent.trim()
        };
      })()`);
      check(result.entry?.mistakes === fixture.expectedMistakes && result.entry?.nudgesUsed === fixture.expectedNudges && result.entry?.completedAt === completedAt, `Suguru Daily ${fixture.label} keeps one complete accepted run`, JSON.stringify(result));
      if (fixture.seconds === 0) {
        check(result.entry?.seconds === 0, "Suguru rejected Daily replay cannot mix new Nudge metrics into the faster stored run", JSON.stringify(result));
      } else {
        check(result.entry?.seconds < fixture.seconds && /1 nudge/.test(result.summary || ""), "Suguru accepted Daily replay replaces time, mistakes, and Nudge count together", JSON.stringify(result));
      }
      check(runtimeErrors(client.events).length === 0, `Suguru Daily ${fixture.label} has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("transactional Daily session fallback", async () => {
    const pastEdition = "2026-07-28";
    const fixedOptions = { fixedInstant: "2026-07-29T12:00:00.000Z", timezoneId: "UTC" };
    for (const fixture of dailyRouteCases) {
      const route = `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=daily&edition=${pastEdition}&corpus=${fixture.corpus}`;
      await navigate(fixture.game, { width: 390, height: 844 }, { query: route, ...fixedOptions });
      const seed = await client.evaluate(`(() => {
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const pools = ${fixture.game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"};
        const puzzle = Object.values(pools).flat().find((entry) => entry.id === resume?.puzzleId);
        const board = puzzle.solution.split("").map(Number);
        const editableIndex = puzzle.puzzle.indexOf("0");
        board[editableIndex] = 0;
        const near = { ...resume, board, selectedIndex: editableIndex, secondsElapsed: 0, mistakes: 2, paused: false, pauseReason: null };
        if (${fixture.game.name === "Sudoku"}) near.assistedRun = true;
        else near.nudgesUsed = 2;
        return { resume: JSON.stringify(near), identity: resume.dailyEdition };
      })()`);
      const pastKey = `${seed.identity.corpus}|${seed.identity.edition}|${seed.identity.band}`;
      const durablePast = fixture.game.name === "Sudoku"
        ? {
            edition: seed.identity.edition,
            corpus: seed.identity.corpus,
            band: seed.identity.band,
            puzzleId: seed.identity.puzzleId,
            seconds: 100,
            mistakes: 9,
            assisted: false,
            completedAt: "2026-07-28T08:00:00.000Z",
            medal: "Old record",
            technique: "Old technique",
            symbolTheme: null,
            dailySpecialTitle: null,
            dailySpecialFocus: null
          }
        : {
            edition: seed.identity.edition,
            corpus: seed.identity.corpus,
            band: seed.identity.band,
            puzzleId: seed.identity.puzzleId,
            seconds: 100,
            mistakes: 9,
            nudgesUsed: 4,
            completedAt: "2026-07-28T08:00:00.000Z"
          };
      const durableRaw = JSON.stringify({ version: 1, entries: { [pastKey]: durablePast } });
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: route,
        storageEntries: { [fixture.resumeKey]: seed.resume, [fixture.dailyKey]: durableRaw },
        beforeLoadSource: `${storageFaultSource({ [fixture.dailyKey]: { set: "throw" } })}${saveHealthMutationProbeSource()}`,
        ...fixedOptions
      });
      const outcome = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const resumeKey = ${JSON.stringify(fixture.resumeKey)};
        const dailyKey = ${JSON.stringify(fixture.dailyKey)};
        const pools = ${fixture.game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"};
        const solveCurrent = async () => {
          const resume = JSON.parse(localStorage.getItem(resumeKey) || "null");
          const puzzle = Object.values(pools).flat().find((entry) => entry.id === resume?.puzzleId);
          if (!resume || !puzzle) throw new Error("Transactional Daily fixture has no active puzzle");
          document.getElementById("value-mode-button")?.click();
          for (let index = 0; index < resume.board.length; index += 1) {
            if (resume.board[index] !== 0) continue;
            document.querySelector('.cell[data-index="' + index + '"]')?.click();
            const digit = [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled);
            if (!digit) throw new Error("No enabled Daily solution digit for cell " + index);
            digit.click();
            await wait(0);
          }
          await wait(60);
        };
        const lastDailyCandidate = () => {
          const attempt = window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "set" && entry.key === dailyKey).at(-1);
          return attempt?.value ? JSON.parse(attempt.value) : null;
        };
        const card = () => ({
          status: document.getElementById("daily-edition-status")?.textContent.trim(),
          helper: document.getElementById("daily-result-share-text")?.textContent.trim(),
          streak: document.getElementById("daily-edition-streak")?.textContent.trim(),
          details: document.getElementById("daily-result-list")?.textContent.replace(/\\s+/g, " ").trim(),
          shareHidden: document.getElementById("share-daily-button")?.hidden,
          primary: document.getElementById("daily-edition-primary-button")?.textContent.trim()
        });
        window.__DAILY_TRANSACTION_SHARES = [];
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async (payload) => { window.__DAILY_TRANSACTION_SHARES.push(payload); }
        });

        window.__STORAGE_FAULT_LOG.length = 0;
        await solveCurrent();
        const firstLog = window.__STORAGE_FAULT_LOG.slice();
        const first = {
          raw: localStorage.getItem(dailyKey),
          candidate: lastDailyCandidate(),
          card: card(),
          localStatus: document.getElementById("local-save-status")?.textContent.trim(),
          localHidden: document.getElementById("local-save-status")?.getAttribute("aria-hidden"),
          localMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          victoryStatus: document.getElementById("victory-save-status")?.textContent.trim(),
          victoryMutations: window.__VICTORY_SAVE_STATUS_MUTATIONS,
          dailySetIndex: firstLog.findIndex((entry) => entry.operation === "set" && entry.key === dailyKey),
          resumeRemoveIndex: firstLog.findIndex((entry) => entry.operation === "remove" && entry.key === resumeKey)
        };
        document.getElementById("share-victory-button")?.click();
        await wait(40);
        document.getElementById("victory-review-button")?.click();
        await wait(40);
        document.getElementById("share-daily-button")?.click();
        await wait(40);
        first.shares = [...window.__DAILY_TRANSACTION_SHARES];
        document.getElementById("view-result-button")?.click();
        await wait(40);
        document.getElementById("victory-secondary-button")?.click();
        await wait(100);

        const todayResume = JSON.parse(localStorage.getItem(resumeKey) || "null");
        const todayIdentity = todayResume?.dailyEdition;
        const todayResultKey = todayIdentity ? todayIdentity.corpus + "|" + todayIdentity.edition + "|" + todayIdentity.band : null;
        window.__STORAGE_FAULT_LOG.length = 0;
        await solveCurrent();
        const secondLog = window.__STORAGE_FAULT_LOG.slice();
        const second = {
          raw: localStorage.getItem(dailyKey),
          candidate: lastDailyCandidate(),
          card: card(),
          todayIdentity,
          todayResultKey,
          localMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          dailySetIndex: secondLog.findIndex((entry) => entry.operation === "set" && entry.key === dailyKey),
          resumeRemoveIndex: secondLog.findIndex((entry) => entry.operation === "remove" && entry.key === resumeKey),
          statsWriteIndex: secondLog.findIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(fixture.game.name === "Sudoku" ? SUDOKU_STATS_KEY : SUGURU_STATS_KEY)})
        };
        document.getElementById("victory-review-button")?.click();
        await wait(40);
        const modeSelect = document.getElementById("mode-select");
        modeSelect.value = "classic";
        modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        document.getElementById("new-game-button")?.click();
        await wait(100);
        const offDaily = {
          card: card(),
          localStatus: document.getElementById("local-save-status")?.textContent.trim(),
          localMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          runSource: JSON.parse(localStorage.getItem(resumeKey) || "null")?.runSource
        };

        window.__STORAGE_FAULT_RULES[dailyKey].set = null;
        window.__STORAGE_FAULT_LOG.length = 0;
        document.getElementById("daily-edition-primary-button")?.click();
        await wait(100);
        await wait(2200);
        const replayResume = JSON.parse(localStorage.getItem(resumeKey) || "null");
        const replaySeconds = replayResume?.secondsElapsed;
        await solveCurrent();
        const recoveryLog = window.__STORAGE_FAULT_LOG.slice();
        const recovered = {
          raw: localStorage.getItem(dailyKey),
          card: card(),
          replaySeconds,
          localMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          dailySetAttempts: recoveryLog.filter((entry) => entry.operation === "set" && entry.key === dailyKey).length,
          dailySetIndex: recoveryLog.findIndex((entry) => entry.operation === "set" && entry.key === dailyKey),
          resumeRemoveIndex: recoveryLog.findLastIndex((entry) => entry.operation === "remove" && entry.key === resumeKey)
        };
        document.getElementById("share-victory-button")?.click();
        await wait(40);
        recovered.share = window.__DAILY_TRANSACTION_SHARES.at(-1);
        window.__STORAGE_FAULT_LOG.length = 0;
        document.getElementById("victory-new-game-button")?.click();
        await wait(100);
        await solveCurrent();
        const rejectedReplayLog = window.__STORAGE_FAULT_LOG.slice();
        recovered.rejectedReplay = {
          raw: localStorage.getItem(dailyKey),
          dailyWrites: rejectedReplayLog.filter((entry) => entry.operation === "set" && entry.key === dailyKey).length,
          victory: document.querySelector("#victory-save-status .save-health-message > span:last-child")?.textContent.trim()
        };
        document.getElementById("victory-review-button")?.click();
        await wait(40);
        modeSelect.value = "classic";
        modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        document.getElementById("new-game-button")?.click();
        await wait(100);
        recovered.active = {
          card: card(),
          localStatus: document.getElementById("local-save-status")?.textContent.trim(),
          localMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
          runSource: JSON.parse(localStorage.getItem(resumeKey) || "null")?.runSource
        };
        return { first, second, offDaily, recovered };
      })()`);

      const firstEntry = outcome.first.candidate?.entries?.[pastKey];
      const todayKey = outcome.second.todayResultKey;
      const secondPast = outcome.second.candidate?.entries?.[pastKey];
      const secondToday = todayKey ? outcome.second.candidate?.entries?.[todayKey] : null;
      const recoveredLedger = JSON.parse(outcome.recovered.raw || "null");
      const recoveredPast = recoveredLedger?.entries?.[pastKey];
      const recoveredToday = todayKey ? recoveredLedger?.entries?.[todayKey] : null;
      check(outcome.first.raw === durableRaw
        && outcome.first.candidate?.version === 1
        && Object.keys(outcome.first.candidate?.entries || {}).length === 1
        && firstEntry?.seconds < durablePast.seconds
        && firstEntry?.mistakes === 2
        && firstEntry?.completedAt === durablePast.completedAt
        && (fixture.game.name === "Sudoku" ? firstEntry?.assisted === true : firstEntry?.nudgesUsed === 2),
      `${fixture.game.name} failed faster replay keeps durable bytes unchanged and retains one complete pending record`, JSON.stringify(outcome.first));
      check(/Solved this session — not saved/.test(outcome.first.card.status || "")
        && /only in this tab and is not saved/.test(outcome.first.card.helper || "")
        && /1 day/.test(outcome.first.card.streak || "")
        && !outcome.first.card.shareHidden
        && outcome.first.localStatus === ""
        && outcome.first.localHidden === "true"
        && outcome.first.localMutations === 0
        && /Session-only: Daily result was not saved in this browser/.test(outcome.first.victoryStatus || "")
        && /Other successful saves are unchanged/.test(outcome.first.victoryStatus || "")
        && outcome.first.victoryMutations === 1
        && outcome.first.dailySetIndex >= 0
        && outcome.first.resumeRemoveIndex > outcome.first.dailySetIndex,
      `${fixture.game.name} keeps the active region muted while the result dialog discloses session-only Daily truth once`, JSON.stringify(outcome.first));
      const expectedShareKeys = fixture.game.name === "Sudoku"
        ? ["corpus", "difficulty", "edition", "game", "mode"]
        : ["corpus", "edition", "game", "level", "mode"];
      check(outcome.first.shares?.length === 2
        && outcome.first.shares.every((share) => /Session-only — not saved in this browser/.test(share.text || "") && /Saved Daily streak: 1 day/.test(share.text || ""))
        && outcome.first.shares[0].text === outcome.first.shares[1].text
        && outcome.first.shares.every((share) => {
          const url = new URL(share.url);
          return [...url.searchParams.keys()].sort().join(",") === expectedShareKeys.join(",")
            && url.searchParams.get("edition") === pastEdition
            && url.searchParams.get("corpus") === fixture.corpus;
        }),
      `${fixture.game.name} victory and Daily-card shares use the same pending result and identity-only URL`, JSON.stringify(outcome.first.shares));
      check(outcome.second.raw === durableRaw
        && outcome.second.todayIdentity?.edition === "2026-07-29"
        && Object.keys(outcome.second.candidate?.entries || {}).length === 2
        && JSON.stringify(secondPast) === JSON.stringify(firstEntry)
        && secondToday?.edition === "2026-07-29"
        && /Solved this session — not saved/.test(outcome.second.card.status || "")
        && /1 day/.test(outcome.second.card.streak || "")
        && outcome.second.dailySetIndex >= 0
        && outcome.second.resumeRemoveIndex > outcome.second.dailySetIndex
        && outcome.second.statsWriteIndex >= 0
        && outcome.second.statsWriteIndex < outcome.second.dailySetIndex,
      `${fixture.game.name} overlays unrelated pending editions and continues later completion writes after failure`, JSON.stringify(outcome.second));
      check(outcome.offDaily.runSource === "ordinary"
        && /Solved this session — not saved/.test(outcome.offDaily.card.status || "")
        && /only in this tab and is not saved/.test(outcome.offDaily.card.helper || "")
        && /open|replay/i.test(outcome.offDaily.card.primary || "")
        && /Session-only: Daily result/.test(outcome.offDaily.localStatus || "")
        && outcome.offDaily.localMutations === 1,
      `${fixture.game.name} keeps today's pending result and one Daily-domain warning available during ordinary play`, JSON.stringify(outcome.offDaily));
      check(recoveredLedger?.version === 1
        && Object.keys(recoveredLedger).sort().join(",") === "entries,version"
        && Object.keys(recoveredLedger.entries || {}).length === 2
        && JSON.stringify(recoveredPast) === JSON.stringify(firstEntry)
        && JSON.stringify(recoveredToday) === JSON.stringify(secondToday)
        && outcome.recovered.replaySeconds > secondToday?.seconds
        && outcome.recovered.dailySetAttempts === 1
        && outcome.recovered.resumeRemoveIndex > outcome.recovered.dailySetIndex
        && /Solved locally/.test(outcome.recovered.card.status || "")
        && /2 day/.test(outcome.recovered.card.streak || ""),
      `${fixture.game.name} rejected slower replay writes every pending record once without mixing metrics`, JSON.stringify(outcome.recovered));
      const expectedFields = fixture.game.name === "Sudoku"
        ? ["assisted", "band", "completedAt", "corpus", "dailySpecialFocus", "dailySpecialTitle", "edition", "medal", "mistakes", "puzzleId", "seconds", "symbolTheme", "technique"]
        : ["band", "completedAt", "corpus", "edition", "mistakes", "nudgesUsed", "puzzleId", "seconds"];
      check(Object.values(recoveredLedger.entries || {}).every((entry) => Object.keys(entry).sort().join(",") === expectedFields.sort().join(","))
        && !outcome.recovered.raw.includes("pending")
        && !outcome.recovered.raw.includes("health"),
      `${fixture.game.name} recovered Daily v1 payload contains no pending or health fields`, outcome.recovered.raw || "missing ledger");
      check(outcome.recovered.rejectedReplay.raw === outcome.recovered.raw
        && outcome.recovered.rejectedReplay.dailyWrites === 0
        && outcome.recovered.rejectedReplay.victory === "Progress saved in this browser.",
      `${fixture.game.name} rejected durable Daily replay does not claim a fresh Daily ledger write`, JSON.stringify(outcome.recovered.rejectedReplay));
      check(!/Session-only — not saved/.test(outcome.recovered.share?.text || "")
        && /2 days streak/.test(outcome.recovered.share?.text || "")
        && outcome.recovered.active.runSource === "ordinary"
        && /Solved locally/.test(outcome.recovered.active.card.status || "")
        && /When browser storage is available/.test(outcome.recovered.active.card.helper || "")
        && /Local saving restored\./.test(outcome.recovered.active.localStatus || "")
        && outcome.recovered.active.localMutations === 2,
      `${fixture.game.name} clears included pending state and announces one full recovery on active play`, JSON.stringify(outcome.recovered));
      check(runtimeErrors(client.events).length === 0, `${fixture.game.name} transactional Daily fallback has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("responsive victory dialog geometry", async () => {
    const victoryViewports = [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 500, height: 900 },
      { width: 1440, height: 1000 }
    ];
    for (const fixture of dailyRouteCases) {
      for (const viewport of victoryViewports) {
        await navigate(fixture.game, viewport, {
          query: `?game=${fixture.game.name.toLowerCase()}&${fixture.bandKey}=${fixture.band}&mode=daily&edition=2026-07-29&corpus=${fixture.corpus}`,
          fixedInstant: "2026-07-29T12:00:00.000Z",
          timezoneId: "UTC"
        });
        const creditKeys = fixture.game.name === "Sudoku"
          ? [SUDOKU_STATS_KEY, SUDOKU_DAILY_KEY, SUDOKU_WEEKLY_KEY, SUDOKU_SESSION_HISTORY_KEY, SUDOKU_RESUME_KEY]
          : [SUGURU_STATS_KEY, SUGURU_DAILY_KEY, SUGURU_JOURNEY_KEY, SUGURU_RESUME_KEY];
        const geometry = await client.evaluate(`(async () => {
          const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
          const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
          const puzzle = Object.values(${fixture.game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"}).flat().find((entry) => entry.id === resume?.puzzleId);
          document.getElementById("value-mode-button")?.click();
          for (let index = 0; index < puzzle.puzzle.length; index += 1) {
            if (puzzle.puzzle[index] !== "0") continue;
            document.querySelector('.cell[data-index="' + index + '"]')?.click();
            [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled)?.click();
            await wait(0);
          }
          await wait(30);
          const rect = (element) => {
            const value = element?.getBoundingClientRect();
            return value ? { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height } : null;
          };
          const intersects = (left, right) => Boolean(left && right && left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top);
          const overlay = document.getElementById("victory-overlay");
          const actions = document.querySelector(".victory-actions");
          const actionRect = rect(actions);
          const titleRect = rect(document.getElementById("victory-title"));
          const contentRects = ["victory-title", "victory-summary", "victory-save-status", "victory-share-card", "victory-progress-list", "victory-next-label", "victory-share-status"].map((id) => rect(document.getElementById(id)));
          const overlayRect = rect(overlay);
          const initialActiveId = document.activeElement?.id;
          const initialOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
          const actionTargets = [...actions.querySelectorAll("button")].map((button) => ({ id: button.id, ...rect(button) }));
          const victoryCard = overlay.querySelector(".victory-card");
          const victorySaveMessage = document.querySelector("#victory-save-status .save-health-message");
          const victorySaveCopy = victorySaveMessage?.lastElementChild;
          const originalSaveCopy = victorySaveCopy?.textContent || "";
          const originalRootSize = document.documentElement.style.fontSize;
          document.documentElement.style.fontSize = "200%";
          if (victorySaveCopy) {
            victorySaveCopy.textContent = "Session-only: board recovery, stats, recent solves, Daily result, Weekly path, Cage Garden, Pair Focus completion, and practice rotation were not saved in this browser. Other successful saves are unchanged. Keep this tab open. Old board recovery data could not be cleared; completed snapshots will still be ignored.";
          }
          await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
          const degradedSaveGeometry = {
            documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            cardOverflow: victoryCard.scrollWidth > victoryCard.clientWidth + 1,
            messageOverflow: victorySaveMessage.scrollWidth > victorySaveMessage.clientWidth + 1,
            overlapsActions: intersects(rect(victorySaveMessage), rect(actions)),
            containsStateWords: /Session-only:/.test(victorySaveCopy?.textContent || "") && /Old board recovery data/.test(victorySaveCopy?.textContent || "")
          };
          if (victorySaveCopy) victorySaveCopy.textContent = originalSaveCopy;
          document.documentElement.style.fontSize = originalRootSize;
          await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
          let lifecycle = null;
          if (${viewport.width !== 500}) {
            const creditKeys = ${JSON.stringify(creditKeys)};
            const creditSnapshot = () => JSON.stringify(creditKeys.map((key) => [key, localStorage.getItem(key)]));
            const creditSnapshots = [creditSnapshot()];
            const ownedSections = [".topbar", ".game-header", ".controls-row", "#focus-ribbon", ".actions-bar", "#number-pad", "#game-message", ".sidebar"]
              .map((selector) => document.querySelector(selector))
              .filter(Boolean);
            const ownedStateMatches = (inert, ariaHidden) => ownedSections.every((section) => section.inert === inert && section.getAttribute("aria-hidden") === ariaHidden);
            const dispatchKey = (key, shiftKey = false) => document.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }));
            const board = document.getElementById(${JSON.stringify(fixture.game.boardId)});
            const localSaveStatus = document.getElementById("local-save-status");
            const title = document.getElementById("victory-title");
            const dialogState = {
              visible: !overlay.hidden,
              modalOpen: document.documentElement.classList.contains("modal-open"),
              ownedMuted: ownedStateMatches(true, "true"),
              boardInert: board.inert,
              saveHealthHidden: localSaveStatus.getAttribute("aria-hidden") === "true" && localSaveStatus.inert,
              viewResultHidden: document.getElementById("view-result-button").hidden
            };
            const shareOutcomes = [];
            if (${viewport.width === 390}) {
              const shareButton = document.getElementById("share-victory-button");
              const shareStatus = document.getElementById("victory-share-status");
              const runShareOutcome = async (label, share, clipboard) => {
                Object.defineProperty(navigator, "share", { configurable: true, value: share });
                Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
                shareButton.focus({ preventScroll: true });
                shareButton.click();
                await wait(50);
                creditSnapshots.push(creditSnapshot());
                shareOutcomes.push({
                  label,
                  status: shareStatus.textContent.trim(),
                  activeId: document.activeElement?.id,
                  insideDialog: overlay.contains(shareStatus),
                  role: shareStatus.getAttribute("role"),
                  live: shareStatus.getAttribute("aria-live")
                });
              };
              await runShareOutcome("success", async () => {}, { writeText: async () => {} });
              await runShareOutcome("cancel", async () => {
                const error = new Error("cancelled");
                error.name = "AbortError";
                throw error;
              }, { writeText: async () => {} });
              await runShareOutcome("clipboard", async () => { throw new Error("native share unavailable"); }, { writeText: async () => {} });
              await runShareOutcome("failure", async () => { throw new Error("native share unavailable"); }, { writeText: async () => { throw new Error("clipboard unavailable"); } });
            }

            title.focus({ preventScroll: true });
            dispatchKey("Tab", true);
            const shiftTabId = document.activeElement?.id;
            dispatchKey("Tab");
            const tabWrapId = document.activeElement?.id;

            const reviewButton = document.getElementById("victory-review-button");
            reviewButton.focus({ preventScroll: true });
            reviewButton.click();
            await wait(50);
            creditSnapshots.push(creditSnapshot());
            const cells = [...board.querySelectorAll(".cell")];
            const padButtons = [...document.querySelectorAll("#number-pad button")];
            const inputControls = [
              document.getElementById("hint-button"),
              document.getElementById("nudge-button"),
              document.getElementById("check-button"),
              document.getElementById("erase-button"),
              document.getElementById("value-mode-button"),
              document.getElementById("note-mode-button"),
              ...padButtons
            ].filter(Boolean);
            const viewResultButton = document.getElementById("view-result-button");
            const viewResultRect = rect(viewResultButton);
            const reviewState = {
              overlayHidden: overlay.hidden,
              modalOpen: document.documentElement.classList.contains("modal-open"),
              ownedRestored: ownedStateMatches(false, "false"),
              activeId: document.activeElement?.id,
              boardInert: board.inert,
              boardDisabled: board.getAttribute("aria-disabled"),
              boardReadonly: board.getAttribute("aria-readonly"),
              boardTabIndex: board.tabIndex,
              cellsDisabled: cells.length === ${fixture.game.size * fixture.game.size} && cells.every((cell) => cell.disabled && cell.getAttribute("aria-readonly") === "true"),
              valuesReadable: cells.every((cell) => cell.textContent.trim().length > 0 && (cell.getAttribute("aria-label") || "").length > 0),
              inputDisabled: inputControls.every((control) => control.disabled),
              saveHealthHidden: localSaveStatus.getAttribute("aria-hidden") === "true" && localSaveStatus.inert,
              viewResultVisible: !viewResultButton.hidden && viewResultRect.width >= 43.5 && viewResultRect.height >= 43.5
            };

            viewResultButton.focus({ preventScroll: true });
            viewResultButton.click();
            await wait(50);
            creditSnapshots.push(creditSnapshot());
            const reopenedState = {
              visible: !overlay.hidden,
              modalOpen: document.documentElement.classList.contains("modal-open"),
              ownedMuted: ownedStateMatches(true, "true"),
              activeId: document.activeElement?.id,
              boardInert: board.inert,
              saveHealthHidden: localSaveStatus.getAttribute("aria-hidden") === "true" && localSaveStatus.inert,
              viewResultHidden: viewResultButton.hidden
            };

            dispatchKey("Escape");
            await wait(50);
            creditSnapshots.push(creditSnapshot());
            const escapedReviewState = {
              overlayHidden: overlay.hidden,
              modalOpen: document.documentElement.classList.contains("modal-open"),
              ownedRestored: ownedStateMatches(false, "false"),
              activeId: document.activeElement?.id,
              boardInert: board.inert,
              saveHealthHidden: localSaveStatus.getAttribute("aria-hidden") === "true" && localSaveStatus.inert
            };

            viewResultButton.click();
            await wait(50);
            creditSnapshots.push(creditSnapshot());
            reviewButton.click();
            await wait(50);
            creditSnapshots.push(creditSnapshot());
            const directReviewState = {
              overlayHidden: overlay.hidden,
              activeId: document.activeElement?.id,
              boardInert: board.inert,
              boardReadonly: board.getAttribute("aria-readonly"),
              saveHealthHidden: localSaveStatus.getAttribute("aria-hidden") === "true" && localSaveStatus.inert
            };

            let newRunState = null;
            if (${viewport.width === 390}) {
              document.getElementById("new-game-button").click();
              await wait(80);
              newRunState = {
                overlayHidden: overlay.hidden,
                modalOpen: document.documentElement.classList.contains("modal-open"),
                viewResultHidden: viewResultButton.hidden,
                boardReadonly: board.getAttribute("aria-readonly"),
                boardInert: board.inert,
                saveHealthExposed: localSaveStatus.getAttribute("aria-hidden") === "false" && !localSaveStatus.inert,
                editableCellCount: [...board.querySelectorAll(".cell")].filter((cell) => !cell.disabled).length
              };
            }

            lifecycle = {
              dialogState,
              shareOutcomes,
              shiftTabId,
              tabWrapId,
              reviewState,
              reopenedState,
              escapedReviewState,
              directReviewState,
              creditStable: creditSnapshots.every((snapshot) => snapshot === creditSnapshots[0]),
              newRunState
            };
          }
          return {
            overlayPosition: getComputedStyle(overlay).position,
            actionPosition: getComputedStyle(actions).position,
            overlayRect,
            titleRect,
            viewport: { width: innerWidth, height: innerHeight },
            intersectsContent: contentRects.some((content) => intersects(actionRect, content)),
            activeId: initialActiveId,
            overflow: initialOverflow,
            actionRect,
            actionTargets,
            contentRects,
            victorySaveText: document.querySelector("#victory-save-status .save-health-message > span:last-child")?.textContent.trim(),
            victorySaveLive: document.getElementById("victory-save-status")?.hasAttribute("aria-live") || document.getElementById("victory-save-status")?.hasAttribute("role"),
            degradedSaveGeometry,
            lifecycle
          };
        })()`);
        const fillsViewport = Math.abs(geometry.overlayRect.left) <= 1
          && Math.abs(geometry.overlayRect.top) <= 1
          && Math.abs(geometry.overlayRect.width - geometry.viewport.width) <= 1
          && Math.abs(geometry.overlayRect.height - geometry.viewport.height) <= 1;
        const titleVisible = geometry.titleRect.top >= 0 && geometry.titleRect.bottom <= geometry.viewport.height;
        const label = `${fixture.game.name} ${viewport.width}px victory`;
        check(geometry.overlayPosition === "fixed" && geometry.actionPosition === "static" && fillsViewport, `${label} portals to a viewport dialog with non-sticky actions`, JSON.stringify(geometry));
        check(!geometry.intersectsContent && !geometry.overflow && titleVisible, `${label} keeps title and result content visible without action overlap`, JSON.stringify(geometry));
        check(geometry.activeId === "victory-title", `${label} focus starts at the visible title`, JSON.stringify(geometry));
        check(geometry.victorySaveText === "Daily result and progress saved in this browser." && !geometry.victorySaveLive, `${label} exposes one healthy non-live Daily save claim`, JSON.stringify(geometry));
        check(!geometry.degradedSaveGeometry.documentOverflow && !geometry.degradedSaveGeometry.cardOverflow && !geometry.degradedSaveGeometry.messageOverflow && !geometry.degradedSaveGeometry.overlapsActions && geometry.degradedSaveGeometry.containsStateWords, `${label} contains the longest degraded save disclosure at 200% text without horizontal overflow or action overlap`, JSON.stringify(geometry.degradedSaveGeometry));
        check(geometry.actionTargets.every((target) => target.width >= 43.5 && target.height >= 43.5), `${label} keeps every result action at least 44px`, JSON.stringify(geometry.actionTargets));
        if (geometry.lifecycle) {
          const lifecycle = geometry.lifecycle;
          check(lifecycle.dialogState.visible && lifecycle.dialogState.modalOpen && lifecycle.dialogState.ownedMuted && lifecycle.dialogState.boardInert && lifecycle.dialogState.saveHealthHidden && lifecycle.dialogState.viewResultHidden, `${label} result dialog owns modal inertness and hides its review-only trigger`, JSON.stringify(lifecycle.dialogState));
          if (viewport.width === 390) {
            check(
              lifecycle.shareOutcomes.map((outcome) => outcome.status).join("|") === "Victory result shared.|Sharing was cancelled.|Victory result copied to clipboard.|Sharing is unavailable in this browser."
                && lifecycle.shareOutcomes.every((outcome) => outcome.activeId === "share-victory-button" && outcome.insideDialog && outcome.role === "status" && outcome.live === "polite"),
              `${label} announces success, cancellation, clipboard fallback, and failure inside the dialog without moving Share focus`,
              JSON.stringify(lifecycle.shareOutcomes)
            );
          }
          check(lifecycle.shiftTabId === "share-victory-button" && lifecycle.tabWrapId === "victory-new-game-button", `${label} focus trap wraps backward from the title and forward from the last action`, JSON.stringify(lifecycle));
          check(
            lifecycle.reviewState.overlayHidden
              && !lifecycle.reviewState.modalOpen
              && lifecycle.reviewState.ownedRestored
              && lifecycle.reviewState.activeId === fixture.game.boardId
              && !lifecycle.reviewState.boardInert
              && lifecycle.reviewState.boardDisabled === "false"
              && lifecycle.reviewState.boardReadonly === "true"
              && lifecycle.reviewState.boardTabIndex === 0
              && lifecycle.reviewState.cellsDisabled
              && lifecycle.reviewState.valuesReadable
              && lifecycle.reviewState.inputDisabled
              && lifecycle.reviewState.saveHealthHidden
              && lifecycle.reviewState.viewResultVisible,
            `${label} review restores the page and exposes a focusable read-only solved grid`,
            JSON.stringify(lifecycle.reviewState)
          );
          check(lifecycle.reopenedState.visible && lifecycle.reopenedState.modalOpen && lifecycle.reopenedState.ownedMuted && lifecycle.reopenedState.activeId === "victory-title" && lifecycle.reopenedState.boardInert && lifecycle.reopenedState.saveHealthHidden && lifecycle.reopenedState.viewResultHidden, `${label} View result restores dialog ownership and title-first focus`, JSON.stringify(lifecycle.reopenedState));
          check(lifecycle.escapedReviewState.overlayHidden && !lifecycle.escapedReviewState.modalOpen && lifecycle.escapedReviewState.ownedRestored && lifecycle.escapedReviewState.activeId === fixture.game.boardId && !lifecycle.escapedReviewState.boardInert && lifecycle.escapedReviewState.saveHealthHidden, `${label} Escape returns to the read-only board review`, JSON.stringify(lifecycle.escapedReviewState));
          check(lifecycle.directReviewState.overlayHidden && lifecycle.directReviewState.activeId === fixture.game.boardId && !lifecycle.directReviewState.boardInert && lifecycle.directReviewState.boardReadonly === "true" && lifecycle.directReviewState.saveHealthHidden, `${label} supports repeated explicit review transitions`, JSON.stringify(lifecycle.directReviewState));
          check(lifecycle.creditStable, `${label} review, reopen, and Escape cycles leave every credit store byte-identical`, JSON.stringify(lifecycle));
          if (viewport.width === 390) {
            check(lifecycle.newRunState?.overlayHidden && !lifecycle.newRunState?.modalOpen && lifecycle.newRunState?.viewResultHidden && lifecycle.newRunState?.boardReadonly === "false" && !lifecycle.newRunState?.boardInert && lifecycle.newRunState?.saveHealthExposed && lifecycle.newRunState?.editableCellCount > 0, `${label} named launch exits review into one editable playing state`, JSON.stringify(lifecycle.newRunState));
          }
        }
      }
    }
  });

  await runScenario("Night Symbol Daily victory contrast", async () => {
    await navigate(sudoku, { width: 390, height: 844 }, {
      query: "?game=sudoku&difficulty=medium&mode=daily&edition=2026-07-29&corpus=sudoku-daily-v1",
      storageEntries: { "sudoku-sakura-theme": "night" },
      fixedInstant: "2026-07-29T12:00:00.000Z",
      timezoneId: "UTC"
    });
    const contrast = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      const puzzle = Object.values(window.SUDOKU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
      document.getElementById("value-mode-button")?.click();
      for (let index = 0; index < puzzle.puzzle.length; index += 1) {
        if (puzzle.puzzle[index] !== "0") continue;
        document.querySelector('.cell[data-index="' + index + '"]')?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled)?.click();
        await wait(0);
      }
      await wait(30);
      const parse = (value) => (value.match(/[\\d.]+/g) || []).map(Number);
      const luminance = ([r, g, b]) => {
        const channels = [r, g, b].map((part) => {
          const normalized = part / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const ratio = (foreground, background) => {
        const left = luminance(parse(foreground));
        const right = luminance(parse(background));
        return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
      };
      const card = document.getElementById("victory-share-card");
      const title = document.getElementById("victory-share-title");
      const medal = document.getElementById("victory-share-medal");
      const cardStyle = getComputedStyle(card);
      const actionStyle = getComputedStyle(document.querySelector(".victory-actions"));
      return {
        bodyTheme: document.body.dataset.theme,
        special: resume?.dailyEdition?.edition,
        cardBackground: cardStyle.backgroundColor,
        cardAlpha: parse(cardStyle.backgroundColor)[3] ?? 1,
        titleContrast: ratio(getComputedStyle(title).color, cardStyle.backgroundColor),
        medalContrast: ratio(getComputedStyle(medal).color, cardStyle.backgroundColor),
        titleAlpha: parse(getComputedStyle(title).color)[3] ?? 1,
        medalAlpha: parse(getComputedStyle(medal).color)[3] ?? 1,
        actionBackground: actionStyle.backgroundColor,
        actionAlpha: parse(actionStyle.backgroundColor)[3] ?? 1
      };
    })()`);
    check(contrast.bodyTheme === "night" && contrast.special === "2026-07-29", "Night contrast fixture exercises the dated Symbol Daily", JSON.stringify(contrast));
    check(contrast.cardAlpha === 1 && contrast.titleAlpha === 1 && contrast.medalAlpha === 1 && contrast.titleContrast >= 4.5 && contrast.medalContrast >= 4.5, "Night Symbol Daily share card uses opaque text with normal-text contrast", JSON.stringify(contrast));
    check(contrast.actionAlpha === 1, "Night victory action footer uses an opaque theme surface", JSON.stringify(contrast));
  });

  await runScenario("Weekly Daily-mode credit isolation", async () => {
    const rotationFixture = JSON.stringify({ version: 1, bands: { "sudoku|easy": { inventory: "fixture", remaining: ["garden-path"], last: "paper-lantern" } } });
    await navigate(sudoku, { width: 390, height: 844 }, {
      storageEntries: { [PRACTICE_ROTATION_KEY]: rotationFixture },
      fixedInstant: "2026-01-01T12:00:00.000Z",
      timezoneId: "UTC",
      beforeLoadSource: practiceWriteProbeSource()
    });
    const weekly = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      window.__WEEKLY_SHARED_PAYLOAD = null;
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (payload) => { window.__WEEKLY_SHARED_PAYLOAD = payload; }
      });
      document.getElementById("weekly-challenge-button")?.click();
      await wait(30);
      const started = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      const puzzle = Object.values(window.SUDOKU_PUZZLES).flat().find((entry) => entry.id === started?.puzzleId);
      document.getElementById("value-mode-button")?.click();
      for (let index = 0; index < puzzle.puzzle.length; index += 1) {
        if (puzzle.puzzle[index] !== "0") continue;
        document.querySelector('.cell[data-index="' + index + '"]')?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled)?.click();
        await wait(0);
      }
      await wait(30);
      document.getElementById("share-victory-button")?.click();
      await wait(20);
      return {
        startedMode: started?.mode,
        weeklyStepId: started?.currentWeeklyStepId,
        runSource: started?.runSource,
        status: document.getElementById("status-mode-label")?.textContent.trim(),
        legacy: JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_LEGACY_DAILY_KEY)}) || "null"),
        verified: JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_DAILY_KEY)}) || "null"),
        rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
        rotationWrites: window.__PRACTICE_ROTATION_WRITES,
        shared: window.__WEEKLY_SHARED_PAYLOAD
      };
    })()`);
    check(weekly.startedMode === "daily" && weekly.weeklyStepId, "Weekly isolation fixture exercises a Daily-mode Weekly step", JSON.stringify(weekly));
    check(weekly.runSource === "weekly" && weekly.status === "Weekly path", "Daily-mode Weekly step retains Weekly provenance and status", JSON.stringify(weekly));
    check((!weekly.legacy || Object.keys(weekly.legacy).length === 0) && (!weekly.verified || Object.keys(weekly.verified.entries || {}).length === 0), "Daily-mode Weekly completion earns no Daily result", JSON.stringify(weekly));
    check(weekly.rotation === rotationFixture && weekly.rotationWrites === 0, "Weekly forced launch leaves practice rotation storage byte-identical", JSON.stringify(weekly));
    const weeklyShareUrl = new URL(weekly.shared?.url || "http://invalid.local/");
    check(weeklyShareUrl.searchParams.get("mode") !== "daily" && !weeklyShareUrl.searchParams.has("edition") && !weeklyShareUrl.searchParams.has("corpus"), "Daily-mode Weekly share cannot manufacture a Daily edition link", weekly.shared?.url || "missing share URL");
  });

  await runScenario("Weekly and Cage Garden session completion", async () => {
    const solveActiveBoard = async (game, resumeKey, poolExpression) => client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(resumeKey)}) || "null");
      const puzzle = Object.values(${poolExpression}).flat().find((entry) => entry.id === resume?.puzzleId);
      if (!resume || !puzzle) throw new Error("Session-progress fixture has no active puzzle");
      document.getElementById("value-mode-button")?.click();
      for (let index = 0; index < puzzle.puzzle.length; index += 1) {
        if (puzzle.puzzle[index] !== "0") continue;
        document.querySelector('.cell[data-index="' + index + '"]')?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled)?.click();
        await wait(0);
      }
      await wait(60);
      return true;
    })()`);

    await navigate(sudoku, { width: 390, height: 844 }, {
      fixedInstant: "2026-01-01T12:00:00.000Z",
      timezoneId: "UTC",
      beforeLoadSource: `${storageFaultSource({ [SUDOKU_WEEKLY_KEY]: { set: "throw" } })}${saveHealthMutationProbeSource()}`
    });
    const weeklyFallback = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      window.__STORAGE_FAULT_LOG.length = 0;
      document.getElementById("weekly-challenge-button")?.click();
      await wait(50);
      window.__LOCAL_SAVE_STATUS_MUTATIONS = 0;
      return JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
    })()`);
    await solveActiveBoard(sudoku, SUDOKU_RESUME_KEY, "window.SUDOKU_PUZZLES");
    const weeklyFailed = await client.evaluate(`(() => {
      const log = window.__STORAGE_FAULT_LOG.slice();
      const attempts = log.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUDOKU_WEEKLY_KEY)});
      const candidate = attempts.at(-1)?.value ? JSON.parse(attempts.at(-1).value) : null;
      const completedText = [...document.querySelectorAll("#weekly-challenge-steps .achievement-item span")].map((node) => node.textContent.trim()).find((value) => value.startsWith("Complete"));
      return {
        candidate,
        stored: localStorage.getItem(${JSON.stringify(SUDOKU_WEEKLY_KEY)}),
        writeAttempts: attempts.length,
        completedText,
        nextLabel: document.getElementById("weekly-challenge-button")?.textContent.trim(),
        victory: document.querySelector("#victory-save-status .save-health-message > span:last-child")?.textContent.trim(),
        victoryMutations: window.__VICTORY_SAVE_STATUS_MUTATIONS,
        localStatus: document.getElementById("local-save-status")?.textContent.trim(),
        localHidden: document.getElementById("local-save-status")?.getAttribute("aria-hidden"),
        localMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
        daily: localStorage.getItem(${JSON.stringify(SUDOKU_DAILY_KEY)}),
        finalResumeSet: log.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUDOKU_RESUME_KEY)}),
        statsSet: log.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUDOKU_STATS_KEY)}),
        historySet: log.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUDOKU_SESSION_HISTORY_KEY)}),
        weeklySet: log.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUDOKU_WEEKLY_KEY)}),
        resumeRemove: log.findLastIndex((entry) => entry.operation === "remove" && entry.key === ${JSON.stringify(SUDOKU_RESUME_KEY)})
      };
    })()`);
    const weeklyEntries = Object.values(weeklyFailed.candidate || {});
    const weeklyStep = weeklyEntries[0] ? Object.values(weeklyEntries[0].completedSteps || {})[0] : null;
    check(weeklyFallback?.runSource === "weekly" && weeklyFailed.stored === null && weeklyFailed.writeAttempts === 2, "Weekly valid launch and completion each retry the pending full ledger", JSON.stringify({ weeklyFallback, weeklyFailed }));
    check(weeklyFailed.completedText?.startsWith("Complete this session in") && /Play /.test(weeklyFailed.nextLabel || ""), "Weekly failed completion remains unlocked and names only the affected item as session-only", JSON.stringify(weeklyFailed));
    check(/Session-only: Weekly path was not saved/.test(weeklyFailed.victory || "") && /Other successful saves are unchanged/.test(weeklyFailed.victory || "") && weeklyFailed.victoryMutations === 1 && /Session-only: Weekly path/.test(weeklyFailed.localStatus || "") && weeklyFailed.localHidden === "true" && weeklyFailed.localMutations === 0, "Weekly completion leaves the existing active warning muted and discloses once in the non-live victory description", JSON.stringify(weeklyFailed));
    check(weeklyFailed.finalResumeSet < weeklyFailed.statsSet && weeklyFailed.statsSet < weeklyFailed.historySet && weeklyFailed.historySet < weeklyFailed.weeklySet && weeklyFailed.weeklySet < weeklyFailed.resumeRemove, "Sudoku completion attempts every domain in fixed order and removes resume last after Weekly failure", JSON.stringify(weeklyFailed));
    check(weeklyFailed.daily === null && weeklyStep && Object.keys(weeklyEntries[0]).sort().join(",") === "completedSteps,pathId" && Object.keys(weeklyStep).sort().join(",") === "date,difficulty,mistakes,mode,time" && !JSON.stringify(weeklyFailed.candidate).includes("pending") && !JSON.stringify(weeklyFailed.candidate).includes("health"), "Weekly session fallback preserves the exact v1 payload and earns no Daily credit", JSON.stringify(weeklyFailed.candidate));

    const weeklyRecovered = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      window.__STORAGE_FAULT_RULES[${JSON.stringify(SUDOKU_WEEKLY_KEY)}].set = null;
      window.__STORAGE_FAULT_LOG.length = 0;
      document.getElementById("victory-review-button")?.click();
      await wait(30);
      document.getElementById("weekly-challenge-button")?.click();
      await wait(100);
      const log = window.__STORAGE_FAULT_LOG.slice();
      return {
        stored: JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_WEEKLY_KEY)}) || "null"),
        writes: log.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUDOKU_WEEKLY_KEY)}).length,
        completedText: [...document.querySelectorAll("#weekly-challenge-steps .achievement-item span")].map((node) => node.textContent.trim()).find((value) => value.startsWith("Complete")),
        status: document.getElementById("local-save-status")?.textContent.trim(),
        resume: JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null")
      };
    })()`);
    check(weeklyRecovered.writes === 1 && JSON.stringify(weeklyRecovered.stored) === JSON.stringify(weeklyFailed.candidate) && weeklyRecovered.completedText?.startsWith("Complete in") && !weeklyRecovered.completedText?.includes("this session"), "Weekly next-step launch persists the complete pending ledger once without replacing first metrics", JSON.stringify(weeklyRecovered));
    check(/Local saving restored/.test(weeklyRecovered.status || "") && weeklyRecovered.resume?.runSource === "weekly" && weeklyRecovered.resume?.currentWeeklyStepId !== weeklyFallback?.currentWeeklyStepId, "Weekly recovery announces once on the newly active next step", JSON.stringify(weeklyRecovered));

    await navigate(suguru, { width: 390, height: 844 }, {
      beforeLoadSource: `${storageFaultSource({ [SUGURU_JOURNEY_KEY]: { set: "throw" } })}${saveHealthMutationProbeSource()}`
    });
    await client.evaluate(`window.__STORAGE_FAULT_LOG.length = 0`);
    await solveActiveBoard(suguru, SUGURU_RESUME_KEY, "window.SUGURU_PUZZLES");
    const cageFailed = await client.evaluate(`(() => {
      const log = window.__STORAGE_FAULT_LOG.slice();
      const attempts = log.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUGURU_JOURNEY_KEY)});
      return {
        candidate: attempts.at(-1)?.value ? JSON.parse(attempts.at(-1).value) : null,
        stored: localStorage.getItem(${JSON.stringify(SUGURU_JOURNEY_KEY)}),
        writes: attempts.length,
        completedLabel: document.querySelector('[data-step-id="garden-gate"] strong')?.textContent.trim(),
        nextState: document.querySelector('[data-step-id="lantern-walk"]')?.dataset.stepState,
        victory: document.querySelector("#victory-save-status .save-health-message > span:last-child")?.textContent.trim(),
        victoryMutations: window.__VICTORY_SAVE_STATUS_MUTATIONS,
        localStatus: document.getElementById("local-save-status")?.textContent.trim(),
        localMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
        daily: localStorage.getItem(${JSON.stringify(SUGURU_DAILY_KEY)}),
        finalResumeSet: log.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUGURU_RESUME_KEY)}),
        statsSet: log.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUGURU_STATS_KEY)}),
        cageSet: log.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUGURU_JOURNEY_KEY)}),
        resumeRemove: log.findLastIndex((entry) => entry.operation === "remove" && entry.key === ${JSON.stringify(SUGURU_RESUME_KEY)})
      };
    })()`);
    const cageStep = cageFailed.candidate?.completedSteps?.["garden-gate"];
    check(cageFailed.stored === null && cageFailed.writes === 1 && cageFailed.completedLabel?.endsWith("Complete this session") && cageFailed.nextState === "ready", "Cage Garden failure keeps current-tab completion while the newly unlocked step remains Ready", JSON.stringify(cageFailed));
    check(/Session-only: Cage Garden was not saved/.test(cageFailed.victory || "") && /Other successful saves are unchanged/.test(cageFailed.victory || "") && cageFailed.victoryMutations === 1 && cageFailed.localStatus === "" && cageFailed.localMutations === 0, "Cage Garden failure is disclosed once by victory while the active region stays muted", JSON.stringify(cageFailed));
    check(cageFailed.finalResumeSet < cageFailed.statsSet && cageFailed.statsSet < cageFailed.cageSet && cageFailed.cageSet < cageFailed.resumeRemove, "Suguru completion continues after Cage Garden failure and removes resume last", JSON.stringify(cageFailed));
    check(cageFailed.daily === null && cageFailed.candidate?.version === 1 && cageFailed.candidate?.journeyId === "cage-garden-v1" && Object.keys(cageStep || {}).sort().join(",") === "completedAt,level,mistakes,mode,nudgesUsed,puzzleId,seconds" && !JSON.stringify(cageFailed.candidate).includes("pending") && !JSON.stringify(cageFailed.candidate).includes("health"), "Cage Garden session fallback preserves the exact v1 payload and earns no Daily credit", JSON.stringify(cageFailed.candidate));

    const cageRecovered = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      window.__STORAGE_FAULT_RULES[${JSON.stringify(SUGURU_JOURNEY_KEY)}].set = null;
      window.__STORAGE_FAULT_LOG.length = 0;
      document.getElementById("victory-new-game-button")?.click();
      await wait(100);
      const log = window.__STORAGE_FAULT_LOG.slice();
      return {
        stored: JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_JOURNEY_KEY)}) || "null"),
        writes: log.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUGURU_JOURNEY_KEY)}).length,
        completedLabel: document.querySelector('[data-step-id="garden-gate"] strong')?.textContent.trim(),
        activeState: document.querySelector('[data-step-id="lantern-walk"]')?.dataset.stepState,
        status: document.getElementById("local-save-status")?.textContent.trim(),
        resume: JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null")
      };
    })()`);
    check(cageRecovered.writes === 1 && JSON.stringify(cageRecovered.stored) === JSON.stringify(cageFailed.candidate) && cageRecovered.completedLabel?.endsWith("Complete") && !cageRecovered.completedLabel?.includes("this session"), "Cage Garden next-step launch persists the full pending ledger once without replacing first metrics", JSON.stringify(cageRecovered));
    check(/Local saving restored/.test(cageRecovered.status || "") && cageRecovered.activeState === "active" && cageRecovered.resume?.journeyStepId === "lantern-walk", "Cage Garden recovery announces once after an explicit launch changes Ready to Active", JSON.stringify(cageRecovered));
    check(runtimeErrors(client.events).length === 0, "Weekly and Cage Garden session fallback has no runtime exception", runtimeErrors(client.events).join(" | "));
  });

  await runScenario("verified Daily streak normalization", async () => {
    const entry = (edition, band, puzzleId) => ({ edition, corpus: "sudoku-daily-v1", band, puzzleId, seconds: 120, mistakes: 0, assisted: false, completedAt: `${edition}T12:00:00.000Z` });
    const ledger = {
      version: 1,
      entries: {
        "sudoku-daily-v1|2026-07-27|easy": entry("2026-07-27", "easy", "easy-garden-path-b-r2"),
        "sudoku-daily-v1|2026-07-28|easy": entry("2026-07-28", "easy", "easy-garden-path-c-r0"),
        "sudoku-daily-v1|2026-07-28|medium": entry("2026-07-28", "medium", "medium-paper-lantern-a-r1")
      }
    };
    await navigate(sudoku, { width: 390, height: 844 }, {
      query: "?game=sudoku&difficulty=easy&mode=daily&edition=2026-07-29&corpus=sudoku-daily-v1",
      storageEntries: { [SUDOKU_DAILY_KEY]: JSON.stringify(ledger) },
      fixedInstant: "2026-07-29T12:00:00.000Z",
      timezoneId: "UTC"
    });
    const streak = await client.evaluate(`document.getElementById("daily-edition-streak")?.textContent.trim()`);
    check(streak?.includes("2 day"), "Daily streak deduplicates same-day bands and may end yesterday", streak || "missing streak");

    await navigate(suguru, { width: 390, height: 844 }, {
      query: "?game=suguru&level=size5-easy&mode=daily",
      storageEntries: { [SUGURU_DAILY_KEY]: "[]" },
      fixedInstant: "2026-07-29T12:00:00.000Z",
      timezoneId: "UTC"
    });
    const malformed = await client.evaluate(`({
      streak: document.getElementById("daily-edition-streak")?.textContent.trim(),
      errors: ${JSON.stringify([])}
    })`);
    check(malformed.streak?.includes("0 day"), "Malformed Suguru Daily ledger normalizes safely to an empty streak", JSON.stringify(malformed));
    check(runtimeErrors(client.events).length === 0, "Malformed verified Daily ledger has no runtime exception", runtimeErrors(client.events).join(" | "));

    const unsafeNudgeLedger = {
      version: 1,
      entries: {
        "suguru-daily-v1|2026-07-29|size5-easy": {
          edition: "2026-07-29",
          corpus: "suguru-daily-v1",
          band: "size5-easy",
          puzzleId: "suguru-size5-garden-path",
          seconds: 120,
          mistakes: 0,
          nudgesUsed: Number.MAX_SAFE_INTEGER + 1,
          completedAt: "2026-07-29T12:00:00.000Z"
        }
      }
    };
    await navigate(suguru, { width: 390, height: 844 }, {
      query: "?game=suguru&level=size5-easy&mode=classic",
      storageEntries: { [SUGURU_DAILY_KEY]: JSON.stringify(unsafeNudgeLedger) },
      fixedInstant: "2026-07-29T12:00:00.000Z",
      timezoneId: "UTC"
    });
    const normalizedNudge = await client.evaluate(`({
      text: document.getElementById("daily-edition-status")?.textContent.trim(),
      childCount: document.getElementById("daily-edition-status")?.childElementCount
    })`);
    check(normalizedNudge.text?.includes("0 nudges") && normalizedNudge.childCount === 0, "Suguru Daily renders an unsafe persisted Nudge count as zero through textContent", JSON.stringify(normalizedNudge));
  });

  await runScenario("expanded content and atomic practice rotation", async () => {
    for (const game of [sudoku, suguru]) {
      await navigate(game, { width: 390, height: 844 }, { beforeLoadSource: practiceWriteProbeSource() });
      const content = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const isSudoku = ${game.name === "Sudoku"};
        const pools = isSudoku ? window.SUDOKU_PUZZLES : window.SUGURU_PUZZLES;
        const entries = Object.values(pools).flat();
        const generated = entries.filter((entry) => entry.origin?.kind === "first-party-generated");
        const band = isSudoku ? "easy" : "size5-easy";
        const resumeKey = isSudoku ? ${JSON.stringify(SUDOKU_RESUME_KEY)} : ${JSON.stringify(SUGURU_RESUME_KEY)};
        const groupField = isSudoku ? "familyId" : "layoutFamilyId";
        const pool = pools[band].filter((entry) => entry.selectable !== false);
        const groupCount = new Set(pool.map((entry) => entry[groupField])).size;
        const initialRotation = localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)});
        const initialWrites = window.__PRACTICE_ROTATION_WRITES;
        const capture = () => {
          const saved = JSON.parse(localStorage.getItem(resumeKey) || "null");
          const puzzle = entries.find((entry) => entry.id === saved?.puzzleId);
          return {
            id: saved?.puzzleId || null,
            group: puzzle?.[groupField] || null,
            generated: puzzle?.origin?.kind === "first-party-generated",
            facts: document.getElementById("board-puzzle-facts")?.textContent.replace(/\\s+/g, " ").trim()
          };
        };
        const played = [];
        for (let index = 0; index < groupCount; index += 1) {
          document.getElementById("new-game-button").click();
          await wait(15);
          played.push(capture());
        }
        document.getElementById("new-game-button").click();
        await wait(15);
        const boundaryPuzzle = capture();
        const branchBeforeDaily = localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)});
        const writesBeforeDaily = window.__PRACTICE_ROTATION_WRITES;
        const modeSelect = document.getElementById("mode-select");
        modeSelect.value = "daily";
        modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        document.getElementById("new-game-button").click();
        await wait(20);
        const dailyResume = JSON.parse(localStorage.getItem(resumeKey) || "null");
        return {
          total: entries.length,
          generated: generated.length,
          generatedSelectable: generated.filter((entry) => entry.selectable !== false).length,
          generatedProfiled: generated.every((entry) => entry.logicProfile?.version === 1 && (isSudoku ? [2, 3].includes(entry.origin?.generatorVersion) : entry.origin?.generatorVersion === 2)),
          generatedVersions: Object.fromEntries([...new Set(generated.map((entry) => entry.origin?.generatorVersion))].sort().map((version) => [version, generated.filter((entry) => entry.origin?.generatorVersion === version).length])),
          generatedPlayed: played.filter((entry) => entry.generated).map((entry) => entry.id),
          generatedFacts: played.filter((entry) => entry.generated).map((entry) => entry.facts),
          structuralGroups: new Set(entries.map((entry) => entry[groupField])).size,
          groupCount,
          firstCycleGroups: played.map((entry) => entry.group),
          boundaryPuzzle,
          initialRotation,
          initialWrites,
          writesBeforeDaily,
          branchBeforeDaily,
          branchAfterDaily: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
          writesAfterDaily: window.__PRACTICE_ROTATION_WRITES,
          dailyRunSource: dailyResume?.runSource,
          persistedBranch: JSON.parse(branchBeforeDaily || "null")?.bands?.[(isSudoku ? "sudoku" : "suguru") + "|" + band] || null,
          weeklyCount: window.WeeklyEditions?.validateRegistry(window.SUDOKU_PUZZLES).memberCount || null
        };
      })()`);
      const expected = game.name === "Sudoku" ? { total: 288, generated: 126, groups: 32, versions: { 2: 36, 3: 90 } } : { total: 26, generated: 7, groups: 4, versions: { 2: 7 } };
      check(content.total === expected.total && content.generated === expected.generated && JSON.stringify(content.generatedVersions) === JSON.stringify(expected.versions), `${game.name} exposes expanded versioned first-party inventory`, JSON.stringify(content));
      check(content.structuralGroups === expected.groups && content.generatedProfiled, `${game.name} exposes stable structural/profile metadata`, JSON.stringify(content));
      check(content.initialRotation === null && content.initialWrites === 0, `${game.name} bare startup does not commit practice rotation`, JSON.stringify(content));
      check(new Set(content.firstCycleGroups).size === content.groupCount && content.firstCycleGroups.every(Boolean), `${game.name} serves every selectable structural group before reuse`, JSON.stringify(content));
      check(content.firstCycleGroups.at(-1) !== content.boundaryPuzzle.group, `${game.name} persisted last group prevents a shuffle-boundary repeat`, JSON.stringify(content));
      check(content.writesBeforeDaily === content.groupCount + 1 && content.persistedBranch?.last === content.boundaryPuzzle.group, `${game.name} named practice launches each commit exactly one bag update`, JSON.stringify(content));
      check(content.generatedSelectable === expected.generated && content.generatedPlayed.length > 0, `${game.name} rotates enabled generated content through its structural group`, JSON.stringify(content));
      check(content.generatedFacts.length > 0 && content.generatedFacts.every((facts) => /steps/.test(facts || "") && !/Logic \d|Target undefined/.test(facts || "")), `${game.name} generated boards render capability workload instead of opaque scores or unsupported timing`, JSON.stringify(content.generatedFacts));
      check(content.branchAfterDaily === content.branchBeforeDaily && content.writesAfterDaily === content.writesBeforeDaily && content.dailyRunSource === "daily-edition", `${game.name} Daily launch leaves practice rotation byte-identical`, JSON.stringify(content));
      if (game.name === "Sudoku") check(content.weeklyCount === 162, "Expanded Sudoku registry preserves frozen Weekly v1 membership", JSON.stringify(content));
      check(runtimeErrors(client.events).length === 0, `${game.name} atomic rotation has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }

    await navigate(sudoku, { width: 390, height: 844 }, { query: "?game=sudoku&difficulty=easy&mode=classic" });
    const v3RollbackSeed = await client.evaluate(`(() => {
      const familyId = "easy-morning-koi";
      const puzzle = window.SUDOKU_PUZZLES.easy.find((entry) => entry.familyId === familyId && entry.transformId === "a-r0");
      const current = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      const board = puzzle.puzzle.split("").map(Number);
      const resume = {
        ...current,
        version: 2,
        gameId: "sudoku",
        runSource: "ordinary",
        difficulty: "easy",
        mode: "classic",
        puzzleId: puzzle.id,
        board,
        notes: Array.from({ length: 81 }, () => []),
        selectedIndex: board.findIndex((value) => value === 0),
        mistakes: 0,
        hintsUsed: 0,
        hintCountedKeys: [],
        checksUsed: 0,
        secondsElapsed: 12,
        paused: false,
        pauseReason: null
      };
      delete resume.dailyEdition;
      delete resume.currentWeeklyStepId;
      delete resume.currentWeeklyPathId;
      delete resume.currentWeeklyWeekKey;
      delete resume.focusLaunchId;
      const groupIds = [...new Set(window.SUDOKU_PUZZLES.easy.filter((entry) => entry.selectable !== false).map((entry) => entry.familyId))];
      const hardBranch = { inventory: "hard-sentinel", remaining: ["hard-ink-maze"], last: "hard-thunder-gate" };
      const rotation = {
        version: 1,
        bands: {
          "sudoku|easy": { inventory: window.PracticeSelection.getInventorySignature(groupIds), remaining: [familyId, "easy-bamboo-window"], last: null },
          "sudoku|hard": hardBranch
        }
      };
      return {
        familyId,
        puzzleId: puzzle.id,
        resume: JSON.stringify(resume),
        board: JSON.stringify(board),
        rotation: JSON.stringify(rotation),
        oldInventory: rotation.bands["sudoku|easy"].inventory,
        hardBranch: JSON.stringify(hardBranch),
        contentBytes: JSON.stringify({ puzzle: puzzle.puzzle, solution: puzzle.solution, logicProfile: puzzle.logicProfile, origin: puzzle.origin })
      };
    })()`);
    await navigate(sudoku, { width: 390, height: 844 }, {
      query: "?game=sudoku&difficulty=easy&mode=classic",
      storageEntries: { [SUDOKU_RESUME_KEY]: v3RollbackSeed.resume, [PRACTICE_ROTATION_KEY]: v3RollbackSeed.rotation },
      beforeLoadSource: disableLibraryGroupSource("SUDOKU_PUZZLES", "familyId", v3RollbackSeed.familyId)
    });
    const v3Rollback = await client.evaluate(`(() => {
      const entries = window.SUDOKU_PUZZLES.easy;
      const family = entries.filter((entry) => entry.familyId === ${JSON.stringify(v3RollbackSeed.familyId)});
      const source = family.find((entry) => entry.id === ${JSON.stringify(v3RollbackSeed.puzzleId)});
      const currentState = window.PracticeSelection.readState();
      const selected = window.PracticeSelection.select({ gameId: "sudoku", band: "easy", entries, state: currentState, random: () => 0 });
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      return {
        familyCount: family.length,
        familyDisabled: family.every((entry) => entry.selectable === false),
        resumeId: resume?.puzzleId,
        resumeBoard: JSON.stringify(resume?.board),
        selectedGroup: selected.groupId,
        oldInventory: currentState.bands["sudoku|easy"]?.inventory,
        newInventory: selected.inventory,
        hardBranch: JSON.stringify(selected.nextState?.bands?.["sudoku|hard"]),
        contentBytes: JSON.stringify({ puzzle: source?.puzzle, solution: source?.solution, logicProfile: source?.logicProfile, origin: source?.origin })
      };
    })()`);
    check(v3Rollback.familyCount === 9 && v3Rollback.familyDisabled && v3Rollback.resumeId === v3RollbackSeed.puzzleId && v3Rollback.resumeBoard === v3RollbackSeed.board, "Sudoku v3 forward disable retains all IDs and restores the exact saved board", JSON.stringify(v3Rollback));
    check(v3Rollback.selectedGroup !== v3RollbackSeed.familyId && v3Rollback.oldInventory === v3RollbackSeed.oldInventory && v3Rollback.newInventory !== v3RollbackSeed.oldInventory, "Sudoku v3 forward disable excludes the family and resets its stale Easy inventory", JSON.stringify(v3Rollback));
    check(v3Rollback.hardBranch === v3RollbackSeed.hardBranch && v3Rollback.contentBytes === v3RollbackSeed.contentBytes, "Sudoku v3 forward disable preserves sibling rotation state and puzzle/profile/provenance bytes", JSON.stringify(v3Rollback));
    check(runtimeErrors(client.events).length === 0, "Sudoku v3 resume and forward-disable drill has no runtime exception", runtimeErrors(client.events).join(" | "));

    const rotationFixture = JSON.stringify({ version: 1, bands: { "sudoku|easy": { inventory: "fixture", remaining: ["garden-path"], last: "paper-lantern" }, "suguru|size5-easy": { inventory: "fixture", remaining: ["lantern"], last: "garden" } } });
    for (const fixture of [
      { game: sudoku, resumeKey: SUDOKU_RESUME_KEY },
      { game: suguru, resumeKey: SUGURU_RESUME_KEY }
    ]) {
      await navigate(fixture.game, { width: 390, height: 844 }, {
        storageEntries: { [fixture.resumeKey]: "{bad", [PRACTICE_ROTATION_KEY]: rotationFixture },
        beforeLoadSource: practiceWriteProbeSource()
      });
      const recovered = await client.evaluate(`({
        rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
        rotationWrites: window.__PRACTICE_ROTATION_WRITES,
        cells: document.querySelectorAll(".cell").length
      })`);
      check(recovered.rotation === rotationFixture && recovered.rotationWrites === 0 && recovered.cells === fixture.game.size ** 2, `${fixture.game.name} malformed-resume recovery leaves practice rotation byte-identical`, JSON.stringify(recovered));
      check(runtimeErrors(client.events).length === 0, `${fixture.game.name} malformed-resume rotation isolation has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }

    for (const fixture of [
      { game: sudoku, globalName: "SUDOKU_PUZZLES", collection: "value.easy", puzzleId: "easy-garden-path-c-r1", query: "?game=sudoku&difficulty=easy&mode=daily&edition=2026-07-29&corpus=sudoku-daily-v1", resumeKey: SUDOKU_RESUME_KEY },
      { game: suguru, globalName: "SUGURU_PUZZLES", collection: "value[\"size5-easy\"]", puzzleId: "suguru-size5-garden-path", query: "?game=suguru&level=size5-easy&mode=daily&edition=2026-07-29&corpus=suguru-daily-v1", resumeKey: SUGURU_RESUME_KEY }
    ]) {
      const mutateDailyMember = `Object.defineProperty(window, ${JSON.stringify(fixture.globalName)}, { configurable: true, set(value) { const target = ${fixture.collection}.find((entry) => entry.id === ${JSON.stringify(fixture.puzzleId)}); target.puzzle = target.puzzle.replace(/[1-9]/, "0"); Object.defineProperty(window, ${JSON.stringify(fixture.globalName)}, { value, writable: true, configurable: true }); } });`;
      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: fixture.query,
        storageEntries: { [PRACTICE_ROTATION_KEY]: rotationFixture },
        fixedInstant: "2026-07-29T12:00:00.000Z",
        timezoneId: "UTC",
        beforeLoadSource: practiceWriteProbeSource(mutateDailyMember)
      });
      const fallback = await client.evaluate(`(() => {
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        return {
          rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
          rotationWrites: window.__PRACTICE_ROTATION_WRITES,
          runSource: resume?.runSource,
          mode: resume?.mode,
          launchLabel: document.getElementById("new-game-button")?.textContent.trim(),
          message: document.getElementById("game-message")?.textContent.trim()
        };
      })()`);
      check(fallback.rotation === rotationFixture && fallback.rotationWrites === 0, `${fixture.game.name} unavailable-Daily fallback leaves practice rotation byte-identical`, JSON.stringify(fallback));
      check(fallback.runSource === "ordinary" && fallback.mode === "classic" && /unavailable/i.test(fallback.message || "") && !/replay.*daily/i.test(fallback.launchLabel || ""), `${fixture.game.name} unavailable-Daily fallback truthfully normalizes to Classic`, JSON.stringify(fallback));
      check(runtimeErrors(client.events).length === 0, `${fixture.game.name} unavailable-Daily rotation fallback has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }

    const weeklyPuzzle = "800234756053867290060519830371402685985070340642080009504628000196053408708901560";
    const weeklyResume = JSON.stringify({
      version: 2, gameId: "sudoku", runSource: "weekly", difficulty: "medium", mode: "classic", puzzleId: "medium-koi-cascade-a-r2",
      board: weeklyPuzzle.split("").map(Number), notes: Array.from({ length: 81 }, () => []), selectedIndex: 0, showMistakes: true, notesMode: false,
      mistakes: 0, hintsUsed: 0, checksUsed: 0, secondsElapsed: 12, paused: false, pauseReason: null,
      currentWeeklyPathId: "bridge-week", currentWeeklyStepId: "step-1", currentWeeklyWeekKey: "2026-07-27"
    });
    const weeklyLedger = JSON.stringify({ "2026-07-27": { pathId: "bridge-week", completedSteps: {} } });
    const weeklyClock = { fixedInstant: "2026-07-29T12:00:00.000Z", timezoneId: "UTC" };
    const weeklyStorage = { [SUDOKU_RESUME_KEY]: weeklyResume, [SUDOKU_WEEKLY_KEY]: weeklyLedger, [PRACTICE_ROTATION_KEY]: rotationFixture };
    await navigate(sudoku, { width: 390, height: 844 }, { storageEntries: weeklyStorage, beforeLoadSource: practiceWriteProbeSource(), ...weeklyClock });
    const restored = await client.evaluate(`(() => { const saved = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null"); return { id: saved?.puzzleId, status: document.getElementById("status-mode-label")?.textContent, rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}), rotationWrites: window.__PRACTICE_ROTATION_WRITES }; })()`);
    check(restored.id === "medium-koi-cascade-a-r2" && restored.status === "Weekly path", "Unfinished Weekly v1 resume restores exact baseline puzzle after append", JSON.stringify(restored));
    check(restored.rotation === rotationFixture && restored.rotationWrites === 0, "Weekly resume leaves practice rotation byte-identical", JSON.stringify(restored));

    const mutateWeeklyMember = `Object.defineProperty(window, "SUDOKU_PUZZLES", { configurable: true, set(value) { const target = value.medium.find((entry) => entry.id === "medium-koi-cascade-a-r2"); target.puzzle = "0" + target.puzzle.slice(1); Object.defineProperty(window, "SUDOKU_PUZZLES", { value, writable: true, configurable: true }); } });`;
    await navigate(sudoku, { width: 390, height: 844 }, {
      storageEntries: weeklyStorage,
      beforeLoadSource: `${practiceWriteProbeSource(mutateWeeklyMember)}${storageFaultSource({ [SUDOKU_RESUME_KEY]: { set: "throw", remove: "throw" } })}${saveHealthMutationProbeSource()}`,
      ...weeklyClock
    });
    await sleep(1200);
    const unavailable = await client.evaluate(`({
      resume: localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}),
      ledger: localStorage.getItem(${JSON.stringify(SUDOKU_WEEKLY_KEY)}),
      rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
      rotationWrites: window.__PRACTICE_ROTATION_WRITES,
      status: document.getElementById("status-mode-label")?.textContent,
      message: document.getElementById("game-message")?.textContent,
      saveStatus: document.getElementById("local-save-status")?.textContent.trim(),
      saveMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
      resumeWriteOperations: window.__STORAGE_FAULT_LOG.filter((entry) => (entry.operation === "set" || entry.operation === "remove") && entry.key === ${JSON.stringify(SUDOKU_RESUME_KEY)}).length
    })`);
    check(unavailable.resume === weeklyResume && unavailable.ledger === weeklyLedger, "Weekly fingerprint failure preserves original resume and ledger bytes", JSON.stringify(unavailable));
    check(unavailable.rotation === rotationFixture && unavailable.rotationWrites === 0, "Weekly fail-closed recovery leaves practice rotation byte-identical", JSON.stringify(unavailable));
    check(unavailable.status === "Classic" && unavailable.message?.includes("preserved"), "Weekly fingerprint failure opens a clearly labelled temporary Classic recovery copy", JSON.stringify(unavailable));
    check(unavailable.saveStatus === "" && unavailable.saveMutations === 0 && unavailable.resumeWriteOperations === 0, "Weekly preserved recovery performs no resume operation or false save-health transition", JSON.stringify(unavailable));
    check(runtimeErrors(client.events).length === 0, "Weekly fail-closed recovery has no runtime exception", runtimeErrors(client.events).join(" | "));
  });

  await runScenario("LogicCoach browser runtime", async () => {
    for (const game of [sudoku, suguru]) {
      await navigate(game, { width: 390, height: 844 });
      const result = await client.evaluate(`(() => {
        const api = window.LogicCoach;
        const isSudoku = ${game.name === "Sudoku"};
        const entry = isSudoku ? window.SUDOKU_PUZZLES.easy[0] : window.SUGURU_PUZZLES["size5-easy"][0];
        const input = entry.puzzle.split("").map(Number);
        const original = input.join("");
        const state = api.createState({
          game: isSudoku ? "sudoku" : "suguru",
          board: input,
          puzzle: input,
          solution: entry.solution,
          meta: isSudoku ? null : entry
        });
        const countBits = (mask) => { let value = mask >>> 0, count = 0; while (value) { value &= value - 1; count += 1; } return count; };
        const before = { empty: state.board.filter((value) => value === 0).length, candidates: state.candidates.reduce((total, mask) => total + countBits(mask), 0) };
        const step = api.getNextStep(state);
        const next = api.applyStep(state, step);
        const inspected = api.inspectState(next);
        const after = { empty: next.board.filter((value) => value === 0).length, candidates: next.candidates.reduce((total, mask) => total + countBits(mask), 0) };
        let forgedRejected = false;
        try { api.applyStep({ ...state }, step); } catch { forgedRejected = true; }
        input.fill(9);
        return {
          apiFrozen: Object.isFrozen(api),
          stateFrozen: Object.isFrozen(state) && Object.isFrozen(state.board) && Object.isFrozen(state.candidates) && Object.isFrozen(state.appliedKeys),
          nestedFrozen: !state.meta || (Object.isFrozen(state.meta) && Object.isFrozen(state.meta.cages) && Object.isFrozen(state.meta.cages[0]) && Object.isFrozen(state.meta.cageMap)),
          proofFrozen: Boolean(step) && Object.isFrozen(step) && Object.isFrozen(step.targetIndexes),
          diagnosticsFrozen: Object.isFrozen(inspected) && Object.isFrozen(inspected.candidates) && Object.isFrozen(inspected.candidates[0]),
          progressed: after.empty < before.empty || (after.empty === before.empty && after.candidates < before.candidates),
          inputCopied: state.board.join("") === original,
          forgedRejected,
          technique: step?.technique || null
        };
      })()`);
      const label = `${game.name} LogicCoach browser smoke`;
      check(result.apiFrozen && result.stateFrozen && result.nestedFrozen, `${label} freezes the complete issued state graph`, JSON.stringify(result));
      check(result.proofFrozen && result.diagnosticsFrozen, `${label} freezes proofs and copied diagnostics`, JSON.stringify(result));
      check(result.progressed && result.technique, `${label} applies one deterministic progress step`, JSON.stringify(result));
      check(result.inputCopied && result.forgedRejected, `${label} copies inputs and rejects forged states`, JSON.stringify(result));
      check(runtimeErrors(client.events).length === 0, `${label} has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("Sudoku contextual Hint adapter", async () => {
    await navigate(sudoku, { width: 390, height: 844 });
    const prepared = await client.evaluate(`(() => {
      document.getElementById("pause-button")?.click();
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      const puzzle = Object.values(window.SUDOKU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
      const editable = [...puzzle.puzzle].map((value, index) => value === "0" ? index : -1).filter((index) => index >= 0);
      const targets = editable.slice(0, 2);
      const board = [...puzzle.solution].map(Number);
      targets.forEach((index) => { board[index] = 0; });
      const selectedIndex = [...puzzle.puzzle].findIndex((value, index) => value !== "0" && !targets.includes(index));
      const preparedResume = {
        ...resume,
        runSource: "ordinary",
        mode: "classic",
        board,
        notes: Array.from({ length: 81 }, () => []),
        selectedIndex,
        hintsUsed: 0,
        checksUsed: 0,
        mistakes: 0,
        secondsElapsed: 0,
        paused: false,
        pauseReason: null
      };
      localStorage.setItem(${JSON.stringify(SUDOKU_RESUME_KEY)}, JSON.stringify(preparedResume));
      const nativeSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === ${JSON.stringify(SUDOKU_RESUME_KEY)}) return;
        return nativeSetItem.call(this, key, value);
      };
      return { targets, selectedIndex, solution: puzzle.solution };
    })()`);
    await reloadPreservingStorage(sudoku);
    const staged = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const readResume = () => JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      const snapshot = () => {
        const resume = readResume();
        return { board: resume?.board, notes: resume?.notes, selectedIndex: resume?.selectedIndex };
      };
      const before = snapshot();
      const messages = [];
      document.getElementById("hint-button")?.focus();
      for (let index = 0; index < 4; index += 1) {
        document.getElementById("hint-button")?.click();
        await wait(10);
        messages.push(document.getElementById("game-message")?.textContent.trim());
      }
      const afterStages = snapshot();
      const targetCell = document.querySelector(".cell.coach-target");
      const targetIndex = Number(targetCell?.dataset.index);
      const proof = {
        focusCount: document.querySelectorAll(".cell.coach-focus").length,
        sourceCount: document.querySelectorAll(".cell.coach-source").length,
        targetCount: document.querySelectorAll(".cell.coach-target").length,
        targetLabel: targetCell?.getAttribute("aria-label")
      };
      const buttonFocus = document.activeElement?.id;
      const afterHintResume = readResume();
      const stats = JSON.parse(localStorage.getItem("sudoku-sakura-stats") || "null");
      document.querySelector('.cell[data-index="' + targetIndex + '"]')?.click();
      const puzzle = Object.values(window.SUDOKU_PUZZLES).flat().find((entry) => entry.id === afterHintResume?.puzzleId);
      [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle?.solution[targetIndex] && !button.disabled)?.click();
      await wait(15);
      document.getElementById("undo-button")?.click();
      await wait(15);
      const afterUndo = readResume();
      const activeCell = document.querySelector('.cell[data-index="' + targetIndex + '"]');
      activeCell?.focus();
      activeCell?.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true }));
      await wait(15);
      const afterKeyboard = readResume();
      return {
        before,
        afterStages,
        messages,
        proof,
        buttonFocus,
        hintsUsed: afterHintResume?.hintsUsed,
        fullHouseHints: stats?.techniques?.fullHouseHints,
        afterUndo: { board: afterUndo?.board, hintsUsed: afterUndo?.hintsUsed },
        keyboard: {
          message: document.getElementById("game-message")?.textContent.trim(),
          hintsUsed: afterKeyboard?.hintsUsed,
          activeIndex: document.activeElement?.dataset?.index,
          selectedIndex: afterKeyboard?.selectedIndex
        }
      };
    })()`);
    check(JSON.stringify(staged.before) === JSON.stringify(staged.afterStages), "Sudoku staged Hint preserves board, notes, and user selection", JSON.stringify(staged));
    check(staged.messages[0]?.startsWith("Hint 1 of 3") && staged.messages[1]?.startsWith("Hint 2 of 3") && staged.messages[2]?.startsWith("Hint 3 of 3") && staged.messages[3] === staged.messages[2], "Sudoku placement Hint advances three stages and caps without placing", JSON.stringify(staged.messages));
    check(staged.proof.focusCount > 0 && staged.proof.sourceCount > 0 && staged.proof.targetCount === 1 && /hint target/i.test(staged.proof.targetLabel || ""), "Sudoku Hint exposes complete non-color proof roles", JSON.stringify(staged.proof));
    check(staged.buttonFocus === "hint-button", "Sudoku Hint button keeps repeatable trigger focus across disclosure stages", JSON.stringify(staged));
    check(staged.hintsUsed === 1 && staged.fullHouseHints === 1, "Sudoku one proof increments usage and the compatible technique counter once", JSON.stringify(staged));
    check(JSON.stringify(staged.afterUndo.board) === JSON.stringify(staged.before.board) && staged.afterUndo.hintsUsed === 1, "Sudoku undo invalidates the trail without lowering Hint usage", JSON.stringify(staged.afterUndo));
    check(staged.keyboard.message?.startsWith("Hint 1 of 3") && staged.keyboard.hintsUsed === 1 && staged.keyboard.activeIndex === String(staged.keyboard.selectedIndex), "Sudoku H restarts the proof without recounting it or moving grid focus", JSON.stringify(staged.keyboard));
    check(runtimeErrors(client.events).length === 0, "Sudoku contextual Hint staging has no runtime exception", runtimeErrors(client.events).join(" | "));

    await reloadPreservingStorage(sudoku);
    const reloadedHint = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      document.getElementById("resume-button")?.click();
      await wait(10);
      document.getElementById("hint-button")?.focus();
      document.getElementById("hint-button")?.click();
      await wait(15);
      const after = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      return { hintsUsed: after?.hintsUsed, countedKeys: after?.hintCountedKeys?.length, message: document.getElementById("game-message")?.textContent.trim() };
    })()`);
    check(reloadedHint.hintsUsed === 1 && reloadedHint.countedKeys > 0 && reloadedHint.message?.startsWith("Hint 1 of 3"), "Sudoku reload resets disclosure while preserving count-once proof history", JSON.stringify(reloadedHint));

    await navigate(sudoku, { width: 390, height: 844 });
    const correction = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      const puzzle = Object.values(window.SUDOKU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
      let fixture = null;
      for (let index = 0; index < puzzle.puzzle.length && !fixture; index += 1) {
        if (puzzle.puzzle[index] !== "0") continue;
        const used = new Set([...window.SudokuCore.getPeers(index)].map((peer) => Number(puzzle.puzzle[peer])).filter(Boolean));
        const wrong = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((value) => value !== Number(puzzle.solution[index]) && !used.has(value));
        if (wrong) fixture = { index, wrong, expected: Number(puzzle.solution[index]) };
      }
      if (!fixture) throw new Error("No locally legal wrong Sudoku entry fixture found");
      document.querySelector('.cell[data-index="' + fixture.index + '"]')?.click();
      [...document.querySelectorAll(".number-button")].find((button) => Number(button.dataset.value) === fixture.wrong && !button.disabled)?.click();
      await wait(10);
      const boardBefore = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null")?.board;
      const messages = [];
      for (let stage = 0; stage < 3; stage += 1) {
        document.getElementById("hint-button")?.click();
        await wait(10);
        messages.push(document.getElementById("game-message")?.textContent.trim());
      }
      const after = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      const target = document.querySelector('.cell.coach-target[data-index="' + fixture.index + '"]');
      return { fixture, boardBefore, boardAfter: after?.board, hintsUsed: after?.hintsUsed, messages, targetLabel: target?.getAttribute("aria-label") };
    })()`);
    check(correction.messages[0]?.includes("Correction first") && correction.messages[2]?.includes(String(correction.fixture.expected)), "Sudoku wrong entry receives staged exact correction guidance", JSON.stringify(correction));
    check(correction.hintsUsed === 0 && JSON.stringify(correction.boardBefore) === JSON.stringify(correction.boardAfter), "Sudoku correction neither counts a Hint nor mutates the board", JSON.stringify(correction));
    check(/hint target/i.test(correction.targetLabel || ""), "Sudoku correction exposes a non-color target label even on an invalid cell", JSON.stringify(correction));
    check(runtimeErrors(client.events).length === 0, "Sudoku correction guidance has no runtime exception", runtimeErrors(client.events).join(" | "));
  });

  await runScenario("Suguru contextual Nudge adapter", async () => {
    await navigate(suguru, { width: 390, height: 844 });
    await client.evaluate(`(() => {
      document.getElementById("pause-button")?.click();
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
      const editable = [...puzzle.puzzle].map((value, index) => value === "0" ? index : -1).filter((index) => index >= 0);
      const targets = editable.slice(0, 2);
      const board = [...puzzle.solution].map(Number);
      targets.forEach((index) => { board[index] = 0; });
      const selectedIndex = [...puzzle.puzzle].findIndex((value, index) => value !== "0" && !targets.includes(index));
      const preparedResume = {
        ...resume,
        version: 3,
        runSource: "ordinary",
        mode: "classic",
        board,
        notes: Array.from({ length: 25 }, () => []),
        selectedIndex,
        mistakes: 0,
        nudgesUsed: 0,
        secondsElapsed: 0,
        paused: false,
        pauseReason: null
      };
      delete preparedResume.journeyId;
      delete preparedResume.journeyStepId;
      delete preparedResume.dailyEdition;
      localStorage.setItem(${JSON.stringify(SUGURU_RESUME_KEY)}, JSON.stringify(preparedResume));
      const nativeSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === ${JSON.stringify(SUGURU_RESUME_KEY)}) return;
        return nativeSetItem.call(this, key, value);
      };
    })()`);
    await reloadPreservingStorage(suguru);
    const staged = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const readResume = () => JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      const snapshot = () => {
        const resume = readResume();
        return { board: resume?.board, notes: resume?.notes, selectedIndex: resume?.selectedIndex };
      };
      const before = snapshot();
      const messages = [];
      document.getElementById("nudge-button")?.focus();
      for (let index = 0; index < 4; index += 1) {
        document.getElementById("nudge-button")?.click();
        await wait(10);
        messages.push(document.getElementById("game-message")?.textContent.trim());
      }
      const afterStages = snapshot();
      const targetCell = document.querySelector(".cell.coach-target");
      const targetIndex = Number(targetCell?.dataset.index);
      const proof = {
        focusCount: document.querySelectorAll(".cell.coach-focus").length,
        sourceCount: document.querySelectorAll(".cell.coach-source").length,
        targetCount: document.querySelectorAll(".cell.coach-target").length,
        targetLabel: targetCell?.getAttribute("aria-label")
      };
      const buttonFocus = document.activeElement?.id;
      const afterNudgeResume = readResume();
      const genericStats = JSON.parse(localStorage.getItem("sudoku-sakura-suguru-stats") || "null");
      document.querySelector('.cell[data-index="' + targetIndex + '"]')?.click();
      const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === afterNudgeResume?.puzzleId);
      [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle?.solution[targetIndex] && !button.disabled)?.click();
      await wait(15);
      document.getElementById("undo-button")?.click();
      await wait(15);
      const afterUndo = readResume();
      const activeCell = document.querySelector('.cell[data-index="' + targetIndex + '"]');
      activeCell?.focus();
      activeCell?.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true }));
      await wait(15);
      const afterKeyboard = readResume();
      const keyboard = {
        message: document.getElementById("game-message")?.textContent.trim(),
        nudgesUsed: afterKeyboard?.nudgesUsed,
        activeIndex: document.activeElement?.dataset?.index,
        selectedIndex: afterKeyboard?.selectedIndex
      };
      document.getElementById("pause-button")?.click();
      const disabledWhilePaused = document.getElementById("nudge-button")?.disabled;
      return {
        before,
        afterStages,
        messages,
        proof,
        buttonFocus,
        nudgesUsed: afterNudgeResume?.nudgesUsed,
        genericStatsHasNudges: Object.prototype.hasOwnProperty.call(genericStats || {}, "nudgesUsed"),
        afterUndo: { board: afterUndo?.board, nudgesUsed: afterUndo?.nudgesUsed },
        keyboard,
        disabledWhilePaused
      };
    })()`);
    check(JSON.stringify(staged.before) === JSON.stringify(staged.afterStages), "Suguru staged Nudge preserves board, notes, and user selection", JSON.stringify(staged));
    check(staged.messages[0]?.startsWith("Nudge 1 of 3") && staged.messages[1]?.startsWith("Nudge 2 of 3") && staged.messages[2]?.startsWith("Nudge 3 of 3") && staged.messages[3] === staged.messages[2], "Suguru placement Nudge advances three stages and caps without placing", JSON.stringify(staged.messages));
    check(staged.proof.focusCount > 0 && staged.proof.sourceCount > 0 && staged.proof.targetCount === 1 && /nudge target/i.test(staged.proof.targetLabel || ""), "Suguru Nudge exposes complete non-color proof roles", JSON.stringify(staged.proof));
    check(staged.buttonFocus === "nudge-button", "Suguru Nudge button keeps repeatable trigger focus across disclosure stages", JSON.stringify(staged));
    check(staged.nudgesUsed === 1 && !staged.genericStatsHasNudges, "Suguru one proof increments runtime usage without changing generic stats schema", JSON.stringify(staged));
    check(JSON.stringify(staged.afterUndo.board) === JSON.stringify(staged.before.board) && staged.afterUndo.nudgesUsed === 1, "Suguru undo invalidates the trail without lowering Nudge usage", JSON.stringify(staged.afterUndo));
    check(staged.keyboard.message?.startsWith("Nudge 1 of 3") && staged.keyboard.nudgesUsed === 1 && staged.keyboard.activeIndex === String(staged.keyboard.selectedIndex), "Suguru H restarts the proof without recounting it or moving grid focus", JSON.stringify(staged.keyboard));
    check(staged.disabledWhilePaused, "Suguru Nudge is disabled while the board is paused", JSON.stringify(staged));
    check(runtimeErrors(client.events).length === 0, "Suguru contextual Nudge staging has no runtime exception", runtimeErrors(client.events).join(" | "));

    await reloadPreservingStorage(suguru);
    const reloadedNudge = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      document.getElementById("resume-button")?.click();
      await wait(10);
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      const cell = document.querySelector('.cell[data-index="' + resume?.selectedIndex + '"]');
      cell?.focus();
      cell?.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true }));
      await wait(15);
      const after = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      return { nudgesUsed: after?.nudgesUsed, countedKeys: after?.nudgeCountedKeys?.length, message: document.getElementById("game-message")?.textContent.trim() };
    })()`);
    check(reloadedNudge.nudgesUsed === 1 && reloadedNudge.countedKeys > 0 && reloadedNudge.message?.startsWith("Nudge 1 of 3"), "Suguru reload resets disclosure while preserving count-once proof history", JSON.stringify(reloadedNudge));

    await navigate(suguru, { width: 390, height: 844 });
    const correction = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume?.puzzleId);
      let fixture = null;
      for (let index = 0; index < puzzle.puzzle.length && !fixture; index += 1) {
        if (puzzle.puzzle[index] !== "0") continue;
        const used = new Set([...window.SuguruCore.getPeers(index, puzzle)].map((peer) => Number(puzzle.puzzle[peer])).filter(Boolean));
        const cageSize = window.SuguruCore.getCageSize(index, puzzle);
        const wrong = Array.from({ length: cageSize }, (_, value) => value + 1).find((value) => value !== Number(puzzle.solution[index]) && !used.has(value));
        if (wrong) fixture = { index, wrong, expected: Number(puzzle.solution[index]) };
      }
      if (!fixture) throw new Error("No locally legal wrong Suguru entry fixture found");
      document.querySelector('.cell[data-index="' + fixture.index + '"]')?.click();
      [...document.querySelectorAll(".number-button")].find((button) => Number(button.dataset.value) === fixture.wrong && !button.disabled)?.click();
      await wait(10);
      const boardBefore = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null")?.board;
      const messages = [];
      for (let stage = 0; stage < 3; stage += 1) {
        document.getElementById("nudge-button")?.click();
        await wait(10);
        messages.push(document.getElementById("game-message")?.textContent.trim());
      }
      const after = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      const target = document.querySelector('.cell.coach-target[data-index="' + fixture.index + '"]');
      return { fixture, boardBefore, boardAfter: after?.board, nudgesUsed: after?.nudgesUsed, messages, targetLabel: target?.getAttribute("aria-label") };
    })()`);
    check(correction.messages[0]?.includes("Correction first") && correction.messages[2]?.includes(String(correction.fixture.expected)), "Suguru wrong entry receives staged exact correction guidance", JSON.stringify(correction));
    check(correction.nudgesUsed === 0 && JSON.stringify(correction.boardBefore) === JSON.stringify(correction.boardAfter), "Suguru correction neither counts a Nudge nor mutates the board", JSON.stringify(correction));
    check(/nudge target/i.test(correction.targetLabel || ""), "Suguru correction exposes a non-color target label even on an invalid cell", JSON.stringify(correction));
    check(runtimeErrors(client.events).length === 0, "Suguru correction guidance has no runtime exception", runtimeErrors(client.events).join(" | "));

    await navigate(suguru, { width: 390, height: 844 });
    const eliminationFixture = await client.evaluate(`(() => {
      document.getElementById("pause-button")?.click();
      let fixture = null;
      for (const [level, entries] of Object.entries(window.SUGURU_PUZZLES)) {
        for (const puzzle of entries) {
          let coach = window.LogicCoach.createState({ game: "suguru", board: puzzle.puzzle, puzzle: puzzle.puzzle, solution: puzzle.solution, meta: puzzle });
          for (let index = 0; index < 200; index += 1) {
            const step = window.LogicCoach.getNextStep(coach);
            if (!step) break;
            if (step.kind === "elimination") {
              const nextCoach = window.LogicCoach.applyStep(coach, step);
              if (window.LogicCoach.getNextStep(nextCoach)) fixture = { level, puzzle, board: [...coach.board] };
              break;
            }
            coach = window.LogicCoach.applyStep(coach, step);
          }
          if (fixture) break;
        }
        if (fixture) break;
      }
      if (!fixture) throw new Error("No Suguru elimination-to-next-proof fixture found");
      const current = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      const preparedResume = {
        ...current,
        version: 3,
        runSource: "ordinary",
        level: fixture.level,
        mode: "classic",
        puzzleId: fixture.puzzle.id,
        board: fixture.board,
        notes: Array.from({ length: fixture.puzzle.size ** 2 }, () => []),
        selectedIndex: fixture.board.findIndex((value) => value === 0),
        mistakes: 0,
        nudgesUsed: 0,
        secondsElapsed: 0,
        paused: false,
        pauseReason: null
      };
      delete preparedResume.journeyId;
      delete preparedResume.journeyStepId;
      delete preparedResume.dailyEdition;
      localStorage.setItem(${JSON.stringify(SUGURU_RESUME_KEY)}, JSON.stringify(preparedResume));
      const nativeSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === ${JSON.stringify(SUGURU_RESUME_KEY)}) return;
        return nativeSetItem.call(this, key, value);
      };
      history.replaceState({}, "", "suguru.html?game=suguru&level=" + fixture.level + "&mode=classic");
      return { level: fixture.level, puzzleId: fixture.puzzle.id };
    })()`);
    await reloadPreservingStorage(suguru);
    const elimination = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const before = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      const messages = [];
      for (let index = 0; index < 3; index += 1) {
        document.getElementById("nudge-button")?.click();
        await wait(10);
        messages.push(document.getElementById("game-message")?.textContent.trim());
      }
      const eliminationTargets = document.querySelectorAll(".cell.coach-target").length;
      document.getElementById("nudge-button")?.click();
      await wait(10);
      const after = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      return {
        boardBefore: before?.board,
        boardAfter: after?.board,
        messages,
        nextMessage: document.getElementById("game-message")?.textContent.trim(),
        nudgesUsed: after?.nudgesUsed,
        eliminationTargets
      };
    })()`);
    check(elimination.messages[2]?.includes("Remove") && elimination.eliminationTargets > 0, "Suguru elimination Nudge names candidate removal and highlights every target", JSON.stringify({ eliminationFixture, elimination }));
    check(elimination.nextMessage?.startsWith("Nudge 1 of 3") && elimination.nudgesUsed === 2, "Suguru stage-three elimination advances only the private trail to a newly counted proof", JSON.stringify(elimination));
    check(JSON.stringify(elimination.boardBefore) === JSON.stringify(elimination.boardAfter), "Suguru private elimination trail never mutates the player board", JSON.stringify(elimination));
    check(runtimeErrors(client.events).length === 0, "Suguru elimination Nudge has no runtime exception", runtimeErrors(client.events).join(" | "));
  });

  await runScenario("deterministic Challenge Compass and pair focus", async () => {
    await navigate(sudoku, { width: 390, height: 844 });
    const freshSudoku = await client.evaluate(`({
      title: document.getElementById("rail-next-step-title")?.textContent.trim(),
      rail: document.getElementById("rail-next-step-title")?.textContent.trim(),
      ritual: document.getElementById("session-ritual-title")?.textContent.trim(),
      featured: document.getElementById("featured-challenge-title")?.textContent.trim()
    })`);
    check(/Daily/.test(freshSudoku.title || "") && freshSudoku.rail === freshSudoku.ritual && freshSudoku.rail === freshSudoku.featured, "Fresh Sudoku mirrors one Daily Compass recommendation", JSON.stringify(freshSudoku));

    const ordinarySudokuFocusSeed = await client.evaluate(`(() => {
      const current = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}));
      const puzzle = window.SUDOKU_PUZZLES.hard.find((entry) => entry.id === "hard-pair-current-a-r0");
      const board = puzzle.solution.split("").map(Number);
      const index = puzzle.puzzle.split("").findIndex((value) => value === "0");
      board[index] = 0;
      const resume = { ...current, version: 2, gameId: "sudoku", runSource: "ordinary", difficulty: "hard", mode: "classic", puzzleId: puzzle.id, board, notes: Array.from({ length: 81 }, () => []), selectedIndex: index, mistakes: 0, hintsUsed: 0, checksUsed: 0, secondsElapsed: 20, paused: false, pauseReason: null };
      delete resume.dailyEdition;
      delete resume.currentWeeklyStepId;
      delete resume.currentWeeklyPathId;
      delete resume.currentWeeklyWeekKey;
      delete resume.focusLaunchId;
      return { resume: JSON.stringify(resume), stats: localStorage.getItem(${JSON.stringify(SUDOKU_STATS_KEY)}) };
    })()`);
    await navigate(sudoku, { width: 390, height: 844 }, { storageEntries: { [SUDOKU_RESUME_KEY]: ordinarySudokuFocusSeed.resume, [SUDOKU_STATS_KEY]: ordinarySudokuFocusSeed.stats } });
    const ordinarySudokuFocus = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}));
      const puzzle = window.SUDOKU_PUZZLES.hard.find((entry) => entry.id === resume.puzzleId);
      const value = Number(puzzle.solution[resume.selectedIndex]);
      document.querySelector('.cell[data-index="' + resume.selectedIndex + '"]')?.click();
      document.querySelector('.number-button[data-value="' + value + '"]')?.click();
      await wait(35);
      return { completed: !document.getElementById("victory-overlay")?.hidden, result: localStorage.getItem(${JSON.stringify(FOCUS_RESULTS_KEY)}) };
    })()`);
    check(ordinarySudokuFocus.completed && ordinarySudokuFocus.result === null, "Ordinary Sudoku provenance cannot consume Pair Focus completion", JSON.stringify(ordinarySudokuFocus));

    const advancedSudokuStats = JSON.parse(await client.evaluate(`localStorage.getItem(${JSON.stringify(SUDOKU_STATS_KEY)})`));
    advancedSudokuStats.difficulties.advanced.solved = 1;
    advancedSudokuStats.overall.solved = Math.max(1, advancedSudokuStats.overall.solved);
    await navigate(sudoku, { width: 390, height: 844 }, { storageEntries: { [SUDOKU_STATS_KEY]: JSON.stringify(advancedSudokuStats) } });
    const qualifiedSudoku = await client.evaluate(`({
      title: document.getElementById("rail-next-step-title")?.textContent.trim(),
      text: document.getElementById("rail-next-step-text")?.textContent.trim(),
      label: document.getElementById("rail-next-step-button")?.textContent.trim(),
      discardKind: document.getElementById("rail-next-step-button")?.dataset.discardKind,
      mirrors: ["session-ritual-title", "featured-challenge-title"].map((id) => document.getElementById(id)?.textContent.trim()),
      mirrorDiscardKinds: ["session-ritual-button", "featured-challenge-button"].map((id) => document.getElementById(id)?.dataset.discardKind || null)
    })`);
    check(qualifiedSudoku.title === "Pair Focus: unlock the unit" && qualifiedSudoku.label === "Open Pair Focus ✦" && qualifiedSudoku.discardKind === "replace", "Advanced Sudoku completion unlocks Pair Focus", JSON.stringify(qualifiedSudoku));
    check(qualifiedSudoku.mirrors.every((title) => title === qualifiedSudoku.title) && qualifiedSudoku.mirrorDiscardKinds.every((kind) => kind === "replace") && /LogicCoach v1 removes 3 candidates/.test(qualifiedSudoku.text || "") && /same trace later records 41 placements/.test(qualifiedSudoku.text || ""), "Sudoku Focus copy and replacement markers are mirrored, educational, and solver-qualified", JSON.stringify(qualifiedSudoku));

    const sudokuFocusLaunch = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const rotationBefore = localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)});
      document.getElementById("rail-next-step-button")?.click();
      await wait(30);
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null");
      return {
        rotationBefore,
        rotationAfter: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
        puzzleId: resume?.puzzleId,
        difficulty: resume?.difficulty,
        mode: resume?.mode,
        runSource: resume?.runSource,
        title: document.getElementById("rail-next-step-title")?.textContent.trim(),
        discardKind: document.getElementById("rail-next-step-button")?.dataset.discardKind || null,
        facts: document.getElementById("board-puzzle-facts")?.textContent.replace(/\\s+/g, " ").trim()
      };
    })()`);
    check(sudokuFocusLaunch.puzzleId === "hard-pair-current-a-r0" && sudokuFocusLaunch.difficulty === "hard" && sudokuFocusLaunch.mode === "classic" && sudokuFocusLaunch.runSource === "ordinary", "Sudoku Pair Focus launches exact ordinary Hard Classic content", JSON.stringify(sudokuFocusLaunch));
    check(sudokuFocusLaunch.rotationBefore === sudokuFocusLaunch.rotationAfter && /Continue/.test(sudokuFocusLaunch.title || "") && sudokuFocusLaunch.discardKind === null, "Sudoku Focus launch preserves rotation and Compass now prefers current board", JSON.stringify(sudokuFocusLaunch));
    check(/LogicCoach v1 pair · 3 eliminations/.test(sudokuFocusLaunch.facts || ""), "Sudoku focused board exposes qualified evidence facts", JSON.stringify(sudokuFocusLaunch));

    const sudokuCompletionSeed = await client.evaluate(`(() => {
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}));
      const puzzle = Object.values(window.SUDOKU_PUZZLES).flat().find((entry) => entry.id === resume.puzzleId);
      const board = puzzle.solution.split("").map(Number);
      const index = puzzle.puzzle.split("").findIndex((value) => value === "0");
      board[index] = 0;
      return {
        resume: JSON.stringify({ ...resume, board, notes: Array.from({ length: 81 }, () => []), selectedIndex: index, secondsElapsed: 20, paused: false, pauseReason: null }),
        stats: localStorage.getItem(${JSON.stringify(SUDOKU_STATS_KEY)}),
        rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)})
      };
    })()`);
    const sudokuCompletionStorage = { [SUDOKU_RESUME_KEY]: sudokuCompletionSeed.resume, [SUDOKU_STATS_KEY]: sudokuCompletionSeed.stats };
    if (sudokuCompletionSeed.rotation) sudokuCompletionStorage[PRACTICE_ROTATION_KEY] = sudokuCompletionSeed.rotation;
    await navigate(sudoku, { width: 390, height: 844 }, { storageEntries: sudokuCompletionStorage });
    const sudokuFocusComplete = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}));
      const puzzle = Object.values(window.SUDOKU_PUZZLES).flat().find((entry) => entry.id === resume.puzzleId);
      const index = resume.selectedIndex;
      const value = Number(puzzle.solution[index]);
      const cell = document.querySelector('.cell[data-index="' + index + '"]');
      cell?.click();
      const button = document.querySelector('.number-button[data-value="' + value + '"]');
      button?.click();
      await wait(35);
      return {
        result: JSON.parse(localStorage.getItem(${JSON.stringify(FOCUS_RESULTS_KEY)}) || "null"),
        title: document.getElementById("rail-next-step-title")?.textContent.trim(),
        completed: !document.getElementById("victory-overlay")?.hidden,
        index, value, cell: Boolean(cell), button: Boolean(button), buttonDisabled: button?.disabled,
        message: document.getElementById("game-message")?.textContent.trim(),
        victory: document.querySelector("#victory-save-status .save-health-message > span:last-child")?.textContent.trim(),
        afterResume: JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null")
      };
    })()`);
    check(sudokuFocusComplete.completed && sudokuFocusComplete.result?.completed?.["sudoku|hard-pair-current-a-r0"] === true && Object.keys(sudokuFocusComplete.result).sort().join(",") === "completed,version" && sudokuFocusComplete.victory === "Progress saved in this browser.", "Sudoku Focus completion writes the exact boolean ledger and exposes a healthy ordinary victory claim", JSON.stringify(sudokuFocusComplete));
    check(!/Pair Focus/.test(sudokuFocusComplete.title || "") && /Daily/.test(sudokuFocusComplete.title || ""), "Completed Sudoku Focus falls through to Daily", JSON.stringify(sudokuFocusComplete));

    await navigate(sudoku, { width: 390, height: 844 }, { storageEntries: sudokuCompletionStorage, beforeLoadSource: `${storageFaultSource({ [FOCUS_RESULTS_KEY]: { set: "throw" } })}${saveHealthMutationProbeSource()}` });
    const sudokuMemoryFocus = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}));
      const puzzle = Object.values(window.SUDOKU_PUZZLES).flat().find((entry) => entry.id === resume.puzzleId);
      const value = Number(puzzle.solution[resume.selectedIndex]);
      document.querySelector('.cell[data-index="' + resume.selectedIndex + '"]')?.click();
      document.querySelector('.number-button[data-value="' + value + '"]')?.click();
      await wait(35);
      return {
        completed: !document.getElementById("victory-overlay")?.hidden,
        stored: localStorage.getItem(${JSON.stringify(FOCUS_RESULTS_KEY)}),
        writeAttempts: window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(FOCUS_RESULTS_KEY)}).length,
        title: document.getElementById("rail-next-step-title")?.textContent.trim(),
        victory: document.querySelector("#victory-save-status .save-health-message > span:last-child")?.textContent.trim(),
        victoryMutations: window.__VICTORY_SAVE_STATUS_MUTATIONS,
        localStatus: document.getElementById("local-save-status")?.textContent.trim(),
        localHidden: document.getElementById("local-save-status")?.getAttribute("aria-hidden"),
        localMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
        finalResumeSet: window.__STORAGE_FAULT_LOG.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUDOKU_RESUME_KEY)}),
        statsSet: window.__STORAGE_FAULT_LOG.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUDOKU_STATS_KEY)}),
        historySet: window.__STORAGE_FAULT_LOG.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUDOKU_SESSION_HISTORY_KEY)}),
        focusSet: window.__STORAGE_FAULT_LOG.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(FOCUS_RESULTS_KEY)}),
        resumeRemove: window.__STORAGE_FAULT_LOG.findLastIndex((entry) => entry.operation === "remove" && entry.key === ${JSON.stringify(SUDOKU_RESUME_KEY)})
      };
    })()`);
    check(sudokuMemoryFocus.completed && sudokuMemoryFocus.stored === null && sudokuMemoryFocus.writeAttempts === 1 && !/Pair Focus/.test(sudokuMemoryFocus.title || "") && /Daily/.test(sudokuMemoryFocus.title || ""), "Sudoku focus storage failure retains completion in session memory after one failed write", JSON.stringify(sudokuMemoryFocus));
    check(/Session-only: Pair Focus completion was not saved/.test(sudokuMemoryFocus.victory || "") && sudokuMemoryFocus.victoryMutations === 1 && sudokuMemoryFocus.localStatus === "" && sudokuMemoryFocus.localHidden === "true" && sudokuMemoryFocus.localMutations === 0, "Sudoku Focus failure is disclosed once by victory without an exposed active-region completion mutation", JSON.stringify(sudokuMemoryFocus));
    check(sudokuMemoryFocus.finalResumeSet < sudokuMemoryFocus.statsSet && sudokuMemoryFocus.statsSet < sudokuMemoryFocus.historySet && sudokuMemoryFocus.historySet < sudokuMemoryFocus.focusSet && sudokuMemoryFocus.focusSet < sudokuMemoryFocus.resumeRemove, "Sudoku Focus failure does not suppress later cleanup and keeps resume removal last", JSON.stringify(sudokuMemoryFocus));
    const sudokuCompletedBypass = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      document.getElementById("victory-new-game-button")?.click();
      await wait(35);
      return {
        dialogOpen: document.getElementById("discard-dialog")?.open,
        victoryHidden: document.getElementById("victory-overlay")?.hidden,
        resume: JSON.parse(localStorage.getItem(${JSON.stringify(SUDOKU_RESUME_KEY)}) || "null"),
        saveStatus: document.getElementById("local-save-status")?.textContent.trim(),
        saveMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
        title: document.getElementById("rail-next-step-title")?.textContent.trim()
      };
    })()`);
    check(!sudokuCompletedBypass.dialogOpen && sudokuCompletedBypass.victoryHidden && sudokuCompletedBypass.resume?.puzzleId, "Completed Sudoku result replacement bypasses discard confirmation", JSON.stringify(sudokuCompletedBypass));
    check(/Session-only: Pair Focus completion/.test(sudokuCompletedBypass.saveStatus || "") && sudokuCompletedBypass.saveMutations === 1 && !/Pair Focus/.test(sudokuCompletedBypass.title || ""), "Sudoku Focus failure falls through in memory and exposes one warning on the next active board", JSON.stringify(sudokuCompletedBypass));
    await navigate(sudoku, { width: 390, height: 844 }, { storageEntries: { [SUDOKU_STATS_KEY]: sudokuCompletionSeed.stats } });
    const sudokuReloadedFocus = await client.evaluate(`document.getElementById("rail-next-step-title")?.textContent.trim()`);
    check(/Pair Focus/.test(sudokuReloadedFocus || ""), "Reloading without a durable Sudoku Focus result reoffers the qualified board", sudokuReloadedFocus || "missing Compass title");

    const easySuguruStats = JSON.stringify({ solved: 1, bestTimes: { "size5-easy:classic": 45 }, streak: 0, lastSolvedOn: null });
    const ordinarySuguruResume = createSuguruResume(SUGURU_FIXTURES.garden, { version: 3, runSource: "ordinary", nudgesUsed: 0, nudgeCountedKeys: [] });
    await navigate(suguru, { width: 390, height: 844 }, { storageEntries: { [SUGURU_STATS_KEY]: easySuguruStats, [SUGURU_RESUME_KEY]: ordinarySuguruResume } });
    const easySuguru = await client.evaluate(`document.getElementById("rail-next-step-title")?.textContent.trim()`);
    check(!/Pair Focus/.test(easySuguru || "") && /waiting/.test(easySuguru || ""), "Easy-only Suguru history does not unlock Pair Focus", JSON.stringify(easySuguru));

    const ordinarySuguruFocusSeed = await client.evaluate(`(() => {
      const current = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}));
      const puzzle = window.SUGURU_PUZZLES["size5-challenge"].find((entry) => entry.id === "suguru-size5-mist-pair-current");
      const board = puzzle.solution.split("").map(Number);
      const index = puzzle.puzzle.split("").findIndex((value) => value === "0");
      board[index] = 0;
      const resume = { ...current, version: 3, runSource: "ordinary", level: "size5-challenge", mode: "classic", puzzleId: puzzle.id, board, notes: Array.from({ length: 25 }, () => []), selectedIndex: index, mistakes: 0, nudgesUsed: 0, nudgeCountedKeys: [], secondsElapsed: 20, paused: false, pauseReason: null };
      delete resume.dailyEdition;
      delete resume.journeyId;
      delete resume.journeyStepId;
      delete resume.focusLaunchId;
      return { resume: JSON.stringify(resume), stats: localStorage.getItem(${JSON.stringify(SUGURU_STATS_KEY)}) };
    })()`);
    await navigate(suguru, { width: 390, height: 844 }, { storageEntries: { [SUGURU_RESUME_KEY]: ordinarySuguruFocusSeed.resume, [SUGURU_STATS_KEY]: ordinarySuguruFocusSeed.stats } });
    const ordinarySuguruFocus = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}));
      const puzzle = window.SUGURU_PUZZLES["size5-challenge"].find((entry) => entry.id === resume.puzzleId);
      const value = Number(puzzle.solution[resume.selectedIndex]);
      document.querySelector('.cell[data-index="' + resume.selectedIndex + '"]')?.click();
      [...document.querySelectorAll(".number-button")].find((button) => Number(button.dataset.value) === value && !button.disabled)?.click();
      await wait(35);
      return { completed: !document.getElementById("victory-overlay")?.hidden, result: localStorage.getItem(${JSON.stringify(FOCUS_RESULTS_KEY)}) };
    })()`);
    check(ordinarySuguruFocus.completed && ordinarySuguruFocus.result === null, "Ordinary Suguru provenance cannot consume Pair Focus completion", JSON.stringify(ordinarySuguruFocus));

    const bridgeSuguruStats = JSON.stringify({ solved: 1, bestTimes: { "size5-medium:classic": 45 }, streak: 0, lastSolvedOn: null });
    await navigate(suguru, { width: 390, height: 844 }, { storageEntries: { [SUGURU_STATS_KEY]: bridgeSuguruStats, [SUGURU_RESUME_KEY]: ordinarySuguruResume } });
    const qualifiedSuguru = await client.evaluate(`({
      title: document.getElementById("rail-next-step-title")?.textContent.trim(),
      text: document.getElementById("rail-next-step-text")?.textContent.trim(),
      label: document.getElementById("rail-next-step-button")?.textContent.trim(),
      discardKind: document.getElementById("rail-next-step-button")?.dataset.discardKind,
      replacementMarkers: ["suguru-ritual-button", "hero-challenge-button"].map((id) => document.getElementById(id)?.dataset.discardKind || null)
    })`);
    check(qualifiedSuguru.title === "Pair Focus: unlock the cage" && qualifiedSuguru.label === "Open Pair Focus ✦" && qualifiedSuguru.discardKind === "replace" && qualifiedSuguru.replacementMarkers.every((kind) => kind === "replace"), "Bridge Suguru completion unlocks Pair Focus with mirrored replacement markers", JSON.stringify(qualifiedSuguru));
    check(/LogicCoach v1 removes 4 candidates/.test(qualifiedSuguru.text || "") && /same trace later records 17 placements/.test(qualifiedSuguru.text || ""), "Suguru Focus copy is educational and solver-qualified", JSON.stringify(qualifiedSuguru));

    const suguruFocusLaunch = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const rotationBefore = localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)});
      document.getElementById("rail-next-step-button")?.click();
      await wait(30);
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null");
      return {
        rotationBefore,
        rotationAfter: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)}),
        puzzleId: resume?.puzzleId,
        level: resume?.level,
        mode: resume?.mode,
        runSource: resume?.runSource,
        title: document.getElementById("rail-next-step-title")?.textContent.trim(),
        discardKind: document.getElementById("rail-next-step-button")?.dataset.discardKind || null,
        facts: document.getElementById("board-puzzle-facts")?.textContent.replace(/\\s+/g, " ").trim()
      };
    })()`);
    check(suguruFocusLaunch.puzzleId === "suguru-size5-mist-pair-current" && suguruFocusLaunch.level === "size5-challenge" && suguruFocusLaunch.mode === "classic" && suguruFocusLaunch.runSource === "ordinary", "Suguru Pair Focus launches exact ordinary Challenge Classic content", JSON.stringify(suguruFocusLaunch));
    check(suguruFocusLaunch.rotationBefore === suguruFocusLaunch.rotationAfter && /Continue/.test(suguruFocusLaunch.title || "") && suguruFocusLaunch.discardKind === null, "Suguru Focus launch preserves rotation and Compass now prefers current board", JSON.stringify(suguruFocusLaunch));
    check(/LogicCoach v1 pair · 4 eliminations/.test(suguruFocusLaunch.facts || ""), "Suguru focused board exposes qualified evidence facts", JSON.stringify(suguruFocusLaunch));

    const suguruCompletionSeed = await client.evaluate(`(() => {
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}));
      const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume.puzzleId);
      const board = puzzle.solution.split("").map(Number);
      const index = puzzle.puzzle.split("").findIndex((value) => value === "0");
      board[index] = 0;
      return {
        resume: JSON.stringify({ ...resume, board, notes: Array.from({ length: 25 }, () => []), selectedIndex: index, secondsElapsed: 20, paused: false, pauseReason: null }),
        stats: localStorage.getItem(${JSON.stringify(SUGURU_STATS_KEY)}),
        rotation: localStorage.getItem(${JSON.stringify(PRACTICE_ROTATION_KEY)})
      };
    })()`);
    const suguruCompletionStorage = { [SUGURU_RESUME_KEY]: suguruCompletionSeed.resume, [SUGURU_STATS_KEY]: suguruCompletionSeed.stats };
    if (suguruCompletionSeed.rotation) suguruCompletionStorage[PRACTICE_ROTATION_KEY] = suguruCompletionSeed.rotation;
    await navigate(suguru, { width: 390, height: 844 }, { storageEntries: suguruCompletionStorage });
    const suguruFocusComplete = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}));
      const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume.puzzleId);
      const index = resume.selectedIndex;
      const value = Number(puzzle.solution[index]);
      const cell = document.querySelector('.cell[data-index="' + index + '"]');
      cell?.click();
      const button = [...document.querySelectorAll(".number-button")].find((candidate) => Number(candidate.dataset.value) === value && !candidate.disabled);
      button?.click();
      await wait(35);
      return {
        result: JSON.parse(localStorage.getItem(${JSON.stringify(FOCUS_RESULTS_KEY)}) || "null"),
        title: document.getElementById("rail-next-step-title")?.textContent.trim(),
        completed: !document.getElementById("victory-overlay")?.hidden,
        index, value, cell: Boolean(cell), button: Boolean(button),
        message: document.getElementById("game-message")?.textContent.trim(),
        victory: document.querySelector("#victory-save-status .save-health-message > span:last-child")?.textContent.trim(),
        afterResume: JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null")
      };
    })()`);
    check(suguruFocusComplete.completed && suguruFocusComplete.result?.completed?.["suguru|suguru-size5-mist-pair-current"] === true && Object.keys(suguruFocusComplete.result).sort().join(",") === "completed,version" && suguruFocusComplete.victory === "Progress saved in this browser.", "Suguru Focus completion writes the exact boolean ledger and exposes a healthy ordinary victory claim", JSON.stringify(suguruFocusComplete));
    check(!/Pair Focus/.test(suguruFocusComplete.title || "") && /waiting/.test(suguruFocusComplete.title || ""), "Completed Suguru Focus falls through to Daily", JSON.stringify(suguruFocusComplete));

    await navigate(suguru, { width: 390, height: 844 }, { storageEntries: suguruCompletionStorage, beforeLoadSource: `${storageFaultSource({ [FOCUS_RESULTS_KEY]: { set: "throw" } })}${saveHealthMutationProbeSource()}` });
    const suguruMemoryFocus = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      const resume = JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}));
      const puzzle = Object.values(window.SUGURU_PUZZLES).flat().find((entry) => entry.id === resume.puzzleId);
      const value = Number(puzzle.solution[resume.selectedIndex]);
      document.querySelector('.cell[data-index="' + resume.selectedIndex + '"]')?.click();
      [...document.querySelectorAll(".number-button")].find((button) => Number(button.dataset.value) === value && !button.disabled)?.click();
      await wait(35);
      return {
        completed: !document.getElementById("victory-overlay")?.hidden,
        stored: localStorage.getItem(${JSON.stringify(FOCUS_RESULTS_KEY)}),
        writeAttempts: window.__STORAGE_FAULT_LOG.filter((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(FOCUS_RESULTS_KEY)}).length,
        title: document.getElementById("rail-next-step-title")?.textContent.trim(),
        victory: document.querySelector("#victory-save-status .save-health-message > span:last-child")?.textContent.trim(),
        victoryMutations: window.__VICTORY_SAVE_STATUS_MUTATIONS,
        localStatus: document.getElementById("local-save-status")?.textContent.trim(),
        localHidden: document.getElementById("local-save-status")?.getAttribute("aria-hidden"),
        localMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
        finalResumeSet: window.__STORAGE_FAULT_LOG.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUGURU_RESUME_KEY)}),
        statsSet: window.__STORAGE_FAULT_LOG.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(SUGURU_STATS_KEY)}),
        focusSet: window.__STORAGE_FAULT_LOG.findLastIndex((entry) => entry.operation === "set" && entry.key === ${JSON.stringify(FOCUS_RESULTS_KEY)}),
        resumeRemove: window.__STORAGE_FAULT_LOG.findLastIndex((entry) => entry.operation === "remove" && entry.key === ${JSON.stringify(SUGURU_RESUME_KEY)})
      };
    })()`);
    check(suguruMemoryFocus.completed && suguruMemoryFocus.stored === null && suguruMemoryFocus.writeAttempts === 1 && !/Pair Focus/.test(suguruMemoryFocus.title || "") && /waiting/.test(suguruMemoryFocus.title || ""), "Suguru focus storage failure retains completion in session memory after one failed write", JSON.stringify(suguruMemoryFocus));
    check(/Session-only: Pair Focus completion was not saved/.test(suguruMemoryFocus.victory || "") && suguruMemoryFocus.victoryMutations === 1 && suguruMemoryFocus.localStatus === "" && suguruMemoryFocus.localHidden === "true" && suguruMemoryFocus.localMutations === 0, "Suguru Focus failure is disclosed once by victory without an exposed active-region completion mutation", JSON.stringify(suguruMemoryFocus));
    check(suguruMemoryFocus.finalResumeSet < suguruMemoryFocus.statsSet && suguruMemoryFocus.statsSet < suguruMemoryFocus.focusSet && suguruMemoryFocus.focusSet < suguruMemoryFocus.resumeRemove, "Suguru Focus failure does not suppress later cleanup and keeps resume removal last", JSON.stringify(suguruMemoryFocus));
    const suguruCompletedBypass = await client.evaluate(`(async () => {
      const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
      document.getElementById("victory-new-game-button")?.click();
      await wait(35);
      return {
        dialogOpen: document.getElementById("discard-dialog")?.open,
        victoryHidden: document.getElementById("victory-overlay")?.hidden,
        resume: JSON.parse(localStorage.getItem(${JSON.stringify(SUGURU_RESUME_KEY)}) || "null"),
        saveStatus: document.getElementById("local-save-status")?.textContent.trim(),
        saveMutations: window.__LOCAL_SAVE_STATUS_MUTATIONS,
        title: document.getElementById("rail-next-step-title")?.textContent.trim()
      };
    })()`);
    check(!suguruCompletedBypass.dialogOpen && suguruCompletedBypass.victoryHidden && suguruCompletedBypass.resume?.puzzleId, "Completed Suguru result replacement bypasses discard confirmation", JSON.stringify(suguruCompletedBypass));
    check(/Session-only: Pair Focus completion/.test(suguruCompletedBypass.saveStatus || "") && suguruCompletedBypass.saveMutations === 1 && !/Pair Focus/.test(suguruCompletedBypass.title || ""), "Suguru Focus failure falls through in memory and exposes one warning on the next active board", JSON.stringify(suguruCompletedBypass));
    await navigate(suguru, { width: 390, height: 844 }, { storageEntries: { [SUGURU_STATS_KEY]: suguruCompletionSeed.stats, [SUGURU_RESUME_KEY]: ordinarySuguruResume } });
    const suguruReloadedFocus = await client.evaluate(`document.getElementById("rail-next-step-title")?.textContent.trim()`);
    check(/Pair Focus/.test(suguruReloadedFocus || ""), "Reloading without a durable Suguru Focus result reoffers the qualified board", suguruReloadedFocus || "missing Compass title");
    check(runtimeErrors(client.events).length === 0, "Challenge Compass flows have no runtime exception", runtimeErrors(client.events).join(" | "));
  });

  await runScenario("forward rollback compatibility", async () => {
    for (const fixture of [
      { game: sudoku, name: "Sudoku", globalName: "SUDOKU_PUZZLES", resumeKey: SUDOKU_RESUME_KEY, statsKey: SUDOKU_STATS_KEY, focusId: "hard-pair-current-a-r0", band: "hard", gameId: "sudoku", size: 81 },
      { game: suguru, name: "Suguru", globalName: "SUGURU_PUZZLES", resumeKey: SUGURU_RESUME_KEY, statsKey: SUGURU_STATS_KEY, focusId: "suguru-size5-mist-pair-current", band: "size5-challenge", gameId: "suguru", size: 25 }
    ]) {
      await navigate(fixture.game, { width: 390, height: 844 });
      const seed = await client.evaluate(`(() => {
        const library = window[${JSON.stringify(fixture.globalName)}];
        const puzzle = Object.values(library).flat().find((entry) => entry.id === ${JSON.stringify(fixture.focusId)});
        const current = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const board = puzzle.puzzle.split("").map(Number);
        const firstIndex = board.findIndex((value) => value === 0);
        board[firstIndex] = Number(puzzle.solution[firstIndex]);
        const selectedIndex = board.findIndex((value) => value === 0);
        const stats = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.statsKey)}) || "{}");
        const resume = {
          ...current,
          runSource: "ordinary",
          mode: "classic",
          puzzleId: puzzle.id,
          board,
          notes: Array.from({ length: ${fixture.size} }, () => []),
          selectedIndex,
          mistakes: 0,
          secondsElapsed: 12,
          paused: false,
          pauseReason: null,
          focusLaunchId: puzzle.id
        };
        if (${JSON.stringify(fixture.name)} === "Sudoku") {
          resume.version = 2;
          resume.gameId = "sudoku";
          resume.difficulty = "hard";
          resume.hintsUsed = 0;
          resume.checksUsed = 0;
          delete resume.dailyEdition;
          delete resume.currentWeeklyStepId;
          delete resume.currentWeeklyPathId;
          delete resume.currentWeeklyWeekKey;
          stats.difficulties ||= {};
          stats.difficulties.advanced ||= {};
          stats.difficulties.advanced.solved = 1;
          stats.overall ||= {};
          stats.overall.solved = Math.max(1, Number(stats.overall.solved) || 0);
        } else {
          resume.version = 3;
          resume.level = "size5-challenge";
          resume.nudgesUsed = 0;
          resume.nudgeCountedKeys = [];
          delete resume.dailyEdition;
          delete resume.journeyId;
          delete resume.journeyStepId;
          stats.solved = Math.max(1, Number(stats.solved) || 0);
          stats.bestTimes ||= {};
          stats.bestTimes["size5-medium:classic"] = 45;
        }
        return { resume: JSON.stringify(resume), stats: JSON.stringify(stats), board: JSON.stringify(board) };
      })()`);
      const disabledSource = disableLibraryEntrySource(fixture.globalName, fixture.focusId);
      await navigate(fixture.game, { width: 390, height: 844 }, {
        storageEntries: { [fixture.resumeKey]: seed.resume, [fixture.statsKey]: seed.stats },
        beforeLoadSource: disabledSource
      });
      const restored = await client.evaluate(`(() => {
        const library = window[${JSON.stringify(fixture.globalName)}];
        const entry = Object.values(library).flat().find((candidate) => candidate.id === ${JSON.stringify(fixture.focusId)});
        const fallback = library[${JSON.stringify(fixture.band)}].find((candidate) => candidate.id !== entry.id && candidate.selectable !== false);
        const practice = window.PracticeSelection.select({
          gameId: ${JSON.stringify(fixture.gameId)},
          band: ${JSON.stringify(fixture.band)},
          entries: [entry, fallback],
          state: { version: 1, bands: {} },
          random: () => 0
        });
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        return {
          disabled: entry?.selectable === false,
          puzzleId: resume?.puzzleId,
          focusLaunchId: resume?.focusLaunchId,
          board: JSON.stringify(resume?.board),
          practicePuzzleId: practice.puzzle?.id,
          title: document.getElementById("rail-next-step-title")?.textContent.trim()
        };
      })()`);
      check(restored.disabled && restored.puzzleId === fixture.focusId && restored.focusLaunchId === fixture.focusId && restored.board === seed.board && restored.practicePuzzleId !== fixture.focusId && /Continue/.test(restored.title || ""), `${fixture.name} forward rollback restores disabled Focus while practice excludes it`, JSON.stringify(restored));

      const unguarded = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const trigger = document.getElementById("new-game-button");
        trigger.removeAttribute("data-discard-kind");
        trigger.click();
        await wait(35);
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        return {
          dialogOpen: document.getElementById("discard-dialog")?.open,
          marker: trigger.dataset.discardKind || null,
          puzzleId: resume?.puzzleId
        };
      })()`);
      check(!unguarded.dialogOpen && unguarded.marker === null && unguarded.puzzleId && unguarded.puzzleId !== fixture.focusId, `${fixture.name} guard-disabled rollback launch proceeds and excludes disabled Focus`, JSON.stringify(unguarded));

      await navigate(fixture.game, { width: 390, height: 844 }, {
        query: fixture.name === "Sudoku" ? "?game=sudoku&difficulty=easy&mode=classic" : "?game=suguru&level=size5-easy&mode=classic",
        storageEntries: { [fixture.statsKey]: seed.stats },
        beforeLoadSource: disabledSource
      });
      const fallback = await client.evaluate(`({
        disabled: Object.values(window[${JSON.stringify(fixture.globalName)}]).flat().find((entry) => entry.id === ${JSON.stringify(fixture.focusId)})?.selectable === false,
        title: document.getElementById("rail-next-step-title")?.textContent.trim()
      })`);
      check(fallback.disabled && !/Pair Focus/.test(fallback.title || "") && /(Daily|waiting)/.test(fallback.title || ""), `${fixture.name} disabled Focus makes Compass fall through to Daily`, JSON.stringify(fallback));
      check(runtimeErrors(client.events).length === 0, `${fixture.name} forward rollback drill has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }
  });

  await runScenario("pre-side-effect progress discard guard", async () => {
    for (const fixture of [
      { game: sudoku, resumeKey: SUDOKU_RESUME_KEY, statsKey: SUDOKU_STATS_KEY, library: "window.SUDOKU_PUZZLES", name: "Sudoku" },
      { game: suguru, resumeKey: SUGURU_RESUME_KEY, statsKey: SUGURU_STATS_KEY, library: "window.SUGURU_PUZZLES", name: "Suguru" }
    ]) {
      await navigate(fixture.game, { width: 390, height: 844 }, { beforeLoadSource: practiceWriteProbeSource() });
      const timerOnly = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        await wait(1050);
        document.getElementById("new-game-button")?.click();
        await wait(25);
        return {
          dialogOpen: document.getElementById("discard-dialog")?.open,
          practiceWrites: window.__PRACTICE_ROTATION_WRITES,
          resume: JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null")
        };
      })()`);
      check(!timerOnly.dialogOpen && timerOnly.practiceWrites === 1, `${fixture.name} timer-only board bypasses discard confirmation`, JSON.stringify(timerOnly));

      const opened = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const puzzle = Object.values(${fixture.library}).flat().find((entry) => entry.id === resume?.puzzleId);
        const cell = [...document.querySelectorAll(".cell")].find((candidate) => !candidate.disabled && !candidate.classList.contains("given"));
        const index = Number(cell?.dataset.index);
        const value = puzzle.solution[index];
        cell?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === value && !button.disabled)?.click();
        await wait(20);
        const storageBefore = JSON.stringify(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]));
        const urlBefore = location.href;
        const timerBefore = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null")?.secondsElapsed;
        const trigger = document.getElementById("new-game-button");
        trigger.focus();
        trigger.click();
        await wait(30);
        return {
          storageBefore,
          storageAfterOpen: JSON.stringify(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])),
          urlBefore,
          urlAfterOpen: location.href,
          timerBefore,
          dialogOpen: document.getElementById("discard-dialog")?.open,
          modal: document.getElementById("discard-dialog")?.matches(":modal"),
          title: document.getElementById("discard-dialog-title")?.textContent.trim(),
          description: document.getElementById("discard-dialog-description")?.textContent.trim(),
          keepFocused: document.activeElement?.id === "discard-keep-button",
          pauseHidden: document.getElementById("pause-overlay")?.hidden,
          resultHidden: document.getElementById("victory-overlay")?.hidden,
          markers: {
            newGame: trigger?.dataset.discardKind || null,
            restart: document.getElementById("reset-button")?.dataset.discardKind || null,
            rail: document.getElementById("rail-next-step-button")?.dataset.discardKind || null,
            preserve: document.getElementById(${JSON.stringify(fixture.name === "Sudoku" ? "hero-primary-button" : "hero-daily-button")})?.dataset.discardKind || null
          }
        };
      })()`);
      await sleep(1150);
      const held = await client.evaluate(`(() => {
        Object.defineProperty(document, "hidden", { configurable: true, value: true });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "hidden", { configurable: true, value: false });
        document.dispatchEvent(new Event("visibilitychange"));
        delete document.hidden;
        return {
          storage: JSON.stringify(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])),
          url: location.href,
          seconds: JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null")?.secondsElapsed,
          dialogOpen: document.getElementById("discard-dialog")?.open,
          pauseHidden: document.getElementById("pause-overlay")?.hidden
        };
      })()`);
      check(opened.dialogOpen && opened.modal && opened.title === "Replace this board?" && opened.keepFocused, `${fixture.name} opens an accessible replace decision with safe default focus`, JSON.stringify(opened));
      const expectedLossSummary = "entries, notes, elapsed time, mistakes, and solver-aid history";
      const hasGameSpecificAbandonmentCopy = fixture.name === "Sudoku"
        ? /recorded as abandoned/.test(opened.description || "")
        : !/abandon/i.test(opened.description || "");
      check(opened.description?.includes(expectedLossSummary) && hasGameSpecificAbandonmentCopy && !/This replaces the current board/.test(opened.description), `${fixture.name} replace copy names actual losses and only promises supported abandonment records`, opened.description);
      check(opened.storageBefore === opened.storageAfterOpen && opened.storageBefore === held.storage && opened.urlBefore === held.url && opened.timerBefore === held.seconds, `${fixture.name} replace decision freezes storage, URL, and timer before consent`, JSON.stringify({ opened, held }));
      check(held.dialogOpen && held.pauseHidden && opened.pauseHidden && opened.resultHidden, `${fixture.name} visibility change cannot layer pause/result UI over discard decision`, JSON.stringify({ opened, held }));
      check(opened.markers.newGame === "replace" && opened.markers.restart === "restart" && opened.markers.rail === null && opened.markers.preserve === null, `${fixture.name} marks replace/restart actions without marking current-board actions`, JSON.stringify(opened.markers));

      await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
      await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
      const tabbed = await client.evaluate(`({ focus: document.activeElement?.id, inside: document.getElementById("discard-dialog")?.contains(document.activeElement) })`);
      check(tabbed.inside && tabbed.focus === "discard-confirm-button", `${fixture.name} native modal traps Tab within its two decisions`, JSON.stringify(tabbed));
      await client.evaluate(`document.getElementById("discard-keep-button")?.focus()`);

      await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await sleep(1150);
      const kept = await client.evaluate(`({
        open: document.getElementById("discard-dialog")?.open,
        focus: document.activeElement?.id,
        seconds: JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null")?.secondsElapsed,
        board: JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null")?.board,
        url: location.href
      })`);
      check(!kept.open && kept.focus === "new-game-button" && kept.seconds > opened.timerBefore && kept.url === opened.urlBefore, `${fixture.name} Keep restores invoker focus and prior timer state`, JSON.stringify(kept));

      await client.evaluate(`document.getElementById("new-game-button")?.click()`);
      await sleep(25);
      await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await sleep(60);
      const escaped = await client.evaluate(`({ open: document.getElementById("discard-dialog")?.open, focus: document.activeElement?.id })`);
      check(!escaped.open && escaped.focus === "new-game-button", `${fixture.name} Escape cancels and restores invoker focus`, JSON.stringify(escaped));

      const beforeConfirm = await client.evaluate(`(() => {
        const stats = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.statsKey)}) || "null");
        document.getElementById("new-game-button")?.click();
        return { practiceWrites: window.__PRACTICE_ROTATION_WRITES, abandoned: stats?.overall?.abandoned ?? null };
      })()`);
      await sleep(20);
      await client.evaluate(`document.getElementById("discard-confirm-button")?.click()`);
      await sleep(40);
      const confirmed = await client.evaluate(`(() => {
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const stats = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.statsKey)}) || "null");
        return {
          open: document.getElementById("discard-dialog")?.open,
          practiceWrites: window.__PRACTICE_ROTATION_WRITES,
          abandoned: stats?.overall?.abandoned ?? null,
          resume,
          htmlLocked: document.documentElement.classList.contains("discard-dialog-open")
        };
      })()`);
      check(!confirmed.open && !confirmed.htmlLocked && confirmed.practiceWrites === beforeConfirm.practiceWrites + 1, `${fixture.name} Replace replays the exact launch once`, JSON.stringify({ beforeConfirm, confirmed }));
      if (fixture.name === "Sudoku") check(confirmed.abandoned === beforeConfirm.abandoned + 1, "Sudoku confirmed replacement records exactly one abandon", JSON.stringify({ beforeConfirm, confirmed }));

      const restartOpened = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const puzzle = Object.values(${fixture.library}).flat().find((entry) => entry.id === resume?.puzzleId);
        const cell = [...document.querySelectorAll(".cell")].find((candidate) => !candidate.disabled && !candidate.classList.contains("given"));
        const index = Number(cell?.dataset.index);
        const value = puzzle.solution[index];
        cell?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === value && !button.disabled)?.click();
        await wait(15);
        const writes = window.__PRACTICE_ROTATION_WRITES;
        const stats = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.statsKey)}) || "null");
        document.getElementById("reset-button")?.click();
        await wait(20);
        return {
          open: document.getElementById("discard-dialog")?.open,
          title: document.getElementById("discard-dialog-title")?.textContent.trim(),
          description: document.getElementById("discard-dialog-description")?.textContent.trim(),
          confirm: document.getElementById("discard-confirm-button")?.textContent.trim(),
          writes,
          abandoned: stats?.overall?.abandoned ?? null
        };
      })()`);
      check(restartOpened.open && restartOpened.title === "Restart this board?" && restartOpened.confirm === "Restart board" && restartOpened.description?.includes("entries, notes, elapsed time, mistakes, and solver-aid history") && !/abandon/i.test(restartOpened.description), `${fixture.name} uses action-specific Restart confirmation with complete loss copy`, JSON.stringify(restartOpened));
      await client.evaluate(`document.getElementById("discard-confirm-button")?.click()`);
      await sleep(35);
      const restarted = await client.evaluate(`(() => {
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const puzzle = Object.values(${fixture.library}).flat().find((entry) => entry.id === resume?.puzzleId);
        const stats = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.statsKey)}) || "null");
        return {
          pristine: JSON.stringify(resume?.board) === JSON.stringify(puzzle?.puzzle.split("").map(Number)),
          writes: window.__PRACTICE_ROTATION_WRITES,
          abandoned: stats?.overall?.abandoned ?? null,
          open: document.getElementById("discard-dialog")?.open
        };
      })()`);
      check(restarted.pristine && !restarted.open && restarted.writes === restartOpened.writes, `${fixture.name} Restart clears progress once without consuming practice rotation`, JSON.stringify(restarted));
      if (fixture.name === "Sudoku") check(restarted.abandoned === restartOpened.abandoned, "Sudoku restart does not record an abandon", JSON.stringify({ restartOpened, restarted }));

      const noopOpened = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const resume = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const puzzle = Object.values(${fixture.library}).flat().find((entry) => entry.id === resume?.puzzleId);
        const cell = [...document.querySelectorAll(".cell")].find((candidate) => !candidate.disabled && !candidate.classList.contains("given"));
        const index = Number(cell?.dataset.index);
        const value = puzzle.solution[index];
        cell?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === value && !button.disabled)?.click();
        await wait(15);
        window.__NOOP_DISCARD_RUNS = 0;
        const button = document.createElement("button");
        button.id = "noop-discard-action";
        button.dataset.discardKind = "replace";
        button.textContent = "Unavailable board";
        button.addEventListener("click", () => { window.__NOOP_DISCARD_RUNS += 1; });
        document.body.appendChild(button);
        button.click();
        await wait(20);
        return { seconds: JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null")?.secondsElapsed, open: document.getElementById("discard-dialog")?.open };
      })()`);
      await client.evaluate(`document.getElementById("discard-confirm-button")?.click()`);
      await sleep(1150);
      const noopConfirmed = await client.evaluate(`({
        runs: window.__NOOP_DISCARD_RUNS,
        seconds: JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null")?.secondsElapsed,
        open: document.getElementById("discard-dialog")?.open
      })`);
      check(noopOpened.open && noopConfirmed.runs === 1 && !noopConfirmed.open && noopConfirmed.seconds > noopOpened.seconds, `${fixture.name} unchanged/failed replacement resumes the original timer after one replay`, JSON.stringify({ noopOpened, noopConfirmed }));
      check(runtimeErrors(client.events).length === 0, `${fixture.name} discard guard has no runtime exception`, runtimeErrors(client.events).join(" | "));
    }

    for (const fixture of [
      { game: sudoku, resumeKey: SUDOKU_RESUME_KEY, library: "window.SUDOKU_PUZZLES", name: "Sudoku", aidId: "hint-button" },
      { game: suguru, resumeKey: SUGURU_RESUME_KEY, library: "window.SUGURU_PUZZLES", name: "Suguru", aidId: "nudge-button" }
    ]) {
      for (const progressKind of ["note", "aid", "check", "mistake"]) {
        const query = progressKind === "note" ? "?notes=on" : progressKind === "mistake" ? "?mode=nomistakes" : "";
        await navigate(fixture.game, { width: 390, height: 844 }, { query });
        const outcome = await client.evaluate(`(async () => {
          const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
          const kind = ${JSON.stringify(progressKind)};
          const readResume = () => JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
          const before = readResume();
          const puzzle = Object.values(${fixture.library}).flat().find((entry) => entry.id === before?.puzzleId);
          if (kind === "aid") {
            document.getElementById(${JSON.stringify(fixture.aidId)})?.click();
          } else if (kind === "check") {
            document.getElementById("check-button")?.click();
          } else {
            if (kind === "note") {
              const toggle = document.getElementById("notes-toggle");
              toggle.checked = true;
              toggle.dispatchEvent(new Event("change", { bubbles: true }));
            }
            for (const cell of document.querySelectorAll(".cell")) {
              const index = Number(cell.dataset.index);
              if (puzzle.puzzle[index] !== "0") continue;
              cell.click();
              const buttons = [...document.querySelectorAll(".number-button")].filter((button) => !button.disabled);
              const button = kind === "mistake"
                ? buttons.find((candidate) => candidate.dataset.value !== puzzle.solution[index])
                : buttons[0];
              if (button) {
                button.click();
                break;
              }
            }
          }
          await wait(20);
          const progressed = readResume();
          const message = document.getElementById("game-message")?.textContent.trim();
          const evidence = kind === "note"
            ? progressed?.notes?.some((notes) => notes.length > 0)
            : kind === "aid"
              ? ((progressed?.hintsUsed || progressed?.nudgesUsed || 0) > 0)
              : kind === "check"
                ? /No mistakes spotted|No incorrect values/.test(message || "")
                : progressed?.mistakes > 0 && JSON.stringify(progressed?.board) === JSON.stringify(puzzle.puzzle.split("").map(Number));
          document.getElementById("new-game-button")?.click();
          await wait(25);
          return { open: document.getElementById("discard-dialog")?.open, evidence, message };
        })()`);
        check(outcome.open && outcome.evidence, `${fixture.name} ${progressKind} progress requires discard confirmation`, JSON.stringify(outcome));
      }

      await navigate(fixture.game, { width: 390, height: 844 }, {
        beforeLoadSource: practiceWriteProbeSource(noSupportedAidSource())
      });
      const unsupportedAid = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        document.getElementById(${JSON.stringify(fixture.aidId)})?.click();
        await wait(15);
        const message = document.getElementById("game-message")?.textContent.trim();
        const writesBefore = window.__PRACTICE_ROTATION_WRITES;
        document.getElementById("new-game-button")?.click();
        await wait(30);
        return {
          dialogOpen: document.getElementById("discard-dialog")?.open,
          message,
          writesBefore,
          writesAfter: window.__PRACTICE_ROTATION_WRITES
        };
      })()`);
      check(!unsupportedAid.dialogOpen && /No supported single-step deduction/.test(unsupportedAid.message || "") && unsupportedAid.writesAfter === unsupportedAid.writesBefore + 1, `${fixture.name} unsuccessful aid remains timer-only and bypasses confirmation`, JSON.stringify(unsupportedAid));

      await navigate(fixture.game, { width: 390, height: 844 });
      const pausedBefore = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const readResume = () => JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        const before = readResume();
        const puzzle = Object.values(${fixture.library}).flat().find((entry) => entry.id === before?.puzzleId);
        const index = puzzle.puzzle.indexOf("0");
        document.querySelector('.cell[data-index="' + index + '"]')?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === puzzle.solution[index] && !button.disabled)?.click();
        await wait(15);
        document.getElementById("pause-button")?.click();
        await wait(15);
        const progress = readResume();
        const rect = document.getElementById("new-game-button")?.getBoundingClientRect();
        return {
          puzzleId: progress?.puzzleId,
          board: JSON.stringify(progress?.board),
          point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        };
      })()`);
      await client.send("Input.dispatchMouseEvent", { type: "mousePressed", x: pausedBefore.point.x, y: pausedBefore.point.y, button: "left", clickCount: 1 });
      await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pausedBefore.point.x, y: pausedBefore.point.y, button: "left", clickCount: 1 });
      await sleep(25);
      const paused = await client.evaluate(`(() => {
        const after = JSON.parse(localStorage.getItem(${JSON.stringify(fixture.resumeKey)}) || "null");
        return {
          dialogOpen: document.getElementById("discard-dialog")?.open,
          pauseVisible: !document.getElementById("pause-overlay")?.hidden,
          puzzleId: after?.puzzleId,
          board: JSON.stringify(after?.board)
        };
      })()`);
      check(!paused.dialogOpen && paused.pauseVisible && paused.puzzleId === pausedBefore.puzzleId && paused.board === pausedBefore.board, `${fixture.name} paused board cannot open or execute a background discard decision`, JSON.stringify({ pausedBefore, paused }));
    }

    for (const game of [sudoku, suguru]) {
      for (const viewport of [{ width: 320, height: 568 }, { width: 1440, height: 1000 }]) {
        await navigate(game, viewport);
        const compact = await client.evaluate(`(async () => {
        const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
        const resumeKey = ${game.name === "Sudoku" ? JSON.stringify(SUDOKU_RESUME_KEY) : JSON.stringify(SUGURU_RESUME_KEY)};
        const pools = ${game.name === "Sudoku" ? "window.SUDOKU_PUZZLES" : "window.SUGURU_PUZZLES"};
        const resume = JSON.parse(localStorage.getItem(resumeKey));
        const puzzle = Object.values(pools).flat().find((entry) => entry.id === resume?.puzzleId);
        const cell = [...document.querySelectorAll(".cell")].find((candidate) => !candidate.disabled && !candidate.classList.contains("given"));
        const index = Number(cell?.dataset.index);
        const value = puzzle.solution[index];
        cell?.click();
        [...document.querySelectorAll(".number-button")].find((button) => button.dataset.value === value && !button.disabled)?.click();
        await wait(15);
        document.getElementById("new-game-button")?.click();
        await wait(25);
        document.documentElement.style.fontSize = "200%";
        await wait(25);
        const dialog = document.getElementById("discard-dialog").getBoundingClientRect();
        const actions = [...document.querySelectorAll(".discard-dialog-actions .action-button")].map((button) => button.getBoundingClientRect());
        return {
          open: document.getElementById("discard-dialog")?.open,
          dialog: { left: dialog.left, right: dialog.right, top: dialog.top, bottom: dialog.bottom },
          viewport: { width: innerWidth, height: innerHeight },
          actions: actions.map((rect) => ({ width: rect.width, height: rect.height }))
        };
        })()`);
        check(compact.open && compact.dialog.left >= 0 && compact.dialog.right <= compact.viewport.width && compact.dialog.top >= 0 && compact.dialog.bottom <= compact.viewport.height, `${game.name} discard dialog fits ${viewport.width}px at 200% text`, JSON.stringify(compact));
        check(compact.actions.length === 2 && compact.actions.every((rect) => rect.height >= 44 && rect.width > 0), `${game.name} discard dialog keeps 44px actions at ${viewport.width}px`, JSON.stringify(compact));
      }
    }
  });

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
