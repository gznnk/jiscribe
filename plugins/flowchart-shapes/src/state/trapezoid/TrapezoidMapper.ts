import { createFrameMapper } from "@workspace/canvas-sdk";

import type { TrapezoidState } from "./TrapezoidState";
import type { TrapezoidDoc } from "../../schema/trapezoid/TrapezoidDoc";
import { TrapezoidFeatures } from "../../schema/trapezoid/TrapezoidDoc";

/** TrapezoidDoc <-> TrapezoidState conversion (Frame-family shared logic generated from features). */
export const { toState: trapezoidToState, toDoc: trapezoidToDoc } =
	createFrameMapper<TrapezoidDoc, TrapezoidState>(TrapezoidFeatures);
