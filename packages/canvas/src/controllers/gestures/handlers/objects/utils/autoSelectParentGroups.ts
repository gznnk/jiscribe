import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import { getTopLevelSelectedIds } from "../../../../utils/getTopLevelSelectedIds";

/**
 * 選択中のオブジェクトを対象に、グループの全子が選択されていれば
 * 子を選択解除してグループ自体を選択する処理を階層の上方向へ繰り返す。
 *
 * 例: group-1 の子 [rect-1, rect-2, rect-3] がすべて選択されている場合
 *   入力: ['rect-1', 'rect-2', 'rect-3']
 *   出力: ['group-1']
 *
 * ### 処理の流れ
 * ① 祖先が既に選択済みの子孫を除去する（不変条件の強制）。
 *   範囲選択などでグループとその子孫が同時に selectedIds に入った場合でも、
 *   子孫を取り除いて最上位アイテムだけを残す。
 * ② 「全子が選択済み」のグループをワークリスト方式で親方向へ畳み込む。
 *   - 選択アイテムの直接の親グループを起点キューに積む。
 *   - キューから取り出したグループの全子が選択済みなら、子を選択から外して
 *     グループ自体を選択し（畳み込み）、そのグループの親を再検査対象として
 *     キューに積む。
 *   - グループが先に検査され全子未選択でスキップされても、後で子グループが
 *     畳み込まれた時点で親が再びキューに積まれるため、処理順に依存しない。
 *
 * ### 計算量
 * 各グループの畳み込みは高々 1 回（collapsed で保証）。再検査がキューに積まれる
 * のは「いずれかの子の畳み込み」に伴う場合のみで、畳み込み回数はグループ数で
 * 上限が決まる。各取り出しのコストは childIds 数に比例するため、全体は
 * 関与オブジェクト数に対して線形 O(N) で収まる（旧実装の while(changed) 全走査と
 * shift ベース BFS による O(N^2) 近傍を解消）。
 *
 * ### ループの終了保証
 * 畳み込みは単調増加する collapsed により高々グループ数回しか起こらず、
 * 再キューイングもそれに連動して有限回。起点キューイングも有限。
 * したがって parentId / childIds に循環参照があってもループは必ず終了する。
 */
export function autoSelectParentGroups(
	state: CanvasState,
	selectedIds: string[],
): string[] {
	// ① 祖先が既に選択済みの子孫を除去する
	const selected = new Set(getTopLevelSelectedIds(selectedIds, state.objects));

	// ② 再検査対象グループのキュー。Set の挿入順で結果順序を安定させる。
	const queue: string[] = [];
	const queued = new Set<string>();
	const enqueue = (groupId: string): void => {
		if (!queued.has(groupId)) {
			queued.add(groupId);
			queue.push(groupId);
		}
	};

	// 起点: 現在の選択アイテムの直接の親グループ
	for (const id of selected) {
		const parentId = state.objects[id]?.parentId;
		if (parentId != null) {
			enqueue(parentId);
		}
	}

	// 畳み込み済みグループ（再畳み込み・無限ループ防止）
	const collapsed = new Set<string>();

	let head = 0;
	while (head < queue.length) {
		const groupId = queue[head];
		head++;
		// 取り出したので、子の畳み込みに伴う再検査で再度積めるようにする
		queued.delete(groupId);

		if (collapsed.has(groupId)) {
			continue;
		}

		const group = state.objects[groupId];
		if (!group || group.type !== "group") {
			continue;
		}

		const { childIds } = group as GroupState;
		if (childIds.length === 0) {
			continue;
		}

		// 全子が選択済みでなければ、まだ畳み込めない
		if (!childIds.every((childId) => selected.has(childId))) {
			continue;
		}

		// 畳み込み: 子を選択から外し、グループ自体を選択する。
		// 子グループは既に自身へ畳み込まれて選択集合に入っているため、
		// 直接の childIds を差し替えるだけで子孫の除去まで完結する。
		for (const childId of childIds) {
			selected.delete(childId);
		}
		selected.add(groupId);
		collapsed.add(groupId);

		// このグループの親が新たに「全子選択済み」になりうるため再検査する
		const parentId = group.parentId;
		if (parentId != null) {
			enqueue(parentId);
		}
	}

	return [...selected];
}
