(function () {
  const VERSION = 1;
  const FIELD_SEPARATOR = "\u001f";
  const CORPUS_IDS = Object.freeze({
    sudoku: "sudoku-daily-v1",
    suguru: "suguru-daily-v1"
  });
  const MANIFESTS = Object.freeze({
  "sudoku": {
    "easy": {
      "ids": [
        "easy-calm-start-a-r0",
        "easy-calm-start-a-r1",
        "easy-calm-start-a-r2",
        "easy-calm-start-b-r0",
        "easy-calm-start-b-r1",
        "easy-calm-start-b-r2",
        "easy-calm-start-c-r0",
        "easy-calm-start-c-r1",
        "easy-calm-start-c-r2",
        "easy-morning-flow-a-r0",
        "easy-morning-flow-a-r1",
        "easy-morning-flow-a-r2",
        "easy-morning-flow-b-r0",
        "easy-morning-flow-b-r1",
        "easy-morning-flow-b-r2",
        "easy-morning-flow-c-r0",
        "easy-morning-flow-c-r1",
        "easy-morning-flow-c-r2",
        "easy-garden-path-a-r0",
        "easy-garden-path-a-r1",
        "easy-garden-path-a-r2",
        "easy-garden-path-b-r0",
        "easy-garden-path-b-r1",
        "easy-garden-path-b-r2",
        "easy-garden-path-c-r0",
        "easy-garden-path-c-r1",
        "easy-garden-path-c-r2"
      ],
      "fingerprints": [
        2019543101,
        1177096964,
        673203091,
        124596183,
        253930254,
        438005589,
        895945555,
        1234419614,
        2126984687,
        685458946,
        1880324275,
        1516876744,
        489443705,
        846867792,
        1590055731,
        501003267,
        614960228,
        1536680069,
        541702826,
        923953169,
        899314320,
        988659191,
        746993024,
        1513260627,
        780842757,
        1712913496,
        2127773021
      ]
    },
    "medium": {
      "ids": [
        "medium-balanced-logic-a-r0",
        "medium-balanced-logic-a-r1",
        "medium-balanced-logic-a-r2",
        "medium-balanced-logic-b-r0",
        "medium-balanced-logic-b-r1",
        "medium-balanced-logic-b-r2",
        "medium-balanced-logic-c-r0",
        "medium-balanced-logic-c-r1",
        "medium-balanced-logic-c-r2",
        "medium-steady-focus-a-r0",
        "medium-steady-focus-a-r1",
        "medium-steady-focus-a-r2",
        "medium-steady-focus-b-r0",
        "medium-steady-focus-b-r1",
        "medium-steady-focus-b-r2",
        "medium-steady-focus-c-r0",
        "medium-steady-focus-c-r1",
        "medium-steady-focus-c-r2",
        "medium-paper-lantern-a-r0",
        "medium-paper-lantern-a-r1",
        "medium-paper-lantern-a-r2",
        "medium-paper-lantern-b-r0",
        "medium-paper-lantern-b-r1",
        "medium-paper-lantern-b-r2",
        "medium-paper-lantern-c-r0",
        "medium-paper-lantern-c-r1",
        "medium-paper-lantern-c-r2",
        "medium-koi-cascade-a-r0",
        "medium-koi-cascade-a-r1",
        "medium-koi-cascade-a-r2",
        "medium-koi-cascade-b-r0",
        "medium-koi-cascade-b-r1",
        "medium-koi-cascade-b-r2",
        "medium-koi-cascade-c-r0",
        "medium-koi-cascade-c-r1",
        "medium-koi-cascade-c-r2"
      ],
      "fingerprints": [
        1019791812,
        1464649269,
        1203600290,
        1159862163,
        1288587166,
        1384573687,
        799873748,
        1714278231,
        2016907114,
        1265079764,
        1398743593,
        840120976,
        256633498,
        1216458187,
        1727343260,
        1715198154,
        757613335,
        1916705014,
        268642817,
        1204392646,
        860111435,
        75191334,
        855875279,
        745767060,
        1872762519,
        493935506,
        14758339,
        1345072131,
        653912084,
        1459261997,
        2056119273,
        1501729826,
        2084089533,
        1182320840,
        687906711,
        1117097354
      ]
    },
    "advanced": {
      "ids": [
        "advanced-rising-bridge-a-r0",
        "advanced-rising-bridge-a-r1",
        "advanced-rising-bridge-a-r2",
        "advanced-rising-bridge-b-r0",
        "advanced-rising-bridge-b-r1",
        "advanced-rising-bridge-b-r2",
        "advanced-rising-bridge-c-r0",
        "advanced-rising-bridge-c-r1",
        "advanced-rising-bridge-c-r2",
        "advanced-evening-lantern-a-r0",
        "advanced-evening-lantern-a-r1",
        "advanced-evening-lantern-a-r2",
        "advanced-evening-lantern-b-r0",
        "advanced-evening-lantern-b-r1",
        "advanced-evening-lantern-b-r2",
        "advanced-evening-lantern-c-r0",
        "advanced-evening-lantern-c-r1",
        "advanced-evening-lantern-c-r2",
        "advanced-garden-echo-a-r0",
        "advanced-garden-echo-a-r1",
        "advanced-garden-echo-a-r2",
        "advanced-garden-echo-b-r0",
        "advanced-garden-echo-b-r1",
        "advanced-garden-echo-b-r2",
        "advanced-garden-echo-c-r0",
        "advanced-garden-echo-c-r1",
        "advanced-garden-echo-c-r2",
        "advanced-cedar-path-a-r0",
        "advanced-cedar-path-a-r1",
        "advanced-cedar-path-a-r2",
        "advanced-cedar-path-b-r0",
        "advanced-cedar-path-b-r1",
        "advanced-cedar-path-b-r2",
        "advanced-cedar-path-c-r0",
        "advanced-cedar-path-c-r1",
        "advanced-cedar-path-c-r2",
        "advanced-stone-rhythm-a-r0",
        "advanced-stone-rhythm-a-r1",
        "advanced-stone-rhythm-a-r2",
        "advanced-stone-rhythm-b-r0",
        "advanced-stone-rhythm-b-r1",
        "advanced-stone-rhythm-b-r2",
        "advanced-stone-rhythm-c-r0",
        "advanced-stone-rhythm-c-r1",
        "advanced-stone-rhythm-c-r2"
      ],
      "fingerprints": [
        1363930535,
        1367565966,
        318228541,
        1404983993,
        898510714,
        2097714833,
        561437793,
        344890734,
        862122007,
        328685931,
        1300325408,
        37730659,
        404872608,
        920463415,
        747901124,
        1680812755,
        1808175652,
        979939125,
        740042704,
        1351502331,
        2004262198,
        328873846,
        986914933,
        446274886,
        494587541,
        1871420376,
        16931479,
        1669373656,
        1708284385,
        1307398818,
        280459888,
        489709793,
        1625875908,
        1679120803,
        1012522632,
        784788675,
        2041056383,
        1728770746,
        479328957,
        60039123,
        1431318630,
        1777520175,
        1507020341,
        231532972,
        1621266899
      ]
    },
    "hard": {
      "ids": [
        "hard-quiet-precision-a-r0",
        "hard-quiet-precision-a-r1",
        "hard-quiet-precision-a-r2",
        "hard-quiet-precision-b-r0",
        "hard-quiet-precision-b-r1",
        "hard-quiet-precision-b-r2",
        "hard-quiet-precision-c-r0",
        "hard-quiet-precision-c-r1",
        "hard-quiet-precision-c-r2",
        "hard-winter-ink-a-r0",
        "hard-winter-ink-a-r1",
        "hard-winter-ink-a-r2",
        "hard-winter-ink-b-r0",
        "hard-winter-ink-b-r1",
        "hard-winter-ink-b-r2",
        "hard-winter-ink-c-r0",
        "hard-winter-ink-c-r1",
        "hard-winter-ink-c-r2",
        "hard-river-shoji-a-r0",
        "hard-river-shoji-a-r1",
        "hard-river-shoji-a-r2",
        "hard-river-shoji-b-r0",
        "hard-river-shoji-b-r1",
        "hard-river-shoji-b-r2",
        "hard-river-shoji-c-r0",
        "hard-river-shoji-c-r1",
        "hard-river-shoji-c-r2"
      ],
      "fingerprints": [
        420017063,
        2022549714,
        98930137,
        905725332,
        1295254003,
        299688804,
        1281343530,
        1781005813,
        1661262578,
        1011835142,
        1139155903,
        1569713256,
        980524248,
        919481517,
        941869848,
        1258994194,
        377886463,
        17190164,
        1165839048,
        1863268933,
        2032778002,
        1231712015,
        1579330336,
        400358907,
        1921180033,
        863004762,
        498917945
      ]
    },
    "expert": {
      "ids": [
        "expert-deep-logic-a-r0",
        "expert-deep-logic-a-r1",
        "expert-deep-logic-a-r2",
        "expert-deep-logic-b-r0",
        "expert-deep-logic-b-r1",
        "expert-deep-logic-b-r2",
        "expert-deep-logic-c-r0",
        "expert-deep-logic-c-r1",
        "expert-deep-logic-c-r2",
        "expert-no-mercy-a-r0",
        "expert-no-mercy-a-r1",
        "expert-no-mercy-a-r2",
        "expert-no-mercy-b-r0",
        "expert-no-mercy-b-r1",
        "expert-no-mercy-b-r2",
        "expert-no-mercy-c-r0",
        "expert-no-mercy-c-r1",
        "expert-no-mercy-c-r2",
        "expert-midnight-koi-a-r0",
        "expert-midnight-koi-a-r1",
        "expert-midnight-koi-a-r2",
        "expert-midnight-koi-b-r0",
        "expert-midnight-koi-b-r1",
        "expert-midnight-koi-b-r2",
        "expert-midnight-koi-c-r0",
        "expert-midnight-koi-c-r1",
        "expert-midnight-koi-c-r2"
      ],
      "fingerprints": [
        181761677,
        418515222,
        187265001,
        637712426,
        1126007351,
        1580732246,
        1589107975,
        1652541152,
        1671334575,
        1155086063,
        1753284378,
        432094247,
        927876825,
        838934816,
        1193434141,
        1461460048,
        196130853,
        1611997138,
        76533876,
        1888941167,
        875974446,
        963439183,
        1957823886,
        1336887425,
        1707251049,
        239874762,
        2071372527
      ]
    }
  },
  "suguru": {
    "size5-easy": {
      "ids": [
        "suguru-size5-garden-path",
        "suguru-size5-morning-rhythm",
        "suguru-size5-brook-lantern",
        "suguru-size5-cascade-lantern"
      ],
      "fingerprints": [
        1381972870,
        770164186,
        1557474609,
        1956051182
      ]
    },
    "size5-medium": {
      "ids": [
        "suguru-size5-bridge-garden",
        "suguru-size5-lantern-bridge",
        "suguru-size5-petal-crossing",
        "suguru-size5-lantern-echo",
        "suguru-size5-brook-bridge",
        "suguru-size5-cascade-bridge"
      ],
      "fingerprints": [
        1966501666,
        1532681353,
        737906741,
        1134040777,
        822284232,
        2096231603
      ]
    },
    "size5-challenge": {
      "ids": [
        "suguru-size5-garden-challenge",
        "suguru-size5-quiet-koi",
        "suguru-size5-garden-deep-night",
        "suguru-size5-lantern-deep-night",
        "suguru-size5-brook-deep-night",
        "suguru-size5-garden-midnight-path",
        "suguru-size5-lantern-midnight-path",
        "suguru-size5-brook-midnight-path",
        "suguru-size5-cascade-midnight-path"
      ],
      "fingerprints": [
        21499246,
        2089742980,
        1815444391,
        1317435569,
        1630759025,
        599921263,
        500861941,
        2074089796,
        1186564531
      ]
    }
  }
});
  const SUDOKU_SPECIALS = Object.freeze([
    Object.freeze({ id: "petal-daily", title: "Petal Daily", focus: "Visible symbol rhythm", symbolTheme: "petals", legendMode: "visible" }),
    Object.freeze({ id: "moon-memory-daily", title: "Moon Memory Daily", focus: "Faded symbol recall", symbolTheme: "moon", legendMode: "faded" }),
    Object.freeze({ id: "hidden-legend-daily", title: "Hidden Legend Daily", focus: "Pure memory spotlight", symbolTheme: "petals", legendMode: "hidden" })
  ]);

  function hashText(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getLocalDateKey(date = new Date()) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function parseEditionDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }

  function isValidEditionDate(value) {
    return Boolean(parseEditionDate(value));
  }

  function isFutureEdition(edition, today = getLocalDateKey()) {
    return isValidEditionDate(edition) && isValidEditionDate(today) && edition > today;
  }

  function getPreviousDateKey(value) {
    const date = parseEditionDate(value);
    if (!date) return null;
    date.setUTCDate(date.getUTCDate() - 1);
    return `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function formatEditionDate(value, options = {}) {
    const date = parseEditionDate(value);
    if (!date) return value || "Unknown date";
    return new Intl.DateTimeFormat(undefined, {
      month: options.long ? "long" : "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function getCurrentCorpusId(gameId) {
    return CORPUS_IDS[gameId] || null;
  }

  function getManifest(gameId) {
    return MANIFESTS[gameId] || null;
  }

  function getPuzzleFingerprint(gameId, band, puzzle) {
    if (!puzzle || typeof puzzle !== "object") return null;
    if (gameId === "sudoku") {
      return hashText([band, puzzle.id, puzzle.puzzle, puzzle.solution].join(FIELD_SEPARATOR));
    }
    if (gameId === "suguru") {
      if (!Array.isArray(puzzle.cageMap)) return null;
      return hashText([band, puzzle.id, puzzle.puzzle, puzzle.solution, puzzle.size, puzzle.cageMap.join(",")].join(FIELD_SEPARATOR));
    }
    return null;
  }

  function validateCorpus(gameId, puzzleLibrary) {
    const manifest = getManifest(gameId);
    if (!manifest || !puzzleLibrary || typeof puzzleLibrary !== "object" || Array.isArray(puzzleLibrary)) {
      return { ok: false, reason: "invalid-corpus-library", memberCount: 0 };
    }
    let memberCount = 0;
    for (const [band, expected] of Object.entries(manifest)) {
      const pool = puzzleLibrary[band];
      if (!Array.isArray(pool)) return { ok: false, reason: `missing-band:${band}`, memberCount };
      for (let index = 0; index < expected.ids.length; index += 1) {
        const id = expected.ids[index];
        const matches = pool.filter((entry) => entry?.id === id);
        if (matches.length !== 1) {
          return { ok: false, reason: `${matches.length ? "duplicate" : "missing"}-member:${id}`, memberCount };
        }
        const puzzle = matches[0];
        if (gameId === "sudoku" && puzzle.difficulty !== band) {
          return { ok: false, reason: `band-mismatch:${id}`, memberCount };
        }
        if (getPuzzleFingerprint(gameId, band, puzzle) !== expected.fingerprints[index]) {
          return { ok: false, reason: `fingerprint-mismatch:${id}`, memberCount };
        }
        memberCount += 1;
      }
    }
    return { ok: true, reason: null, memberCount };
  }

  function resolveEdition({ gameId, band, edition, corpus, puzzleLibrary, today = getLocalDateKey() }) {
    const manifest = getManifest(gameId);
    if (!manifest) return { ok: false, reason: "unknown-game" };
    if (!Object.prototype.hasOwnProperty.call(manifest, band)) return { ok: false, reason: "unknown-band" };
    if (corpus !== getCurrentCorpusId(gameId)) return { ok: false, reason: "unknown-corpus" };
    if (!isValidEditionDate(edition)) return { ok: false, reason: "invalid-edition" };
    if (isFutureEdition(edition, today)) return { ok: false, reason: "future-edition" };
    const corpusResult = validateCorpus(gameId, puzzleLibrary);
    if (!corpusResult.ok) return { ok: false, reason: "corpus-unavailable", detail: corpusResult.reason };
    const expected = manifest[band];
    const puzzleId = expected.ids[hashText(`${band}-${edition}`) % expected.ids.length];
    const puzzle = puzzleLibrary[band].find((entry) => entry.id === puzzleId) || null;
    if (!puzzle) return { ok: false, reason: "corpus-unavailable", detail: `missing-selected:${puzzleId}` };
    const identity = Object.freeze({
      version: VERSION,
      gameId,
      corpus,
      edition,
      band,
      puzzleId
    });
    return { ok: true, reason: null, identity, puzzle };
  }

  function validateEditionIdentity(identity, { puzzleLibrary, today = getLocalDateKey() } = {}) {
    if (!identity || typeof identity !== "object" || Array.isArray(identity) || identity.version !== VERSION) {
      return { ok: false, reason: "invalid-identity" };
    }
    const resolved = resolveEdition({
      gameId: identity.gameId,
      band: identity.band,
      edition: identity.edition,
      corpus: identity.corpus,
      puzzleLibrary,
      today
    });
    if (!resolved.ok) return resolved;
    if (identity.puzzleId !== resolved.identity.puzzleId) return { ok: false, reason: "puzzle-mismatch" };
    return resolved;
  }

  function getSudokuSpecial(difficulty, edition) {
    if (!isValidEditionDate(edition)) return null;
    const eligible = SUDOKU_SPECIALS.filter((entry) => entry.legendMode !== "hidden" || ["advanced", "hard", "expert"].includes(difficulty));
    if (!eligible.length) return null;
    const seed = hashText(`daily-special-${edition}-${difficulty}`);
    if (seed % 3 !== 0) return null;
    return { ...eligible[seed % eligible.length], difficulty, edition };
  }

  function getDailyStreak(entries, today = getLocalDateKey()) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries) || !isValidEditionDate(today)) return 0;
    const dates = new Set(Object.values(entries)
      .map((entry) => entry?.edition)
      .filter((edition) => isValidEditionDate(edition) && !isFutureEdition(edition, today)));
    let cursor = dates.has(today) ? today : getPreviousDateKey(today);
    if (!dates.has(cursor)) return 0;
    let streak = 0;
    while (cursor && dates.has(cursor)) {
      streak += 1;
      cursor = getPreviousDateKey(cursor);
    }
    return streak;
  }

  window.DailyEditions = Object.freeze({
    version: VERSION,
    hashText,
    getLocalDateKey,
    isValidEditionDate,
    isFutureEdition,
    getPreviousDateKey,
    formatEditionDate,
    getCurrentCorpusId,
    getManifest,
    getPuzzleFingerprint,
    validateCorpus,
    resolveEdition,
    validateEditionIdentity,
    getSudokuSpecial,
    getDailyStreak
  });
})();
