import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";

/**
 * Breathing room a derived height leaves above and below its text, as a multiple
 * of the body's font size, for a type that declares none of its own
 * (`ObjectDocDefinition.autoHeightPaddingEm`, read through
 * {@link resolveAutoHeightPaddingEm}). It sits outside the text box's own
 * TEXT_BOX_PADDING_Y, which exists only so the drawn box does not clip the
 * first and last line and is far too tight to read as a label's margin.
 *
 * 0.75 is where the shape-label rule the diagrams were drawn to lands: a stated
 * height was to carry 24–44px of padding top and bottom together, and 0.75em on
 * each side is exactly 24px at the 16px body — the floor of that band, since a
 * derived height is the smallest one a shape is drawn at rather than a chosen
 * one. Charging it in em rather than px keeps the same density at every type
 * size: 19.5px at 13px, 48px at 32px.
 *
 * Only a shape that derives its height takes it. Block text (`text`) sizes its
 * box to the paragraph itself, where a margin would be wrong, and it stores no
 * height to derive (`supportsAutoHeight`), so it never reaches here.
 */
export const AUTO_HEIGHT_COMFORT_PADDING_EM = 0.75;

/**
 * The room a type's derived height leaves above and below its text, in ems of
 * the body's font size: its own `autoHeightPaddingEm`, or
 * {@link AUTO_HEIGHT_COMFORT_PADDING_EM} where it declares none. Every reader of
 * the value — the canvas's content resizer, the doc ops and `diagnoseDoc` —
 * goes through here, so a type is derived alike everywhere.
 *
 * @param definition - The type's doc definition, or anything carrying its `autoHeightPaddingEm`
 * @returns The declared value when it is a finite number at or above 0 (0 itself included), and the default for an absent one. A value outside that range (`NaN`, `Infinity`, a negative number) reads as absent too
 */
export const resolveAutoHeightPaddingEm = (
	definition: Pick<ObjectDocDefinition, "autoHeightPaddingEm">,
): number => {
	const declared = definition.autoHeightPaddingEm;
	return declared !== undefined && Number.isFinite(declared) && declared >= 0
		? declared
		: AUTO_HEIGHT_COMFORT_PADDING_EM;
};
