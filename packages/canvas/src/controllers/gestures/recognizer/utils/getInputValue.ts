import { findGestureElement } from "./findGestureElement";

/**
 * Read the value from an input element that has data-gesture="native-pointer".
 * Targets elements such as sliders that propagate their value via gesture events.
 *
 * @param target - the event target
 * @returns the input value, or undefined if the element does not qualify
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
