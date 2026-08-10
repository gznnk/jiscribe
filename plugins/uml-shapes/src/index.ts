// External package of UML-family shapes. The first shape is record (a box with
// compartments), which doubles as proof that the "several text slots in one shape"
// mechanism holds up on the public API alone (the canonical slot set is the keys of
// state.text, and the textRegion calculator returns each region from a slotId).
// ObjectDocDefinition is derived from features/defaults by createFrameObjectDoc
// (`@jiscribe/canvas-sdk/doc`), so there is no RecordObjectFactory / validateRecordDoc.
// ObjectTypeDefinition is written out by hand rather than via createFrameObjectDefinition,
// because the mapper is a derived version that layers the slot normal form on top (see
// RecordMapper). The headless parts of schema/** (validateTextSlotStyleFields /
// AUTO_COLOR / DEFAULT_FONT_FAMILY / TEXT_LINE_HEIGHT) come from
// `@jiscribe/canvas-sdk/doc`; the presentation / state parts (createFrameObject /
// TextOverlay / createFrameBehavior / createFrameMapper / createFrameStateValidator)
// come through `@jiscribe/canvas-sdk`.
// The headless parse entry point is ./doc (umlDocPlugin).
// (See packages/canvas/docs/13-authoring-plugins.md.)
export * from "./schema/RecordDoc";
export * from "./state/RecordState";
export { recordToDoc, recordToState } from "./state/RecordMapper";
export { isValidRecordState } from "./state/validateRecordState";

export { RecordBox } from "./presentation/RecordBox";
export { calcRecordSlotRegions } from "./presentation/calcRecordSlotRegions";
export type {
	RecordSlotRegions,
	RecordSlotRegionsState,
} from "./presentation/calcRecordSlotRegions";
export { calcRecordTextRegion } from "./presentation/calcRecordTextRegion";

export { RecordStencils } from "./stencil/RecordStencils";
export { umlToolbarEntry } from "./stencil/UmlToolbarEntry";

export { recordDefinition } from "./definition";
export { recordDocDefinition, umlDocPlugin } from "./doc";
export { umlPlugin } from "./plugin";
