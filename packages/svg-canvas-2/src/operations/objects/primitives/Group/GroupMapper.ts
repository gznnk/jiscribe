import type { GroupDoc } from "../../../../schemas/objects/primitives/GroupDoc";
import type { GroupState } from "../../../../states/objects/primitives/GroupState";
import { ObjectMapper } from "../../base/ObjectMapper";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../types/ObjectMapperTypes";
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

	// Note: children conversion should be handled by the caller/registry
	return {
		...base,
		...transform,
		children: doc.children.map((child) => ObjectMapper.toState(child)),
	} as GroupState;
};

/**
 * Converts GroupState to GroupDoc.
 */
export const groupToDoc: StateToDocMapper<GroupState, GroupDoc> = (state) => {
	const base = ObjectMapper.toDoc(state);
	const transform = convertTransformStateToDoc(state);

	// Note: children conversion should be handled by the caller/registry
	return {
		...base,
		...transform,
		children: state.children.map((child) => ObjectMapper.toDoc(child)),
	} as GroupDoc;
};
