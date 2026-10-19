# @jiscribe/ai-tools

The canvas tool set an AI model can call — declared once, independently of how it
is transported, and applied through the same package.

## What lives here

- The operation vocabulary (`AiCanvasOp` and everything it is built from) — a
  facade over the canvas docOps and the canvas view, and the only contract the
  declaring side and the applying side share.
- `createCanvasToolSet(capabilities, aiToolPlugins)` — the tool set a host offers:
  one `CanvasToolDescriptor` per tool (its name, the wording the model reads, the
  argument schema as a zod raw shape, and `toOp`, which turns validated arguments
  into an operation), the built-ins followed by the object tools the plugins offer
  for their own types (`AiToolPlugin`, declared in `@jiscribe/ai-tools-sdk`, whose argument
  schemas are zod raw shapes put into the descriptor as they are). Hand the same
  set to `applyCanvasOp`, which resolves a plugin tool's op through it, so a tool
  that is declared is always one that can be applied.
- `toCanvasCapabilities(docPlugins)` — the shape types the descriptors may name,
  derived from a doc plugin set.

Two subpaths carry the applying side, split by what each half needs to run:

- `@jiscribe/ai-tools/apply` — `applyCanvasOp`, which runs an `AiDocOp` against
  whatever holds the document (`AiDocBridge`), plus the undo history that lets an
  operation be taken back while the AI's own edit is still the latest one. No
  React, no DOM, so a server that owns a file can run it.
- `@jiscribe/ai-tools/client` — the half that only a mounted canvas can answer:
  `applyHandleOp` (capture, camera, selection, measurement), the `CanvasHandle`
  adapter behind it, and `captureCanvasImage`. Browser only.

## Which canvas API a tool drives

A tool name and the canvas member behind it are allowed to differ: the canvas
namespaces its API where the tool namespace is flat, so `viewport.centerOn` folds
into `center_view`. What is not allowed is leaving the correspondence implied —
that is how `move_objects` came to call `translateObjects` while a differently
meaning `moveObjects` existed beside it. Every descriptor therefore states its
`drives`, a list of `CanvasApiRef` (`docOps.<member>`, `handle.<namespace>.<member>`,
`"agent"` for what the host owns rather than the canvas, or `"plugin"` for a
plugin's own tool code), typed off the real
`DocOps` and `CanvasHandle` declarations so a member that does not exist cannot be
named.

Adding a doc-op fails `src/__tests__/canvasApiRef.test.ts` until it is either
driven by a tool or entered in that file's `UNEXPOSED_DOC_OPS` with the reason it
is not worth one. The canvas handle gets no such check — it only exists once a
canvas is mounted — so that side rests on the type alone.

zod is the source of truth for the argument schemas. The Claude Agent SDK's
`tool()` takes a raw shape as it is, and the Messages API's `input_schema` is one
call away with `z.toJSONSchema(z.object(inputSchema))`; the reverse is not
possible.

## What does not live here

Everything about reaching a model: wrapping a descriptor in an SDK `tool()`,
naming an MCP server, shaping a tool result for the wire, and keeping a session.
Those belong to the host that owns the transport.

Applying an operation used to be on that list, on the grounds that it belonged to
the same host. It does not: every host applies it the same way, so the one
implementation lives here beside the declaration it mirrors.

## Usage

```typescript
import { createCanvasToolSet, toCanvasCapabilities } from "@jiscribe/ai-tools";
import { applyCanvasOp } from "@jiscribe/ai-tools/apply";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";
import { standardAiToolPlugins } from "@jiscribe/standard-shapes/tools";

const toolSet = createCanvasToolSet(
	toCanvasCapabilities(standardDocPlugins),
	standardAiToolPlugins,
);
// Declare toolSet.descriptors to the model, then apply what comes back with
// applyCanvasOp(op, docBridge, history, docOps, toolSet)
```
