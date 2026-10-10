import { TEXT_SLOT_PART_KIND } from "../../../selection/partKinds/textSlotPartKind";
import { VERTEX_PART_KIND } from "../../../selection/partKinds/vertexPartKind";

/**
 * The `data-part` grammar of an object's own sub-parts (`targetKind: "object"`
 * and `"control"`): `<kind>:<partId>`, naming one part of one object the way
 * `data-id` names the object itself.
 *
 * - `textSlot:{slotId}` — one text slot of a `features.text === "slots"` shape,
 *   the id spelled as a key of the object's own `text`
 * - `vertex:{index}` — one vertex of a poly-geometry shape, the id spelled as
 *   the decimal index into its `points`
 *
 * The `kind` is a namespace `ObjectPartKindRegistry` answers for, spelled as an
 * identifier (`ObjectPartKindRegistry.register`), so the first `:` is the
 * separator and a `partId` may carry `:` of its own. The `partId` is opaque to
 * core, which hands it back to the type (`has` / `delete`).
 *
 * The element that draws a part builds its address with the per-kind builder
 * below ({@link textSlotPart}, re-exported from `@jiscribe/canvas` for plugins;
 * {@link vertexPart}), and the click path takes it apart with
 * {@link parsePartAddress} (selectPartByClick), so no reader spells a kind.
 */

const PART_ADDRESS_SEPARATOR = ":";

/**
 * Builds the address a part's element carries.
 *
 * @param kind - The part-id namespace, as its definition spells it ("textSlot",
 *   "vertex"); an identifier (ObjectPartKindRegistry.register refuses anything
 *   else), so it holds no `:`
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

/**
 * The `data-part` one text slot's element carries: how a click picks that slot
 * (selectPartByClick) and a double click opens it for editing
 * (resolveTextSlotId). A shape drawing one hit region per slot marks each
 * region with it.
 *
 * @param slotId - Key of the shape's own `text`; an id the shape does not hold
 *   addresses nothing, so a click on it steps back up to the object
 * @returns The `data-part` value, `textSlot:<slotId>`
 */
export const textSlotPart = (slotId: string): string =>
	formatPartAddress(TEXT_SLOT_PART_KIND, slotId);

/**
 * The inverse of {@link textSlotPart}: the slot id a pressed element's address
 * names, for the double click that opens a slot for editing (resolveTextSlotId).
 *
 * @param targetPart - `event.targetPart`; undefined for a press on the body
 * @returns The slot id, or undefined when the address is not a text slot's — no
 *   address at all, or one of another kind (a vertex). The id is untrusted DOM
 *   text; whether the shape holds that slot is the caller's check
 */
export const readTextSlotPart = (
	targetPart: string | undefined,
): string | undefined => {
	const address = parsePartAddress(targetPart);
	return address?.kind === TEXT_SLOT_PART_KIND ? address.partId : undefined;
};

/**
 * The `data-part` one vertex handle carries: how a click picks that vertex
 * (selectPartByClick) and a drag moves it (VertexControlHandler).
 *
 * @param index - Index into the object's `points`; a non-negative integer, since
 *   only the canonical decimal spelling names a vertex
 * @returns The `data-part` value, `vertex:<index>`
 */
export const vertexPart = (index: number): string =>
	formatPartAddress(VERTEX_PART_KIND, String(index));
