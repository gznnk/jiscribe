import type {
	TextAreaNodeData,
	TextAreaNodeFeatures,
} from "../../data/nodes/TextAreaNodeData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for text area nodes.
 */
export type TextAreaNodeState = CreateStateType<
	TextAreaNodeData,
	typeof TextAreaNodeFeatures
>;
