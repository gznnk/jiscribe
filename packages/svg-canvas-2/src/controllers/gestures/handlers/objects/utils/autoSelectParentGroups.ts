import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";

/**
 * Collects all descendant IDs of a group using BFS.
 * Circular references in the hierarchy are detected and skipped with a warning.
 * @param state - The canvas state
 * @param groupId - The group ID to collect descendants from
 * @returns Set of all descendant IDs (children, grandchildren, etc.)
 */
function collectAllDescendants(
	state: CanvasState,
	groupId: string,
): Set<string> {
	const descendants = new Set<string>();
	const visited = new Set([groupId]);
	const queue = [groupId];

	while (queue.length > 0) {
		const currentId = queue.shift()!;
		const obj = state.objects[currentId];
		if (!obj || obj.type !== "group") continue;

		const group = obj as GroupState;
		for (const childId of group.childIds) {
			if (visited.has(childId)) {
				console.warn(`[collectAllDescendants] Circular reference detected at "${childId}"`);
				continue;
			}
			visited.add(childId);
			descendants.add(childId);
			queue.push(childId);
		}
	}

	return descendants;
}

/**
 * 選択中のオブジェクトを対象に、グループの全子が選択されていれば
 * 子を選択解除してグループ自体を選択する処理を階層の上方向へ繰り返す。
 *
 * 例: group-1 の子 [rect-1, rect-2, rect-3] がすべて選択されている場合
 *   入力: ['rect-1', 'rect-2', 'rect-3']
 *   出力: ['group-1']
 *
 * ### ループの終了保証
 * 各イテレーションで「全子が選択済み」の親を「昇格」させる。
 * 昇格した親は everPromoted に記録され、同じ親が再昇格することはない。
 * オブジェクト数は有限かつ everPromoted は単調増加するため、
 * データに循環参照があってもループは必ず終了する。
 *
 * ### 2つのガード条件（どちらも必要）
 * - `!selectedSet.has(parentId)`:
 *   そのイテレーション開始時点で既に選択中の親（ネスト内のサブグループなど）を
 *   誤って二重昇格させないためのガード。
 * - `!everPromoted.has(parentId)`:
 *   循環参照 (A→B→A) があるとき、一度昇格した親が次のイテレーションで
 *   再び昇格候補になっても無限ループしないためのガード。
 */
export function autoSelectParentGroups(
	state: CanvasState,
	selectedIds: string[],
): string[] {
	let currentSelectedIds = [...selectedIds];
	let changed = true;
	const everPromoted = new Set<string>();

	while (changed) {
		changed = false;

		// 現在の選択オブジェクトの親グループをすべて候補として収集する
		const parentCandidates = new Set<string>();
		for (const id of currentSelectedIds) {
			const obj = state.objects[id];
			if (obj?.parentId) {
				parentCandidates.add(obj.parentId);
			}
		}

		// このイテレーションの選択スナップショット。
		// 同一イテレーション内で currentSelectedIds が変化しても
		// 子の選択判定は開始時点の状態で行う。
		const selectedSet = new Set(currentSelectedIds);

		for (const parentId of parentCandidates) {
			const parent = state.objects[parentId] as GroupState;
			if (!parent) continue;

			const allChildrenSelected =
				parent.childIds.length > 0 &&
				parent.childIds.every((childId) => selectedSet.has(childId));

			if (allChildrenSelected && !selectedSet.has(parentId) && !everPromoted.has(parentId)) {
				// 全子孫（孫以降も含む）を選択から取り除き、グループ自体を選択する
				const allDescendants = collectAllDescendants(state, parentId);
				currentSelectedIds = currentSelectedIds.filter(
					(id) => !allDescendants.has(id),
				);
				currentSelectedIds.push(parentId);
				everPromoted.add(parentId);
				changed = true;
			}
		}
	}

	return currentSelectedIds;
}
