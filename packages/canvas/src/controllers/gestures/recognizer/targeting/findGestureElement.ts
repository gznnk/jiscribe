/**
 * Tokens that can be set on the data-gesture attribute.
 *
 * - "none": does not originate a gesture (ignores pointerdown, and leaves right-click to native)
 * - "native-pointer": participates in gestures but does not capture the pointer.
 *   Also becomes a target for inputValue harvesting (for input elements such as sliders that
 *   need native drag behavior)
 * - "native-wheel": leaves wheel to native scrolling when the element is scrollable
 *
 * See packages/canvas/docs/04-gesture-system.md for details.
 */
export type GestureToken = "none" | "native-pointer" | "native-wheel";

/**
 * From the target element or its ancestors, find the element carrying the given data-gesture token.
 *
 * data-gesture is treated as a whitespace-separated token list, searched with `closest`
 * using the [data-gesture~="token"] selector (the same ancestor-walking convention as data-kind).
 *
 * @param target - The event target
 * @param token - The token to look for
 * @returns The nearest element carrying the token, or null if none
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
