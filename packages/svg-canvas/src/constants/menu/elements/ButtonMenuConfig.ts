import { ButtonFeatures } from "../../../types/data/elements/ButtonData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Button elements.
 * Menu options are enabled based on ButtonFeatures.
 */
export const ButtonMenuConfig: DiagramMenuConfig =
	createMenuConfig(ButtonFeatures);
