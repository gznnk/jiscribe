import { PathFeatures } from "../../../types/data/shapes/PathData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Path shapes.
 * Border color, line style, arrow head, group, and transformation options are enabled.
 */
export const PathMenuConfig: DiagramMenuConfig = {
	...createMenuConfig(PathFeatures),
	arrowHead: true,
	lineStyle: true,
	lineColor: true,
	borderColor: false,
	borderStyle: undefined,
};
