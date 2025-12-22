import type { SvgToDiagramNodeData } from "../../../types/data/nodes/SvgToDiagramNodeData";
import { SvgToDiagramNodeFeatures } from "../../../types/data/nodes/SvgToDiagramNodeData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default SVG to diagram node data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const SvgToDiagramNodeDefaultData =
	CreateDefaultData<SvgToDiagramNodeData>({
		type: "SvgToDiagramNode",
		options: SvgToDiagramNodeFeatures,
		properties: {},
	});
