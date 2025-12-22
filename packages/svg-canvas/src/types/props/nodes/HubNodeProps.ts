import type { HubNodeFeatures } from "../../data/nodes/HubNodeData";
import type { HubNodeState } from "../../state/nodes/HubNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the hub node component props.
 */
export type HubNodeProps = CreateDiagramProps<
	HubNodeState,
	typeof HubNodeFeatures
>;
