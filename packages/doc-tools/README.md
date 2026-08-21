# @jiscribe/doc-tools

Checking, measuring and diagnosing `.jis.json` documents from Node. React- and
DOM-free: the document layer is reached through `@jiscribe/doc` and
`@jiscribe/doc/unstable` alone, so this runs in a CI job, an MCP server or a CLI without a
browser anywhere.

`@jiscribe/cli` is the command-line mouth on it (`jiscribe validate` /
`diagnose` / `measure`); the same functions are what an MCP tool should call, so
the answers an AI gets and the answers CI gets cannot drift.

## API

| Function                                          | What it answers                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `validateDoc(text)`                               | Is this a sound document? Runs both validators the format has and returns their findings together. |
| `measureWrappedText(text, font, availableWidth?)` | How many lines does this text become, and how big is the block?                                    |
| `contentBox(shape)`                               | How much of a shape's box is its text actually laid out in?                                        |
| `diagnoseDoc(doc)`                                | Does any object's text overflow the shape holding it?                                              |

## Why validation is two validators

`validateDoc` runs the official JSON schema (`@jiscribe/ai-docs/schema`, what an
editor completes and validates against) **and** the canvas parser loaded with the
shipped shape set (what actually opens the file). Neither contains the other: the
schema refuses a misspelled property the parser strips silently, and the parser
catches cross-object rules — duplicate ids, a connector pointing at nothing — that
no schema can express. The two must be given the same plugin set or they
disagree, which is why both take it from `@jiscribe/standard-shapes/doc`.

## Measurement in Node

The canvas measures text on an offscreen canvas and, without one, falls back to
`characters × fontSize × 0.6` — an estimate that gets line breaking wrong by a
wide margin for Japanese. This package installs a third backend through
`setTextWidthMeasurerFactory`: it reads the very `.woff` files
`@jiscribe/canvas` ships to the browser (`@fontsource/*`) and takes advances off
them with fontkit.

- Fontsource splits a family into per-`unicode-range` subsets — 125 of them for
  Noto Sans JP — so `fontFaceIndex.ts` parses the `@font-face` stylesheet once and
  loads only the subsets a text actually reaches.
- A string is split into maximal stretches drawn from one file, and each stretch
  is laid out whole, so kerning and substitutions apply as they do in a browser.
- A family the canvas does not ship is left to the canvas's own estimate. A
  diagnosis of such a document is approximate, and says so.

Installing is idempotent and process-wide; every entry point here does it before
measuring. **A browser is unaffected** — nothing registers a factory there, so
the canvas keeps measuring exactly as it did.

## Where the content box comes from

`contentBox` asks the shape's own type. Every shipped type declares where its
text goes on its doc definition (`ObjectDocDefinition.textRegion`), as a function
of the doc: the box, plus whatever field the outline depends on — the callout's
`tail`, the container's `headerHeight`. The rendering layer's
`ObjectTypeDefinition` registers **the same function**, so what a browser draws
the text in and what a Node-side diagnosis measures against are one declaration,
and this package restates nothing.

Three answers are possible, and they mean different things:

- **a rectangle** — the region, in the shape's own coordinates. `contentBox`
  subtracts the shared text-box padding from it and hands back the result.
- **`null`** — the box does not hold the text: the shape draws its label outside
  the outline (the pictograms, the group markers), or divides the box into bands
  each sized from their own text (`record`), or carries no text at all. Nothing
  about such a shape's size can make its text overflow, so `diagnoseDoc` passes
  over it.
- **no declaration** — the type is not one this build ships, or ships without
  having declared a region. `contentBox` answers null, and `diagnoseDoc` reports
  a warning for a text-bearing type rather than passing over it silently.

## What `diagnoseDoc` does not check

Only overflow — a fact about the document. Spacing, aspect ratio and the rest of
the layout rules in a project's own design guide are matters of taste and belong
in a rule file, not in the default check.
