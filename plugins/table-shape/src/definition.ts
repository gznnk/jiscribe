import { createTextSlotPartKindDefinition } from "@jiscribe/canvas";
import type {
	ObjectPartKindDefinition,
	ObjectTypeDefinition,
	ObjectTransformHandles,
	SelectionControlDefinition,
} from "@jiscribe/canvas";
import {
	appendPropertyPanelItems,
	createDefaultPropertyPanel,
	createFrameBehavior,
	PROPERTY_PANEL_SECTIONS,
} from "@jiscribe/canvas-sdk";

import { handleTableColumnBoundary } from "./controls/handleTableColumnBoundary";
import { createTableInsertHandler } from "./controls/handleTableInsert";
import { handleTableRowBoundary } from "./controls/handleTableRowBoundary";
import { createTableTrackGripHandler } from "./controls/handleTableTrackGrip";
import { TableColumnBoundaryControl } from "./controls/TableColumnBoundaryControl";
import { TableColumnGripControl } from "./controls/TableColumnGripControl";
import { TableColumnInsertControl } from "./controls/TableColumnInsertControl";
import { TableRowBoundaryControl } from "./controls/TableRowBoundaryControl";
import { TableRowGripControl } from "./controls/TableRowGripControl";
import { TableRowInsertControl } from "./controls/TableRowInsertControl";
import { tableDocDefinition } from "./doc";
import { clearTableCells } from "./grid/clearTableCells";
import { collectTableCellRange } from "./grid/collectTableCellRange";
import { TABLE_COLUMN_PART_KIND, TABLE_ROW_PART_KIND } from "./grid/tableTrack";
import { TableCellColorMenu } from "./menu/TableCellColorMenu";
import { TableCellColorRow } from "./menu/TableCellColorRow";
import { createTableTrackPartDefinition } from "./parts/tableTrackParts";
import { calcTableTextRegion } from "./presentation/calcTableTextRegion";
import { TableBox } from "./presentation/TableBox";
import type { TableDoc } from "./schema/TableDoc";
import { TABLE_EXTRA_STYLE_PROPERTIES, TableFeatures } from "./schema/TableDoc";
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
 * Six controls: a boundary, a grip and an insert badge per axis. One registration
 * covers every boundary or track of its axis — each handle appends its own index
 * to the control's `data-part`, and the handler reads it back off the event's
 * `subPart` (parseTableBoundaryIndex / parseTableTrackPartId). A registration per
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
 * (resizeTableStateToContent), which is what makes a column drag leave the outer
 * frame exactly where it was.
 *
 * The grips write no object at all, only the part selection, so a click on one is
 * never a document change. A `+` badge is the one control here that changes the
 * document on a click, which handleGesture closes out and commits exactly as it
 * does the end of a drag.
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
		events: ["click"],
		Component: TableRowInsertControl,
		handle: createTableInsertHandler(TABLE_ROW_PART_KIND),
	},
	{
		name: "columnInsert",
		events: ["click"],
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
 * What is declared here is the two things core cannot derive — what Delete means
 * over a cell range, and what the range between two cells is — so
 * `createTextSlotPartKindDefinition` is spread for the rest and only those added (a
 * declared `"textSlot"` replaces the derived one). Emptying is not removing,
 * which is why rows and cells are separate kinds at all: Delete over a row grip
 * takes the row, where the very same cells picked as cells keep their places and
 * lose their text. And a grid's run between two cells is the rectangle they
 * corner, not the slice of the slot order between them (collectTableCellRange).
 */
const TABLE_PARTS: ObjectPartKindDefinition<TableState>[] = [
	createTableTrackPartDefinition(TABLE_ROW_PART_KIND),
	createTableTrackPartDefinition(TABLE_COLUMN_PART_KIND),
	{
		...createTextSlotPartKindDefinition(calcTableTextRegion),
		range: collectTableCellRange,
		delete: clearTableCells,
	},
];

/** Identity of the cell-background control on both surfaces; matched by the multi-type merge. */
const TABLE_CELL_FILL_ITEM_ID = "table-cell-fill";

/**
 * The properties sidebar: what the features imply, plus the cell background.
 *
 * A declared `propertyPanel` replaces the default rather than adding to it, so
 * the default is built here and appended to — the core types that add a row do
 * the same. The row goes under the shared Fill heading, which is already worded
 * in every locale the canvas knows, and lands last because a table's features
 * declare no fill of its own for that section to have been created by.
 *
 * `slotAware`, for the reason the menu item carries it: the write lands on the
 * cells, so the row has to survive one being picked.
 */
const TABLE_PROPERTY_PANEL = appendPropertyPanelItems(
	createDefaultPropertyPanel(TableFeatures),
	PROPERTY_PANEL_SECTIONS.fill,
	{
		type: "custom",
		id: TABLE_CELL_FILL_ITEM_ID,
		component: TableCellColorRow,
		slotAware: true,
	},
);

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
 * the `+` badges.
 *
 * The cell background is the one item this shape draws itself. It sits with the
 * stroke items, being the other half of how a table looks, and is the only custom
 * item here that survives a cell being picked — it writes what a cell holds, so
 * it declares `slotAware` (filterTextSlotMenuSections drops every other one).
 * The sidebar takes the same background as a row of its own
 * ({@link TABLE_PROPERTY_PANEL}); the floating menu is not the only place a user
 * looks for it.
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
	partKinds: TABLE_PARTS,
	transformHandles: TABLE_TRANSFORM_HANDLES,
	stencils: TableStencils,
	extraStyleProperties: TABLE_EXTRA_STYLE_PROPERTIES,
	propertyPanel: TABLE_PROPERTY_PANEL,
	menu: [
		{
			id: "style",
			items: [
				{
					type: "custom",
					id: TABLE_CELL_FILL_ITEM_ID,
					component: TableCellColorMenu,
					slotAware: true,
				},
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
