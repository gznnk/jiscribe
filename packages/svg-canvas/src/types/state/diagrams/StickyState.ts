import type {
	StickyData,
	StickyFeatures,
} from "../../data/diagrams/StickyData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for Sticky diagrams.
 * Contains properties specific to sticky note diagram elements.
 */
export type StickyState = CreateStateType<StickyData, typeof StickyFeatures>;
