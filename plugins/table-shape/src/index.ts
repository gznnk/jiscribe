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

export { calcTableLayout } from "./layout/calcTableLayout";
export type { TableLayout, TableLayoutState } from "./layout/calcTableLayout";
export { calcTableFrameSize } from "./layout/calcTableFrameSize";
export { calcTableTextRegion } from "./presentation/calcTableTextRegion";
export { TableBox } from "./presentation/TableBox";

export { TableIcon } from "./stencil/TableIcon";
export { TableStencils } from "./stencil/TableStencils";

export { tableDefinition } from "./definition";
export { tableDocDefinition, tableDocPlugin } from "./doc";
export { tablePlugin } from "./plugin";
