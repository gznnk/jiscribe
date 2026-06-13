import { findGestureElement } from "./findGestureElement";

/**
 * wheel イベントをブラウザのネイティブスクロールに任せるべきか判定する。
 *
 * data-gesture="native-wheel" を持つ要素の内側で発生したホイールは、
 * その要素がスクロール可能（内容があふれている）な場合に限り、
 * キャンバスのスクロールではなく要素自身のネイティブスクロールとして扱う。
 * Ctrl 押下時はズーム操作のため常にキャンバス側で処理する。
 *
 * @param target - wheel イベントの target
 * @param ctrlKey - Ctrl キーが押下されているか
 * @returns ネイティブスクロールに任せる場合 true
 */
export const shouldUseNativeWheel = (
	target: EventTarget | null,
	ctrlKey: boolean,
): boolean => {
	if (ctrlKey) {
		return false;
	}

	const scrollableEl = findGestureElement(target, "native-wheel");
	if (!scrollableEl) {
		return false;
	}

	return scrollableEl.scrollHeight > scrollableEl.clientHeight;
};
