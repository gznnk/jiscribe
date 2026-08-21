import type { SvgDoc } from "@jiscribe/doc/model/objects/primitives/svg/SvgDoc";
import {
	SVG_EXTRA_KEYS,
	SvgFeatures,
} from "@jiscribe/doc/model/objects/primitives/svg/SvgDoc";

import type { SvgState } from "./SvgState";
import { createFrameMapper } from "../../base/FrameMapper";

/**
 * SvgDoc ↔ SvgState conversion (Frame-family shared logic generated from features).
 * The allow-list takes the type's own fields from the one declaration of them
 * (SVG_EXTRA_KEYS), which the doc definition passes to doc-ops as well.
 */
export const { toState: svgToState, toDoc: svgToDoc } = createFrameMapper<
	SvgDoc,
	SvgState
>(SvgFeatures, SVG_EXTRA_KEYS);
