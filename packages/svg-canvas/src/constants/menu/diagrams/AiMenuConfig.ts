import { AiFeatures } from "../../../types/data/diagrams/AiData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";
import { createMenuConfig } from "../core/createMenuConfig";

/**
 * Menu configuration for Ai diagrams.
 * Menu options are enabled based on AiFeatures.
 */
export const AiMenuConfig: DiagramMenuConfig = createMenuConfig(AiFeatures);
