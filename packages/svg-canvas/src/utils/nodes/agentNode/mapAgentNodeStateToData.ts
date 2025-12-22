import { AgentNodeDefaultData } from "../../../constants/data/nodes/AgentNodeDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { AgentNodeData } from "../../../types/data/nodes/AgentNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapAgentNodeStateToData =
	createStateToDataMapper<AgentNodeData>(AgentNodeDefaultData);

export const agentNodeStateToData = (state: Diagram): DiagramData =>
	mapAgentNodeStateToData(state as AgentNodeData);
