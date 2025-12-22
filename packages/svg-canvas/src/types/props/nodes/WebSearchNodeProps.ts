import type { WebSearchNodeFeatures } from "../../data/nodes/WebSearchNodeData";
import type { WebSearchNodeState } from "../../state/nodes/WebSearchNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the WebSearchNode component props.
 */
export type WebSearchNodeProps = CreateDiagramProps<
	WebSearchNodeState,
	typeof WebSearchNodeFeatures
>;
