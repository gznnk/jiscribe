import { LLMNodeDefaultData } from "../../../constants/data/nodes/LLMNodeDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { LLMNodeData } from "../../../types/data/nodes/LLMNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { LLMNodeState } from "../../../types/state/nodes/LLMNodeState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapLLMNodeStateToData =
	createStateToDataMapper<LLMNodeData>(LLMNodeDefaultData);

export const llmNodeStateToData = (state: Diagram): DiagramData =>
	mapLLMNodeStateToData(state as LLMNodeState);
