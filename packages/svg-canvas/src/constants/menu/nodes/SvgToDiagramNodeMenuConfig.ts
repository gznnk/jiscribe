import { SvgToDiagramNodeFeatures } from "../../../types/data/nodes/SvgToDiagramNodeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for SvgToDiagramNode.
 * Menu options are enabled based on SvgToDiagramNodeFeatures.
 */
export const SvgToDiagramNodeMenuConfig: DiagramMenuConfig = createMenuConfig(
	SvgToDiagramNodeFeatures,
);
