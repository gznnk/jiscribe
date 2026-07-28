/**
 * Gets the id and kind from the nearest ancestor element carrying [data-kind].
 * Returns null when no id is present.
 * part carries the nearest [data-part] at or below that element, which
 * distinguishes a sub-area of the target (a connector's label box vs. its line,
 * or which text slot of a multi-slot shape was pressed). It is read separately
 * from the [data-kind] element so a shape that draws several hit regions can
 * mark them while still exposing exactly one [data-kind] element (the DOM
 * contract e2e's captureObjects counts on).
 */
export const getKindAndId = (
	el: Element,
): { id: string; kind: string; part?: string } | null => {
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
