import { RectangleFeatures } from "../../../types/data/shapes/RectangleData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Rectangle shapes.
 * All menu options are enabled based on RectangleFeatures.
 */
export const RectangleMenuConfig: DiagramMenuConfig =
	createMenuConfig(RectangleFeatures);
