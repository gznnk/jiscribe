import { AiDefaultState } from "../../../constants/state/diagrams/AiDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { AiState } from "../../../types/state/diagrams/AiState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

/**
 * Maps Ai data to state
 */
export const mapAiDataToState =
	createDataToStateMapper<AiState>(AiDefaultState);

export const aiDataToState = (data: DiagramData): Diagram =>
	mapAiDataToState(data);
