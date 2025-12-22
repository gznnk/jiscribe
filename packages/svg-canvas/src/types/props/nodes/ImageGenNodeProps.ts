import type { ImageGenNodeFeatures } from "../../data/nodes/ImageGenNodeData";
import type { ImageGenNodeState } from "../../state/nodes/ImageGenNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the ImageGenNode component props.
 */
export type ImageGenNodeProps = CreateDiagramProps<
	ImageGenNodeState,
	typeof ImageGenNodeFeatures
>;
