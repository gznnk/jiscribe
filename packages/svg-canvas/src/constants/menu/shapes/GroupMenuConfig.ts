import { GroupFeatures } from "../../../types/data/shapes/GroupData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Group shapes.
 * Only transformation and grouping options are enabled based on GroupFeatures.
 */
export const GroupMenuConfig: DiagramMenuConfig =
	createMenuConfig(GroupFeatures);
