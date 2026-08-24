// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definition.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";
import { calcFullBoxTextRegion, calcOutsideBoxTextRegion } from "@jiscribe/doc";

import {
	RECORD_DOC_DEFAULTS,
	RECORD_SLOT_STYLE_DEFAULTS_BY_ID,
	RecordFeatures,
} from "./schema/RecordDoc";
import { calcUmlPackageTextRegion } from "./schema/textRegions";
import {
	UML_COMPONENT_DOC_DEFAULTS,
	UmlComponentFeatures,
} from "./schema/UmlComponentDoc";
import {
	UML_PACKAGE_DOC_DEFAULTS,
	UmlPackageFeatures,
} from "./schema/UmlPackageDoc";
import { validateRecordTextFields } from "./schema/validateRecordTextFields";

/**
 * Both box shapes here share the rect geometry (x/y/width/height) of RectDoc and
 * only swap the rendering, so the sentence saying so is factored out of their
 * descriptions.
 */
const RECT_GEOMETRY_NOTE =
	"Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs.";

export const recordDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: RecordFeatures,
	textRegion: calcOutsideBoxTextRegion,
	defaults: RECORD_DOC_DEFAULTS,
	// The schema $def is a handwritten template (text is a slotted object), so
	// only summary is consumed — it fills the generated doc tables.
	summary: "titled box + row compartments (UML class / ER entity)",
	validateExtra: validateRecordTextFields,
	// Resolved per read, so a document keeps whichever of these it wrote itself
	// and nothing more (ObjectTextStyleDefaultsRegistry).
	textSlotStyleDefaults: RECORD_SLOT_STYLE_DEFAULTS_BY_ID,
});

export const umlPackageDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: UmlPackageFeatures,
		textRegion: calcUmlPackageTextRegion,
		defaults: UML_PACKAGE_DOC_DEFAULTS,
		description: `UML package shape (a rectangle with a tab on its top-left corner), typically used for namespaces, modules and layers in UML package diagrams. ${RECT_GEOMETRY_NOTE} The rect is the outer bounds of the whole silhouette, tab included, and the text is laid out in the body below the tab. Distinct from "package", which is an isometric box for a build artifact or deployment unit, and from "container", which actually holds the objects placed inside it — this one is a plain shape with no children.`,
		summary: "namespace, module, layer",
	});

export const umlComponentDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: UmlComponentFeatures,
		textRegion: calcFullBoxTextRegion,
		defaults: UML_COMPONENT_DOC_DEFAULTS,
		description: `UML 2 component shape (a rectangle carrying the component symbol in its top-right corner), typically used for replaceable parts of a system in UML component diagrams. ${RECT_GEOMETRY_NOTE} Text is laid out over the whole box, so keep the name short enough to clear the symbol, or widen the box. Prefer "record" with a <<component>> stereotype when the part needs compartments of its own.`,
		summary: "component, replaceable part",
	});

/**
 * Headless `CanvasDocPlugin` for the UML shapes: the doc-layer view of
 * `umlPlugin`, teaching `createCanvasParser` the types without loading any
 * React / presentation code (packages/canvas/docs/12-plugin-architecture.md).
 */
export const umlDocPlugin: CanvasDocPlugin = {
	id: "uml-shapes",
	objects: {
		record: recordDocDefinition,
		umlPackage: umlPackageDocDefinition,
		umlComponent: umlComponentDocDefinition,
	},
};
