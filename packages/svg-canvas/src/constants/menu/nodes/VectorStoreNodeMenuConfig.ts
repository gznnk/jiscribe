import { VectorStoreNodeFeatures } from "../../../types/data/nodes/VectorStoreNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for VectorStoreNode.
 * Menu options are enabled based on VectorStoreNodeFeatures.
 */
export const VectorStoreNodeMenuConfig: DiagramMenuConfig = createMenuConfig(
	VectorStoreNodeFeatures,
);
