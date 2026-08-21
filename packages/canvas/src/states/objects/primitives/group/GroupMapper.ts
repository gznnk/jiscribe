import type { GroupDoc } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";

import type { GroupState } from "./GroupState";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../base/MapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "../../base/TransformMapper";
import { rebrand } from "../../utils/rebrand";

/**
 * Converts GroupDoc to GroupState.
 */
export const groupToState: DocToStateMapper<GroupDoc, GroupState> = (doc) => {
	const base = ObjectMapper.toState(doc);
	const transform = mapTransformDocToState(doc);

	// Note: Children are handled by CanvasMapper during the normalization process.
	// We initialize with an empty array here, which will be populated by the parent process.
	// Frame (cx, cy, width, height) will be calculated after children are set.
	return rebrand<GroupState>({
		...base,
		...transform,
		type: "group",
		childIds: [],
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
	});
};

/**
 * Converts GroupState to GroupDoc.
 */
export const groupToDoc: StateToDocMapper<GroupState, GroupDoc> = (state) => {
	const base = ObjectMapper.toDoc(state);
	const transform = mapTransformStateToDoc(state);

	// Note: Children are handled by CanvasMapper during the denormalization process.
	// We initialize with an empty array here.
	return rebrand<GroupDoc>({
		...base,
		...transform,
		type: "group",
		children: [],
	});
};
