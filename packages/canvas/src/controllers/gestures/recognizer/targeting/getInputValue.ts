import { isNativePointerTarget } from "./isNativePointerTarget";

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
	if (!isNativePointerTarget(target)) {
		return undefined;
	}
	return readInputValue(target);
};

/**
 * Read the value without re-checking the native-pointer qualification.
 * For the per-frame drag / pointerup path, where the qualification was fixed at
 * pointerdown (Pressed.isNativePointerTarget) and must not repeat the closest()
 * walk every frame (#123).
 *
 * @param target - the event target (already known to be a native-pointer input)
 * @returns the input value, or undefined if the element has no string value
 */
export const readInputValue = (
	target: EventTarget | null,
): string | undefined => {
	const value = (target as HTMLInputElement | null)?.value;
	return typeof value === "string" ? value : undefined;
};
