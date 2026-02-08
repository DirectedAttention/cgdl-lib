# cgdl-lib

A tiny, deliberate TypeScript library that reads plain-text CGDL and builds an in-memory directed graph.

cgdl-lib implements only the graph-building core of CGDL:

- class selection
- node selection
- properties
- outgoing edges (with fully consistent incoming edges)
- preservation of non-structural lines as Line { signal, text }

Everything else is preserved but never interpreted. Higher layers (protocols, CLIs, editors) can assign meaning to preserved lines later.

Status: not published to npm yet. Use from source / GitHub until the first release.

----------------------------------------------------------------

WHAT CGDL IS

CGDL (Context Graph Description Language) is a line-oriented, hand-editable format for describing small graphs and attached context. It is designed to be friendly to:

- hand-editing
- git diffs
- sequential reading
- structured notes that happen to form a graph

----------------------------------------------------------------

CORE SYNTAX (IMPLEMENTED)

1) Class directives

Open / reopen class:

[[ ClassName ]]

Effects:

- state.currentClass = "ClassName"
- clears current node selection

Close class (enter graph-level class mode):

[[ ]]

Effects:

- state.currentClass = ""
- clears current node selection

Note: Leading whitespace is ignored for directive detection.

----------------------------------------------------------------

Node directives

Open/select node in the current class:

## Label text

Effects:

- creates node if needed: (currentClass, "Label text")
- sets it as current node

Close current node only (class stays open):

##

Effects:

- clears current node selection

----------------------------------------------------------------

## Properties

Set property:

{} key = value

Parsing:

- key is trimmed and whitespace-collapsed
- value is everything after the first = (so = is allowed inside the value)

Behavior:

- applies to the effective node (see below)
- overwrites (reassignment semantics): last value wins

----------------------------------------------------------------

## Outgoing edges

Outgoing edge:

OtherClass:TargetLabel

Behavior:

- adds an outgoing edge from the effective node
- always creates the target node if it doesn’t exist yet (stub node)
- maintains consistent edges:
  - source stores target in _outgoingSet
  - target stores source in _incomingSet
- duplicate edge adds are ignored (with a warning)

----------------------------------------------------------------

EFFECTIVE NODE RULES (IMPORTANT)

Commands must still work even when no explicit node is currently open.

Definition:

- If an explicit node is open (state.currentNodeKey != ""):
  effectiveNode = that node
- Else:
  effectiveNode = graph.getOrCreateNode(state.currentClass, "")

So when no node is selected, properties and edges attach to the class default node:

(currentClass, "")

Graph-level class

After [[ ]], currentClass = "".

Nodes opened via ## Label in this state become:

("", "Label")

These are graph-level / global feature nodes.

----------------------------------------------------------------

UNORDERED-BY-DESIGN

Graph node sets are unordered by design. cgdl-lib intentionally does not preserve insertion order.

Do not write tests or logic that depends on iteration order of nodes or edges.

----------------------------------------------------------------

LINE PRESERVATION AND 2-CHAR SIGNALS (FROZEN RULE)

Non-structural lines are preserved inside the current node as:

Line { signal: string, text: string }

Signal extraction:

1. Ignore leading whitespace for detection.
2. If the first two non-whitespace characters are BOTH punctuation,
3. AND neither is one of: - , ' , _
4. Then:
   signal = those 2 chars
   text = the rest (trimOne)
5. Otherwise:
   signal = ""
   text = left-trimmed line

Notes:

- '-' and "'" are treated as “word-ish” and never count as command punctuation.
- whitespace cannot be part of a command.

Examples:

- "{} country = France" -> signal "{}"
- "!! hello"            -> signal "!!"
- "-> something"        -> not a signal (contains '-') -> signal ""
- "'# foo"              -> not a signal (contains "'") -> signal ""
- "+-" at start         -> not a signal (contains '-') -> signal ""

Text normalization:

- display normalization collapses whitespace runs and trims
- keying normalization lowercases

----------------------------------------------------------------

API

readText(text: string)

Parses full text and returns:

- graph
- state (incremental reader state)
- diagnostics (warnings/errors)

readLine(graph, state, diagnostics, rawLine, lineNo)

Incremental parser for editor / streaming scenarios:

- updates graph and state
- appends warnings/errors to diagnostics

Diagnostics store:

- warnings: { lineNo, message }[]
- errors: { lineNo, message }[]

----------------------------------------------------------------

INCREMENTAL PARSING EXAMPLE

import { CGGraph } from "../src/model/CGGraph";
import { ReaderState } from "../src/reader/ReaderState";
import { Diagnostics } from "../src/reader/Diagnostics";
import { readLine } from "../src/reader/Reader";

const graph = new CGGraph();
const state = new ReaderState();
const diagnostics = new Diagnostics();

const lines = [
  "[[ Places ]]",
  "## Paris",
  "{} country = France",
  "Food:Croissant",
  "##",
  "## Lyon",
  "{} country = France",
];

lines.forEach((rawLine, i) => {
  readLine(graph, state, diagnostics, rawLine, i + 1);
});

console.log(graph);
console.log(diagnostics);

----------------------------------------------------------------

DEVELOPMENT

Tests (vitest):
npm test

Build:
npm run build

----------------------------------------------------------------

LICENSE

MIT (see LICENSE).
