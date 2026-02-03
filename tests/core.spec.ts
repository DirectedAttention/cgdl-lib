import { describe, it } from "vitest";
import { readText } from "../src/reader/Reader";
import { assertConforms } from "./assertConforms";

describe("cgdl-lib conformance: core graph-building", () => {
  it("class open + node open + property + non-structural line preserved", () => {
    const text = `
[[ people ]]
## Sasson Margaliot
born = 19XX
!! call LLM later
`;

    const r = readText(text, { strict: true });

    assertConforms(
      { graph: r.graph, diagnostics: r.diagnostics },
      {
        order: ["people::sasson margaliot"],
        nodes: [
          {
            key: "people::sasson margaliot",
            classDisplay: "people",
            labelDisplay: "Sasson Margaliot",
            properties: { born: "19XX" },
            outgoing: [],
            incoming: [],
            lines: [{ signal: "!!", text: "!! call LLM later" }]
          }
        ],
        warnings: [],
        errors: []
      }
    );
  });

  it("node re-open appends; property overwrite replaces previous", () => {
    const text = `
[[ people ]]
## Paris
country = France
## Paris
country = Republic of France
`;

    const r = readText(text, { strict: true });

    assertConforms(
      { graph: r.graph, diagnostics: r.diagnostics },
      {
        order: ["people::paris"],
        nodes: [
          {
            key: "people::paris",
            properties: { country: "Republic of France" },
            outgoing: [],
            incoming: []
          }
        ],
        warnings: [],
        errors: []
      }
    );
  });

  it("outgoing edge creates stub target node (default behavior)", () => {
    const text = `
[[ chess ]]
## Game-1
Player:Kasparov
`;

    const r = readText(text, { strict: true, createStubNodesForEdges: true });

    assertConforms(
      { graph: r.graph, diagnostics: r.diagnostics },
      {
        order: ["chess::game-1", "player::kasparov"],
        nodes: [
          {
            key: "chess::game-1",
            outgoing: [{ cls: "Player", label: "Kasparov" }]
          },
          {
            key: "player::kasparov",
            outgoing: [],
            incoming: []
          }
        ],
        warnings: [],
        errors: []
      }
    );
  });

  it("duplicate outgoing edge yields warning; stored once", () => {
    const text = `
[[ chess ]]
## Game-1
Player:Kasparov
Player:Kasparov
`;

    const r = readText(text, { strict: true });

    assertConforms(
      { graph: r.graph, diagnostics: r.diagnostics },
      {
        order: ["chess::game-1", "player::kasparov"],
        nodes: [
          {
            key: "chess::game-1",
            outgoing: [{ cls: "Player", label: "Kasparov" }]
          },
          { key: "player::kasparov" }
        ],
        warnings: ["Duplicate outgoing edge ignored: Player:Kasparov"],
        errors: []
      }
    );
  });

  it("property outside a node is an error in strict mode", () => {
    const text = `
[[ people ]]
born = 19XX
## A
x = 1
`;

    const r = readText(text, { strict: true });

    assertConforms(
      { graph: r.graph, diagnostics: r.diagnostics },
      {
        order: ["people::a"],
        nodes: [{ key: "people::a", properties: { x: "1" } }],
        warnings: [],
        errors: ["Property line outside of any node: 'born = 19XX'"]
      }
    );
  });

  it("class close clears currentClass; node open without class errors (strict)", () => {
    const text = `
[[ people ]]
## A
[[ ]]
## B
`;

    const r = readText(text, { strict: true });

    assertConforms(
      { graph: r.graph, diagnostics: r.diagnostics },
      {
        order: ["people::a"],
        nodes: [{ key: "people::a" }],
        warnings: [],
        errors: ["Cannot select node '## B' because currentClass is empty."]
      }
    );
  });

  it("close node line [] clears current node; edge after close is ignored with warning", () => {
    const text = `
[[ people ]]
## A
[]
Friend:B
`;

    const r = readText(text, { strict: true });

    // We expect:
    // - Node A exists
    // - Edge line after [] is outside a node => warning (ignored)
    assertConforms(
      { graph: r.graph, diagnostics: r.diagnostics },
      {
        order: ["people::a"],
        nodes: [{ key: "people::a" }],
        warnings: ["Outgoing edge ignored because no current node is open: 'Friend:B'"],
        errors: []
      }
    );
  });
});
