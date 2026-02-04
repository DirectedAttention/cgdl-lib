import { describe, it } from "vitest";
import { readText } from "../src/reader/Reader";
import { assertConforms } from "./assertConforms";

  it("node re-open appends; property overwrite replaces previous", () => 
  {
    const text = `
[[ people ]]
## Paris
{} country = France

## Paris
{} country = Republic of France
`;

    const r = readText(text);

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

    const r = readText(text, { createStubNodesForEdges: true });

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

    const r = readText(text);

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


  it("class close switches to graph-level class; node open is allowed", () => {
    const text = `
[[ people ]]
## A
[[ ]]
## B
`;

  const r = readText(text);

  assertConforms(
    { graph: r.graph, diagnostics: r.diagnostics },
    {
      order: ["people::a", "::b"],
      nodes: [
        { key: "people::a", outgoing: [], incoming: [] },
        { key: "::b", outgoing: [], incoming: [] }
      ],
      warnings: [],
      errors: []
    }
  );
});


it("close node line ## routes subsequent edge to the class default node", () => {
  const text = `
[[ people ]]
## A
##
Friend:B
`;

  const r = readText(text, { createStubNodesForEdges: true });

  assertConforms(
    { graph: r.graph, diagnostics: r.diagnostics },
    {
      order: ["people::a", "people::", "friend::b"],
      nodes: [
        { key: "people::a", outgoing: [], incoming: [] },
        { key: "people::", outgoing: [{ cls: "Friend", label: "B" }], incoming: [] },
        { key: "friend::b", outgoing: [], incoming: [] }
      ],
      warnings: [],
      errors: []
    }
  );
});

