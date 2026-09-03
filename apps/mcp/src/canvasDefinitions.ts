import { toCanvasCapabilities } from "@jiscribe/ai-tools";
import { createCanvasParser, createDocOps } from "@jiscribe/doc";
import { offerTextMeasurement } from "@jiscribe/doc/unstable";
import { nodeTextMeasurement } from "@jiscribe/doc-tools";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";

/**
 * The parser shared by loading and writing back. The shipped shape set is the
 * source of truth for which shapes exist.
 */
export const canvasParser = createCanvasParser({ plugins: standardDocPlugins });

// docOps asks for text measurement, since it derives the height of a shape that
// omits one from that shape's text. Unless it is offered while this module is
// evaluated, the first measurement can run with none offered — depending on the
// order the tools are called — and throw.
offerTextMeasurement(nodeTextMeasurement());

/**
 * The doc-ops shared by the built-in add tools and the ai-tools doc operations
 * (applyCanvasOp). With a plugin set other than the parser's, the write-back
 * right after adding a plugin shape — and the next load — fail with an unknown
 * type.
 */
export const docOps = createDocOps({ plugins: standardDocPlugins });

/**
 * The capability table the ai-tools tool declarations use to fill in the shape
 * type enums. Derived from the same plugin set as the parser and docOps, so the
 * types a declaration lists cannot disagree with the types that can actually be
 * added.
 */
export const canvasCapabilities = toCanvasCapabilities(standardDocPlugins);
