import { getSelectionCenter } from "./getSelectionCenter";
import type { CanvasControllerState } from "../../../CanvasTypes";

/** Move-aware オフセットが無効な場合に使う既定のオフセット量。 */
export const DUPLICATE_OFFSET = { x: 20, y: 20 };

/**
 * Move-aware オフセットを計算する。
 *
 * - 直前の複製で作ったオブジェクトが現在選択されている場合:
 *     ユーザーが動かした距離を次のオフセットとして使用（Figma 方式）
 *     ほとんど動いていない場合は前回のオフセットを継続
 * - それ以外: DUPLICATE_OFFSET を使用
 */
export function computeDuplicateOffset(state: CanvasControllerState): {
	x: number;
	y: number;
} {
	const { lastDuplicate, selectedIds } = state;
	if (!lastDuplicate) {
		return DUPLICATE_OFFSET;
	}

	// 選択セットが直前の複製結果と一致するか確認
	if (lastDuplicate.newIds.length !== selectedIds.length) {
		return DUPLICATE_OFFSET;
	}
	const lastSet = new Set(lastDuplicate.newIds);
	if (!selectedIds.every((id) => lastSet.has(id))) {
		return DUPLICATE_OFFSET;
	}

	// 現在の選択中心を取得
	const center = getSelectionCenter(state, selectedIds);
	if (!center) {
		return lastDuplicate.offset;
	}

	const dx = center.cx - lastDuplicate.cx;
	const dy = center.cy - lastDuplicate.cy;

	// ほぼ動いていない（1px 未満）→ 前回オフセットを継続
	if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
		return lastDuplicate.offset;
	}

	// 動かした距離を新しいオフセットとして採用
	return { x: dx, y: dy };
}
