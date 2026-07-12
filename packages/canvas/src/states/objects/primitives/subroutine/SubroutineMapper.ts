import type { SubroutineState } from "./SubroutineState";
import type { SubroutineDoc } from "../../../../schemas/objects/primitives/subroutine/SubroutineDoc";
import { SubroutineFeatures } from "../../../../schemas/objects/primitives/subroutine/SubroutineDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** SubroutineDoc <-> SubroutineState conversion (Frame-family shared logic generated from features). */
export const { toState: subroutineToState, toDoc: subroutineToDoc } =
	createFrameMapper<SubroutineDoc, SubroutineState>(SubroutineFeatures);
