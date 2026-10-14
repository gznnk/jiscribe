import type {
	ConnectionAnchorOffsets,
	ObjectPartKindDefinition,
	ObjectTypeDefinition,
	ObjectTransformHandles,
	SelectionControlDefinition,
} from "@jiscribe/canvas";
import {
	createDefaultPropertyPanel,
	createFrameBehavior,
	createTextSlotPartKindDefinition,
} from "@jiscribe/canvas-sdk";
import type { DeclaredStyleTable } from "@jiscribe/canvas-sdk";

import { TABLE_INSERT_PICKED_PART_KINDS } from "./commands/tableInsertCommands";
import { createTableTrackGripHandler } from "./controls/createTableTrackGripHandler";
import { handleTableColumnBoundary } from "./controls/handleTableColumnBoundary";
import { handleTableRowBoundary } from "./controls/handleTableRowBoundary";
import { handleTableTrailingEdge } from "./controls/handleTableTrailingEdge";
import { TableColumnBoundaryControl } from "./controls/TableColumnBoundaryControl";
import { TableColumnGripControl } from "./controls/TableColumnGripControl";
import { TableRowBoundaryControl } from "./controls/TableRowBoundaryControl";
import { TableRowGripControl } from "./controls/TableRowGripControl";
import { calcConnectionAnchorOffsetPastGrips } from "./controls/TableTrackGrip";
import { TableTrailingEdgeControl } from "./controls/TableTrailingEdgeControl";
import { tableDocDefinition } from "./doc";
import { clearTableCells } from "./grid/clearTableCells";
import { collectTableCellRange } from "./grid/collectTableCellRange";
import { TABLE_COLUMN_PART_KIND, TABLE_ROW_PART_KIND } from "./grid/tableTrack";
import { TableInsertMenu } from "./menu/TableInsertMenu";
import { TABLE_CELL_STYLE_INTENT_KINDS } from "./parts/tableCellStyleIntentKinds";
import { TABLE_TRACK_PART_DEFINITIONS } from "./parts/tableTrackParts";
import { calcTableTextSlotRegions } from "./presentation/calcTableTextSlotRegions";
import { Table } from "./presentation/Table";
import { TableInsertProperty } from "./propertyPanel/TableInsertProperty";
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
 * answer, and a row is given a height by dragging its boundary or, for the last
 * row, the table's trailing edge ({@link TABLE_SELECTION_CONTROLS}), both of which
 * write the row's bound rather than the box.
 *
 * Declared once at module scope because the registry memoizes on the declaration
 * itself (ObjectTransformHandlesRegistry).
 */
const TABLE_TRANSFORM_HANDLES: ObjectTransformHandles = { resize: "width" };

/**
 * The top and left connection-anchor dots pushed out past the grips lining
 * those edges. The trailing-edge strips on the bottom and right reach out too
 * little to meet a dot at the theme's distance, so those dots keep it.
 */
const calcTableConnectionAnchorOffsets = (
	_state: TableState,
	zoom: number,
): ConnectionAnchorOffsets => {
	const offsetPastGrips = calcConnectionAnchorOffsetPastGrips(zoom);
	return {
		topCenter: offsetPastGrips,
		leftCenter: offsetPastGrips,
	};
};

/**
 * Five controls: a boundary and a grip per axis, and the trailing edges. One
 * registration covers every boundary or track of its axis — each handle appends
 * its own index to the control's `data-action`, and the handler reads it back off
 * the event's `subAction` (parseTableBoundaryIndex / parseTableTrackPartId). A
 * registration per boundary would instead have to change as rows and columns
 * come and go, which registration is not able to do — it happens once per type.
 * The trailing edges share one registration the same way, by axis
 * (parseTableTrailingEdgeAxis).
 *
 * A boundary drag resizes the track before it alone and the table with it, or
 * with Shift held trades between the two tracks and leaves the outer frame where
 * it was. A trailing-edge drag resizes the last track alone, Shift or not. Only
 * the column drags ever write the box, and only when the columns' total changes
 * (resizeTableToColumns); otherwise the box is re-derived from the tracks on the
 * same reducer tick (reconcileTableBoxWithGrid).
 *
 * The grips write no object at all, only the part selection, so a click on one is
 * never a document change.
 *
 * All five are drawn under the core handles: the strips and grips run along the
 * edges the width handles sit on, and one covered at a handle's spot is still
 * reachable along the rest of its length, where the handle can be pressed
 * nowhere else.
 */
const TABLE_SELECTION_CONTROLS: SelectionControlDefinition<TableState>[] = [
	{
		name: "columnBoundary",
		layer: "belowHandles",
		Component: TableColumnBoundaryControl,
		handle: handleTableColumnBoundary,
	},
	{
		name: "rowBoundary",
		layer: "belowHandles",
		Component: TableRowBoundaryControl,
		handle: handleTableRowBoundary,
	},
	{
		name: "trailingEdge",
		layer: "belowHandles",
		Component: TableTrailingEdgeControl,
		handle: handleTableTrailingEdge,
	},
	{
		name: "rowGrip",
		layer: "belowHandles",
		events: ["click"],
		Component: TableRowGripControl,
		handle: createTableTrackGripHandler(TABLE_ROW_PART_KIND),
	},
	{
		name: "columnGrip",
		layer: "belowHandles",
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
 * What is declared here is the four things core cannot derive — where the cells
 * are (every cell rect in one layout pass, calcTableTextSlotRegions), what Delete
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
		...createTextSlotPartKindDefinition<TableState>({
			regions: calcTableTextSlotRegions,
		}),
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
 * background on the table's own ({@link TABLE_STYLE_ENTRIES}). An Insert section
 * follows them, drawn only while a row, column or cell is picked, where the
 * narrowing keeps its item (`pickedPartKinds`); with the table selected as a
 * whole it draws nothing and the section collapses with its divider.
 *
 * `propertyPanel` is the sections `createDefaultPropertyPanel` derives from
 * `TableFeatures`, with an Insert section added after them. It is offered
 * only while a row, column or cell is picked, where the narrowing keeps its row
 * (`pickedPartKinds`); with the table selected as a whole there is nowhere to
 * insert next to, so the section's `isShown` takes its heading away.
 */
export const tableDefinition: ObjectTypeDefinition<TableDoc, TableState> = {
	...tableDocDefinition,
	mapper: { toDoc: tableToDoc, toState: tableToState },
	stateValidator: isValidTableState,
	contentResizer: (state) => reconcileTableBoxWithGrid(state as TableState),
	component: Table,
	behavior: createFrameBehavior<TableState>(),
	selectionControls: TABLE_SELECTION_CONTROLS,
	partKinds: TABLE_PARTS,
	transformHandles: TABLE_TRANSFORM_HANDLES,
	connectionAnchorOffsets: calcTableConnectionAnchorOffsets,
	stencils: TableStencils,
	styleEntries: TABLE_STYLE_ENTRIES,
	propertyPanel: [
		...createDefaultPropertyPanel(tableDocDefinition.features),
		{
			id: "table-insert",
			label: { en: "Insert", ja: "挿入" },
			isShown: ({ selection }) => selection.part !== null,
			items: [
				{
					type: "custom",
					id: "table-insert",
					component: TableInsertProperty,
					pickedPartKinds: TABLE_INSERT_PICKED_PART_KINDS,
				},
			],
		},
	],
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
		{
			id: "table-insert",
			items: [
				{
					type: "custom",
					id: "table-insert",
					component: TableInsertMenu,
					pickedPartKinds: TABLE_INSERT_PICKED_PART_KINDS,
				},
			],
		},
	],
};
