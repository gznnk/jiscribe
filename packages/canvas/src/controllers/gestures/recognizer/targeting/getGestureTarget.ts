/** Object/element resolved from a DOM event target via its [data-kind] ancestor. */
export type GestureTarget = {
	/** Value of the resolved element's data-id attribute. */
	id: string;
	/** Value of the resolved element's data-kind attribute. */
	kind: string;
	/**
	 * Nearest [data-part] at or below the [data-kind] element: the address of
	 * the model part that was pressed (`textSlot:{slotId}` / `vertex:{index}`,
	 * see parsePartAddress). It is read separately from the [data-kind] element
	 * so a shape that draws several hit regions can mark them while still
	 * exposing exactly one [data-kind] element (the DOM contract e2e's
	 * captureObjects counts on). Undefined when no [data-part] is found at or
	 * below the target.
	 */
	part?: string;
	/**
	 * Nearest [data-action] at or below the [data-kind] element: what pressing
	 * this element starts (a menu command, a resize handle, a connector's label
	 * box, ...). Resolved with the same rule as `part`. Undefined when no
	 * [data-action] is found at or below the target.
	 */
	action?: string;
};

/**
 * Reads `attribute` from its nearest carrier at or above `el`, counting the
 * carrier only when it is `kindEl` or inside it: one above the [data-kind]
 * element belongs to an unrelated outer widget.
 */
const readScopedAttribute = (
	el: Element,
	kindEl: Element,
	attribute: string,
): string | undefined => {
	const carrierEl = el.closest(`[${attribute}]`);
	return carrierEl && (carrierEl === kindEl || kindEl.contains(carrierEl))
		? (carrierEl.getAttribute(attribute) ?? undefined)
		: undefined;
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

	const part = readScopedAttribute(el, kindEl, "data-part");
	const action = readScopedAttribute(el, kindEl, "data-action");

	return { id, kind, part, action };
};
