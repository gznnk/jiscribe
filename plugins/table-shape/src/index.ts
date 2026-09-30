// External package of the table shape: a grid of cells, each cell one text slot
// of the shape plus a background of its own. It is the first shipped shape whose
// document stores no size — the width is the column widths summed and the height
// the resolved row heights summed — so the box is re-derived from the content
// (contentResizer) rather than read off the document.
// The headless parse entry point is ./doc (tableDocPlugin).
// (See packages/canvas/docs/13-authoring-plugins.md.)
export * from "./schema/TableDoc";
export { validateTableFields } from "./schema/validateTableFields";

export * from "./state/TableState";
export { tableToDoc, tableToState } from "./state/TableMapper";
export { isValidTableState } from "./state/validateTableState";
export { resizeTableStateToContent } from "./state/resizeTableStateToContent";
export { growTableFromDrawnCorner } from "./state/growTableFromDrawnCorner";

export { clearTableCells } from "./grid/clearTableCells";
export { insertTableTrack } from "./grid/insertTableTrack";
export { readTableCell } from "./grid/readTableCell";
export { remapTablePartSelectionForInsert } from "./grid/remapTablePartSelectionForInsert";
export { removeTableTracks } from "./grid/removeTableTracks";
export { rewriteTableGrid } from "./grid/rewriteTableGrid";
export {
	countTableTracks,
	parseTableTrackPartId,
	TABLE_COLUMN_PART_KIND,
	TABLE_ROW_PART_KIND,
	tableTrackPartId,
} from "./grid/tableTrack";
export type { TableAxis } from "./grid/tableTrack";

export { createTableTrackPartDefinition } from "./parts/tableTrackParts";

export { TABLE_INSERT_COMMANDS } from "./commands/tableInsertCommands";
export { TABLE_REMOVE_COMMANDS } from "./commands/tableRemoveCommands";
export { TABLE_CONTEXT_MENU } from "./commands/tableContextMenu";
export { resolveTableInsertTarget } from "./commands/resolveTableInsertTarget";
export type {
	TableInsertSide,
	TableInsertTarget,
} from "./commands/resolveTableInsertTarget";
export { resolveTableTrackSelection } from "./commands/resolveTableTrackSelection";
export type { TableTrackSelection } from "./commands/resolveTableTrackSelection";

export { calcTableLayout } from "./layout/calcTableLayout";
export type { TableLayout, TableLayoutState } from "./layout/calcTableLayout";
export { calcTableFrameSize } from "./layout/calcTableFrameSize";
export { distributeTableWidthToColumns } from "./layout/distributeTableWidthToColumns";
export { calcTableTextRegion } from "./presentation/calcTableTextRegion";
export { TableBox } from "./presentation/TableBox";

export {
	calcTableLocalDragDelta,
	calcTableStripPlacement,
	createTableInsertHandler,
	createTableTrackGripHandler,
	handleTableColumnBoundary,
	handleTableRowBoundary,
	parseTableBoundaryIndex,
	resolveTableColumnBoundaryDrag,
	resolveTableRowBoundaryDrag,
	TableBoundaryStrip,
	TableColumnBoundaryControl,
	TableColumnGripControl,
	TableColumnInsertControl,
	TableInsertBadge,
	TableInsertBadges,
	TableRowBoundaryControl,
	TableRowGripControl,
	TableRowInsertControl,
	TableTrackGrip,
	TableTrackGrips,
} from "./controls";
export type { TableStripPlacement } from "./controls";

export { TableIcon } from "./stencil/TableIcon";
export { TableStencils } from "./stencil/TableStencils";

// The plugin's own wording, resolved against the canvas locale with
// resolveLocaleMessages (see useTableStrings).
export { tableMessagesByLocale } from "./messages/tableMessages";
export type { TableStrings } from "./messages/tableMessages";

export { tableDefinition } from "./definition";
export { tableDocDefinition, tableDocPlugin } from "./doc";
export { tablePlugin } from "./plugin";
