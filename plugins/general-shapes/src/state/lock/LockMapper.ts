import { createFrameMapper } from "@workspace/canvas-sdk";

import type { LockState } from "./LockState";
import type { LockDoc } from "../../schema/lock/LockDoc";
import { LockFeatures } from "../../schema/lock/LockDoc";

/** LockDoc <-> LockState conversion (Frame-family shared logic generated from features). */
export const { toState: lockToState, toDoc: lockToDoc } = createFrameMapper<
	LockDoc,
	LockState
>(LockFeatures);
