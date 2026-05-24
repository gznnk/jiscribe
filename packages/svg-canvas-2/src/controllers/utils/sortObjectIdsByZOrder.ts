import { getPathFromRoot } from "./getPathFromRoot";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * オブジェクトIDの配列を、キャンバス上のZオーダー（背面から前面）に従ってソートして返します。
 *
 * 各オブジェクトについてのルートからのパスを取得し、先頭（ルート側）から階層ごとに
 * インデックスを比較することで、キャンバス上の正確な Zオーダーを算出します。
 *
 * @param ids - ソート対象のオブジェクト ID 一覧
 * @param objects - キャンバス上の全オブジェクトマップ
 * @param rootIds - キャンバスのルート ID リスト
 * @returns Zオーダーでソートされたオブジェクト ID の配列
 */
export function sortObjectIdsByZOrder(
	ids: string[],
	objects: Record<string, ObjectState>,
	rootIds: string[],
): string[] {
	return [...ids].sort((idA, idB) => {
		const pathA = getPathFromRoot(idA, objects);
		const pathB = getPathFromRoot(idB, objects);
		const minPathLength = Math.min(pathA.length, pathB.length);

		for (let depthIndex = 0; depthIndex < minPathLength; depthIndex++) {
			const nodeIdA = pathA[depthIndex];
			const nodeIdB = pathB[depthIndex];

			if (nodeIdA !== nodeIdB) {
				// ルート要素同士の場合
				if (depthIndex === 0) {
					return rootIds.indexOf(nodeIdA) - rootIds.indexOf(nodeIdB);
				}
				// 枝分かれする位置の共通の親グループ内で比較
				const commonParentId = pathA[depthIndex - 1];
				const commonParentGroup = objects[commonParentId] as GroupState;
				return (
					commonParentGroup.childIds.indexOf(nodeIdA) -
					commonParentGroup.childIds.indexOf(nodeIdB)
				);
			}
		}
		// 完全に包含されている場合は階層が浅いもの（親）を先にする
		return pathA.length - pathB.length;
	});
}
