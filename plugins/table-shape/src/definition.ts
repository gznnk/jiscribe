import type {
	ObjectTypeDefinition,
	ObjectTransformHandles,
	SelectionControlDefinition,
} from "@jiscribe/canvas";
import { createFrameBehavior } from "@jiscribe/canvas-sdk";

import { handleTableColumnBoundary } from "./controls/handleTableColumnBoundary";
import { handleTableRowBoundary } from "./controls/handleTableRowBoundary";
import { TableColumnBoundaryControl } from "./controls/TableColumnBoundaryControl";
import { TableRowBoundaryControl } from "./controls/TableRowBoundaryControl";
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
 * The left and right handles alone. Dragging one distributes the width change
 * across every column in the proportions it holds, which the content resizer does
 * on reading a width the columns do not sum to (resizeTableStateToContent) — so
 * the handle does not fight the re-derivation, it feeds it.
 *
 * No handle on the height: a row's stored height is a lower bound its text raises,
 * which makes a dragged bottom edge and deleted text indistinguishable to the
 * resizer, the one place a handle's write is visible. The height stays the grid's
 * answer, and a row is given a height by dragging its boundary
 * ({@link TABLE_SELECTION_CONTROLS}).
 *
 * Declared once at module scope because the registry memoizes on the declaration
 * itself (ObjectTransformHandlesRegistry).
 */
const TABLE_TRANSFORM_HANDLES: ObjectTransformHandles = { resize: "width" };

/**
 * The two boundary controls. One registration per axis covers every boundary of
 * that axis: each strip appends its index to the control's `data-part`, and the
 * handler reads it back off the event's `subPart` (parseTableBoundaryIndex). A
 * registration per boundary would instead have to change as rows and columns come
 * and go, which registration is not able to do — it happens once per type.
 *
 * Neither handler writes the table's box. Both return the pair of tracks they
 * rewrote, and the box is re-derived from them on the same reducer tick
 * (resizeTableStateToContent), which is what makes a column drag leave the outer
 * frame exactly where it was.
 */
const TABLE_SELECTION_CONTROLS: SelectionControlDefinition<TableState>[] = [
	{
		name: "columnBoundary",
		Component: TableColumnBoundaryControl,
		handle: handleTableColumnBoundary,
	},
	{
		name: "rowBoundary",
		Component: TableRowBoundaryControl,
		handle: handleTableRowBoundary,
	},
];

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
	selectionControls: TABLE_SELECTION_CONTROLS,
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
