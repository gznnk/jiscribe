// Headless AI-tool entry point: the tools the table offers for its own shape, with
// no rendering layer behind them. Gathered into standardAiToolPlugins.
//
// e.g. `import { tableAiToolPlugin } from "@jiscribe/plugin-table-shape/tools";`
import type { AiToolPlugin } from "@jiscribe/canvas-sdk/tools";

import { tableClearCellsTool } from "./tools/tableClearCellsTool";
import { tableDeleteTracksTool } from "./tools/tableDeleteTracksTool";
import { tableFillCellsTool } from "./tools/tableFillCellsTool";
import { tableInsertTracksTool } from "./tools/tableInsertTracksTool";
import { tableReadTool } from "./tools/tableReadTool";
import { tableSetCellStyleTool } from "./tools/tableSetCellStyleTool";
import { tableSetTrackSizesTool } from "./tools/tableSetTrackSizesTool";

/**
 * The table's AI tools: reading the grid, changing its structure, and editing its
 * cells, each acting on the one table a call names by `id`. Registered in
 * `standardAiToolPlugins`.
 */
export const tableAiToolPlugin: AiToolPlugin = {
	id: "table-shape",
	tools: [
		tableReadTool,
		tableInsertTracksTool,
		tableDeleteTracksTool,
		tableFillCellsTool,
		tableClearCellsTool,
		tableSetTrackSizesTool,
		tableSetCellStyleTool,
	],
};
