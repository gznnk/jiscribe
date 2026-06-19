import { findGestureElement } from "./findGestureElement";

/**
 * ポインタキャプチャを行わずブラウザのネイティブなポインタ挙動を維持すべきか判定する。
 *
 * data-gesture="native-pointer" を持つ要素（スライダーなど）では、
 * キャプチャするとネイティブのドラッグ挙動が壊れるためキャプチャしない。
 *
 * @param target - イベントの target
 * @returns ポインタキャプチャを行わない場合 true
 */
export const shouldSkipPointerCapture = (
	target: EventTarget | null,
): boolean => {
	return findGestureElement(target, "native-pointer") !== null;
};
