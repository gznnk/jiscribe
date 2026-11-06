import type { TextSlot } from "@jiscribe/doc";
import { LABEL_TEXT_STYLE_DEFAULTS } from "@jiscribe/doc";

/**
 * Typography of a label a `features.text: "body"` shape sizes from its own text
 * and places outside its box itself — the group markers' beyond their tip, an
 * AWS group's in its band (calcLabelBoxSize). Spread into such a shape's
 * `*_DOC_DEFAULTS`, so a shape created from the toolbar writes the same values
 * into its doc.
 *
 * The caption typography `@jiscribe/doc` declares for a `features.text:
 * "label"` type (LABEL_TEXT_STYLE_DEFAULTS), plus the `verticalAlign` a `"body"`
 * text carries; a `"label"` type spreads that one instead.
 */
export const BELOW_LABEL_STYLE_DEFAULTS = {
	...LABEL_TEXT_STYLE_DEFAULTS,
	verticalAlign: "middle",
} as const satisfies Omit<TextSlot, "text">;
