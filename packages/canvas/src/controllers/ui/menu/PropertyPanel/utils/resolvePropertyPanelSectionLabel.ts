import type { CanvasMessages } from "../../../../messages/CanvasMessagesTypes";
import type { LocaleMessages } from "../../../../messages/resolveLocaleMessages";
import { resolveLocalizedLabel } from "../../../../messages/resolveLocaleMessages";

/**
 * Readers rather than key names: not every CanvasMessages entry is a string.
 * Keyed by the section ids `createDefaultPropertyPanel` produces plus the two
 * the panel adds itself (canvas / arrange), which is what makes the core
 * headings translatable and host-overridable while a plugin section's own label
 * is left alone.
 */
const CORE_SECTION_LABEL_READERS: Record<
	string,
	(messages: CanvasMessages) => string
> = {
	canvas: (messages) => messages.propertyPanelSectionCanvas,
	layout: (messages) => messages.propertyPanelSectionLayout,
	fill: (messages) => messages.propertyPanelSectionFill,
	line: (messages) => messages.propertyPanelSectionLine,
	stroke: (messages) => messages.propertyPanelSectionStroke,
	arrow: (messages) => messages.propertyPanelSectionArrow,
	text: (messages) => messages.propertyPanelSectionText,
	arrange: (messages) => messages.propertyPanelSectionArrange,
};

/**
 * Heading of one sidebar accordion: the core section's own message when the id
 * names one, then the label the section declaration carries, resolved for
 * `locale`.
 *
 * @param sectionId - The section's id; the eight core ids resolve through CanvasMessages, anything else falls through to `label`
 * @param label - The label the declaration carries: a plain string is locale-agnostic, a dictionary is resolved for `locale`
 * @param messages - The active message set, host overrides already applied
 * @param locale - BCP 47 tag the dictionary form is resolved against (exact tag, then language subtag, then `en`)
 * @returns The heading to draw; never empty for a core section
 */
export const resolvePropertyPanelSectionLabel = (
	sectionId: string,
	label: string | LocaleMessages<string>,
	messages: CanvasMessages,
	locale: string,
): string =>
	CORE_SECTION_LABEL_READERS[sectionId]?.(messages) ??
	resolveLocalizedLabel(label, locale);
