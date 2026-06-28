import {
	DOUBLE_CLICK_DISTANCE_THRESHOLD,
	DOUBLE_CLICK_THRESHOLD,
} from "../GestureRecognizerConstants";
import type { ClickSnapshot } from "../GestureRecognizerTypes";

/**
 * 今回のクリックが doubleClick の成立条件をすべて満たすか判定する。
 *
 * 条件:
 *   1. 直前の単一クリックが記録済み（previous !== null）
 *   2. 同一ターゲット（targetId 一致。背景はどちらも undefined で一致する）
 *   3. 時間しきい値内（DOUBLE_CLICK_THRESHOLD）
 *   4. 画面距離しきい値内（DOUBLE_CLICK_DISTANCE_THRESHOLD）
 *
 * previous が null（基準未記録）の間は決して doubleClick にしない。背景は targetId が
 * 常に undefined で一致してしまうため、位置で別クリックを切り分けるのは距離判定が担う。
 * 距離は DRAG_THRESHOLD 判定と同じく平方のまま比較する（sqrt を避ける）。
 *
 * @param previous - 直前の単一クリック。未記録なら null
 * @param current - 今回のクリック
 * @returns doubleClick として扱うべきなら true
 */
export const isDoubleClick = (
	previous: ClickSnapshot | null,
	current: ClickSnapshot,
): boolean => {
	if (previous === null) {
		return false;
	}

	const clientDistanceSquared =
		(current.clientPos.x - previous.clientPos.x) ** 2 +
		(current.clientPos.y - previous.clientPos.y) ** 2;

	return (
		previous.targetId === current.targetId &&
		current.time - previous.time < DOUBLE_CLICK_THRESHOLD &&
		clientDistanceSquared < DOUBLE_CLICK_DISTANCE_THRESHOLD
	);
};
