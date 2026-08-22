import type { RichText } from "../types/RichText";
import type { TextSlot } from "../types/TextSlot";

/**
 * The doc form of a single-body text (features.text: "body"): the content and
 * its styling, flat on the object. The styling fields are `TextSlot`'s own —
 * derived, not copied, so the doc cannot grow a style the slot lacks — and the
 * mappers expand the group into the state's one `body` slot and fold it back on
 * save (TextSlotsMapper).
 */
export type TextStyleDoc = Omit<TextSlot, "text"> & {
	/** Text content to display; the run form only when part of it is styled on its own (RichText). */
	text?: RichText;
};
