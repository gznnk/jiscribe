// The canvas prompt subpath (@jiscribe/ai-tools/prompt). Its body is generated
// from engine/packages/doc-schema/parts/ by pnpm generate:schema.

import { GENERATED_CANVAS_PROMPT } from "./prompt/generatedCanvasPrompt";

/**
 * What an AI holding the canvas tools needs to know to draw well: the canvas
 * model, what each shape type is for, and the drawing practice. How to use the
 * tools is not in here — that is what each descriptor's own wording says, right
 * beside the schema it is checked against. Host-independent, so a host prepends
 * its own preamble (who is watching, which document is open) and joins the two.
 */
export const CANVAS_TOOL_PROMPT = GENERATED_CANVAS_PROMPT;
