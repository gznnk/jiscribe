import type {
	NodeHeaderData,
	NodeHeaderFeatures,
} from "../../data/elements/NodeHeaderData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for NodeHeader elements.
 * Contains state properties specific to NodeHeader diagram elements.
 */
export type NodeHeaderState = CreateStateType<
	NodeHeaderData,
	typeof NodeHeaderFeatures
>;
