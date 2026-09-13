/** Object/element resolved from a DOM event target via its [data-kind] ancestor. */
export type GestureTarget = {
	/** Value of the resolved element's data-id attribute. */
	id: string;
	/** Value of the resolved element's data-kind attribute. */
	kind: string;
	/**
	 * Nearest [data-part] at or below the [data-kind] element, distinguishing a
	 * sub-area of the target (a connector's label box vs. its line, or which
	 * text slot of a multi-slot shape was pressed). It is read separately from
	 * the [data-kind] element so a shape that draws several hit regions can mark
	 * them while still exposing exactly one [data-kind] element (the DOM
	 * contract e2e's captureObjects counts on). Undefined when no [data-part]
	 * is found at or below the target.
	 */
	part?: string;
};

/**
 * Resolves the gesture target from the nearest ancestor element carrying [data-kind].
 *
 * @param el - Event target to start the ancestor walk from (the element itself counts)
 * @returns The resolved target, or null when no [data-kind] ancestor exists or it
 *   carries no data-kind / data-id value
 */
export const getGestureTarget = (el: Element): GestureTarget | null => {
	const kindEl = el.closest("[data-kind]");
	if (!kindEl) {
		return null;
	}

	const kind = kindEl.getAttribute("data-kind");
	if (!kind) {
		return null;
	}

	const id = kindEl.getAttribute("data-id");
	if (!id) {
		return null;
	}

	// A [data-part] above the [data-kind] element belongs to an unrelated outer
	// widget, so only one inside (or the element itself) counts.
	const partEl = el.closest("[data-part]");
	const part =
		partEl && (partEl === kindEl || kindEl.contains(partEl))
			? (partEl.getAttribute("data-part") ?? undefined)
			: undefined;

	return { id, kind, part };
};
