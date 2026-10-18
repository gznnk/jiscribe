// Headless AI-tool entry point: the tools the ER shapes offer for their own entity,
// with no rendering layer behind them. Gathered into standardAiToolPlugins.
//
// e.g. `import { erAiToolPlugin } from "@jiscribe/plugin-er-shapes/tools";`
import type { AiToolPlugin } from "@jiscribe/canvas-sdk/tools";

import { erEntityDeleteColumnsTool } from "./tools/erEntityDeleteColumnsTool";
import { erEntityInsertColumnsTool } from "./tools/erEntityInsertColumnsTool";
import { erEntityMoveColumnsTool } from "./tools/erEntityMoveColumnsTool";
import { erEntityReadTool } from "./tools/erEntityReadTool";
import { erEntitySetTextsTool } from "./tools/erEntitySetTextsTool";
import { erEntitySetTextStyleTool } from "./tools/erEntitySetTextStyleTool";

/**
 * The entity's AI tools: reading it, changing its columns with the connectors on
 * them following, and editing and styling its texts, each acting on the one
 * entity a call names by `id`. Registered in `standardAiToolPlugins`.
 */
export const erAiToolPlugin: AiToolPlugin = {
	id: "er-shapes",
	tools: [
		erEntityReadTool,
		erEntityInsertColumnsTool,
		erEntityDeleteColumnsTool,
		erEntityMoveColumnsTool,
		erEntitySetTextsTool,
		erEntitySetTextStyleTool,
	],
};
