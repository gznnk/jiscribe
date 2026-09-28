import { createTextSlotPartDefinition } from "@jiscribe/canvas";
import type {
	ObjectPartDefinition,
	ObjectTypeDefinition,
	ObjectTransformHandles,
	SelectionControlDefinition,
} from "@jiscribe/canvas";
import { createFrameBehavior } from "@jiscribe/canvas-sdk";

import { TABLE_CONTEXT_MENU } from "./commands/tableContextMenu";
import { handleTableColumnBoundary } from "./controls/handleTableColumnBoundary";
import { handleTableRowBoundary } from "./controls/handleTableRowBoundary";
import { createTableTrackGripHandler } from "./controls/handleTableTrackGrip";
import { TableColumnBoundaryControl } from "./controls/TableColumnBoundaryControl";
import { TableColumnGripControl } from "./controls/TableColumnGripControl";
import { TableRowBoundaryControl } from "./controls/TableRowBoundaryControl";
import { TableRowGripControl } from "./controls/TableRowGripControl";
import { tableDocDefinition } from "./doc";
import { clearTableCells } from "./grid/clearTableCells";
import { TABLE_COLUMN_PART_KIND, TABLE_ROW_PART_KIND } from "./grid/tableTrack";
import { createTableTrackPartDefinition } from "./parts/tableTrackParts";
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
 * Four controls: a boundary per axis and a grip per axis. One registration covers
 * every boundary or track of its axis — each strip appends its own index to the
 * control's `data-part`, and the handler reads it back off the event's `subPart`
 * (parseTableBoundaryIndex / parseTableTrackPartId). A registration per boundary
 * would instead have to change as rows and columns come and go, which
 * registration is not able to do — it happens once per type.
 *
 * Neither boundary handler writes the table's box. Both return the pair of tracks
 * they rewrote, and the box is re-derived from them on the same reducer tick
 * (resizeTableStateToContent), which is what makes a column drag leave the outer
 * frame exactly where it was.
 *
 * The grips write no object at all, only the part selection, so a click on one is
 * never a document change.
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
	{
		name: "rowGrip",
		events: ["click"],
		Component: TableRowGripControl,
		handle: createTableTrackGripHandler(TABLE_ROW_PART_KIND),
	},
	{
		name: "columnGrip",
		events: ["click"],
		Component: TableColumnGripControl,
		handle: createTableTrackGripHandler(TABLE_COLUMN_PART_KIND),
	},
];

/**
 * Three kinds: whole rows, whole columns, and the cells.
 *
 * The cells ride core's own `"textSlot"` rather than a kind of this shape's
 * invention. A table's cells *are* the slot map core builds that part from, and
 * the half of core that selects and styles a slot names that kind: the click
 * that steps into a shape writes it, Tab walks it, the text style menu reads it.
 * A `"cell"` kind would be a second name for the same thing, selected by nobody.
 *
 * What is declared here is the one thing core cannot derive — what Delete means
 * over a cell range — so `createTextSlotPartDefinition` is spread for the rest
 * and only `delete` added (a declared `"textSlot"` replaces the derived one).
 * Emptying is not removing, which is why rows and cells are separate kinds at
 * all: Delete over a row grip takes the row, where the very same cells picked as
 * cells keep their places and lose their text.
 */
const TABLE_PARTS: ObjectPartDefinition<TableState>[] = [
	createTableTrackPartDefinition(TABLE_ROW_PART_KIND),
	createTableTrackPartDefinition(TABLE_COLUMN_PART_KIND),
	{
		...createTextSlotPartDefinition(calcTableTextRegion),
		delete: clearTableCells,
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
 * Reshaping the grid is in neither section: it belongs to the keys, the grips and
 * the right-click rows ({@link TABLE_CONTEXT_MENU}).
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
	parts: TABLE_PARTS,
	contextMenu: TABLE_CONTEXT_MENU,
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
