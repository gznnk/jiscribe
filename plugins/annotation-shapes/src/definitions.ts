import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import {
	createFrameObjectDefinition,
	createTypeStencils,
} from "@jiscribe/canvas-sdk";

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
import { Callout, calloutGeometryKey } from "./presentation/Callout";
import { Note } from "./presentation/Note";
import {
	calcGroupMarkerConnectPoints,
	groupMarkerGeometryKey,
} from "./presentation/shared";
import type { BraceDoc } from "./schema/brace/BraceDoc";
import type { BracketDoc } from "./schema/bracket/BracketDoc";
import type { BracketWithStemDoc } from "./schema/bracketWithStem/BracketWithStemDoc";
import type { CalloutDoc } from "./schema/callout/CalloutDoc";
import { isCalloutTail } from "./schema/callout/CalloutDoc";
import type { NoteDoc } from "./schema/note/NoteDoc";
import type { BraceState } from "./state/brace/BraceState";
import type { BracketState } from "./state/bracket/BracketState";
import type { BracketWithStemState } from "./state/bracketWithStem/BracketWithStemState";
import type { CalloutState } from "./state/callout/CalloutState";
import type { NoteState } from "./state/note/NoteState";
import {
	isValidGroupMarkerDirection,
	isValidGroupMarkerTipFields,
} from "./state/shared/isValidGroupMarkerFields";
import { BraceIcon } from "./stencil/BraceIcon";
import { BracketIcon } from "./stencil/BracketIcon";
import { BracketWithStemIcon } from "./stencil/BracketWithStemIcon";
import { CalloutIcon } from "./stencil/CalloutIcon";
import { NoteIcon } from "./stencil/NoteIcon";
import {
	GROUP_MARKER_DIRECTION_STYLE_ENTRIES,
	GROUP_MARKER_TIP_STYLE_ENTRIES,
} from "./style/groupMarkerStyleEntries";

/**
 * The label hangs off the tip, outside the geometry box, where the doc
 * definition's `labelRegion` places it; the core widens the visual bounds by it,
 * which keeps zoom-to-fit and the export viewBox from cropping it. `outline`
 * stays undeclared on all three group markers: the box is the marker band itself, so the
 * default bounding-box outline is already the shape's extent. The one place a
 * connector should really land is the tip, so all three declare it as an
 * `extraConnectPoints` anchor (`"tip"`), paired with the `geometryKey` that keeps
 * such a connector live while the tip is dragged. `menu` likewise stays derived
 * from the features: the tip handle covers both `direction` and `tipPosition`,
 * so neither needs a section (they stay reachable through `onStyleIntent`
 * via the type's own style table, GROUP_MARKER_TIP_STYLE_ENTRIES).
 */
export const braceDefinition: ObjectTypeDefinition<BraceDoc, BraceState> =
	createFrameObjectDefinition<BraceDoc, BraceState>({
		doc: braceDocDefinition,
		component: Brace,
		extraConnectPoints: calcGroupMarkerConnectPoints,
		geometryKey: groupMarkerGeometryKey,
		isExtraStateValid: isValidGroupMarkerTipFields,
		selectionControls: [
			{
				name: "tip",
				Component: GroupMarkerTipControl,
				handle: handleGroupMarkerTip,
			},
		],
		styleEntries: GROUP_MARKER_TIP_STYLE_ENTRIES,
		/**
		 * One stencil, not one per direction: drag-drawing already picks the axis from
		 * the drawn proportions (createGroupMarkerObjectFactory), so four palette entries would be
		 * four ways to reach the same shape.
		 */
		stencils: createTypeStencils({
			objectType: "brace",
			label: { en: "Brace", ja: "波括弧" },
			icon: BraceIcon,
		}),
	});

/**
 * Same as the brace, except that the tip does not move: the handle only ever
 * re-attaches the bracket to another edge (handleGroupMarkerDirection), and
 * `tipPosition` is in neither its doc nor its style table: the bracket's doc definition
 * leaves it out of `extraKeys`, so one written onto a bracket doc is refused by
 * doc-ops and dropped by the mapper rather than travelling as dead state.
 */
export const bracketDefinition: ObjectTypeDefinition<BracketDoc, BracketState> =
	createFrameObjectDefinition<BracketDoc, BracketState>({
		doc: bracketDocDefinition,
		component: Bracket,
		extraConnectPoints: calcGroupMarkerConnectPoints,
		geometryKey: groupMarkerGeometryKey,
		isExtraStateValid: isValidGroupMarkerDirection,
		selectionControls: [
			{
				name: "tip",
				Component: GroupMarkerTipControl,
				handle: handleGroupMarkerDirection,
			},
		],
		styleEntries: GROUP_MARKER_DIRECTION_STYLE_ENTRIES,
		/** One stencil; the drawn proportions pick the axis (createGroupMarkerObjectFactory). */
		stencils: createTypeStencils({
			objectType: "bracket",
			label: { en: "Bracket", ja: "角括弧" },
			icon: BracketIcon,
		}),
	});

/** Same as the brace, with the stem's end standing in for the brace's cusp. */
export const bracketWithStemDefinition: ObjectTypeDefinition<
	BracketWithStemDoc,
	BracketWithStemState
> = createFrameObjectDefinition<BracketWithStemDoc, BracketWithStemState>({
	doc: bracketWithStemDocDefinition,
	component: BracketWithStem,
	extraConnectPoints: calcGroupMarkerConnectPoints,
	geometryKey: groupMarkerGeometryKey,
	isExtraStateValid: isValidGroupMarkerTipFields,
	selectionControls: [
		{
			name: "tip",
			Component: GroupMarkerTipControl,
			handle: handleGroupMarkerTip,
		},
	],
	styleEntries: GROUP_MARKER_TIP_STYLE_ENTRIES,
	/** One stencil; the drawn proportions pick the axis (createGroupMarkerObjectFactory). */
	stencils: createTypeStencils({
		objectType: "bracketWithStem",
		label: { en: "Bracket with stem", ja: "角括弧（枝つき）" },
		icon: BracketWithStemIcon,
	}),
});

/**
 * Its `geometryKey` covers the outline rather than a connect point: the tail tip
 * handle moves the silhouette while every frame field stands still, so without it
 * a connector attached to the callout keeps the endpoints it resolved before the
 * drag. Text goes inside the bubble body as it does in the note, where the doc
 * definition's `textRegion` places it.
 */
export const calloutDefinition: ObjectTypeDefinition<CalloutDoc, CalloutState> =
	createFrameObjectDefinition<CalloutDoc, CalloutState>({
		doc: calloutDocDefinition,
		component: Callout,
		geometryKey: calloutGeometryKey,
		isExtraStateValid: (state) =>
			state.tail === undefined || isCalloutTail(state.tail),
		selectionControls: [
			{
				name: "tailTip",
				Component: CalloutTailTipControl,
				handle: handleCalloutTailTip,
			},
		],
		stencils: createTypeStencils({
			objectType: "callout",
			label: { en: "Callout", ja: "吹き出し" },
			icon: CalloutIcon,
		}),
	});

/**
 * Like the callout, and unlike the group markers, the note takes its text inside
 * the box, where the doc definition's `textRegion` places it.
 */
export const noteDefinition: ObjectTypeDefinition<NoteDoc, NoteState> =
	createFrameObjectDefinition<NoteDoc, NoteState>({
		doc: noteDocDefinition,
		component: Note,
		stencils: createTypeStencils({
			objectType: "note",
			label: { en: "Note", ja: "ノート" },
			icon: NoteIcon,
		}),
	});
