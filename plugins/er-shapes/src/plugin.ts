import type { CanvasPlugin } from "@jiscribe/canvas";

import { ER_ENTITY_COLUMN_COMMANDS } from "./commands/erEntityColumnCommands";
import { ER_ENTITY_COLUMN_SELECTION_COMMANDS } from "./commands/erEntityColumnSelectionCommands";
import { ER_ENTITY_TEXT_SLOT_SELECTION_COMMANDS } from "./commands/erEntityTextSlotSelectionCommands";
import { erEntityDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the ER shapes
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this into
 * `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `erDocPlugin` in `./doc`.
 *
 * `commands` carries the column insertions (Alt+Shift+Up / Down beside a picked
 * column or slot, and "Add at Bottom" for the entity as a whole), Delete and
 * Enter over a column pick, the arrows that move or widen a column pick
 * (Up / Down, Shift for the range), and the arrows that move or widen a slot
 * pick (all four, Shift for the range), each with its own wording per locale.
 */
export const erPlugin: CanvasPlugin = {
	id: "er-shapes",
	objects: { erEntity: erEntityDefinition },
	commands: [
		...ER_ENTITY_COLUMN_COMMANDS,
		...ER_ENTITY_COLUMN_SELECTION_COMMANDS,
		...ER_ENTITY_TEXT_SLOT_SELECTION_COMMANDS,
	],
};
