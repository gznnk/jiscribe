import { useLayoutEffect, useRef } from "react";
import type { ReactElement } from "react";

/** An element built for one id, with what it was built from. */
type CachedElement = {
	/** Everything the element is built from, compared entry by entry with `Object.is`. */
	inputs: readonly unknown[];
	/** The element handed to React, reused as is while `inputs` hold. */
	element: ReactElement;
};

/**
 * Builds an element for `id`, or hands back the one built last time.
 *
 * @param id - The key the element is cached under; one call per id per render
 * @param inputs - Everything `build` reads; the cached element stands only while
 *   each entry is `Object.is` the one it was built from, in the same order
 * @param build - Builds the element; called only when `inputs` changed or `id`
 *   was not drawn in the last committed render
 */
export type ReuseElement = (
	id: string,
	inputs: readonly unknown[],
	build: () => ReactElement,
) => ReactElement;

const hasSameInputs = (
	cachedInputs: readonly unknown[],
	inputs: readonly unknown[],
): boolean =>
	cachedInputs.length === inputs.length &&
	cachedInputs.every((input, index) => Object.is(input, inputs[index]));

/**
 * Hands each id's element back as the very same object while what it is built
 * from holds, so React bails out on it without visiting anything below.
 *
 * The cache is read from the last committed render and replaced only once this
 * render commits, so a render React throws away (StrictMode's second pass, an
 * interrupted transition) leaves nothing behind. Every render starts a new map,
 * so an id the render does not ask for is dropped with it.
 *
 * @returns The function to build each id's element through, valid for this render only
 */
export const useElementReuse = (): ReuseElement => {
	const committedElementsRef = useRef<ReadonlyMap<string, CachedElement>>(
		new Map(),
	);
	const nextElements = new Map<string, CachedElement>();
	useLayoutEffect(() => {
		committedElementsRef.current = nextElements;
	});
	return (id, inputs, build) => {
		const cached = committedElementsRef.current.get(id);
		const entry =
			cached && hasSameInputs(cached.inputs, inputs)
				? cached
				: { inputs, element: build() };
		nextElements.set(id, entry);
		return entry.element;
	};
};
