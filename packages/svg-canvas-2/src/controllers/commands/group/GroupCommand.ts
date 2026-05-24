import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { calculateGroupOrientedBounds } from "../../../states/utils/calculateGroupOrientedBounds";
import type { CanvasControllerState } from "../../CanvasTypes";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { findLowestCommonAncestor } from "../../utils/findLowestCommonAncestor";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { Command } from "../CommandTypes";

export const GroupCommand: Command = {
	id: "group",
	label: "Group",
	category: "arrange",
	shortcuts: {
		mac: [{ code: "KeyG", meta: true }],
		win: [{ code: "KeyG", ctrl: true }],
		default: [{ code: "KeyG", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length >= 2,

	execute: (state) => {
		const groupId = crypto.randomUUID();
		const { selectedIds } = state;
		const selectedSet = new Set(selectedIds);
		const lockAspectRatio = state.multiSelectGroup?.lockAspectRatio ?? false;

		// 新グループをどのグループの直下に配置するかを LCA（最近共通祖先）で決める。
		// 例: group-A 配下の rect-1 と rect-2 を選択した場合、LCA は group-A になり、
		// 新グループは group-A の子として挿入される。
		// 選択アイテムが共通の祖先グループを持たない場合は undefined（ルートに配置）。
		const lcaId = findLowestCommonAncestor(selectedIds, state.objects);

		// グループ化後も図形の重なり順が変わらないよう、selectedIds を z-order で並び替える
		const childIds = sortByZOrder(selectedIds, lcaId, state.objects);

		// 新グループのバウンドを計算するため、仮のグループオブジェクトを作成して
		// calculateGroupOrientedBounds に渡す（この時点では cx/cy/width/height は仮の 0）
		const tempGroup = {
			id: groupId,
			type: "group",
			parentId: lcaId,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			childIds,
			cx: 0,
			cy: 0,
			width: 0,
			height: 0,
			lockAspectRatio,
		} as unknown as GroupState;

		const bounds = calculateGroupOrientedBounds(
			{ ...state.objects, [groupId]: tempGroup },
			groupId,
		);

		// 計算したバウンドを反映した確定版グループを作成する
		const newGroup = {
			...tempGroup,
			cx: bounds?.cx ?? 0,
			cy: bounds?.cy ?? 0,
			width: bounds?.width ?? 0,
			height: bounds?.height ?? 0,
		} as unknown as GroupState;

		// objects に新グループを追加し、各子アイテムの parentId を新グループに付け替える
		const updatedObjects = { ...state.objects, [groupId]: newGroup };
		for (const childId of childIds) {
			updatedObjects[childId] = { ...updatedObjects[childId], parentId: groupId };
		}

		// 各選択アイテムをそれぞれの元の親グループの childIds から取り除く。
		// 取り除いた親グループのバウンド更新が後で必要になるため affectedParentIds に記録する。
		const affectedParentIds = new Set<string>();
		for (const id of selectedIds) {
			const parentId = state.objects[id]?.parentId;
			if (parentId != null) {
				const parent = updatedObjects[parentId] as GroupState;
				if (parent) {
					updatedObjects[parentId] = {
						...parent,
						childIds: parent.childIds.filter((cid) => cid !== id),
					} as GroupState;
					affectedParentIds.add(parentId);
				}
			}
		}

		if (lcaId != null) {
			// ── LCA が存在する場合: 新グループを LCA の childIds に挿入する ──────────────
			//
			// 挿入位置は「選択アイテムの LCA 直下エントリのうち最も前にあった位置」にする。
			// LCA 直下エントリとは、LCA の直接の子であって選択アイテムの祖先（または本人）のこと。
			// 例: LCA が group-A で、選択が group-A/group-B/rect-1 の場合、
			//     rect-1 の LCA エントリは group-B になる。
			//
			// すでに選択アイテムが直接 LCA の子だった場合は上のステップで childIds から
			// 除去済みなので、元の childIds（originalLcaChildIds）を基準に位置を計算し、
			// 除去された分だけインデックスを調整する。
			const originalLcaChildIds = (state.objects[lcaId] as GroupState).childIds;
			const currentLcaChildIds = (updatedObjects[lcaId] as GroupState).childIds;

			let origPos = originalLcaChildIds.length;
			for (const id of selectedIds) {
				const entry = findAncestorUnderLca(id, lcaId, state.objects);
				if (entry != null) {
					const p = originalLcaChildIds.indexOf(entry);
					if (p >= 0) origPos = Math.min(origPos, p);
				}
			}
			const currentSet = new Set(currentLcaChildIds);
			const insertPos =
				origPos -
				originalLcaChildIds.slice(0, origPos).filter((id) => !currentSet.has(id)).length;

			const updatedLcaChildIds = [...currentLcaChildIds];
			updatedLcaChildIds.splice(insertPos, 0, groupId);
			updatedObjects[lcaId] = {
				...(updatedObjects[lcaId] as GroupState),
				childIds: updatedLcaChildIds,
			} as GroupState;
		} else {
			// ── LCA が存在しない場合: 新グループをルートに配置する ────────────────────────
			//
			// 選択アイテムが共通の祖先グループを持たない（異なるルートグループ間の選択など）ケース。
			// ルート直下にある選択アイテムの元の位置に新グループを挿入し、残りは末尾に追加する。
			updatedObjects[groupId] = {
				...(updatedObjects[groupId] as GroupState),
				parentId: undefined,
			} as GroupState;
		}

		// 選択アイテムを取り出した副作用で空や単体になったグループ（LCA を含む）を整理する。
		// LCA 自体も1件になれば cleanupGroups が解体する（これは正しい挙動）。
		const updatedRootIds = lcaId == null
			? insertGroupIntoList(state.rootIds, selectedSet, groupId)
			: state.rootIds.filter((id) => !selectedSet.has(id));

		let nextState: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			rootIds: updatedRootIds,
			selectedIds: [groupId],
			objectMenuOpenId: null,
			commitVersion: state.commitVersion + 1,
		};
		for (const parentId of affectedParentIds) {
			nextState = updateGroupBoundsFromRoot(nextState, parentId);
		}
		return cleanupGroups(nextState);
	},
};

/**
 * グループ化後も図形の重なり順（z-order）が変わらないよう、selectedIds を並び替えて返す。
 *
 * LCA が存在する場合、各選択アイテムの「LCA 直下エントリ」（LCA の直接の子であって
 * 選択アイテムの祖先または本人にあたるオブジェクト）の位置を基準にソートする。
 * LCA が存在しない（ルート配置）場合は selectedIds の順序をそのまま使う。
 *
 * @param selectedIds - グループ化対象のオブジェクト ID 一覧
 * @param lcaId - 新グループの配置先となる LCA のID。ルート配置の場合は undefined
 * @param objects - キャンバス上の全オブジェクトマップ
 * @returns z-order でソートされた childIds
 */
function sortByZOrder(
	selectedIds: string[],
	lcaId: string | undefined,
	objects: Record<string, ObjectState>,
): string[] {
	if (lcaId == null) return [...selectedIds];
	const lcaChildIds = (objects[lcaId] as GroupState).childIds;
	return [...selectedIds].sort((a, b) => {
		const ea = findAncestorUnderLca(a, lcaId, objects) ?? "";
		const eb = findAncestorUnderLca(b, lcaId, objects) ?? "";
		return lcaChildIds.indexOf(ea) - lcaChildIds.indexOf(eb);
	});
}

/**
 * 指定オブジェクトの「LCA 直下エントリ」を返す。
 *
 * LCA 直下エントリとは、lcaId の直接の子であって、id の祖先（または id 本人）にあたる
 * オブジェクトのこと。言い換えると、id から親をたどっていったとき最初に lcaId の
 * 直接の子になるオブジェクト。
 *
 * 例: lcaId = "group-A"、id = "rect-1"（group-A → group-B → rect-1 の階層）の場合、
 *     group-B を返す。
 *
 * @param id - 対象オブジェクトの ID
 * @param lcaId - LCA グループの ID
 * @param objects - キャンバス上の全オブジェクトマップ
 * @returns LCA 直下エントリの ID。見つからない場合は undefined
 */
function findAncestorUnderLca(
	id: string,
	lcaId: string,
	objects: Record<string, ObjectState>,
): string | undefined {
	let currentId: string | undefined = id;
	const visited = new Set<string>();
	while (currentId != null) {
		if (visited.has(currentId)) return undefined;
		visited.add(currentId);
		const obj: ObjectState | undefined = objects[currentId];
		if (obj?.parentId === lcaId) return currentId;
		if (obj?.parentId == null) return undefined;
		currentId = obj.parentId;
	}
	return undefined;
}

/**
 * ids の中から selectedSet に含まれるアイテムを groupId に置き換えたリストを返す。
 *
 * 最初に一致したアイテムの位置に groupId を挿入し、以降の一致アイテムは除去する。
 * selectedSet に含まれるアイテムが ids に一つも存在しない場合は末尾に groupId を追加する。
 * ルート配置時に rootIds の z-order を維持しながら新グループを挿入するために使用する。
 *
 * @param ids - 挿入先のリスト（rootIds など）
 * @param selectedSet - グループ化対象の ID セット
 * @param groupId - 挿入する新グループの ID
 * @returns groupId を挿入した新しいリスト
 */
function insertGroupIntoList(
	ids: string[],
	selectedSet: Set<string>,
	groupId: string,
): string[] {
	const result: string[] = [];
	let inserted = false;
	for (const id of ids) {
		if (selectedSet.has(id)) {
			if (!inserted) {
				result.push(groupId);
				inserted = true;
			}
		} else {
			result.push(id);
		}
	}
	if (!inserted) result.push(groupId);
	return result;
}

