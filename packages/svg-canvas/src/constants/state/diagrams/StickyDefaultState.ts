import { StickyFeatures } from "../../../types/data/diagrams/StickyData";
import type { StickyState } from "../../../types/state/diagrams/StickyState";
import { StickyDefaultData } from "../../data/diagrams/StickyDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default state values for Sticky
 */
export const StickyDefaultState: StickyState = CreateDefaultState<StickyState>({
	type: "Sticky",
	options: StickyFeatures,
	baseData: StickyDefaultData,
	properties: {
		minWidth: 80,
		minHeight: 60,
	},
});
