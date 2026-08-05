import { transformFrameByGroup, rotateFrameByGroup } from "./FrameTransform";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";

/**
 * Recursive group-driven transform for Group objects.
 * A Group is transformed the same way as a Frame.
 */
export function transformGroupByGroup(
	group: GroupState,
	transformRootGroupStartState: GroupState,
	transformRootGroupEndState: GroupState,
): GroupState {
	// A Group is transformed as a Frame
	return transformFrameByGroup(
		group,
		transformRootGroupStartState,
		transformRootGroupEndState,
	);
}

/**
 * Recursive group-driven rotation for Group objects.
 * A Group is rotated the same way as a Frame.
 */
export function rotateGroupByGroup(
	group: GroupState,
	rotationRootGroup: GroupState,
	endGroupRotation: number,
): GroupState {
	// A Group is rotated as a Frame
	return rotateFrameByGroup(group, rotationRootGroup, endGroupRotation);
}
