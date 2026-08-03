import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { BracketFeatures } from "../../schema/bracket/BracketDoc";
import { isValidGroupMarkerDirection } from "../shared/isValidGroupMarkerFields";

/** Validates BracketState (Frame-family common logic + optional direction). */
export const isValidBracketState: ObjectStateValidator =
	createFrameStateValidator(BracketFeatures, isValidGroupMarkerDirection);
