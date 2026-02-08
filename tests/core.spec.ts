// core.spec.ts

import { describe, it, expect } from "vitest";
import { readText } from "../src/reader/Reader";
import { CGGraph } from "../src/model/CGGraph";
import { assertConforms } from "./assertConforms";

describe("core", () => {

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
        nodes: [
          {
            key: "people::paris",
            properties: { country: "Republic of France" },
            outgoingKeys: [],
            incomingKeys: []
          }
        ],
        warnings: [],
        errors: []
      }
    );

    expect(Array.from(r.graph.nodes.keys()).sort()).toEqual(["people::paris"]);
  });


  it("outgoing edge creates stub target node (default behavior)", () =>
  {
    const text = `
[[ chess ]]
## Game-1
Player:Kasparov
`;

    const r = readText(text);

    assertConforms(
      { graph: r.graph, diagnostics: r.diagnostics },
      {
        nodes: [
          {
            key: "chess::game-1",
            outgoingKeys: ["player::kasparov"],
            incomingKeys: []
          },
          {
            key: "player::kasparov",
            outgoingKeys: [],
            incomingKeys: ["chess::game-1"]
          }
        ],
        warnings: [],
        errors: []
      }
    );

    expect(new Set(r.graph.nodes.keys())).toEqual(new Set(["chess::game-1", "player::kasparov"]));
  });


  it("duplicate outgoing edge yields warning; stored once", () =>
  {
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
        nodes: [
          {
            key: "chess::game-1",
            outgoingKeys: ["player::kasparov"]
          },
          {
            key: "player::kasparov",
            incomingKeys: ["chess::game-1"]
          }
        ],
        warnings: ["Duplicate outgoing edge ignored: Player:Kasparov"],
        errors: []
      }
    );

    const n = r.graph.getNodeByKey("chess::game-1");
    expect(n?._outgoingSet.size).toBe(1);
  });


  it("class close switches to graph-level class; node open is allowed", () =>
  {
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
        nodes: [
          { key: "people::a", outgoingKeys: [], incomingKeys: [] },
          { key: "::b",       outgoingKeys: [], incomingKeys: [] }
        ],
        warnings: [],
        errors: []
      }
    );

    expect(new Set(r.graph.nodes.keys())).toEqual(new Set(["people::a", "::b"]));
  });


  it("close node line ## routes subsequent edge to the class default node", () =>
  {
    const text = `
[[ people ]]
## A
##
Friend:B
`;

    const r = readText(text);

    assertConforms(
      { graph: r.graph, diagnostics: r.diagnostics },
      {
        nodes: [
          { key: "people::a", outgoingKeys: [], incomingKeys: [] },
          { key: "people::",  outgoingKeys: ["friend::b"], incomingKeys: [] },
          { key: "friend::b", outgoingKeys: [], incomingKeys: ["people::"] }
        ],
        warnings: [],
        errors: []
      }
    );
  });


  it("edge adds must update both sides (incoming on target; outgoing on source)", () =>
  {
    const text = `
[[ chess ]]
## Game-1
Player:Kasparov
`;

    const r = readText(text);

    const source = r.graph.getNodeByKey("chess::game-1");
    const target = r.graph.getNodeByKey("player::kasparov");

    expect(source?._outgoingSet.has("player::kasparov")).toBe(true);
    expect(target?._incomingSet.has("chess::game-1")).toBe(true);
  });


  it("Reader edge from class default node also updates incoming on target", () =>
  {
    const text = `
[[ people ]]
##
Friend:B
`;

    const r = readText(text);

    const from = r.graph.getNodeByKey("people::")!;
    const to = r.graph.getNodeByKey("friend::b")!;

    expect(from._outgoingSet.has("friend::b")).toBe(true);
    expect(to._incomingSet.has("people::")).toBe(true);
  });


  it("CGGraph.deleteEdge removes both sides when both nodes exist", () =>
  {
    const g = new CGGraph();
    g.getOrCreateNode("chess", "game-1");
    g.getOrCreateNode("player", "kasparov");

    expect(g.addEdge("chess", "game-1", "player", "kasparov")).toBe(true);

    const source = g.getNodeByKey("chess::game-1")!;
    const target = g.getNodeByKey("player::kasparov")!;

    expect(source._outgoingSet.has("player::kasparov")).toBe(true);
    expect(target._incomingSet.has("chess::game-1")).toBe(true);

    expect(g.deleteEdge("chess", "game-1", "player", "kasparov")).toBe(true);

    expect(source._outgoingSet.has("player::kasparov")).toBe(false);
    expect(target._incomingSet.has("chess::game-1")).toBe(false);
  });


  it("CGGraph.deleteNode removes the node and cleans neighbor edge sets", () =>
  {
    const g = new CGGraph();
    g.getOrCreateNode("a", "x");
    g.getOrCreateNode("b", "y");
    g.getOrCreateNode("c", "z");

    g.addEdge("a", "x", "b", "y");
    g.addEdge("c", "z", "b", "y");

    const bx = g.getNodeByKey("b::y")!;
    expect(bx._incomingSet.has("a::x")).toBe(true);
    expect(bx._incomingSet.has("c::z")).toBe(true);

    expect(g.deleteNode("b", "y")).toBe(true);
    expect(g.getNodeByKey("b::y")).toBeUndefined();

    const ax = g.getNodeByKey("a::x")!;
    const cz = g.getNodeByKey("c::z")!;

    expect(ax._outgoingSet.has("b::y")).toBe(false);
    expect(cz._outgoingSet.has("b::y")).toBe(false);
  });

  it("leading whitespace is ignored for class and node directives", () =>
  {
    const text = `
    [[ people ]]
      ## Alice
      Friend:Bob
    [[ ]]
      ## Global
  `;

    const r = readText(text);

    // Alice node exists and has outgoing to friend::bob
    const alice = r.graph.getNodeByKey("people::alice")!;
    const bob = r.graph.getNodeByKey("friend::bob")!;
    expect(alice._outgoingSet.has("friend::bob")).toBe(true);
    expect(bob._incomingSet.has("people::alice")).toBe(true);

    // Graph-level node exists (class == "")
    expect(r.graph.getNodeByKey("::global")).toBeTruthy();
  });
});
