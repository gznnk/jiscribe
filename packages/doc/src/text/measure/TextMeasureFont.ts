/** The font a measurement is taken with; the values a CSS `font` shorthand needs. */
export type TextMeasureFont = {
	/** Type size in local pixels (the same unit the drawn box is measured in). */
	fontSize: number;
	/** Concrete font string (a theme's resolved family, not `inherit`). */
	fontFamily: string;
	/** CSS font-weight keyword or numeric string ("normal" / "bold" / "600"). */
	fontWeight: string;
	/** CSS font-style ("normal" / "italic"); omitted measures as "normal". */
	fontStyle?: string;
};
