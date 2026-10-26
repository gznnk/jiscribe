import { type RefObject, useEffect, useRef } from "react";

/**
 * A ref that holds the value of the latest committed render, for callbacks and
 * effects that must read a fresh value without listing it as a dependency.
 *
 * Updated in a passive effect, so code running during render or in a layout
 * effect still sees the previous commit's value; a reader that runs before the
 * passive effects flush needs its own layout-effect mirror instead.
 */
export const useLatestRef = <T>(value: T): RefObject<T> => {
	const ref = useRef(value);
	useEffect(() => {
		ref.current = value;
	});
	return ref;
};
