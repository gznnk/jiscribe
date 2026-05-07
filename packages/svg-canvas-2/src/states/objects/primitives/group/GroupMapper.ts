import type { GroupState } from "./GroupState";
import type { GroupDoc } from "../../../../schemas/objects/primitives/GroupDoc";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../base/MapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "../../base/TransformMapper";

/**
 * Converts GroupDoc to GroupState.
 */
export const groupToState: DocToStateMapper<GroupDoc, GroupState> = (doc) => {
	const base = ObjectMapper.toState(doc);
	const transform = mapTransformDocToState(doc);

	// Note: Children are handled by CanvasMapper during the normalization process.
	// We initialize with an empty array here, which will be populated by the parent process.
	// Frame (cx, cy, width, height) will be calculated after children are set.
	return {
		...base,
		...transform,
		childIds: [],
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
	} as unknown as GroupState;
};

/**
 * Converts GroupState to GroupDoc.
 */
export const groupToDoc: StateToDocMapper<GroupState, GroupDoc> = (state) => {
	const base = ObjectMapper.toDoc(state);
	const transform = mapTransformStateToDoc(state);

	// Note: Children are handled by CanvasMapper during the denormalization process.
	// We initialize with an empty array here.
	return {
		...base,
		...transform,
		children: [],
	} as unknown as GroupDoc;
};
