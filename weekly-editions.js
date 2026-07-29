(function () {
  "use strict";
  const VERSION = 1;
  const FIELD_SEPARATOR = "\u001f";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  const MANIFEST = deepFreeze({
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
});

  function hashText(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getPuzzleFingerprint(difficulty, puzzle) {
    if (!puzzle || typeof puzzle !== "object") return null;
    return hashText([difficulty, puzzle.id, puzzle.puzzle, puzzle.solution].join(FIELD_SEPARATOR));
  }

  function validateBand(difficulty, puzzleLibrary) {
    const expected = MANIFEST[difficulty];
    if (!expected) return { ok: false, reason: "unknown-difficulty", memberCount: 0 };
    const pool = puzzleLibrary?.[difficulty];
    if (!Array.isArray(pool)) return { ok: false, reason: "missing-band", memberCount: 0 };
    const ordered = [];
    for (let index = 0; index < expected.ids.length; index += 1) {
      const id = expected.ids[index];
      const matches = pool.filter((entry) => entry?.id === id);
      if (matches.length !== 1) return { ok: false, reason: (matches.length ? "duplicate-member:" : "missing-member:") + id, memberCount: ordered.length };
      const puzzle = matches[0];
      if (puzzle.difficulty !== difficulty) return { ok: false, reason: "band-mismatch:" + id, memberCount: ordered.length };
      if (getPuzzleFingerprint(difficulty, puzzle) !== expected.fingerprints[index]) return { ok: false, reason: "fingerprint-mismatch:" + id, memberCount: ordered.length };
      ordered.push(puzzle);
    }
    return { ok: true, reason: null, memberCount: ordered.length, pool: Object.freeze(ordered) };
  }

  function validateRegistry(puzzleLibrary) {
    let memberCount = 0;
    for (const difficulty of Object.keys(MANIFEST)) {
      const result = validateBand(difficulty, puzzleLibrary);
      if (!result.ok) return { ...result, memberCount };
      memberCount += result.memberCount;
    }
    return { ok: true, reason: null, memberCount };
  }

  function resolve({ weekKey, pathId, stepId, difficulty, mode, puzzleLibrary }) {
    if (![weekKey, pathId, stepId, difficulty, mode].every((value) => typeof value === "string" && value)) return { ok: false, reason: "invalid-weekly-request" };
    const result = validateBand(difficulty, puzzleLibrary);
    if (!result.ok) return { ok: false, reason: "weekly-v1-unavailable", detail: result.reason };
    const seed = weekKey + "-" + pathId + "-" + stepId + "-" + difficulty + "-" + mode;
    const puzzle = result.pool[hashText(seed) % result.pool.length] || null;
    return puzzle ? { ok: true, reason: null, puzzle } : { ok: false, reason: "weekly-v1-unavailable", detail: "empty-selection" };
  }

  window.WeeklyEditions = Object.freeze({
    version: VERSION,
    hashText,
    getManifest: () => MANIFEST,
    getPuzzleFingerprint,
    validateBand,
    validateRegistry,
    resolve
  });
})();
