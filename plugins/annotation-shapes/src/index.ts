// External package of annotation shapes. The inclusion criterion is "general-purpose
// annotations that belong to no notation", which keeps it apart both from the vocabulary
// of a specific notation such as flowchart / UML (each its own package) and from the
// pictograms for things, people and places (general-shapes).
// Each shape's ObjectDocDefinition / ObjectTypeDefinition is derived wholesale from
// features/defaults by createFrameObjectDoc / createFrameObjectDefinition
// (`@jiscribe/canvas-sdk/doc` / `@jiscribe/canvas-sdk`), so there is no per-shape
// ObjectFactory / validate*Doc / Mapper / validate*State (only the group marker factory
// is swapped in, by passing schema/shared/createGroupMarkerObjectFactory). The headless
// parts of schema/** (AUTO_COLOR / BELOW_LABEL_STYLE_DEFAULTS) come from
// `@jiscribe/canvas-sdk/doc`; the presentation / controls parts (createFrameObject /
// calcLabelBoxSize / readTextSlot / centeredPolygonOutline / SelectionControlPill) come
// through `@jiscribe/canvas-sdk`.
// The headless parse entry point is ./doc (annotationDocPlugin).
// Shapes get one folder each (schema/<id>/, state/<id>/, presentation/<Pascal>/), and
// parts shared by several shapes live in each layer's shared/. brace / bracket /
// bracketWithStem have the same makeup — a band with an orientation plus a label sitting
// outside it — so the geometry, label and drawing skeleton and the selection controls are
// shared as a group marker, and each shape's own folder holds only how its path is built.
// Selection controls are laid out flat with a type-name prefix (controls/), as in stencil/.
// callout and note are not part of that group marker family: they are standalone note
// boxes that carry text inside a box, so they use no shared/ and are self-contained in
// their own folders (a callout tail is {side, position}, a different model from the group
// marker's direction / tipPosition).
// The toolbar exposes all 5 shapes under one annotationToolbarEntry (a category).
export * from "./schema/shared/GroupMarkerFields";
export {
	validateGroupMarkerDirection,
	validateGroupMarkerTipFields,
} from "./schema/shared/validateGroupMarkerFields";

export * from "./schema/brace/BraceDoc";
export * from "./schema/bracket/BracketDoc";
export * from "./schema/bracketWithStem/BracketWithStemDoc";
export * from "./schema/callout/CalloutDoc";
export * from "./schema/note/NoteDoc";

export * from "./state/brace/BraceState";
export * from "./state/bracket/BracketState";
export * from "./state/bracketWithStem/BracketWithStemState";
export * from "./state/callout/CalloutState";
export * from "./state/note/NoteState";
export * from "./state/shared/GroupMarkerControlState";

export * from "./presentation/shared";
export * from "./presentation/Brace";
export * from "./presentation/Bracket";
export * from "./presentation/BracketWithStem";
export * from "./presentation/Callout";
export * from "./presentation/Note";

export {
	CalloutTailTipControl,
	GroupMarkerTipControl,
	handleCalloutTailTip,
	handleGroupMarkerDirection,
	handleGroupMarkerTip,
} from "./controls";

export { BraceIcon } from "./stencil/BraceIcon";
export { BracketIcon } from "./stencil/BracketIcon";
export { BracketWithStemIcon } from "./stencil/BracketWithStemIcon";
export { CalloutIcon } from "./stencil/CalloutIcon";
export { NoteIcon } from "./stencil/NoteIcon";
export { annotationToolbarEntry } from "./stencil/AnnotationToolbarEntry";

export {
	braceDefinition,
	bracketDefinition,
	bracketWithStemDefinition,
	calloutDefinition,
	noteDefinition,
} from "./definitions";
export {
	annotationDocPlugin,
	braceDocDefinition,
	bracketDocDefinition,
	bracketWithStemDocDefinition,
	calloutDocDefinition,
	noteDocDefinition,
} from "./doc";
export { annotationPlugin } from "./plugin";
