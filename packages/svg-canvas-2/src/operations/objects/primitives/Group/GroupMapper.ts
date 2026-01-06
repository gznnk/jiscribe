import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../../registry/ObjectRegistryTypes";
import type { GroupDoc } from "../../../../schemas/objects/primitives/GroupDoc";
import type { GroupState } from "../../../../states/objects/primitives/GroupState";
import { ObjectMapper } from "../../base/ObjectMapper";
import {
	convertTransformDocToState,
	convertTransformStateToDoc,
} from "../../utils/transformConverter";

/**
 * Converts GroupDoc to GroupState.
 */
export const groupToState: DocToStateMapper<GroupDoc, GroupState> = (doc) => {
	const base = ObjectMapper.toState(doc);
	const transform = convertTransformDocToState(doc);

	// Note: Children are handled by CanvasMapper during the normalization process.
	// We initialize with an empty array here, which will be populated by the parent process.
	return {
		...base,
		...transform,
		children: [],
	} as unknown as GroupState;
};

/**
 * Converts GroupState to GroupDoc.
 */
export const groupToDoc: StateToDocMapper<GroupState, GroupDoc> = (state) => {
	const base = ObjectMapper.toDoc(state);
	const transform = convertTransformStateToDoc(state);

	// Note: Children are handled by CanvasMapper during the denormalization process.
	// We initialize with an empty array here.
	return {
		...base,
		...transform,
		children: [],
	} as unknown as GroupDoc;
};
