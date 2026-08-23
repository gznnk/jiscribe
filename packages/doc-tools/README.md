# @jiscribe/doc-tools

Checking, measuring and diagnosing `.jis.json` documents from Node. React- and
DOM-free: the document layer is reached through `@jiscribe/doc` and
`@jiscribe/doc/unstable` alone, so this runs in a CI job, an MCP server or a CLI without a
browser anywhere.

`@jiscribe/cli` is the command-line mouth on it (`jiscribe validate` /
`diagnose` / `measure`); the same functions are what an MCP tool should call, so
the answers an AI gets and the answers CI gets cannot drift.

## API

| Function                                          | What it answers                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateDoc(text)`                               | Is this a sound document? Runs both validators the format has and returns their findings together.                                                    |
| `measureWrappedText(text, font, availableWidth?)` | How many lines does this text become, and how big is the block?                                                                                       |
| `resolveContentBox(shape)`                        | How much of a shape's box is its text actually laid out in — or is there no box to lay it in?                                                         |
| `diagnoseDoc(doc)`                                | Does any text land where it cannot be read — a body overflowing its shape, a connector label wider than the space between the shapes it runs between? |

## Why validation is two validators

`validateDoc` runs the official JSON schema (`@jiscribe/doc-schema/schema`, what an
editor completes and validates against) **and** the canvas parser loaded with the
shipped shape set (what actually opens the file). Neither contains the other: the
schema refuses a misspelled property the parser strips silently, and the parser
catches cross-object rules — duplicate ids, a connector pointing at nothing — that
no schema can express. The two must be given the same plugin set or they
disagree, which is why both take it from `@jiscribe/standard-shapes/doc`.

## Measurement in Node

The document layer measures through whichever implementation a host has offered
(`offerTextMeasurement`), and measuring with none offered throws rather than
guessing. In a browser `@jiscribe/canvas` offers its own offscreen canvas; the
only other candidate is `characters × fontSize × 0.6`, an estimate that gets line
breaking wrong by a wide margin for Japanese. This package supplies the middle
one, `nodeTextMeasurement()`: it reads the very `.woff` files `@jiscribe/canvas`
ships to the browser (`@fontsource/*`) and takes advances off them with fontkit.

- Fontsource splits a family into per-`unicode-range` subsets — 125 of them for
  Noto Sans JP — so `fontFaceIndex.ts` parses the `@font-face` stylesheet once and
  loads only the subsets a text actually reaches.
- A string is split into maximal stretches drawn from one file, and each stretch
  is laid out whole, so kerning and substitutions apply as they do in a browser.
- A family the canvas does not ship is charged the 0.6em estimate instead. A
  diagnosis of such a document is approximate, and says so.

Offering is idempotent and process-wide; every entry point here does it before
measuring. **A browser is unaffected** — the canvas's own measurement outranks
this one, so an offer made in a process that draws is declined.

## Where the content box comes from

`resolveContentBox` asks the shape's own type. Every shipped type declares where its
text goes on its doc definition (`ObjectDocDefinition.textRegion`), as a function
of the doc: the box, plus whatever field the outline depends on — the callout's
`tail`, the container's `headerHeight`. The rendering layer's
`ObjectTypeDefinition` registers **the same function**, so what a browser draws
the text in and what a Node-side diagnosis measures against are one declaration,
and this package restates nothing.

Three answers are possible, and `resolveContentBox` keeps them apart — a caller
that cannot tell "this shape holds no text" from "you misspelled the type" cannot
report either one usefully:

- **`{ kind: "region", rect }`** — the region, in the shape's own coordinates,
  with the shared text-box padding already subtracted.
- **`{ kind: "outside" }`** — the box does not hold the text: the shape draws its
  label outside the outline (the pictograms, the group markers), or divides the
  box into bands each sized from their own text (`record`), or carries no text at
  all and declares no region. Nothing about such a shape's size can make its text
  overflow, so `diagnoseDoc` passes over it and `jiscribe measure` reports the
  text's own size with no verdict.
- **`{ kind: "unknown" }`** — the type is not one this build ships, so nothing
  declares anything about it. `jiscribe measure` and the MCP `measure_text` tool
  report it as an error. Within a document the case does not arise: a type the
  parser does not know never reaches `diagnoseDoc`, which does report a warning
  for a shipped text-bearing type that declares no region.

## The connector label check

A connector's label has no box of its own to overflow: it is drawn over the line
at whatever width its text comes to, so what it can run out of is the space
between the two shapes the line joins. `diagnoseDoc` warns when the label's
longest line is wider than that gap.

Only the one arrangement whose drawn path is certain is judged — both endpoints
attached to shapes the package can box, no stored waypoints, no label `offset`,
and the two boxes standing across from each other on an axis (overlapping on the
other). An elbow, a diagonal, a self loop or a free endpoint is passed over
rather than guessed at. The box's padding and border are left out of the width:
they are background, and a shape's own margin has room for them.

## What `diagnoseDoc` does not check

Only text that cannot be read where it is drawn — a fact about the document.
Spacing, aspect ratio and the rest of the layout rules in a project's own design
guide are matters of taste and belong in a rule file, not in the default check.
