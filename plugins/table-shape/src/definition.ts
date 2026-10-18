import type {
	ConnectionAnchors,
	ObjectPartKindDefinition,
	ObjectTypeDefinition,
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
import { handleTableCornerGrip } from "./controls/handleTableCornerGrip";
import { handleTableRowBoundary } from "./controls/handleTableRowBoundary";
import { handleTableTrailingEdge } from "./controls/handleTableTrailingEdge";
import { TableColumnBoundaryControl } from "./controls/TableColumnBoundaryControl";
import { TableColumnGripControl } from "./controls/TableColumnGripControl";
import { TableCornerGripControl } from "./controls/TableCornerGripControl";
import { TableRowBoundaryControl } from "./controls/TableRowBoundaryControl";
import { TableRowGripControl } from "./controls/TableRowGripControl";
import { calcConnectionAnchorOffsetPastGrips } from "./controls/TableTrackGrip";
import { TableTrailingEdgeControl } from "./controls/TableTrailingEdgeControl";
import { tableDocDefinition } from "./doc";
import { clearTableGridCells } from "./grid/clearTableGridCells";
import { collectTableCellRange } from "./grid/collectTableCellRange";
import { insertTableGridTrack } from "./grid/insertTableGridTrack";
import {
	countTableTracks,
	TABLE_COLUMN_PART_KIND,
	TABLE_ROW_PART_KIND,
} from "./grid/tableTrack";
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
 * The top and left connection-anchor dots pushed out past the grips lining
 * those edges. The trailing-edge strips on the bottom and right reach out too
 * little to meet a dot at the theme's distance, so those dots keep it.
 */
const calcTableConnectionAnchors = (
	_state: TableState,
	zoom: number,
): ConnectionAnchors => {
	const offsetPastGrips = calcConnectionAnchorOffsetPastGrips(zoom);
	return {
		topCenter: { offset: offsetPastGrips },
		leftCenter: { offset: offsetPastGrips },
	};
};

/**
 * Six controls: a boundary and a grip per axis, the trailing edges, and the
 * corner grip where the two strips of grips meet. One
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
 * it was. A trailing-edge drag resizes the last track alone, Shift or not. None
 * of them writes the box: it is re-derived from the tracks on the same reducer
 * tick (reconcileTableBoxWithGrid), and these being selection controls rather than
 * transform handles, the resizer reads no axis of it as an input.
 *
 * The grips write no object at all, only the part selection, so a click on one is
 * never a document change. The corner grip picks every cell, as cells rather
 * than as rows, so Delete over that pick clears text and removes nothing.
 *
 * All six are drawn under the core handles: the strips and grips run along the
 * edges the resize handles sit on, and one covered at a handle's spot is still
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
	{
		name: "cornerGrip",
		layer: "belowHandles",
		events: ["click"],
		Component: TableCornerGripControl,
		handle: handleTableCornerGrip,
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
 * What is declared here is the five things core cannot derive — where the cells
 * are (every cell rect in one layout pass, calcTableTextSlotRegions), what Delete
 * means over a cell range, what the range between two cells is, that a cell
 * pick receives the fill on top of the text (TABLE_CELL_STYLE_INTENT_KINDS), and
 * that Tab in the editor of the last cell appends a row looking like the last
 * one, as Insert Row Below would, rather than wrapping to the first cell — so
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
		delete: (table, cellIds) => {
			const clearedTable = clearTableGridCells(table, cellIds);
			return clearedTable === null ? null : { object: clearedTable };
		},
		styleIntentKinds: TABLE_CELL_STYLE_INTENT_KINDS,
		extend: (table) => ({
			object: insertTableGridTrack(
				table,
				"row",
				countTableTracks(table, "row"),
			),
		}),
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
	contentResizer: (state, context) =>
		reconcileTableBoxWithGrid(state as TableState, context),
	component: Table,
	behavior: createFrameBehavior<TableState>(),
	selectionControls: TABLE_SELECTION_CONTROLS,
	partKinds: TABLE_PARTS,
	connectionAnchors: calcTableConnectionAnchors,
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
