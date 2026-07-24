import { createFrameMapper } from "@workspace/canvas/unstable";

import type { DisplayState } from "./DisplayState";
import type { DisplayDoc } from "../../schema/display/DisplayDoc";
import { DisplayFeatures } from "../../schema/display/DisplayDoc";

/** DisplayDoc <-> DisplayState conversion (Frame-family shared logic generated from features). */
export const { toState: displayToState, toDoc: displayToDoc } =
	createFrameMapper<DisplayDoc, DisplayState>(DisplayFeatures);
