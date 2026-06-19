import { collectDescendantIds } from "./collectDescendantIds";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * 選択中の ID 群 + それぞれの全子孫 ID を含む Set を構築する。
 *
 * dragStart 時に一度だけ計算して eventStartState にキャッシュすることで、
 * drag 中の毎フレームでの再計算を避ける。
 *
 * @param selectedIds - 選択中のオブジェクト ID 一覧
 * @param objects - フラットなオブジェクトマップ
 * @returns selectedIds と全子孫 ID を含む ReadonlySet
 */
export function buildSelectedIdsWithDescendants(
	selectedIds: readonly string[],
	objects: Record<string, ObjectState>,
): ReadonlySet<string> {
	const result = new Set<string>(selectedIds);
	for (const id of selectedIds) {
		for (const descendantId of collectDescendantIds(id, objects)) {
			result.add(descendantId);
		}
	}
	return result;
}
