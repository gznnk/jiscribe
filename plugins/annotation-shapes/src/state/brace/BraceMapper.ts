import { createFrameMapper } from "@workspace/canvas-sdk";

import type { BraceState } from "./BraceState";
import type { BraceDoc } from "../../schema/brace/BraceDoc";
import { BraceFeatures } from "../../schema/brace/BraceDoc";

/** BraceDoc ↔ BraceState conversion (Frame-family shared logic generated from features). */
export const { toState: braceToState, toDoc: braceToDoc } = createFrameMapper<
	BraceDoc,
	BraceState
>(BraceFeatures, ["direction", "tipPosition"]);
