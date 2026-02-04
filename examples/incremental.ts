import { CGGraph } from "../src/model/CGGraph";
import { Diagnostics } from "../src/reader/Diagnostics";
import { ReaderState } from "../src/reader/ReaderState";
import { readLine } from "../src/reader/Reader";

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