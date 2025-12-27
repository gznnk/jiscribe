import { LLMNodeDefaultState } from "../../../constants/state/nodes/LLMNodeDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { LLMNodeState } from "../../../types/state/nodes/LLMNodeState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapLLMNodeDataToState =
	createDataToStateMapper<LLMNodeState>(LLMNodeDefaultState);

export const llmNodeDataToState = (data: DiagramData): Diagram =>
	mapLLMNodeDataToState(data as unknown as LLMNodeState);
