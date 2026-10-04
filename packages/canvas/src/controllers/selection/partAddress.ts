/**
 * The `data-part` grammar of an object's sub-parts: `<kind>:<partId>`, naming one
 * part of one object the way `data-id` names the object itself. The `kind` is a
 * namespace `ObjectPartKindRegistry` answers for and the `partId` is opaque to
 * core, which hands it back to the type (`has` / `delete`).
 *
 * The element that draws a part builds its address with the per-kind builders
 * ({@link textSlotPart}, {@link vertexPart}), and the click path reads it back
 * with {@link parsePartAddress} (applyPartClick), so no reader spells a kind.
 */

/** Separator of a part address; a kind holding it would make the split ambiguous. */
export const PART_ADDRESS_SEPARATOR = ":";

/**
 * Builds the address a part's element carries.
 *
 * @param kind - The part-id namespace, as its definition spells it ("textSlot",
 *   "vertex"); must hold no `:` (ObjectPartKindRegistry.register refuses one)
 * @param partId - The id inside that namespace; `:` inside it is preserved, and
 *   an empty id addresses nothing
 * @returns The `data-part` value
 */
export const formatPartAddress = (kind: string, partId: string): string =>
	`${kind}${PART_ADDRESS_SEPARATOR}${partId}`;

/**
 * Reads a part address back into its pieces, splitting at the first separator so
 * an id may hold `:` of its own.
 *
 * @param targetPart - `event.targetPart`; undefined (a press on the target's
 *   body) and any string outside the grammar give null
 * @returns The kind and the part id, or null when there is no separator or
 *   either side is empty — an empty kind names no namespace, an empty id no part
 */
export const parsePartAddress = (
	targetPart: string | undefined,
): { kind: string; partId: string } | null => {
	if (targetPart === undefined) {
		return null;
	}
	const separatorIndex = targetPart.indexOf(PART_ADDRESS_SEPARATOR);
	// 0 is an empty kind, -1 is no separator at all.
	if (separatorIndex <= 0) {
		return null;
	}
	const partId = targetPart.slice(separatorIndex + 1);
	if (partId === "") {
		return null;
	}
	return { kind: targetPart.slice(0, separatorIndex), partId };
};
