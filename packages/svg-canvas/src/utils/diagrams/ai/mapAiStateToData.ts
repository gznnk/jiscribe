import { AiDefaultData } from "../../../constants/data/diagrams/AiDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { AiData } from "../../../types/data/diagrams/AiData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { AiState } from "../../../types/state/diagrams/AiState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

/**
 * Maps Ai state to data
 */
export const mapAiStateToData = createStateToDataMapper<AiData>(AiDefaultData);

export const aiStateToData = (state: Diagram): DiagramData =>
	mapAiStateToData(state as AiState);
