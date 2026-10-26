// The canvas tool set over the shipped shape set, as a Node host applies it to
// documents: the ai-tools declarations, the plugin tools they resolve through,
// and the doc-ops both edit with. jiscribe-mcp and the jiscribe CLI take theirs
// from here, so a tool is declared and applied the same way in both.
//
// e.g. `import { standardCanvasToolSet, standardDocOps } from "@jiscribe/doc-tools/canvas-tools";`

import { createCanvasToolSet, toCanvasCapabilities } from "@jiscribe/ai-tools";
import { createDocOps } from "@jiscribe/doc";
import { offerTextMeasurement } from "@jiscribe/doc/unstable";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";
import { standardAiToolPlugins } from "@jiscribe/standard-shapes/tools";

import { nodeTextMeasurement } from "./measure/nodeTextMeasurer";

// The doc-ops derive the height of a shape that omits one from its text. Unless
// a measurer is offered while this module is evaluated, the first op to measure
// can run with none offered — depending on the order the tools are called — and
// throw.
offerTextMeasurement(nodeTextMeasurement());

/**
 * The doc-ops applyCanvasOp edits through. Built from the same plugin set as the
 * parser the `./file` entry loads and writes back with, so a plugin shape added
 * through them survives the write-back and the next load.
 */
export const standardDocOps = createDocOps({ plugins: standardDocPlugins });

/**
 * The ai-tools tool set: the declarations a host offers and the plugin tools
 * applyCanvasOp resolves an `objectTool` op through, read off this one value so
 * a declared tool always has its application. The shape-type enums come from
 * the same plugin set as {@link standardDocOps}, so a type a declaration lists
 * is one that can be added.
 */
export const standardCanvasToolSet = createCanvasToolSet(
	toCanvasCapabilities(standardDocPlugins),
	standardAiToolPlugins,
);
