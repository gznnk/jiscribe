/** One drawn line of text: which characters it holds, and the box they take. */
export type VisualLine = {
	/** First offset of the line in the flattened text, in UTF-16 code units. */
	start: number;
	/** First offset past the line; the newline a break falls on is not part of either side. */
	end: number;
	/** Rendered width in local pixels, trailing spaces included. */
	width: number;
	/**
	 * Line box height: the tallest type size laid out on the line × the shared
	 * line-height, plus the allowance a line in more than one family takes
	 * (calcMixedFamilyLineSlack). "Laid out on" reaches one past `end` where a
	 * newline ends the line, so a run opening there counts.
	 */
	height: number;
};
