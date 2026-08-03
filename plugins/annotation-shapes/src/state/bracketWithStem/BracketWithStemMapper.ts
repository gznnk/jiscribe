import { createFrameMapper } from "@workspace/canvas/unstable";

import type { BracketWithStemState } from "./BracketWithStemState";
import type { BracketWithStemDoc } from "../../schema/bracketWithStem/BracketWithStemDoc";
import { BracketWithStemFeatures } from "../../schema/bracketWithStem/BracketWithStemDoc";

/** BracketWithStemDoc ↔ BracketWithStemState conversion (Frame-family shared logic generated from features). */
export const { toState: bracketWithStemToState, toDoc: bracketWithStemToDoc } =
	createFrameMapper<BracketWithStemDoc, BracketWithStemState>(
		BracketWithStemFeatures,
		["direction", "tipPosition"],
	);
