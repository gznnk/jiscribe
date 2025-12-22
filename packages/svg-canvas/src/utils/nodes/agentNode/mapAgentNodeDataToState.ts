import { AgentNodeDefaultState } from "../../../constants/state/nodes/AgentNodeDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { AgentNodeData } from "../../../types/data/nodes/AgentNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { AgentNodeState } from "../../../types/state/nodes/AgentNodeState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapAgentNodeDataToState = createDataToStateMapper<AgentNodeState>(
	AgentNodeDefaultState,
);

export const agentNodeDataToState = (data: DiagramData): Diagram =>
	mapAgentNodeDataToState(data as AgentNodeData);
