import { getStandardCanvasParser } from "@jiscribe/doc-tools/file";

/**
 * The parser the file mirror judges a file's text with: the one the file layer
 * loads and writes back with, over the shipped shape set.
 */
export const canvasParser = getStandardCanvasParser();

// The doc-ops and the ai-tools tool set, built from the same standard set (see
// @jiscribe/doc-tools/canvas-tools, which also offers the text measurement the
// doc-ops need). runtime.ts and server.ts take them from here, so a test can
// stand in for one with vi.mock("../canvasDefinitions").
export {
	standardCanvasToolSet as canvasToolSet,
	standardDocOps as docOps,
} from "@jiscribe/doc-tools/canvas-tools";
