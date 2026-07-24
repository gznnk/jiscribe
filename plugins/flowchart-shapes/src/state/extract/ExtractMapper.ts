import { createFrameMapper } from "@workspace/canvas/unstable";

import type { ExtractState } from "./ExtractState";
import type { ExtractDoc } from "../../schema/extract/ExtractDoc";
import { ExtractFeatures } from "../../schema/extract/ExtractDoc";

/** ExtractDoc <-> ExtractState conversion (Frame-family shared logic generated from features). */
export const { toState: extractToState, toDoc: extractToDoc } =
	createFrameMapper<ExtractDoc, ExtractState>(ExtractFeatures);
