import type { GroupDoc } from "../../../../schemas/objects/primitives/GroupDoc";
import type { GroupState } from "../../../../states/objects/primitives/GroupState";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../../types/ObjectMapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";

/**
 * Converts GroupDoc to GroupState.
 */
export const groupToState: DocToStateMapper<GroupDoc, GroupState> = (doc) => {
	const base = ObjectMapper.toState(doc);

	// TransformDoc to Transform conversion
	const rotation = doc.rotation ?? 0;
	const flipX = doc.flipX ?? false;
	const flipY = doc.flipY ?? false;
	const scaleX = flipX ? -1 : 1;
	const scaleY = flipY ? -1 : 1;

	// Note: children conversion should be handled by the caller/registry
	return {
		...base,
		rotation,
		scaleX,
		scaleY,
		children: doc.children.map((child) => ObjectMapper.toState(child)),
	} as GroupState;
};

/**
 * Converts GroupState to GroupDoc.
 */
export const groupToDoc: StateToDocMapper<GroupState, GroupDoc> = (state) => {
	const base = ObjectMapper.toDoc(state);

	// Transform to TransformDoc conversion
	const rotation = state.rotation !== 0 ? state.rotation : undefined;
	const flipX = state.scaleX < 0 ? true : undefined;
	const flipY = state.scaleY < 0 ? true : undefined;

	// Note: children conversion should be handled by the caller/registry
	return {
		...base,
		rotation,
		flipX,
		flipY,
		children: state.children.map((child) => ObjectMapper.toDoc(child)),
	} as GroupDoc;
};
