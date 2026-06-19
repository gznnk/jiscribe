/**
 * data-gesture 属性に指定できるトークン。
 *
 * - "none": ジェスチャーシステムの起点にならない（pointerdown を無視、右クリックもネイティブに任せる）
 * - "native-pointer": ジェスチャーに参加するがポインタキャプチャを行わない。
 *   inputValue の収穫対象にもなる（スライダーなどネイティブのドラッグ挙動が必要な入力要素向け）
 * - "native-wheel": 要素がスクロール可能な場合、wheel をネイティブスクロールに任せる
 *
 * 詳細は packages/svg-canvas-2/docs/04-gesture-system.md を参照。
 */
export type GestureToken = "none" | "native-pointer" | "native-wheel";

/**
 * 対象要素またはその祖先から、指定した data-gesture トークンを持つ要素を探す。
 *
 * data-gesture は空白区切りのトークンリストとして扱い、
 * [data-gesture~="token"] セレクタで closest 探索する（data-kind と同じ祖先遡り規約）。
 *
 * @param target - イベントの target
 * @param token - 探すトークン
 * @returns トークンを持つ最も近い要素。なければ null
 */
export const findGestureElement = (
	target: EventTarget | null,
	token: GestureToken,
): Element | null => {
	const targetEl = target as Element | null;
	if (!targetEl || typeof targetEl.closest !== "function") {
		return null;
	}
	return targetEl.closest(`[data-gesture~="${token}"]`);
};
