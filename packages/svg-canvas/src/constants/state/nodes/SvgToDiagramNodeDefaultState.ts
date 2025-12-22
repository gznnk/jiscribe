import { SvgToDiagramNodeFeatures } from "../../../types/data/nodes/SvgToDiagramNodeData";
import type { SvgToDiagramNodeState } from "../../../types/state/nodes/SvgToDiagramNodeState";
import { SvgToDiagramNodeDefaultData } from "../../data/nodes/SvgToDiagramNodeDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default SVG to diagram node state template.
 */
export const SvgToDiagramNodeDefaultState =
	CreateDefaultState<SvgToDiagramNodeState>({
		type: "SvgToDiagramNode",
		options: SvgToDiagramNodeFeatures,
		baseData: SvgToDiagramNodeDefaultData,
		properties: {},
	});
