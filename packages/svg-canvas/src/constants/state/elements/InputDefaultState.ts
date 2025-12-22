import { InputFeatures } from "../../../types/data/elements/InputData";
import type { InputState } from "../../../types/state/elements/InputState";
import { InputDefaultData } from "../../data/elements/InputDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default state values for Input
 */
export const InputDefaultState: InputState = CreateDefaultState<InputState>({
	type: "Input",
	options: InputFeatures,
	baseData: InputDefaultData,
});
