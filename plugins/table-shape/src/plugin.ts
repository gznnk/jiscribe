import type { CanvasPlugin } from "@jiscribe/canvas";

import { TABLE_INSERT_COMMANDS } from "./commands/tableInsertCommands";
import { tableDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the table shape
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this into
 * `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `tableDocPlugin` in `./doc`.
 *
 * `commands` carries the four insertions, answering to Alt+Shift+arrow. They
 * reshape the grid rather than style it, so they stay out of the type's
 * ObjectMenu. Removal has no command: Delete over a picked row or column takes it
 * (the `row` / `column` part definitions' `delete`). Each command carries its
 * own wording per locale.
 */
export const tablePlugin: CanvasPlugin = {
	id: "table-shape",
	objects: { table: tableDefinition },
	commands: TABLE_INSERT_COMMANDS,
};
