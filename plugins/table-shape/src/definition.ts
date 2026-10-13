import type {
	ConnectionAnchorOffsets,
	ObjectPartKindDefinition,
	ObjectTypeDefinition,
	ObjectTransformHandles,
	SelectionControlDefinition,
} from "@jiscribe/canvas";
import {
	createFrameBehavior,
	createTextSlotPartKindDefinition,
} from "@jiscribe/canvas-sdk";
import type { DeclaredStyleTable } from "@jiscribe/canvas-sdk";

import { createTableInsertHandler } from "./controls/createTableInsertHandler";
import { createTableTrackGripHandler } from "./controls/createTableTrackGripHandler";
import { handleTableColumnBoundary } from "./controls/handleTableColumnBoundary";
import { handleTableRowBoundary } from "./controls/handleTableRowBoundary";
import { TableColumnBoundaryControl } from "./controls/TableColumnBoundaryControl";
import { TableColumnGripControl } from "./controls/TableColumnGripControl";
import { TableColumnInsertControl } from "./controls/TableColumnInsertControl";
import { TableRowBoundaryControl } from "./controls/TableRowBoundaryControl";
import { TableRowGripControl } from "./controls/TableRowGripControl";
import { TableRowInsertControl } from "./controls/TableRowInsertControl";
import { CONNECTION_ANCHOR_OFFSET_PAST_CONTROLS } from "./controls/TableTrackGrip";
import { tableDocDefinition } from "./doc";
import { clearTableCells } from "./grid/clearTableCells";
import { collectTableCellRange } from "./grid/collectTableCellRange";
import { TABLE_COLUMN_PART_KIND, TABLE_ROW_PART_KIND } from "./grid/tableTrack";
import { TABLE_CELL_STYLE_INTENT_KINDS } from "./parts/tableCellStyleIntentKinds";
import { TABLE_TRACK_PART_DEFINITIONS } from "./parts/tableTrackParts";
import { calcTableTextRegion } from "./presentation/calcTableTextRegion";
import { Table } from "./presentation/Table";
import type { TableDoc } from "./schema/TableDoc";
import { reconcileTableBoxWithGrid } from "./state/reconcileTableBoxWithGrid";
import { tableToDoc, tableToState } from "./state/TableMapper";
import type { TableState } from "./state/TableState";
import { isValidTableState } from "./state/validateTableState";
import { TableStencils } from "./stencil/TableStencils";
import { tableFillEntry } from "./style/tableFillEntries";

/**
 * The left and right handles alone. Dragging one distributes the width change
 * across every column in the proportions it holds, which the content resizer does
 * on reading a width the columns do not sum to (reconcileTableBoxWithGrid) — so
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
 * Every connection-anchor dot pushed out past the control lining its edge: the
 * grips on the top and left, the insert badges on the bottom and right.
 */
const TABLE_CONNECTION_ANCHOR_OFFSETS: ConnectionAnchorOffsets = {
	topCenter: CONNECTION_ANCHOR_OFFSET_PAST_CONTROLS,
	leftCenter: CONNECTION_ANCHOR_OFFSET_PAST_CONTROLS,
	bottomCenter: CONNECTION_ANCHOR_OFFSET_PAST_CONTROLS,
	rightCenter: CONNECTION_ANCHOR_OFFSET_PAST_CONTROLS,
};

/**
 * Six controls: a boundary, a grip and an insert badge per axis. One registration
 * covers every boundary or track of its axis — each handle appends its own index
 * to the control's `data-action`, and the handler reads it back off the event's
 * `subAction` (parseTableBoundaryIndex / parseTableTrackPartId). A registration per
 * boundary would instead have to change as rows and columns come and go, which
 * registration is not able to do — it happens once per type.
 *
 * Dragging a boundary and inserting at one are separate controls rather than one
 * control taking both events. They number different things — the strips run along
 * the inner rules alone, where a `+` stands at every insertion position, the outer
 * two edges included — and a click on the drag strip has to stay a no-op, a
 * missed drag being the commonest way to produce one.
 *
 * Neither boundary handler writes the table's box. Both return the pair of tracks
 * they rewrote, and the box is re-derived from them on the same reducer tick
 * (reconcileTableBoxWithGrid), which is what makes a column drag leave the outer
 * frame exactly where it was.
 *
 * The grips write no object at all, only the part selection, so a click on one is
 * never a document change. A `+` badge is the one control here that changes the
 * document on a click, which the adapter commits on the spot. It takes a
 * doubleClick as well, each press being one insertion: the recognizer reports a
 * second press within the double-click window as a doubleClick instead of a
 * click, so a badge taking clicks alone would drop every other press of a
 * rapid run.
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
	{
		name: "rowInsert",
		events: ["click", "doubleClick"],
		Component: TableRowInsertControl,
		handle: createTableInsertHandler(TABLE_ROW_PART_KIND),
	},
	{
		name: "columnInsert",
		events: ["click", "doubleClick"],
		Component: TableColumnInsertControl,
		handle: createTableInsertHandler(TABLE_COLUMN_PART_KIND),
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
 * What is declared here is the three things core cannot derive — what Delete
 * means over a cell range, what the range between two cells is, and that a cell
 * pick receives the fill on top of the text (TABLE_CELL_STYLE_INTENT_KINDS) — so
 * `createTextSlotPartKindDefinition` is spread for the rest and only those added (a
 * declared `"textSlot"` replaces the derived one). Emptying is not removing,
 * which is why rows and cells are separate kinds at all: Delete over a row grip
 * takes the row, where the very same cells picked as cells keep their places and
 * lose their text. And a grid's run between two cells is the rectangle they
 * corner, not the slice of the slot order between them (collectTableCellRange).
 */
const TABLE_PARTS: ObjectPartKindDefinition<TableState>[] = [
	TABLE_TRACK_PART_DEFINITIONS.row,
	TABLE_TRACK_PART_DEFINITIONS.column,
	{
		...createTextSlotPartKindDefinition(calcTableTextRegion),
		range: collectTableCellRange,
		delete: clearTableCells,
		styleIntentKinds: TABLE_CELL_STYLE_INTENT_KINDS,
	},
];

/**
 * Fill is declared again, to follow the selection: the table's own background
 * with nothing picked inside it, the cells the pick reaches otherwise
 * (tableFillEntry). Its opacity is left derived: the background's alone, which
 * is why no cell pick receives it (TABLE_CELL_STYLE_INTENT_KINDS) and the narrowing
 * hides its row under one.
 */
const TABLE_STYLE_ENTRIES = {
	fill: tableFillEntry,
} satisfies DeclaredStyleTable<TableState>;

/**
 * `createFrameObjectDefinition` is not used here for the reason its doc half is
 * not (see ./doc): it is built around a stored box. The mapper and the content
 * resizer are the two halves that replace it.
 *
 * The menu is declared rather than derived: a table takes the background, the
 * stroke items for its rules and the text items for its cells, and nothing else
 * the features would offer. A text edit or a background from the menu lands on
 * the picked cells or the cells of the picked rows or columns (each kind's
 * `textSlotIds`); with nothing picked, a text edit lands on every cell and a
 * background on the table's own ({@link TABLE_STYLE_ENTRIES}). Reshaping the grid is in neither
 * section: it belongs to the keys, the grips and the `+` badges.
 */
export const tableDefinition: ObjectTypeDefinition<TableDoc, TableState> = {
	...tableDocDefinition,
	mapper: { toDoc: tableToDoc, toState: tableToState },
	stateValidator: isValidTableState,
	contentResizer: (state) => reconcileTableBoxWithGrid(state as TableState),
	component: Table,
	textRegion: calcTableTextRegion,
	behavior: createFrameBehavior<TableState>(),
	selectionControls: TABLE_SELECTION_CONTROLS,
	partKinds: TABLE_PARTS,
	transformHandles: TABLE_TRANSFORM_HANDLES,
	connectionAnchorOffsets: TABLE_CONNECTION_ANCHOR_OFFSETS,
	stencils: TableStencils,
	styleEntries: TABLE_STYLE_ENTRIES,
	menu: [
		{
			id: "style",
			items: [
				{ type: "backgroundColor" },
				{ type: "borderColor" },
				{ type: "borderStyle", radius: false },
			],
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
