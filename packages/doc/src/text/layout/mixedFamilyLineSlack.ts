/**
 * Added to a line box drawn in more than one font family, on top of
 * `fontSize × TEXT_LINE_HEIGHT`.
 *
 * A line box is the baseline-aligned union of its inline boxes, and how far one
 * reaches above and below the baseline follows that font's own
 * `ascent - descent`. Two families on one line therefore make the union taller
 * than the single-family formula by `fontSize × Δ(ascent - descent) / 2`, which
 * across the shipped families measures at up to 0.045em — a box short by it
 * clips the descenders, and scrolls the editor that replaces it.
 *
 * The ratio covers that spread; the floor covers the whole pixel the browser
 * rounds the line box up to, which is the larger of the two below 20px or so.
 * Measured in `scratch/2026-08-20-mixed-font-line-box`.
 *
 * @param fontSize - The line's largest type size in local px, the same one the line box is built from
 * @returns The height to add; always positive, so it is only ever asked for on a line that needs it
 */
export const calcMixedFamilyLineSlack = (fontSize: number): number =>
	Math.max(1, fontSize * 0.05);
