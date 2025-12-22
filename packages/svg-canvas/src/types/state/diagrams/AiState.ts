import type { AiData, AiFeatures } from "../../data/diagrams/AiData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for Ai diagrams.
 * Contains properties specific to AI chat diagram elements.
 */
export type AiState = CreateStateType<AiData, typeof AiFeatures>;
