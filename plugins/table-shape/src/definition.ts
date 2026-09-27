import type {
	ObjectTypeDefinition,
	ObjectTransformHandles,
} from "@jiscribe/canvas";
import { createFrameBehavior } from "@jiscribe/canvas-sdk";

import { tableDocDefinition } from "./doc";
import { calcTableTextRegion } from "./presentation/calcTableTextRegion";
import { TableBox } from "./presentation/TableBox";
import type { TableDoc } from "./schema/TableDoc";
import { resizeTableStateToContent } from "./state/resizeTableStateToContent";
import { tableToDoc, tableToState } from "./state/TableMapper";
import type { TableState } from "./state/TableState";
import { isValidTableState } from "./state/validateTableState";
import { TableStencils } from "./stencil/TableStencils";

/**
 * No resize handles: the box is the grid's answer, so a handle dragged against it
 * would fight the next re-derivation. Column widths and row heights are what a
 * table is resized by, and they get their own controls rather than the transform
 * frame's.
 *
 * Declared once at module scope because the registry memoizes on the declaration
 * itself (ObjectTransformHandlesRegistry).
 */
const TABLE_TRANSFORM_HANDLES: ObjectTransformHandles = { resize: false };

/**
 * `createFrameObjectDefinition` is not used here for the reason its doc half is
 * not (see ./doc): it is built around a stored box. The mapper and the content
 * resizer are the two halves that replace it.
 *
 * The menu is declared rather than derived: a table takes the stroke items for
 * its rules and the text items for its cells, and nothing else the features would
 * offer. With no cell picked, a text edit from the menu writes into every cell at
 * once (TextSlotStyleProperty); clicking one first narrows it to that cell.
 */
export const tableDefinition: ObjectTypeDefinition<TableDoc, TableState> = {
	...tableDocDefinition,
	mapper: { toDoc: tableToDoc, toState: tableToState },
	stateValidator: isValidTableState,
	contentResizer: (state) => resizeTableStateToContent(state as TableState),
	component: TableBox,
	textRegion: calcTableTextRegion,
	behavior: createFrameBehavior<TableState>(),
	transformHandles: TABLE_TRANSFORM_HANDLES,
	stencils: TableStencils,
	menu: [
		{
			id: "style",
			items: [{ type: "borderColor" }, { type: "borderStyle", radius: false }],
		},
		{
			id: "text",
			items: [
				{ type: "font" },
				{ type: "textFormat" },
				{ type: "textAlignment" },
			],
		},
	],
};
