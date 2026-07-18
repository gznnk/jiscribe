import type { ExtractState } from "./ExtractState";
import type { ExtractDoc } from "../../../../schemas/objects/flowchart/extract/ExtractDoc";
import { ExtractFeatures } from "../../../../schemas/objects/flowchart/extract/ExtractDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** ExtractDoc <-> ExtractState conversion (Frame-family shared logic generated from features). */
export const { toState: extractToState, toDoc: extractToDoc } =
	createFrameMapper<ExtractDoc, ExtractState>(ExtractFeatures);
