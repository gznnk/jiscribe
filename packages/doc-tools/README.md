# @jiscribe/doc-tools

Checking, measuring and diagnosing `.jis.json` documents from Node. React- and
DOM-free: the canvas is reached through `@jiscribe/canvas/doc` and
`/unstable-doc` alone, so this runs in a CI job, an MCP server or a CLI without a
browser anywhere.

`@jiscribe/cli` is the command-line mouth on it (`jiscribe validate` /
`diagnose` / `measure`); the same functions are what an MCP tool should call, so
the answers an AI gets and the answers CI gets cannot drift.

## API

| Function                                          | What it answers                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `validateDoc(text)`                               | Is this a sound document? Runs both validators the format has and returns their findings together. |
| `measureWrappedText(text, font, availableWidth?)` | How many lines does this text become, and how big is the block?                                    |
| `contentBox(type, width, height)`                 | How much of a shape's box is its text actually laid out in?                                        |
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

## The content-inset table is provisional

`contentInsets.ts` restates, as numbers, what each shape's `textRegion`
calculator produces. Those calculators live in each plugin's `presentation/**`,
are registered on the React-side `ObjectTypeDefinition`, and take a resolved
object state — none of which a Node-side diagnosis can reach. **The table is a
copy, and a change to a shape's text region has to be repeated in it.**

Moving the declaration onto `ObjectDocDefinition` (where `description` and
`textSlotStyleDefaults` already sit) would end the duplication and let
`pnpm generate:ai` publish the same numbers to AI authors. It was not done here
because several shapes' regions are not static ratios: `stadium` swaps axis on a
tall box, `card` / `delay` / `note` / `file` / `multiDocument` derive from
`min(width, height)`, `container` / `umlPackage` are absolute pixels clamped
against the height, `callout` follows a doc field, and `record` / the pictogram
labels are sized from their own text. A declaration would have to be a function
mirroring `textRegion`, not a constant — a bigger change to the plugin interface
than this package needed.

Known gap: `callout` is measured with its default downward tail, since
`contentBox` is given a type and a size and cannot see the object's `tail.side`.

## What `diagnoseDoc` does not check

Only overflow — a fact about the document. Spacing, aspect ratio and the rest of
the layout rules in a project's own design guide are matters of taste and belong
in a rule file, not in the default check.
