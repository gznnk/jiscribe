import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import { transformFrameByGroup } from "./FrameTransform";

/**
 * Group系のグループ変形処理（再帰）
 * GroupもFrame系として変形
 */
export function transformGroupByGroup(
	group: GroupState,
	transformRootGroupStartState: GroupState,
	transformRootGroupEndState: GroupState,
): GroupState {
	// GroupもFrame系として変形
	return transformFrameByGroup(
		group,
		transformRootGroupStartState,
		transformRootGroupEndState,
	);
}
