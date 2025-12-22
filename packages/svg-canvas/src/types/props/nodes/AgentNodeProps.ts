import type { AgentNodeFeatures } from "../../data/nodes/AgentNodeData";
import type { AgentNodeState } from "../../state/nodes/AgentNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the AgentNode component props.
 */
export type AgentNodeProps = CreateDiagramProps<
	AgentNodeState,
	typeof AgentNodeFeatures
>;
