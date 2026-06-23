import { walkParentChain } from "./walkParentChain";
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
	// walkParentChain は [parent, ..., root] を返すので、targetId を先頭に付けて反転する。
	return [targetId, ...walkParentChain(targetId, objects)].reverse();
}
