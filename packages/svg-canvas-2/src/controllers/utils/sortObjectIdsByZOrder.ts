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
	const rootIndexMap = new Map(rootIds.map((id, i) => [id, i]));
	// childIds の indexOf を O(1) にするため、比較時に都度 Map を生成してキャッシュする
	const childIndexCache = new Map<string, Map<string, number>>();

	const getChildIndex = (parentId: string, childId: string): number => {
		let map = childIndexCache.get(parentId);
		if (!map) {
			const group = objects[parentId] as GroupState;
			map = new Map(group.childIds.map((id, i) => [id, i]));
			childIndexCache.set(parentId, map);
		}
		return map.get(childId) ?? -1;
	};

	return [...ids].sort((idA, idB) => {
		const pathA = getPathFromRoot(idA, objects);
		const pathB = getPathFromRoot(idB, objects);
		const minPathLength = Math.min(pathA.length, pathB.length);

		for (let depthIndex = 0; depthIndex < minPathLength; depthIndex++) {
			const nodeIdA = pathA[depthIndex];
			const nodeIdB = pathB[depthIndex];

			if (nodeIdA !== nodeIdB) {
				if (depthIndex === 0) {
					return (
						(rootIndexMap.get(nodeIdA) ?? -1) -
						(rootIndexMap.get(nodeIdB) ?? -1)
					);
				}
				const commonParentId = pathA[depthIndex - 1];
				return (
					getChildIndex(commonParentId, nodeIdA) -
					getChildIndex(commonParentId, nodeIdB)
				);
			}
		}
		return pathA.length - pathB.length;
	});
}
