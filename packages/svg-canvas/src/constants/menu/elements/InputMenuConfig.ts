import { InputFeatures } from "../../../types/data/elements/InputData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Input elements.
 * Menu options are enabled based on InputFeatures.
 */
export const InputMenuConfig: DiagramMenuConfig =
	createMenuConfig(InputFeatures);
