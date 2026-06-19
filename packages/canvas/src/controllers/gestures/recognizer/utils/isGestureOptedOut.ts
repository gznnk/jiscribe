import { findGestureElement } from "./findGestureElement";

/**
 * 対象要素がジェスチャーシステムの対象外（data-gesture="none" の内側）か判定する。
 *
 * true の場合、pointerdown はジェスチャーの起点にならず、
 * contextmenu もネイティブの動作に任せる。
 * テキスト編集中の textarea やメニュー内の入力欄など、
 * React のイベントハンドラで完結する要素に付与する。
 *
 * @param target - イベントの target
 * @returns ジェスチャーシステムの対象外の場合 true
 */
export const isGestureOptedOut = (target: EventTarget | null): boolean => {
	return findGestureElement(target, "none") !== null;
};
