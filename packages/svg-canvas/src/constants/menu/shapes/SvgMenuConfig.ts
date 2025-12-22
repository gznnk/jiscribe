import { SvgFeatures } from "../../../types/data/shapes/SvgData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Svg shapes.
 * Menu options are enabled based on SvgFeatures.
 */
export const SvgMenuConfig: DiagramMenuConfig = createMenuConfig(SvgFeatures);
