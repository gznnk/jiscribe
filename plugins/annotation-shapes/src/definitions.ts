import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

import {
	GroupMarkerTipControl,
	handleGroupMarkerDirection,
	handleGroupMarkerTip,
} from "./controls";
import {
	braceDocDefinition,
	bracketDocDefinition,
	bracketWithStemDocDefinition,
} from "./doc";
import { Brace } from "./presentation/Brace";
import { Bracket } from "./presentation/Bracket";
import { BracketWithStem } from "./presentation/BracketWithStem";
import {
	calcGroupMarkerTextRegion,
	calcGroupMarkerVisualBounds,
} from "./presentation/shared";
import type { BraceDoc } from "./schema/brace/BraceDoc";
import type { BracketDoc } from "./schema/bracket/BracketDoc";
import type { BracketWithStemDoc } from "./schema/bracketWithStem/BracketWithStemDoc";
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
import { BraceStencils } from "./stencil/BraceStencils";
import { BracketStencils } from "./stencil/BracketStencils";
import { BracketWithStemStencils } from "./stencil/BracketWithStemStencils";

/**
 * The label hangs off the tip, outside the geometry box, so `visualBounds` is
 * what keeps zoom-to-fit and the export viewBox from cropping it. `outline`
 * stays undeclared on all three: the box is the marker band itself, so the
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
