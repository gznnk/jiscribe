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
// umlPackage and umlComponent are plain Frame-family box shapes beside it, built
// through createFrameObjectDoc / createFrameObjectDefinition with nothing written
// out by hand.
// The headless parse entry point is ./doc (umlDocPlugin).
// (See packages/canvas/docs/13-authoring-plugins.md.)
export * from "./schema/RecordDoc";
export * from "./schema/UmlPackageDoc";
export * from "./schema/UmlComponentDoc";
export * from "./state/RecordState";
export * from "./state/UmlPackageState";
export * from "./state/UmlComponentState";
export { recordToDoc, recordToState } from "./state/RecordMapper";
export { isValidRecordState } from "./state/validateRecordState";

export { RecordBox } from "./presentation/RecordBox";
export { calcRecordSlotRegions } from "./presentation/calcRecordSlotRegions";
export type {
	RecordSlotRegions,
	RecordSlotRegionsState,
} from "./presentation/calcRecordSlotRegions";
export { calcRecordTextRegion } from "./presentation/calcRecordTextRegion";

export { UmlPackageBox } from "./presentation/UmlPackageBox";
export { calcUmlPackagePoints } from "./presentation/calcUmlPackagePoints";
export { calcUmlPackageTextRegion } from "./schema/textRegions";
export { umlPackageOutline } from "./presentation/umlPackageOutline";

export { UmlComponentBox } from "./presentation/UmlComponentBox";
export {
	buildUmlComponentBodyPath,
	buildUmlComponentIconPaths,
} from "./presentation/buildUmlComponentPaths";

export { RecordStencils } from "./stencil/RecordStencils";
export { UmlPackageIcon } from "./stencil/UmlPackageIcon";
export { UmlComponentIcon } from "./stencil/UmlComponentIcon";
export { umlToolbarEntry } from "./stencil/UmlToolbarEntry";

export {
	recordDefinition,
	umlComponentDefinition,
	umlPackageDefinition,
} from "./definition";
export {
	recordDocDefinition,
	umlComponentDocDefinition,
	umlPackageDocDefinition,
	umlDocPlugin,
} from "./doc";
export { umlPlugin } from "./plugin";
