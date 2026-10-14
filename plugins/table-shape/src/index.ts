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
export { reconcileTableBoxWithGrid } from "./state/reconcileTableBoxWithGrid";
export { resizeTableFromDrawnCorner } from "./state/resizeTableFromDrawnCorner";

export { clearTableCells } from "./grid/clearTableCells";
export { collectTableTrackCellIds } from "./grid/collectTableTrackCellIds";
export { insertTableTrack } from "./grid/insertTableTrack";
export { resolveTableCell } from "./grid/resolveTableCell";
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

export { TABLE_TRACK_PART_DEFINITIONS } from "./parts/tableTrackParts";

export { TABLE_INSERT_COMMANDS } from "./commands/tableInsertCommands";
export { TABLE_CELL_SELECTION_COMMANDS } from "./commands/tableCellSelectionCommands";
export { readTableInsertTarget } from "./commands/readTableInsertTarget";
export type {
	TableInsertSide,
	TableInsertTarget,
} from "./commands/readTableInsertTarget";
export { readTableTrackTarget } from "./commands/readTableTrackTarget";
export type { TableTrackTarget } from "./commands/readTableTrackTarget";

export { calcTableLayout } from "./layout/calcTableLayout";
export type { TableLayout, TableLayoutSource } from "./layout/calcTableLayout";
export { calcTableFrameSize } from "./layout/calcTableFrameSize";
export { distributeTableWidthToColumns } from "./layout/distributeTableWidthToColumns";
export { calcTableTextSlotRegions } from "./presentation/calcTableTextSlotRegions";
export { Table } from "./presentation/Table";

export {
	calcTableLocalDragDelta,
	calcSegmentPlacement,
	createTableTrackGripHandler,
	handleTableColumnBoundary,
	handleTableRowBoundary,
	parseTableBoundaryIndex,
	readTableBoundaryDragMode,
	calcTableColumnBoundaryDrag,
	calcTableRowBoundaryDrag,
	TableBoundaryStrip,
	TableColumnBoundaryControl,
	TableColumnGripControl,
	TableRowBoundaryControl,
	TableRowGripControl,
	TableTrackGrip,
	TableTrackGrips,
} from "./controls";
export type { SegmentPlacement, TableBoundaryDragMode } from "./controls";

export { TableIcon } from "./stencil/TableIcon";
export { TableStencils } from "./stencil/TableStencils";

export { tableDefinition } from "./definition";
export { tableDocDefinition, tableDocPlugin } from "./doc";
export { tablePlugin } from "./plugin";
