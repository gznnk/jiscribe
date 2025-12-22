import type { SvgToDiagramNodeFeatures } from "../../data/nodes/SvgToDiagramNodeData";
import type { SvgToDiagramNodeState } from "../../state/nodes/SvgToDiagramNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the SvgToDiagramNode component props.
 */
export type SvgToDiagramNodeProps = CreateDiagramProps<
	SvgToDiagramNodeState,
	typeof SvgToDiagramNodeFeatures
>;
