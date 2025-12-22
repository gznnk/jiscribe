import { EllipseFeatures } from "../../../types/data/shapes/EllipseData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Ellipse shapes.
 * All menu options are enabled based on EllipseFeatures.
 */
export const EllipseMenuConfig: DiagramMenuConfig =
	createMenuConfig(EllipseFeatures);
