import { PageDesignNodeFeatures } from "../../../types/data/nodes/PageDesignNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for PageDesignNode.
 * Menu options are enabled based on PageDesignNodeFeatures.
 */
export const PageDesignNodeMenuConfig: DiagramMenuConfig = createMenuConfig(
	PageDesignNodeFeatures,
);
