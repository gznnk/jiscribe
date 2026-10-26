import { useLayoutEffect, useRef, useState } from "react";

/** An element's border-box size in CSS px, as getBoundingClientRect reports it. */
export type ElementSize = {
	width: number;
	height: number;
};

/**
 * The size of the element `ref` points at, kept current with a ResizeObserver.
 *
 * Read once in a layout effect, before the first paint, so a consumer that lays
 * itself out by the size never shows a frame laid out without it; then on every
 * resize the observer reports. A report whose width and height are unchanged
 * keeps the previous object and renders nothing, so an observer firing for
 * nothing (a reflow elsewhere, a sub-pixel jitter rounded away) does not loop
 * through the consumer.
 *
 * @param ref - The element to watch; read when the component mounts. An element
 *   swapped in later under the same ref is not followed, so keep it mounted for
 *   the component's life
 * @returns null until the first measurement; afterwards the size, which is
 *   `{ width: 0, height: 0 }` for an element not laid out (`display: none`, or
 *   an environment without layout such as jsdom)
 */
export const useElementSize = (
	ref: React.RefObject<Element | null>,
): ElementSize | null => {
	const [size, setSize] = useState<ElementSize | null>(null);
	// Compared here rather than in a state updater, which React may still render
	// for before it finds the state unchanged.
	const measuredSizeRef = useRef<ElementSize | null>(null);

	useLayoutEffect(() => {
		const element = ref.current;
		if (element === null) {
			return;
		}
		const measure = () => {
			const { width, height } = element.getBoundingClientRect();
			const measuredSize = measuredSizeRef.current;
			if (
				measuredSize !== null &&
				measuredSize.width === width &&
				measuredSize.height === height
			) {
				return;
			}
			measuredSizeRef.current = { width, height };
			setSize(measuredSizeRef.current);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [ref]);

	return size;
};
