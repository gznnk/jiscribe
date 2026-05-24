import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * 指定したオブジェクトからルートまで辿り、ルートからそのオブジェクト自身へ至るパス（IDの配列）を返します。
 *
 * @param targetId - 対象となるオブジェクトのID
 * @param objects - キャンバス上の全オブジェクトマップ
 * @returns ルート要素から対象要素自身までの ID 配列 `[rootId, ..., parentId, targetId]`
 */
export function getPathFromRoot(
	targetId: string,
	objects: Record<string, ObjectState>,
): string[] {
	const path: string[] = [targetId];
	let currentParentId = objects[targetId]?.parentId;
	while (currentParentId != null) {
		path.push(currentParentId);
		currentParentId = objects[currentParentId]?.parentId;
	}
	return path.reverse();
}
