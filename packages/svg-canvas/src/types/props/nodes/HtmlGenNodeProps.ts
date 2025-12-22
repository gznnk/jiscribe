import type { HtmlGenNodeFeatures } from "../../data/nodes/HtmlGenNodeData";
import type { HtmlGenNodeState } from "../../state/nodes/HtmlGenNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the HTML Generation node component props.
 */
export type HtmlGenNodeProps = CreateDiagramProps<
	HtmlGenNodeState,
	typeof HtmlGenNodeFeatures
>;
