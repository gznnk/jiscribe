/**
 * Gets the id and kind from the nearest ancestor element carrying [data-kind].
 * Returns null when no id is present.
 * part carries the same element's optional [data-part], which distinguishes a
 * sub-area of the target (e.g. a connector's label box vs. its line).
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

	const part = kindEl.getAttribute("data-part") ?? undefined;

	return { id, kind, part };
};
