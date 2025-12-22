import type { ImageGenNodeData } from "../../../types/data/nodes/ImageGenNodeData";
import { ImageGenNodeFeatures } from "../../../types/data/nodes/ImageGenNodeData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default image generation node data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const ImageGenNodeDefaultData = CreateDefaultData<ImageGenNodeData>({
	type: "ImageGenNode",
	options: ImageGenNodeFeatures,
	properties: {},
});
