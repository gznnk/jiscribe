import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

import { BraceTipControl, handleBraceTip } from "./controls";
import { braceDocDefinition } from "./doc";
import {
	Brace,
	calcBraceTextRegion,
	calcBraceVisualBounds,
} from "./presentation/Brace";
import { BraceExtraStyleProperties } from "./schema/brace/BraceDoc";
import type { BraceDoc } from "./schema/brace/BraceDoc";
import { braceToDoc, braceToState } from "./state/brace/BraceMapper";
import type { BraceState } from "./state/brace/BraceState";
import { isValidBraceState } from "./state/brace/validateBraceState";
import { BraceStencils } from "./stencil/BraceStencils";

/**
 * The label hangs off the tip, outside the geometry box, so `visualBounds` is
 * what keeps zoom-to-fit and the export viewBox from cropping it. `outline`
 * stays undeclared: the box is the bracket band itself, so the default
 * bounding-box outline is already the shape's extent, and connectors attach to
 * the band rather than to the label. `menu` likewise stays derived from the
 * features: the tip handle covers both `direction` and `tipPosition`, so
 * neither needs a section (they stay reachable through `onPropertyUpdate` via
 * BraceExtraStyleProperties).
 */
export const braceDefinition: ObjectTypeDefinition<BraceDoc, BraceState> = {
	...braceDocDefinition,
	mapper: { toDoc: braceToDoc, toState: braceToState },
	stateValidator: isValidBraceState,
	component: Brace,
	textRegion: calcBraceTextRegion,
	visualBounds: calcBraceVisualBounds,
	behavior: createFrameBehavior<BraceState>(),
	selectionControls: [
		{ name: "tip", Component: BraceTipControl, handle: handleBraceTip },
	],
	extraStyleProperties: BraceExtraStyleProperties,
	stencils: BraceStencils,
};
