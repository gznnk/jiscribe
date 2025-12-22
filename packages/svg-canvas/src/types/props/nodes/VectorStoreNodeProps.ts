import type { VectorStoreNodeFeatures } from "../../data/nodes/VectorStoreNodeData";
import type { VectorStoreNodeState } from "../../state/nodes/VectorStoreNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the VectorStoreNode component props.
 */
export type VectorStoreNodeProps = CreateDiagramProps<
	VectorStoreNodeState,
	typeof VectorStoreNodeFeatures
>;
