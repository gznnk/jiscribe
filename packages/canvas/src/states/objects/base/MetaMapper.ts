import type { MetaDoc } from "../../../schemas/objects/base/MetaDoc";
import type { MetaState } from "../../../states/objects/base/MetaState";

/**
 * Mapper for converting between MetaDoc and MetaState.
 * MetaDoc and MetaState are branded types with the same structure,
 * so conversion requires type assertions.
 */
export const MetaMapper = {
	/**
	 * Converts MetaDoc to MetaState.
	 * @param doc - The document to convert
	 * @returns The converted state
	 */
	toState(doc: MetaDoc): MetaState {
		return doc as unknown as MetaState;
	},

	/**
	 * Converts MetaState to MetaDoc.
	 * @param state - The state to convert
	 * @returns The converted document
	 */
	toDoc(state: MetaState): MetaDoc {
		return state as unknown as MetaDoc;
	},
};
