import type { SvgState } from "./SvgState";
import type { SvgDoc } from "../../../../schemas/objects/primitives/svg/SvgDoc";
import { SvgFeatures } from "../../../../schemas/objects/primitives/svg/SvgDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/**
 * SvgDoc ↔ SvgState conversion (Frame-family shared logic generated from features).
 * svgText is a shape-specific pass-through field, so it is passed as an extra key
 * in the allow-list.
 */
export const { toState: svgToState, toDoc: svgToDoc } = createFrameMapper<
	SvgDoc,
	SvgState
>(SvgFeatures, ["svgText"] satisfies readonly (keyof SvgDoc)[]);
