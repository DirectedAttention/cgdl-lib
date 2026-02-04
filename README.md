# cgdl-lib

`cgdl-lib` a small, modular TypeScript library (ESM-only) that **reads CGDL text line-by-line and builds a directed graph in memory**.

This library implements **only the graph-building subset** of CGDL.

Everything else (most 2-char DiGraph / “command prose” signals) is **not interpreted** here; it is preserved as `Line { signal, text }` for higher layers (CLI / protocol).

## Status

- ESM-only
- No file I/O (caller supplies text)
- Single-pass reader
- Conformance tests included (Vitest)

## Core commands supported

### Class block control

- `[[ ClassName ]]`  
  Opens or reopens a class block. Sets `currentClass = ClassName` and clears the current node.

- `[[ ]]` (or `]]`)  
  Closes the class block. Clears `currentClass` and current node.

### Node control

- `## Label`  
  Creates or reopens a node identified by `(currentClass, Label)` and sets it as current.

- `[]`  
  Closes the current node only (class stays open).

### Edge declaration (outgoing from current node)

- `OtherClass : TargetLabel`  
  Adds an outgoing edge from the current node to `(OtherClass, TargetLabel)`.  
  By default the target node is created as a stub (configurable).

### Properties

- `key = value`  
  Stored on the current node. Reassignment overwrites previous value.

### Non-structural lines

Any other line is preserved as a `Line { signal, text }` on the current node, if a node is open.
The reader does not interpret the behavior of these lines.

## Install

_Not published yet._ For now, clone the repo and use `npm install`.

## Dev

```bash
npm install
npm test
npm run build
