import { AiFeatures } from "../../../types/data/diagrams/AiData";
import type { AiState } from "../../../types/state/diagrams/AiState";
import { AiDefaultData } from "../../data/diagrams/AiDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default state values for Ai
 */
export const AiDefaultState: AiState = CreateDefaultState<AiState>({
	type: "Ai",
	options: AiFeatures,
	baseData: AiDefaultData,
	properties: {
		itemableType: "composite",
	},
});
