import { createFrameMapper } from "@workspace/canvas/unstable";

import type { SubroutineState } from "./SubroutineState";
import type { SubroutineDoc } from "../../schema/subroutine/SubroutineDoc";
import { SubroutineFeatures } from "../../schema/subroutine/SubroutineDoc";

/** SubroutineDoc <-> SubroutineState conversion (Frame-family shared logic generated from features). */
export const { toState: subroutineToState, toDoc: subroutineToDoc } =
	createFrameMapper<SubroutineDoc, SubroutineState>(SubroutineFeatures);
