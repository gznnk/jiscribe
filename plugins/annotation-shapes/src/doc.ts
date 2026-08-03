// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definitions.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas-sdk/doc のみで、presentation / state / stencil を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";
import { createFrameObjectDoc } from "@workspace/canvas-sdk/doc";

import { BRACE_DOC_DEFAULTS, BraceFeatures } from "./schema/brace/BraceDoc";
import {
	BRACKET_DOC_DEFAULTS,
	BracketFeatures,
} from "./schema/bracket/BracketDoc";
import {
	BRACKET_WITH_STEM_DOC_DEFAULTS,
	BracketWithStemFeatures,
} from "./schema/bracketWithStem/BracketWithStemDoc";
import {
	CALLOUT_DOC_DEFAULTS,
	CalloutFeatures,
} from "./schema/callout/CalloutDoc";
import { validateCalloutTail } from "./schema/callout/validateCalloutTail";
import { NOTE_DOC_DEFAULTS, NoteFeatures } from "./schema/note/NoteDoc";
import { createGroupMarkerObjectFactory } from "./schema/shared/createGroupMarkerObjectFactory";
import {
	validateGroupMarkerDirection,
	validateGroupMarkerTipFields,
} from "./schema/shared/validateGroupMarkerFields";

export const braceDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: BraceFeatures,
	defaults: BRACE_DOC_DEFAULTS,
	description:
		'Curly brace shape, used to mark a run of shapes as one group and name it. Uses the same rect-based geometry (x/y/width/height) as RectDoc, but the box is the bracket alone: its short side is how far the curve bulges, its long side how far the arms reach. "direction" is the way the tip points, away from what is being grouped — a "left" brace is the typographic "{" and groups what is to its right, so place the box just left of that run and give it a small width (e.g. 24x160). "tipPosition" (0..1) moves the tip along the span, from the top for a left/right brace and from the left for an up/down one. Text is drawn as a label just beyond the tip, auto-sized to the text itself and outside the box, so the box stays a thin band however long the label is. The brace has no fill.',
	summary: "group marker, grouping annotation",
	validateExtra: validateGroupMarkerTipFields,
	factory: createGroupMarkerObjectFactory(BRACE_DOC_DEFAULTS),
});

export const bracketDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: BracketFeatures,
	defaults: BRACKET_DOC_DEFAULTS,
	description:
		'Square bracket shape, used to mark a run of shapes as one group and name it. Same box and same "direction" as BraceDoc — a "left" bracket is the typographic "[" and groups what is to its right — but it is drawn with straight lines only: a spine along the outer edge with a foot at each end, reaching towards the grouped shapes. It has no "tipPosition", because nothing on it singles out a place along the spine; the label always sits just beyond the middle of the spine, auto-sized to the text itself and outside the box. Use BracketWithStemDoc instead when the label should point at one particular place in the run. The bracket has no fill.',
	summary: "group marker, grouping annotation",
	// There is no tipPosition to check: the bracket's label is pinned to the
	// middle of its spine.
	validateExtra: validateGroupMarkerDirection,
	factory: createGroupMarkerObjectFactory(BRACKET_DOC_DEFAULTS),
});

export const bracketWithStemDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: BracketWithStemFeatures,
		defaults: BRACKET_WITH_STEM_DOC_DEFAULTS,
		description:
			'Square bracket with a stem, used to mark a run of shapes as one group and name it at a chosen point. Same box and same "direction" as BracketDoc, except that the spine sits half way into the box and a straight stem runs out of it, at right angles, to the outer edge. "tipPosition" (0..1) moves the stem along the span, from the top for a left/right bracket and from the left for an up/down one, and the label hangs off the stem\'s end, auto-sized to the text itself and outside the box. Use BracketDoc instead when the label needs to point at nothing in particular. It has no fill.',
		summary: "group marker with a pointer, grouping annotation",
		validateExtra: validateGroupMarkerTipFields,
		factory: createGroupMarkerObjectFactory(BRACKET_WITH_STEM_DOC_DEFAULTS),
	});

export const calloutDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: CalloutFeatures,
	defaults: CALLOUT_DOC_DEFAULTS,
	description:
		"Speech-bubble callout, typically used for annotations and explanatory comments. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a bubble. The tail stays inside the bounding box, occupying a quarter of it on its side; text is laid out in the bubble body beside it. Point the tail at the annotated object via `tail` (default: bottom edge, position 0.2).",
	summary: "annotation bubble",
	validateExtra: validateCalloutTail,
});

export const noteDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: NoteFeatures,
	defaults: NOTE_DOC_DEFAULTS,
	description:
		'Note shape: a box with its top-right corner folded back, holding a comment about the diagram — the UML note. It uses the same rect geometry (x/y/width/height) as RectDoc and only swaps the drawing, so it takes text inside the box, unlike the group markers in this package. Give it a landscape box (e.g. 180x110) and left-aligned text, and attach it to what it comments on with a connector. Two shapes are easily mistaken for it, and neither is the same thing: "document" (a wavy bottom edge) is a flowchart step that produces paperwork, and "file" is a portrait pictogram standing for a file on disk. Reach for "note" when the box holds prose *about* the diagram, and for those two when the shape *is* one of the things the diagram is about. Where the comment should point at one spot on one shape, CalloutDoc (a bubble with a tail) says so more directly.',
	summary: "comment box, UML note",
});

/**
 * Headless `CanvasDocPlugin` for the annotation shapes: the doc-layer view of
 * `annotationPlugin`, teaching `createCanvasParser` the types without loading any
 * React / presentation code (docs/05_extensibility/plugin-architecture-requirements.md §4 UC1).
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
