# @jiscribe/ai-tools

The canvas tool set an AI model can call, declared once and independently of how
it is transported.

## What lives here

- The operation vocabulary (`AiCanvasOp` and everything it is built from) — a
  facade over the canvas docOps and the canvas view, and the only contract the
  declaring side and the applying side share.
- `createCanvasToolDescriptors(capabilities)` — one `CanvasToolDescriptor` per
  tool: its name, the wording the model reads, the argument schema as a zod raw
  shape, and `toOp`, which turns validated arguments into an operation.
- `toCanvasCapabilities(docPlugins)` — the shape types the descriptors may name,
  derived from a doc plugin set.

## Which canvas API a tool drives

A tool name and the canvas member behind it are allowed to differ: the canvas
namespaces its API where the tool namespace is flat, so `viewport.centerOn` folds
into `center_view`. What is not allowed is leaving the correspondence implied —
that is how `move_objects` came to call `translateObjects` while a differently
meaning `moveObjects` existed beside it. Every descriptor therefore states its
`drives`, a list of `CanvasApiRef` (`docOps.<member>`, `handle.<namespace>.<member>`,
or `"agent"` for what the host owns rather than the canvas), typed off the real
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
naming an MCP server, shaping a tool result, running the operation, and keeping a
session. Those belong to the host that owns the transport.

## Usage

```typescript
import type { AiCanvasOp } from "@jiscribe/ai-tools";
import {
	createCanvasToolDescriptors,
	toCanvasCapabilities,
} from "@jiscribe/ai-tools";

const descriptors = createCanvasToolDescriptors(
	toCanvasCapabilities([flowchartDocPlugin]),
);
```
