// Headless AI-tool entry point: the tools the UML shapes offer for their own types,
// with no rendering layer behind them. Gathered into standardAiToolPlugins.
//
// e.g. `import { umlAiToolPlugin } from "@jiscribe/plugin-uml-shapes/tools";`
import type { AiToolPlugin } from "@jiscribe/canvas-sdk/tools";

import { recordSetCompartmentsTool } from "./tools/recordSetCompartmentsTool";

/**
 * The UML shapes' AI tools: setting a record's compartments, which the generic
 * text tools cannot add or remove, with its height refitted to them. Registered in
 * `standardAiToolPlugins`.
 */
export const umlAiToolPlugin: AiToolPlugin = {
	id: "uml-shapes",
	tools: [recordSetCompartmentsTool],
};
