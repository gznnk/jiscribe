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
