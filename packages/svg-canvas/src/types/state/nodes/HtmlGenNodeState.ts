import type {
	HtmlGenNodeData,
	HtmlGenNodeFeatures,
} from "../../data/nodes/HtmlGenNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for HTML Generation nodes.
 */
export type HtmlGenNodeState = CreateStateType<HtmlGenNodeData, typeof HtmlGenNodeFeatures>;