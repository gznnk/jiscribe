import { findGestureElement } from "./findGestureElement";

/**
 * data-gesture="native-pointer" を持つ入力要素から値を取得する。
 * スライダーなど、ジェスチャーイベント経由で値を伝える要素が対象。
 *
 * @param target - イベントの target
 * @returns 入力値。対象外の要素の場合は undefined
 */
export const getInputValue = (
	target: EventTarget | null,
): string | undefined => {
	if (!findGestureElement(target, "native-pointer")) {
		return undefined;
	}
	const value = (target as HTMLInputElement | null)?.value;
	return typeof value === "string" ? value : undefined;
};
