/**
 * Whether a stored `fontWeight` is the bold the format toggle turns on. "bold"
 * and "700" are one weight written two ways — the canvas writes the word, an AI
 * copying a design token writes the number — so a slot holding either shows the
 * toggle lit. The middle rungs of the shipped ladder ("500" / "600") are weights
 * of their own: the toggle is bold on and off, not a step up the ladder.
 *
 * @param value - The slot's or run's `fontWeight`; undefined (nothing stored, so
 *   the weight is whatever the type draws with) is not bold
 * @returns True for "bold" and "700" alone
 */
export const isBoldFontWeight = (value: string | undefined): boolean =>
	value === "bold" || value === "700";
