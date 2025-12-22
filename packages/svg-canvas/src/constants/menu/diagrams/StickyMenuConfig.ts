import { StickyFeatures } from "../../../types/data/diagrams/StickyData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Sticky diagrams.
 * Menu options are enabled based on StickyFeatures.
 */
export const StickyMenuConfig: DiagramMenuConfig =
	createMenuConfig(StickyFeatures);
