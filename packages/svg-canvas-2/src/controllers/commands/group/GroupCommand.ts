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
		mac: [{ key: "g", meta: true }],
		win: [{ key: "g", ctrl: true }],
		default: [{ key: "g", ctrl: true }],
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
				const entry = findLcaEntry(id, lcaId, state.objects);
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

			// 選択アイテムを取り出した結果、LCA 内の中間グループが空または1件になった場合は
			// cleanupGroups 相当の処理で解体する
			// （LCA 自体は対象外。LCA は新グループを子に持つため解体対象にならない）
			for (const parentId of affectedParentIds) {
				if (parentId !== lcaId) {
					cleanupGroupUpToLca(updatedObjects, parentId, lcaId);
				}
			}

			// 変更を反映したステートを構築し、バウンドを更新する
			let nextState: CanvasControllerState = {
				...state,
				objects: updatedObjects,
				selectedIds: [groupId],
				objectMenuOpenId: null,
				commitVersion: state.commitVersion + 1,
			};
			for (const parentId of affectedParentIds) {
				if (parentId !== lcaId && updatedObjects[parentId] != null) {
					nextState = updateGroupBoundsFromRoot(nextState, parentId);
				}
			}
			return updateGroupBoundsFromRoot(nextState, lcaId);
		}

		// No LCA: place at root, preserving z-order of root-level selected items
		// ── LCA が存在しない場合: 新グループをルートに配置する ────────────────────────
		//
		// 選択アイテムが共通の祖先グループを持たない（異なるルートグループ間の選択など）ケース。
		// ルート直下にある選択アイテムの元の位置に新グループを挿入し、残りは末尾に追加する。
		// また、選択アイテムを取り出した副作用で空や単体になったグループを cleanupGroups で整理する。
		const updatedRootIds = insertGroupIntoList(state.rootIds, selectedSet, groupId);

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

/** Sorts selectedIds by z-order within the LCA container. */
function sortByZOrder(
	selectedIds: string[],
	lcaId: string | undefined,
	objects: Record<string, ObjectState>,
): string[] {
	if (lcaId == null) return [...selectedIds];
	const lcaChildIds = (objects[lcaId] as GroupState).childIds;
	return [...selectedIds].sort((a, b) => {
		const ea = findLcaEntry(a, lcaId, objects) ?? "";
		const eb = findLcaEntry(b, lcaId, objects) ?? "";
		return lcaChildIds.indexOf(ea) - lcaChildIds.indexOf(eb);
	});
}

/** Returns the direct child of lcaId that is an ancestor of (or equal to) id. */
function findLcaEntry(
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

/** Inserts groupId where the first selected item was in the list, or appends if none found. */
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

/**
 * cleanupGroups 相当の処理を LCA 配下に限定して実行する。
 * - 0件: グループを削除し、親から取り除く
 * - 1件: グループを解体し、子を親へ引き上げる（z-order 維持）
 * LCA 自体は対象外（LCA を意図せず解体しないよう保護）。
 */
function cleanupGroupUpToLca(
	objects: Record<string, ObjectState>,
	groupId: string,
	lcaId: string,
): void {
	if (groupId === lcaId) return;
	const group = objects[groupId] as GroupState | undefined;
	if (!group || group.type !== "group") return;

	const parentId = group.parentId;
	const parent = parentId != null ? (objects[parentId] as GroupState | undefined) : undefined;

	if (group.childIds.length === 0) {
		// 0件: グループを削除して親の childIds から取り除く
		delete objects[groupId];
		if (parent?.type === "group" && parentId != null) {
			objects[parentId] = {
				...parent,
				childIds: parent.childIds.filter((cid) => cid !== groupId),
			} as GroupState;
			cleanupGroupUpToLca(objects, parentId, lcaId);
		}
	} else if (group.childIds.length === 1) {
		// 1件: グループを解体し、子を親へ引き上げる
		const childId = group.childIds[0]!;
		const child = objects[childId];
		if (!child) return;
		delete objects[groupId];
		objects[childId] = { ...child, parentId } as ObjectState;
		if (parent?.type === "group" && parentId != null) {
			objects[parentId] = {
				...parent,
				childIds: parent.childIds.map((cid) => (cid === groupId ? childId : cid)),
			} as GroupState;
			cleanupGroupUpToLca(objects, parentId, lcaId);
		}
	}
}
