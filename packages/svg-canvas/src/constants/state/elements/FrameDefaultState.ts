import { FrameFeatures } from "../../../types/data/elements/FrameData";
import type { FrameState } from "../../../types/state/elements/FrameState";
import { FrameDefaultData } from "../../data/elements/FrameDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default state values for Frame
 */
export const FrameDefaultState: FrameState = CreateDefaultState<FrameState>({
	type: "Frame",
	options: FrameFeatures,
	baseData: FrameDefaultData,
});
