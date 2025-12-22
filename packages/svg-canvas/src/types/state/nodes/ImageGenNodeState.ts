import type {
	ImageGenNodeData,
	ImageGenNodeFeatures,
} from "../../data/nodes/ImageGenNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for image generation nodes.
 */
export type ImageGenNodeState = CreateStateType<
	ImageGenNodeData,
	typeof ImageGenNodeFeatures
>;
