import type { DisplayState } from "./DisplayState";
import type { DisplayDoc } from "../../../../schemas/objects/primitives/display/DisplayDoc";
import { DisplayFeatures } from "../../../../schemas/objects/primitives/display/DisplayDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** DisplayDoc <-> DisplayState conversion (Frame-family shared logic generated from features). */
export const { toState: displayToState, toDoc: displayToDoc } =
	createFrameMapper<DisplayDoc, DisplayState>(DisplayFeatures);
