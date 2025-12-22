import { ConnectLineFeatures } from "../../../types/data/shapes/ConnectLineData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for ConnectLine shapes.
 * Border color, line style, and arrow head options are enabled.
 */
export const ConnectLineMenuConfig: DiagramMenuConfig = {
	...createMenuConfig(ConnectLineFeatures),
	aspectRatio: false,
	arrowHead: true,
	lineStyle: true,
	lineColor: true,
	borderColor: false,
	borderStyle: undefined,
};
