import type { MetaDoc } from "../../../schemas/objects/base/MetaDoc";
import type { MetaState } from "../../../states/objects/base/MetaState";
import { rebrand } from "../utils/rebrand";

/**
 * Mapper for converting between MetaDoc and MetaState.
 * The two are structurally identical and differ only by their brand, so both
 * directions are a re-brand of the same object — no field is read or rewritten.
 */
export const MetaMapper = {
	/**
	 * Converts MetaDoc to MetaState.
	 * @param doc - The document to convert
	 * @returns The same object reference, re-branded
	 */
	toState(doc: MetaDoc): MetaState {
		return rebrand<MetaState>(doc);
	},

	/**
	 * Converts MetaState to MetaDoc.
	 * @param state - The state to convert
	 * @returns The same object reference, re-branded
	 */
	toDoc(state: MetaState): MetaDoc {
		return rebrand<MetaDoc>(state);
	},
};
