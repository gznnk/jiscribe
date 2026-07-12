import type { TrapezoidState } from "./TrapezoidState";
import type { TrapezoidDoc } from "../../../../schemas/objects/primitives/trapezoid/TrapezoidDoc";
import { TrapezoidFeatures } from "../../../../schemas/objects/primitives/trapezoid/TrapezoidDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** TrapezoidDoc <-> TrapezoidState conversion (Frame-family shared logic generated from features). */
export const { toState: trapezoidToState, toDoc: trapezoidToDoc } =
	createFrameMapper<TrapezoidDoc, TrapezoidState>(TrapezoidFeatures);
