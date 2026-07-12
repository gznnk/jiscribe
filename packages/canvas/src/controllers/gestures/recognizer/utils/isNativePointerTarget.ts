import { findGestureElement } from "./findGestureElement";

/**
 * Determines whether the target is inside a data-gesture="native-pointer" element
 * (such as a slider).
 *
 * For these elements the recognizer skips pointer capture (capturing would break
 * the native drag behavior) and harvests inputValue from the target. The result is
 * fixed at pointerdown and held on Pressed so the per-frame drag path never repeats
 * the closest() walk (#123).
 *
 * @param target - The event target
 * @returns true if the target is inside a native-pointer element
 */
export const isNativePointerTarget = (target: EventTarget | null): boolean => {
	return findGestureElement(target, "native-pointer") !== null;
};
