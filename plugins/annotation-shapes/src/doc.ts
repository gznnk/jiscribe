// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definitions.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";
import { calcOutsideBoxTextRegion } from "@jiscribe/doc";

import type { BraceDoc } from "./schema/brace/BraceDoc";
import { BRACE_DOC_DEFAULTS, BraceFeatures } from "./schema/brace/BraceDoc";
import {
	BRACKET_DOC_DEFAULTS,
	BracketFeatures,
} from "./schema/bracket/BracketDoc";
import type { BracketDoc } from "./schema/bracket/BracketDoc";
import {
	BRACKET_WITH_STEM_DOC_DEFAULTS,
	BracketWithStemFeatures,
} from "./schema/bracketWithStem/BracketWithStemDoc";
import type { BracketWithStemDoc } from "./schema/bracketWithStem/BracketWithStemDoc";
import {
	CALLOUT_DOC_DEFAULTS,
	CalloutFeatures,
} from "./schema/callout/CalloutDoc";
import type { CalloutDoc } from "./schema/callout/CalloutDoc";
import { validateCalloutTail } from "./schema/callout/validateCalloutTail";
import { NOTE_DOC_DEFAULTS, NoteFeatures } from "./schema/note/NoteDoc";
import { createGroupMarkerObjectFactory } from "./schema/shared/createGroupMarkerObjectFactory";
import {
	validateGroupMarkerDirection,
	validateGroupMarkerTipFields,
} from "./schema/shared/validateGroupMarkerFields";
import {
	calcCalloutTextRegion,
	calcNoteTextRegion,
} from "./schema/textRegions";

export const braceDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: BraceFeatures,
	textRegion: calcOutsideBoxTextRegion,
	defaults: BRACE_DOC_DEFAULTS,
	extraKeys: ["direction", "tipPosition"] satisfies readonly (keyof BraceDoc)[],
	description:
		'Curly brace shape, used to mark a run of shapes as one group and name it. Uses the same rect-based geometry (x/y/width/height) as RectDoc, but the box is the bracket alone: its short side is how far the curve bulges, its long side how far the arms reach. "direction" is the way the tip points, away from what is being grouped — a "left" brace is the typographic "{" and groups what is to its right, so place the box just left of that run and give it a small width (e.g. 24x160). "tipPosition" (0..1) moves the tip along the span, from the top for a left/right brace and from the left for an up/down one. Text is drawn as a label just beyond the tip, auto-sized to the text itself and outside the box, so the box stays a thin band however long the label is. The brace has no fill. Beyond the four edge midpoints it offers a connect point at its tip, "tip": aim a connector at the brace with { "kind": "connectPoint", "id": "tip" } so the line meets the cusp instead of a midpoint of the thin band.',
	summary: "group marker, grouping annotation",
	validateExtra: validateGroupMarkerTipFields,
	factory: createGroupMarkerObjectFactory(BRACE_DOC_DEFAULTS),
});

export const bracketDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: BracketFeatures,
	textRegion: calcOutsideBoxTextRegion,
	defaults: BRACKET_DOC_DEFAULTS,
	extraKeys: ["direction"] satisfies readonly (keyof BracketDoc)[],
	description:
		'Square bracket shape, used to mark a run of shapes as one group and name it. Same box and same "direction" as BraceDoc — a "left" bracket is the typographic "[" and groups what is to its right — but it is drawn with straight lines only: a spine along the outer edge with a foot at each end, reaching towards the grouped shapes. It has no "tipPosition", because nothing on it singles out a place along the spine; the label always sits just beyond the middle of the spine, auto-sized to the text itself and outside the box. Use BracketWithStemDoc instead when the label should point at one particular place in the run. The bracket has no fill. Beyond the four edge midpoints it offers a connect point named "tip", which for a plain bracket is the middle of the spine — the same place its label points from.',
	summary: "group marker, grouping annotation",
	// There is no tipPosition to check: the bracket's label is pinned to the
	// middle of its spine.
	validateExtra: validateGroupMarkerDirection,
	factory: createGroupMarkerObjectFactory(BRACKET_DOC_DEFAULTS),
});

export const bracketWithStemDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: BracketWithStemFeatures,
		textRegion: calcOutsideBoxTextRegion,
		defaults: BRACKET_WITH_STEM_DOC_DEFAULTS,
		extraKeys: [
			"direction",
			"tipPosition",
		] satisfies readonly (keyof BracketWithStemDoc)[],
		description:
			'Square bracket with a stem, used to mark a run of shapes as one group and name it at a chosen point. Same box and same "direction" as BracketDoc, except that the spine sits half way into the box and a straight stem runs out of it, at right angles, to the outer edge. "tipPosition" (0..1) moves the stem along the span, from the top for a left/right bracket and from the left for an up/down one, and the label hangs off the stem\'s end, auto-sized to the text itself and outside the box. Use BracketDoc instead when the label needs to point at nothing in particular. It has no fill. Beyond the four edge midpoints it offers a connect point named "tip", the stem\'s end, so a connector can meet the stem where the label does.',
		summary: "group marker with a pointer, grouping annotation",
		validateExtra: validateGroupMarkerTipFields,
		factory: createGroupMarkerObjectFactory(BRACKET_WITH_STEM_DOC_DEFAULTS),
	});

export const calloutDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: CalloutFeatures,
	textRegion: calcCalloutTextRegion,
	defaults: CALLOUT_DOC_DEFAULTS,
	extraKeys: ["tail"] satisfies readonly (keyof CalloutDoc)[],
	description:
		"Speech-bubble callout, typically used for annotations and explanatory comments. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a bubble. The tail stays inside the bounding box, occupying a quarter of it on its side; text is laid out in the bubble body beside it. Point the tail at the annotated object via `tail` (default: bottom edge, position 0.2).",
	summary: "annotation bubble",
	validateExtra: validateCalloutTail,
});

export const noteDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: NoteFeatures,
	textRegion: calcNoteTextRegion,
	defaults: NOTE_DOC_DEFAULTS,
	description:
		'Note shape: a box with its top-right corner folded back, holding a comment about the diagram — the UML note. It uses the same rect geometry (x/y/width/height) as RectDoc and only swaps the drawing, so it takes text inside the box, unlike the group markers in this package. Give it a landscape box (e.g. 180x110) and left-aligned text, and attach it to what it comments on with a connector. Two shapes are easily mistaken for it, and neither is the same thing: "document" (a wavy bottom edge) is a flowchart step that produces paperwork, and "file" is a portrait pictogram standing for a file on disk. Reach for "note" when the box holds prose *about* the diagram, and for those two when the shape *is* one of the things the diagram is about. Where the comment should point at one spot on one shape, CalloutDoc (a bubble with a tail) says so more directly.',
	summary: "comment box, UML note",
});

/**
 * Headless `CanvasDocPlugin` for the annotation shapes: the doc-layer view of
 * `annotationPlugin`, teaching `createCanvasParser` the types without loading any
 * React / presentation code (packages/canvas/docs/12-plugin-architecture.md).
 */
export const annotationDocPlugin: CanvasDocPlugin = {
	id: "annotation-shapes",
	objects: {
		brace: braceDocDefinition,
		bracket: bracketDocDefinition,
		bracketWithStem: bracketWithStemDocDefinition,
		callout: calloutDocDefinition,
		note: noteDocDefinition,
	},
};
