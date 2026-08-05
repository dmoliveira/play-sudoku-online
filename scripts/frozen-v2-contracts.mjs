import { createHash } from "node:crypto";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function canonicalSerialize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical values must contain only finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalSerialize(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  throw new TypeError(`Unsupported canonical value type: ${typeof value}`);
}

export function canonicalSha256(value) {
  return createHash("sha256").update(canonicalSerialize(value), "utf8").digest("hex");
}

export function textSha256(value) {
  if (typeof value !== "string") throw new TypeError("Text hash input must be a string");
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// These reviewed hashes describe the complete v2 prefix. V3 validation compares
// only that prefix so append-only content can grow without rewriting history.
export const FROZEN_V2_CONTRACTS = deepFreeze({
  "payloadSchemaVersion": 2,
  "generatedContentV2FileSha256": "30fbd84229a02f60d2e52f415e4a2c560163c6f2943723edeaf36cac7893bc0a",
  "generated": {
    "sudokuSources": {
      "easy": [
        {
          "id": "easy-sunlit-maple",
          "sha256": "496b9518b2c9200a25df814f850e6a4ed9f5b0d5a85963c4730f80f15114999d"
        }
      ],
      "medium": [],
      "advanced": [],
      "hard": [
        {
          "id": "hard-temple-current",
          "sha256": "f55aef89e620dce1b20ff1688c171e77cba58d960b8bea73c25aa65ceda70124"
        },
        {
          "id": "hard-pair-current",
          "sha256": "e0e2e4b4a4c6830373568773cd85bbc370b2cc4c0734628ff178a51e1e7e3e9e"
        }
      ],
      "expert": [
        {
          "id": "expert-starlit-pines",
          "sha256": "e835a45f2a6d18ed084de6c495442c2a7b7cbe2f95881435aabb5029fd68b0e7"
        }
      ]
    },
    "suguruLayouts": [
      {
        "id": "mist",
        "sha256": "c571e209ceb576f09bc6f3bc4ea9589a7e78038fa9a78b0f7d2712f7a008f19f"
      },
      {
        "id": "cedar",
        "sha256": "90681d19020aeeee8a7f8abc05cc5b9e1129801537473567458d4dfa0dc3698d"
      }
    ],
    "suguruEntries": {
      "size5-easy": [
        {
          "id": "suguru-size5-mist-garden",
          "sha256": "87cbc5e883beb0e00fa64e65e394ea5e125132f7ec3295163a49477f50982fa4"
        },
        {
          "id": "suguru-size5-cedar-garden",
          "sha256": "455e0eaea70036738ea05109eed8c2936c2b48ac52b0a4550a14cd8a1795a85f"
        }
      ],
      "size5-medium": [
        {
          "id": "suguru-size5-mist-bridge",
          "sha256": "008829a476726e5736250394fe7f041a5be03ddffa11f932862583dd41f32dd3"
        },
        {
          "id": "suguru-size5-cedar-bridge",
          "sha256": "99b8d2d8ac8d325eee71e2873480123a5b6d24db7493dbde87546dfe6d8b7854"
        }
      ],
      "size5-challenge": [
        {
          "id": "suguru-size5-mist-deep-current",
          "sha256": "2c0911a18d763882b535d699c087a92d7debdbbc5a706d42ab16c7a7136bd5e1"
        },
        {
          "id": "suguru-size5-cedar-deep-night",
          "sha256": "102d437806c93748210a1d6136308fa7516d78713af7e0834aa5ff3b3d8801bc"
        },
        {
          "id": "suguru-size5-mist-pair-current",
          "sha256": "3a98d11a352c558b742770c4107778b3e7b6d533088ece4bfda5c2cb753eb985"
        }
      ]
    }
  },
  "orderedPrefixes": {
    "sudoku": {
      "easy": {
        "count": 36,
        "idsSha256": "c7e1731e539543437b8585b89564202d5de6d3f735d91a084bef976e4a7fd688"
      },
      "medium": {
        "count": 36,
        "idsSha256": "5b1cbf4fd754c7e05c531de7336fd64d1fcffcbbae0fda72286c219dfb8c9a16"
      },
      "advanced": {
        "count": 45,
        "idsSha256": "1e2565b7b7d75244c53d0e4a6ce75bfb2c8e202d3366e715cdcd8a1975cfdb43"
      },
      "hard": {
        "count": 45,
        "idsSha256": "03af48e213dd61590062859a7dd9b369e7a34af2d024e572a830413c30fdbfc3"
      },
      "expert": {
        "count": 36,
        "idsSha256": "68a8049ad30ed10797d18b3c55cd3ee3ffa85087da69469627c86f3f6d65447f"
      }
    },
    "suguru": {
      "size5-easy": {
        "count": 6,
        "idsSha256": "917e336ac669379251c169e582a02987c00f1da9a90032727da8125ee8b5ad33"
      },
      "size5-medium": {
        "count": 8,
        "idsSha256": "6d49000130f506c635b3ffd4295b66064abd8ea691c797e96236a6fd790ea4a0"
      },
      "size5-challenge": {
        "count": 12,
        "idsSha256": "8d13e6d07306cbe8e1a9c658b1492a4a07fbc6cb19f873604c788022e47486bd"
      }
    }
  },
  "focus": {
    "sudoku": {
      "id": "hard-pair-current",
      "objectSha256": "e0e2e4b4a4c6830373568773cd85bbc370b2cc4c0734628ff178a51e1e7e3e9e",
      "evidenceSha256": "f129074d1e9a1b26671e13a6168c7bc0c0ed44f3abe6721371dd01fd73d576db"
    },
    "suguru": {
      "id": "suguru-size5-mist-pair-current",
      "objectSha256": "3a98d11a352c558b742770c4107778b3e7b6d533088ece4bfda5c2cb753eb985",
      "evidenceSha256": "dbda24cea2b44ad3be4930f50aa3d229ccb187e51b7902a83b9826160f17ccd8"
    }
  },
  "daily": {
    "version": 1,
    "corpora": {
      "sudoku": "sudoku-daily-v1",
      "suguru": "suguru-daily-v1"
    },
    "manifests": {
      "sudoku": {
        "sha256": "8e42b94ed1a1c5aa774fd2843e3a430505e7dfa7be71bb4ac819bfa5bd412534",
        "bands": {
          "easy": {
            "count": 27,
            "idsSha256": "1790f4a26f055e9465bbb73d9b8d37a6c2ab8c85b06b2aeab2b218db678ddfb5",
            "fingerprintsSha256": "935c95a738210053c14c3589878e26556178e18932d1292804c0542149c1f5ca"
          },
          "medium": {
            "count": 36,
            "idsSha256": "5b1cbf4fd754c7e05c531de7336fd64d1fcffcbbae0fda72286c219dfb8c9a16",
            "fingerprintsSha256": "bf01b6ce03fec03f6aa450949dd0d076d83e21e201a05e6ca4964d6960d050fe"
          },
          "advanced": {
            "count": 45,
            "idsSha256": "1e2565b7b7d75244c53d0e4a6ce75bfb2c8e202d3366e715cdcd8a1975cfdb43",
            "fingerprintsSha256": "04e787b7a589f463f06fc7625ba8049fdb879c035309317e547061b5ad5ead58"
          },
          "hard": {
            "count": 27,
            "idsSha256": "f6b56e0006534f43678a843dd8f7206ddb91fa4593acb1bad8f2331a3755fe7d",
            "fingerprintsSha256": "209ff5a8928385b922a707a2adda2d0fe23c80d96f7e4b03eec2abc44e655dc7"
          },
          "expert": {
            "count": 27,
            "idsSha256": "0092c94ff79a552c6bbaecf3176f22b03cb1b9acbe9c7bafd86f694f77009b14",
            "fingerprintsSha256": "9ff04f5f25c63ae4ac1eb32de711195dc06e9096b9bb4a39f22aa2ba68a8afd8"
          }
        }
      },
      "suguru": {
        "sha256": "304d1514c4dd5bed64e2f1d3370f07e5e692f42dcd7b5437219c2929c9d3659a",
        "bands": {
          "size5-easy": {
            "count": 4,
            "idsSha256": "8858475948a76bc0a9a437c3b63f15966df6c12af5378449deaf988a26eb2098",
            "fingerprintsSha256": "0026be7a562784181bdd1a1e8d589b0ee5cd4b3964c6fa82197120c00aed00d1"
          },
          "size5-medium": {
            "count": 6,
            "idsSha256": "6c3f35d2926ffdca5b9501cee25489b8f073e701e7e64929568e97b2d1705dec",
            "fingerprintsSha256": "5b315bfc1616532f5a20cb41ee964ffb2943a03b2559428ab6a1f41aeb895335"
          },
          "size5-challenge": {
            "count": 9,
            "idsSha256": "a281674b27f865e0f4da0ffd188633c407736a77145a976ca2eb1f0f7bdb24c1",
            "fingerprintsSha256": "0386e66668659a3e39472c5c8ac5f4558ad9152cd4a77429fc0dac2b58c19470"
          }
        }
      }
    }
  },
  "weekly": {
    "version": 1,
    "manifest": {
      "sha256": "8e42b94ed1a1c5aa774fd2843e3a430505e7dfa7be71bb4ac819bfa5bd412534",
      "bands": {
        "easy": {
          "count": 27,
          "idsSha256": "1790f4a26f055e9465bbb73d9b8d37a6c2ab8c85b06b2aeab2b218db678ddfb5",
          "fingerprintsSha256": "935c95a738210053c14c3589878e26556178e18932d1292804c0542149c1f5ca"
        },
        "medium": {
          "count": 36,
          "idsSha256": "5b1cbf4fd754c7e05c531de7336fd64d1fcffcbbae0fda72286c219dfb8c9a16",
          "fingerprintsSha256": "bf01b6ce03fec03f6aa450949dd0d076d83e21e201a05e6ca4964d6960d050fe"
        },
        "advanced": {
          "count": 45,
          "idsSha256": "1e2565b7b7d75244c53d0e4a6ce75bfb2c8e202d3366e715cdcd8a1975cfdb43",
          "fingerprintsSha256": "04e787b7a589f463f06fc7625ba8049fdb879c035309317e547061b5ad5ead58"
        },
        "hard": {
          "count": 27,
          "idsSha256": "f6b56e0006534f43678a843dd8f7206ddb91fa4593acb1bad8f2331a3755fe7d",
          "fingerprintsSha256": "209ff5a8928385b922a707a2adda2d0fe23c80d96f7e4b03eec2abc44e655dc7"
        },
        "expert": {
          "count": 27,
          "idsSha256": "0092c94ff79a552c6bbaecf3176f22b03cb1b9acbe9c7bafd86f694f77009b14",
          "fingerprintsSha256": "9ff04f5f25c63ae4ac1eb32de711195dc06e9096b9bb4a39f22aa2ba68a8afd8"
        }
      }
    }
  },
  "cageGarden": {
    "journeyId": "cage-garden-v1",
    "orderedDescriptorsSha256": "cd13388e042f53230ef7c8b77f4c00ddf4b6207e91ebcecfbbeea7ff2228fc58",
    "steps": [
      {
        "id": "garden-gate",
        "descriptorSha256": "4da0c9a01fdb6a0c6838694def48ddbd7fc94d962c37d435c29664f2e4799613",
        "puzzleBytesSha256": "c1292d86ad00a4f81c4e4f073fd1fc15c47bb0558dae5f07a5b6843af94dd3f5",
        "targetEntrySha256": "ac3077a964686399594a69d297e6089e20adaa982383039bb7075c7c9109055e"
      },
      {
        "id": "lantern-walk",
        "descriptorSha256": "1882faa3ca5a59ddc5bf63c06a93bf5d31370e0a7aaf5542893f2c0a3e88ec7f",
        "puzzleBytesSha256": "876496fc44312a9c013496ea45597fc70f83b971a749e05c22ad056ed1176240",
        "targetEntrySha256": "0f64fa58b228ce30ed51f2a3f6848752019814d7a83273e6fb609b6eec3a5d6b"
      },
      {
        "id": "brook-crossing",
        "descriptorSha256": "d4920eec9b323a49ecd319188cb7e419457a2d4c5dd42c2ddd14c55c3a53b2a1",
        "puzzleBytesSha256": "55044016089d3e1c7fae767b8674209e51759f8d9f8310b9493c5d31e54c7a42",
        "targetEntrySha256": "764bef1c790a4ba13fe49079b9da5edbfe191817b156894e071caccb03c9bb75"
      },
      {
        "id": "cascade-finale",
        "descriptorSha256": "06086bd86817371ae7a7ddbbc81592eff9f95093f8b5ccc6c002aa2fd1bd2fe0",
        "puzzleBytesSha256": "807722e90a4ccb3f90145bb46dda26eb0191763755263c6de7c02231b52280cf",
        "targetEntrySha256": "91bab74c96776bf62dd667b6bd4f3e6a848f9abf2b5b3d3eeb2d788cc88a4cb4"
      }
    ]
  }
});
