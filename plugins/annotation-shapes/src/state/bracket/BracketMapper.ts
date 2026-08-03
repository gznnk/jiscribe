import { createFrameMapper } from "@workspace/canvas-sdk";

import type { BracketState } from "./BracketState";
import type { BracketDoc } from "../../schema/bracket/BracketDoc";
import { BracketFeatures } from "../../schema/bracket/BracketDoc";

/**
 * BracketDoc ↔ BracketState conversion (Frame-family shared logic generated from
 * features). The passthrough list is the allow-list, so a `tipPosition` written
 * onto a bracket doc is dropped here rather than travelling as dead state.
 */
export const { toState: bracketToState, toDoc: bracketToDoc } =
	createFrameMapper<BracketDoc, BracketState>(BracketFeatures, ["direction"]);
