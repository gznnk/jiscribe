// External package of the ER diagram shapes. The first is erEntity: an entity box
// whose columns are structured data (`columns`, each a key / name / type), every
// text one slot of the shape, and whose height — like the table's — is derived
// from the content rather than stored.
// The headless parse entry point is ./doc (erDocPlugin).
// (See packages/canvas/docs/13-authoring-plugins.md.)
export * from "./schema/ErEntityDoc";
export {
	countErEntityColumns,
	erEntityColumnConnectPointId,
	erEntityColumnPartId,
	erEntityColumnTextSlotId,
	erEntityTextSlotIds,
	parseErEntityColumnConnectPointId,
	parseErEntityColumnPartId,
	parseErEntityColumnTextSlotId,
} from "./schema/erEntityColumnIds";
export type { ErEntityColumnConnectPointSide } from "./schema/erEntityColumnIds";
export { calcErEntityLayout } from "./layout/calcErEntityLayout";
export type {
	ErEntityLayout,
	ErEntityRowLayout,
} from "./layout/calcErEntityLayout";
export type { ErEntityLayoutInput } from "./layout/readErEntityLayoutSource";
export type {
	ErEntitySlotFloors,
	ErEntitySlotWidths,
} from "./layout/erEntitySlotWidths";
export { distributeErEntityWidthToSlots } from "./layout/distributeErEntityWidthToSlots";
export { validateErEntityFields } from "./schema/validateErEntityFields";
export {
	readErEntityTextSlotStyleDefaults,
	resolveErEntityTextSlotFont,
	resolveErEntityTextSlotStyle,
} from "./schema/erEntityTextSlotStyle";
export type { ErEntityTextSlots } from "./schema/erEntityTextSlotStyle";
export { mapErEntityDocToTextSlots } from "./schema/mapErEntityDocToTextSlots";

export * from "./state/ErEntityState";
export { erEntityToDoc, erEntityToState } from "./state/ErEntityMapper";
export { isValidErEntityState } from "./state/validateErEntityState";
export { reconcileErEntityBox } from "./state/reconcileErEntityBox";
export { resizeErEntityFromDrawnCorner } from "./state/resizeErEntityFromDrawnCorner";

export { ErEntityBox } from "./presentation/ErEntityBox";
export {
	calcErEntityColumnSlotBands,
	calcErEntityTextSlotRegions,
} from "./presentation/calcErEntityTextSlotRegions";
export type { ErEntityColumnSlotBands } from "./presentation/calcErEntityTextSlotRegions";
export { calcErEntityConnectPoints } from "./presentation/calcErEntityConnectPoints";
export { erEntityGeometryKey } from "./presentation/erEntityGeometryKey";

export {
	ER_ENTITY_COLUMN_PART_DEFINITION,
	ER_ENTITY_COLUMN_PART_KIND,
} from "./parts/erEntityColumnPartKind";
export {
	ER_ENTITY_LANE_PART_DEFINITION,
	ER_ENTITY_LANE_PART_KIND,
} from "./parts/erEntityLanePartKind";
export {
	ER_ENTITY_LANES,
	parseErEntityLanePartId,
} from "./parts/erEntityLaneIds";
export type { ErEntityLane } from "./parts/erEntityLaneIds";
export { insertErEntityColumn } from "./columns/insertErEntityColumn";
export { removeErEntityColumns } from "./columns/removeErEntityColumns";

export { calcErEntitySlotBoundaryDrag } from "./controls/calcErEntitySlotBoundaryDrag";
export type { ErEntitySlotDragStart } from "./controls/calcErEntitySlotBoundaryDrag";
export {
	ER_ENTITY_KEY_NAME_BOUNDARY,
	ER_ENTITY_NAME_TYPE_BOUNDARY,
} from "./controls/erEntitySlotBoundaryAction";
export type {
	ErEntitySlotBoundaryDragMode,
	ErEntitySlotBoundaryIndex,
} from "./controls/erEntitySlotBoundaryAction";

export { ErEntityIcon } from "./stencil/ErEntityIcon";
export { ErEntityStencils } from "./stencil/ErEntityStencils";
export { erStencilCategory } from "./stencil/ErStencilCategory";

export { erEntityDefinition } from "./definition";
export { erEntityDocDefinition, erDocPlugin } from "./doc";
export { erPlugin } from "./plugin";
