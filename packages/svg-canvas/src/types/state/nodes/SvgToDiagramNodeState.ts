import type {
	SvgToDiagramNodeData,
	SvgToDiagramNodeFeatures,
} from "../../data/nodes/SvgToDiagramNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for SVG to diagram nodes.
 */
export type SvgToDiagramNodeState = CreateStateType<
	SvgToDiagramNodeData,
	typeof SvgToDiagramNodeFeatures
>;
