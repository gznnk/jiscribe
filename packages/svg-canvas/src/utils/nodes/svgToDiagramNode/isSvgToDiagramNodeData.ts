import type { SvgToDiagramNodeData } from "../../../types/data/nodes/SvgToDiagramNodeData";
import { SvgToDiagramNodeFeatures } from "../../../types/data/nodes/SvgToDiagramNodeData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is SvgToDiagramNodeData.
 */
export const isSvgToDiagramNodeData = createValidatorFromTypeAndFeatures(
	"SvgToDiagramNode",
	SvgToDiagramNodeFeatures,
) as (data: unknown) => data is SvgToDiagramNodeData;
