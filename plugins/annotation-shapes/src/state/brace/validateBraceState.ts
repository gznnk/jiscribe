import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { BraceFeatures } from "../../schema/brace/BraceDoc";
import { isValidGroupMarkerTipFields } from "../shared/isValidGroupMarkerFields";

/** Validates BraceState (Frame-family common logic + optional direction / tipPosition). */
export const isValidBraceState: ObjectStateValidator =
	createFrameStateValidator(BraceFeatures, isValidGroupMarkerTipFields);
