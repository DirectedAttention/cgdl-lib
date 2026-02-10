import { CGGraph } from "../src/model/CGGraph.js";
import { Diagnostics } from "../src/reader/Diagnostics.js";
import { ReaderState } from "../src/reader/ReaderState.js";
import { readLine } from "../src/reader/Reader.js";

const graph = new CGGraph();
const state = new ReaderState();
const diag  = new Diagnostics();

readLine(graph, state, diag, "[[ people ]]", 1);
readLine(graph, state, diag, "## Paris", 2);
readLine(graph, state, diag, "country = France", 3);
readLine(graph, state, diag, "Person:Victor Hugo", 4);
readLine(graph, state, diag, "[]", 5);

console.log("Nodes:", graph.nodes.size);
console.log("Diagnostics:", diag.items.length);