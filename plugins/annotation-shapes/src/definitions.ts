import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas-sdk";

import {
	CalloutTailTipControl,
	GroupMarkerTipControl,
	handleCalloutTailTip,
	handleGroupMarkerDirection,
	handleGroupMarkerTip,
} from "./controls";
import {
	braceDocDefinition,
	bracketDocDefinition,
	bracketWithStemDocDefinition,
	calloutDocDefinition,
	noteDocDefinition,
} from "./doc";
import { Brace } from "./presentation/Brace";
import { Bracket } from "./presentation/Bracket";
import { BracketWithStem } from "./presentation/BracketWithStem";
import {
	Callout,
	calcCalloutTextRegion,
	calloutGeometryKey,
	calloutOutline,
} from "./presentation/Callout";
import { Note, calcNoteTextRegion, noteOutline } from "./presentation/Note";
import {
	calcGroupMarkerTextRegion,
	calcGroupMarkerVisualBounds,
} from "./presentation/shared";
import type { BraceDoc } from "./schema/brace/BraceDoc";
import type { BracketDoc } from "./schema/bracket/BracketDoc";
import type { BracketWithStemDoc } from "./schema/bracketWithStem/BracketWithStemDoc";
import type { CalloutDoc } from "./schema/callout/CalloutDoc";
import type { NoteDoc } from "./schema/note/NoteDoc";
import {
	GROUP_MARKER_DIRECTION_STYLE_PROPERTY,
	GROUP_MARKER_TIP_STYLE_PROPERTIES,
} from "./schema/shared/GroupMarkerFields";
import { braceToDoc, braceToState } from "./state/brace/BraceMapper";
import type { BraceState } from "./state/brace/BraceState";
import { isValidBraceState } from "./state/brace/validateBraceState";
import { bracketToDoc, bracketToState } from "./state/bracket/BracketMapper";
import type { BracketState } from "./state/bracket/BracketState";
import { isValidBracketState } from "./state/bracket/validateBracketState";
import {
	bracketWithStemToDoc,
	bracketWithStemToState,
} from "./state/bracketWithStem/BracketWithStemMapper";
import type { BracketWithStemState } from "./state/bracketWithStem/BracketWithStemState";
import { isValidBracketWithStemState } from "./state/bracketWithStem/validateBracketWithStemState";
import { calloutToDoc, calloutToState } from "./state/callout/CalloutMapper";
import type { CalloutState } from "./state/callout/CalloutState";
import { isValidCalloutState } from "./state/callout/validateCalloutState";
import { noteToDoc, noteToState } from "./state/note/NoteMapper";
import type { NoteState } from "./state/note/NoteState";
import { isValidNoteState } from "./state/note/validateNoteState";
import { BraceStencils } from "./stencil/BraceStencils";
import { BracketStencils } from "./stencil/BracketStencils";
import { BracketWithStemStencils } from "./stencil/BracketWithStemStencils";
import { CalloutStencils } from "./stencil/CalloutStencils";
import { NoteStencils } from "./stencil/NoteStencils";

/**
 * The label hangs off the tip, outside the geometry box, so `visualBounds` is
 * what keeps zoom-to-fit and the export viewBox from cropping it. `outline`
 * stays undeclared on all three group markers: the box is the marker band itself, so the
 * default bounding-box outline is already the shape's extent, and connectors
 * attach to the band rather than to the label. `menu` likewise stays derived
 * from the features: the tip handle covers both `direction` and `tipPosition`,
 * so neither needs a section (they stay reachable through `onPropertyUpdate`
 * via the extra style properties).
 */
export const braceDefinition: ObjectTypeDefinition<BraceDoc, BraceState> = {
	...braceDocDefinition,
	mapper: { toDoc: braceToDoc, toState: braceToState },
	stateValidator: isValidBraceState,
	component: Brace,
	textRegion: calcGroupMarkerTextRegion,
	visualBounds: calcGroupMarkerVisualBounds,
	behavior: createFrameBehavior<BraceState>(),
	selectionControls: [
		{
			name: "tip",
			Component: GroupMarkerTipControl,
			handle: handleGroupMarkerTip,
		},
	],
	extraStyleProperties: GROUP_MARKER_TIP_STYLE_PROPERTIES,
	stencils: BraceStencils,
};

/**
 * Same as the brace, except that the tip does not move: the handle only ever
 * re-attaches the bracket to another edge (handleGroupMarkerDirection), and
 * `tipPosition` is neither declared nor styleable.
 */
export const bracketDefinition: ObjectTypeDefinition<BracketDoc, BracketState> =
	{
		...bracketDocDefinition,
		mapper: { toDoc: bracketToDoc, toState: bracketToState },
		stateValidator: isValidBracketState,
		component: Bracket,
		textRegion: calcGroupMarkerTextRegion,
		visualBounds: calcGroupMarkerVisualBounds,
		behavior: createFrameBehavior<BracketState>(),
		selectionControls: [
			{
				name: "tip",
				Component: GroupMarkerTipControl,
				handle: handleGroupMarkerDirection,
			},
		],
		extraStyleProperties: GROUP_MARKER_DIRECTION_STYLE_PROPERTY,
		stencils: BracketStencils,
	};

/** Same as the brace, with the stem's end standing in for the brace's cusp. */
export const bracketWithStemDefinition: ObjectTypeDefinition<
	BracketWithStemDoc,
	BracketWithStemState
> = {
	...bracketWithStemDocDefinition,
	mapper: { toDoc: bracketWithStemToDoc, toState: bracketWithStemToState },
	stateValidator: isValidBracketWithStemState,
	component: BracketWithStem,
	textRegion: calcGroupMarkerTextRegion,
	visualBounds: calcGroupMarkerVisualBounds,
	behavior: createFrameBehavior<BracketWithStemState>(),
	selectionControls: [
		{
			name: "tip",
			Component: GroupMarkerTipControl,
			handle: handleGroupMarkerTip,
		},
	],
	extraStyleProperties: GROUP_MARKER_TIP_STYLE_PROPERTIES,
	stencils: BracketWithStemStencils,
};

/**
 * The one definition here that needs a `geometryKey`: the tail tip handle moves
 * the silhouette while every frame field stands still, so without it a connector
 * attached to the callout keeps the endpoints it resolved before the drag. Text
 * goes inside the bubble body as it does in the note, so there is no label
 * outside the box and no `visualBounds` to widen; `outline` is required because
 * the tail band leaves the body edge short of the bounding box.
 */
export const calloutDefinition: ObjectTypeDefinition<CalloutDoc, CalloutState> =
	{
		...calloutDocDefinition,
		mapper: { toDoc: calloutToDoc, toState: calloutToState },
		stateValidator: isValidCalloutState,
		component: Callout,
		textRegion: calcCalloutTextRegion,
		outline: calloutOutline,
		geometryKey: calloutGeometryKey,
		behavior: createFrameBehavior<CalloutState>(),
		selectionControls: [
			{
				name: "tailTip",
				Component: CalloutTailTipControl,
				handle: handleCalloutTailTip,
			},
		],
		stencils: CalloutStencils,
	};

/**
 * Like the callout, and unlike the group markers, the note takes its text inside
 * the box, so there is no label hanging outside it and no `visualBounds` to
 * widen. `outline` on the other hand is required — the folded corner is cut off
 * the bounding box, so without it a connector aimed at the note's center would
 * stop in mid-air beside the fold.
 */
export const noteDefinition: ObjectTypeDefinition<NoteDoc, NoteState> = {
	...noteDocDefinition,
	mapper: { toDoc: noteToDoc, toState: noteToState },
	stateValidator: isValidNoteState,
	component: Note,
	textRegion: calcNoteTextRegion,
	outline: noteOutline,
	behavior: createFrameBehavior<NoteState>(),
	stencils: NoteStencils,
};
