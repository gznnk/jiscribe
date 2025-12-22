import { CanvasFrameFeatures } from "../../../types/data/diagrams/CanvasFrameData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for CanvasFrame diagrams.
 * Menu options are enabled based on CanvasFrameFeatures.
 */
export const CanvasFrameMenuConfig: DiagramMenuConfig =
	createMenuConfig(CanvasFrameFeatures);
