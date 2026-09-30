import type { CanvasPlugin } from "@jiscribe/canvas";

import { TABLE_INSERT_COMMANDS } from "./commands/tableInsertCommands";
import { TABLE_REMOVE_COMMANDS } from "./commands/tableRemoveCommands";
import { tableDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the table shape
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this into
 * `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `tableDocPlugin` in `./doc`.
 *
 * `commands` carries the four insertions and the two removals. They reshape the
 * grid rather than style it, so they are reachable by key and by the right-click
 * menu and stay out of the type's ObjectMenu. Registering them here is also what
 * makes the type's context-menu rows draw at all: an item naming an unregistered
 * command is skipped. Each of them carries its own wording per locale, so a
 * Japanese host reads the right-click rows in Japanese.
 */
export const tablePlugin: CanvasPlugin = {
	id: "table-shape",
	objects: { table: tableDefinition },
	commands: [...TABLE_INSERT_COMMANDS, ...TABLE_REMOVE_COMMANDS],
};
