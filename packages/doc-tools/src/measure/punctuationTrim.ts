/**
 * Half an em: what one collapsed boundary loses. Constant across type size and
 * weight, and independent of the face the marks are drawn from — the trimming is
 * the browser's own, not a font feature, and it happens across the boundary
 * between two `@font-face` subsets as readily as inside one.
 */
const TRIM_EM_PER_BOUNDARY = 0.5;

/** The character carries a collapsible half on its start side. */
const HALF_AT_START = 1 << 0;
/** The character carries a collapsible half on its end side. */
const HALF_AT_END = 1 << 1;
/** The character before it may collapse its end half against this one's start side. */
const ABUTTABLE_AT_START = 1 << 2;
/** The character after it may collapse its start half against this one's end side. */
const ABUTTABLE_AT_END = 1 << 3;

const ABUTTABLE_AT_BOTH_SIDES = ABUTTABLE_AT_START | ABUTTABLE_AT_END;

const roleByCharacter = new Map<string, number>();

const assignRole = (characters: string, role: number): void => {
	for (const character of characters) {
		roleByCharacter.set(character, role);
	}
};

// Fullwidth opening brackets: half of the cell is blank at the start, and either
// side of one is somewhere a neighbour's half may collapse.
assignRole(
	"〈《「『【〔〖〘〚〝（［｛｟",
	HALF_AT_START | ABUTTABLE_AT_BOTH_SIDES,
);
// Fullwidth closing brackets, ideographic comma and full stop: blank at the end instead.
assignRole(
	"、。〉》」』】〕〗〙〛〞〟），．］｝｠",
	HALF_AT_END | ABUTTABLE_AT_BOTH_SIDES,
);
// Fullwidth marks carrying no collapsible half of their own, which a neighbour's half still collapses against.
assignRole("　・", ABUTTABLE_AT_BOTH_SIDES);
// The halfwidth corner brackets carry no half of their own and abut on one side only:
// `｢「` collapses and `。｢` does not, `。｣` collapses and `｣「` does not.
assignRole("｢", ABUTTABLE_AT_END);
assignRole("｣", ABUTTABLE_AT_START);

/**
 * How much of the text's summed advance the browser takes back between adjacent
 * fullwidth punctuation, in ems — Chromium's `text-spacing-trim: normal`, which is
 * on by default and which measuring character by character does not see.
 *
 * A boundary loses half an em when one of its two characters offers a collapsible
 * half there and the other is punctuation that can sit against it; the two halves
 * of a pair such as `」「` overlap rather than both being taken, so a boundary is
 * never charged twice. Nothing is trimmed at the ends of the text: the browser
 * leaves the first and last mark of a measured string full width.
 *
 * The fullwidth colon and semicolon are left out on purpose. Chromium trims `：`
 * against some brackets and not others (`：『` yes, `：「` no) and never trims `；`
 * at all, which no rule over character classes reproduces; leaving both untrimmed
 * is what agrees with the browser on the brackets a document actually uses.
 *
 * The table this encodes was read off Chromium `measureText`, and the fixture
 * beside the tests (`__tests__/fixtures/chromiumTextWidths.json`) is what pins it
 * there.
 *
 * @param text - One line's worth of text; a newline in it would be treated as any other untrimmed character
 * @returns Ems to subtract from the summed advance, 0 for text with no adjacent fullwidth punctuation
 */
export const calcPunctuationTrimEm = (text: string): number => {
	let trimmedBoundaries = 0;
	let previousRole = 0;
	for (const character of text) {
		const role = roleByCharacter.get(character) ?? 0;
		const collapsesAfter =
			(previousRole & HALF_AT_END) !== 0 && (role & ABUTTABLE_AT_START) !== 0;
		const collapsesBefore =
			(role & HALF_AT_START) !== 0 && (previousRole & ABUTTABLE_AT_END) !== 0;
		if (collapsesAfter || collapsesBefore) {
			trimmedBoundaries += 1;
		}
		previousRole = role;
	}
	return trimmedBoundaries * TRIM_EM_PER_BOUNDARY;
};
