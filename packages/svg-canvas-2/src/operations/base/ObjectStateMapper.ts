import { MetaStateMapper } from "./MetaStateMapper";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Mapper for converting between ObjectDoc and ObjectState.
 */
export const ObjectStateMapper = {
	/**
	 * Converts ObjectDoc to ObjectState.
	 * @param doc - The document to convert
	 * @returns The converted state
	 */
	toState(doc: ObjectDoc): ObjectState {
		return {
			id: doc.id,
			type: doc.type,
			meta: doc.meta ? MetaStateMapper.toState(doc.meta) : undefined,
		} as ObjectState;
	},

	/**
	 * Converts ObjectState to ObjectDoc.
	 * @param state - The state to convert
	 * @returns The converted document
	 */
	toDoc(state: ObjectState): ObjectDoc {
		return {
			id: state.id,
			type: state.type,
			meta: state.meta ? MetaStateMapper.toDoc(state.meta) : undefined,
		} as ObjectDoc;
	},
};
