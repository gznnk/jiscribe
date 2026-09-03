import type { RichText } from "../types/RichText";
import type { TextSlot } from "../types/TextSlot";
import type { TextVerticalBasis } from "../types/TextVerticalBasis";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * The doc form of a single-body text (features.text: "body"): the content and
 * its styling, flat on the object. The styling fields are `TextSlot`'s own —
 * derived, not copied, so the doc cannot grow a style the slot lacks — and the
 * mappers expand the group into the state's one `body` slot and fold it back on
 * save (TextSlotsMapper).
 *
 * {@link TEXT_BODY_KEYS} is what it carries beyond that: placement that belongs
 * to the shape rather than to a slot, and so stays on the object.
 */
export type TextStyleDoc = Omit<TextSlot, "text"> & {
	/** Text content to display; the run form only when part of it is styled on its own (RichText). */
	text?: RichText;
	/**
	 * Box the body's `verticalAlign` is measured against; omitted = `"region"`,
	 * the type's own declared region (see {@link TextVerticalBasis}).
	 */
	textVerticalBasis?: TextVerticalBasis;
};

/**
 * Field names a single-body doc carries beyond the slot's own styling
 * (`TEXT_SLOT_STYLE_KEYS`) and the content. Kept apart from the slot keys
 * because these place the shape's one body against the shape itself and have no
 * meaning inside a slot, so a `text: "slots"` type declares none of them.
 *
 * Tied to the type the same way the style-group constants are, so a field added
 * to the group and not listed here fails to compile.
 */
export const TEXT_BODY_KEYS = exhaustiveKeysOf<
	Omit<TextStyleDoc, keyof TextSlot>
>()(["textVerticalBasis"] as const);
