/**
 * Gets the id and kind from the nearest ancestor element carrying [data-kind].
 * Returns null when no id is present.
 */
export const getKindAndId = (
	el: Element,
): { id: string; kind: string } | null => {
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

	return { id, kind };
};
