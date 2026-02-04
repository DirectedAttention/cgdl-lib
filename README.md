# cgdl-lib

## A tiny, deliberate TypeScript library that turns plain-text CGDL into structured directed graphs

Reads line-oriented text and builds a compact directed graph in memory.
cgdl-lib implements only the minimal “graph-building core” of CGDL:

- class selection
- node selection
- properties
- outgoing edges

Everything else is *preserved*, not interpreted.

That is the point: cgdl-lib is a neutral foundation that:
(1) parses core syntax,
(2) builds a graph model in memory,
(3) extracts (optional) two-character command “signals” from non-structural lines,
(4) stores those lines on nodes for higher layers to interpret later
    (e.g., lingage-protocol, lingage-cli, editors, VS Code integrations).

CGDL (Context Graph Description Language) is designed to be friendly to:

- hand editing
- git diffs
- sequential reading
- “structured notes” that are actually a graph

## Publishing status

Not yet published to npm.
(Do NOT write `npm install cgdl-lib` yet.)

## What cgdl-lib implements

### Core directives at a glance

Class open:
[[ ClassName ]]

Class close (graph-level class mode):
[[ ]]

Node open/select:
Start line with ## followed by the Label.

Property:
{} key = value

Outgoing edge:
OtherClass:TargetLabel

Non-structural line (preserved as Line{ signal, text }):
anything else

## Parsing model: class + node selection

cgdl-lib maintains a small incremental reader state:

- currentClass (string)
- currentNodeKey (string, empty when no explicit node is selected)

### Class directives

Open or reopen a class:
[[ ClassName ]]

Effects:

- state.currentClass = "ClassName"
- clears current node selection (state.clearNode())

Close class (enter graph-level class mode):
[[ ]]

Effects:

- state.currentClass = "" (empty string)
- clears current node selection

Notes:

- Class names are trimmed; internal whitespace runs collapse (for keying).
- Keying is case-insensitive (normalized to lowercase).

Important:
Node directives always attach to the *current class*, even if it is "".

## Effective node rules (important design choice)

There is no “strict mode”.
Commands should still work even if no explicit node is currently open.

Definition:

If an explicit node is open (state.currentNodeKey != ""):
  effectiveNode = that node
Else:
  effectiveNode = graph.getOrCreateNode(state.currentClass, "")

So when no node is selected, properties and outgoing edges attach to the
“class default node”:

(currentClass, "")

### Graph-level class

After [[ ]], currentClass becomes "".
Nodes opened via @!@! Label in this state become:

("", "Label")

These are graph-level / global feature nodes.

## Properties

Set property:
{} key = value

Parsing rules:

- key is trimmed and whitespace-collapsed
- value is everything after the first "="
  (so "=" is allowed inside value)

## Outgoing edges

Outgoing edge:
OtherClass:TargetLabel

Behavior:

- added as an outgoing edge from the effective node
- if createStubNodesForEdges == true (default), target node is auto-created

## Preserved lines and 2-character signals (frozen rule)

Any non-structural line is preserved inside the current node as:

Line { signal: string, text: string }

Signal extraction:

1) Ignore leading whitespace for detection.
2) If the first two non-whitespace chars are BOTH punctuation,
3) AND neither is one of: '-' , "'" , '_'
4) Then:
   - signal = those 2 chars
   - text = the rest (trimOne)
5) Otherwise:
   - signal = ""
   - text = left-trimmed line

Also:

- '-' and "'" are treated as “word-ish” (never command punctuation).
- whitespace cannot be part of a command (left-trim / trimOne is used).

Examples:
"{} country = France"  => signal "{}"
"!! hello"             => signal "!!"
"-> something"         => NOT a signal (contains '-') => signal ""
"'# foo"               => NOT a signal (contains "'") => signal ""
"+-" at start          => NOT a signal (contains '-') => signal ""

Text normalization:

- normalizeDisplay / normalizeWhitespace collapses whitespace runs, trims
- keying normalization lowercases

## API

readText(text, options?) -> { graph, state, diagnostics }

Reads full text and returns:

- graph
- state (incremental reader state)
- diagnostics (warnings/errors)

readLine(graph, state, diagnostics, rawLine, lineNo, options?) -> LineResult

Incremental parser for streaming/editor scenarios:

- updates graph + state
- appends warnings/errors to diagnostics

Diagnostics currently stores warnings/errors as arrays of:

- { lineNo, message }
(or message-only depending on latest local edits)

## License

MIT (see LICENSE).
