/** The font a measurement is taken with; the three values a CSS `font` shorthand needs. */
export type TextMeasureFont = {
	/** Type size in local pixels (the same unit the drawn box is measured in). */
	fontSize: number;
	/** Concrete font string (a theme's resolved family, not `inherit`). */
	fontFamily: string;
	/** CSS font-weight keyword or numeric string ("normal" / "bold" / "600"). */
	fontWeight: string;
};

/**
 * Width one character is assumed to take, as a fraction of the font size, when
 * no canvas is available (non-browser test environments). Rough on purpose: the
 * wrapping it produces is proportional, not faithful.
 */
const FALLBACK_CHAR_WIDTH_RATIO = 0.6;

/**
 * Characters a line may break between without a space, matching the CSS default
 * for CJK. Kinsoku (no break before a closing bracket or a full stop) is not
 * applied, so a line ending in such a character can be counted as breaking one
 * character earlier than a browser lays it out.
 */
const CJK_BREAKABLE_PATTERN = /[⺀-〿ぁ-㏿㐀-䶿一-鿿가-힣豈-﫿︰-﹏＀-｠￠-￦]/;

/** Characters that are horizontal whitespace inside a line (a newline never reaches here). */
const isSpaceCharacter = (char: string): boolean =>
	char === " " || char === "\t";

// Offscreen canvas dedicated to measurement (measures width without triggering DOM layout).
let measureCanvas: HTMLCanvasElement | null = null;

const getMeasureContext = (): CanvasRenderingContext2D | null => {
	if (typeof document === "undefined") {
		return null;
	}
	if (!measureCanvas) {
		measureCanvas = document.createElement("canvas");
	}
	return measureCanvas.getContext("2d");
};

/** Measures single strings under one font; created once per wrapping pass so `ctx.font` is set once. */
type TextWidthMeasurer = (text: string) => number;

const createTextWidthMeasurer = (font: TextMeasureFont): TextWidthMeasurer => {
	const ctx = getMeasureContext();
	if (!ctx) {
		// When measurement is unavailable (non-browser environment), fall back to a rough estimate from character count.
		return (text) => text.length * font.fontSize * FALLBACK_CHAR_WIDTH_RATIO;
	}
	ctx.font = `${font.fontWeight} ${font.fontSize}px ${font.fontFamily}`;
	return (text) => ctx.measureText(text).width;
};

/**
 * Rendered width of a single line, in the same local pixels as `fontSize`.
 * Measured on an offscreen canvas, so it can run every frame without triggering
 * DOM layout.
 *
 * @param text - One line; an embedded newline is measured as an ordinary character rather than starting a new line
 * @param font - Font the text is drawn with; a family other than the drawn one skews the result
 * @returns The width, or a `characters × fontSize × 0.6` estimate outside a browser
 */
export const measureTextWidth = (text: string, font: TextMeasureFont): number =>
	createTextWidthMeasurer(font)(text);

/**
 * The smallest pieces a line may not be broken inside: a run of non-space
 * characters with its trailing spaces attached (a break is allowed after them),
 * or a single CJK character.
 */
const splitIntoWrapUnits = (line: string): string[] => {
	const units: string[] = [];
	let unit = "";
	const flush = (): void => {
		if (unit !== "") {
			units.push(unit);
			unit = "";
		}
	};

	for (const char of line) {
		if (isSpaceCharacter(char)) {
			unit += char;
			continue;
		}
		if (CJK_BREAKABLE_PATTERN.test(char)) {
			flush();
			units.push(char);
			continue;
		}
		// The spaces that ended the previous unit are also where it may break.
		if (isSpaceCharacter(unit.slice(-1))) {
			flush();
		}
		unit += char;
	}
	flush();

	return units;
};

/**
 * Counts the lines one logical line occupies: units are packed greedily, and a
 * unit too long for an empty line is split between characters (break-word).
 */
const countWrappedLines = (
	line: string,
	availableWidth: number,
	measureWidth: TextWidthMeasurer,
): number => {
	let lineCount = 1;
	let filledWidth = 0;

	const placeCharacters = (unit: string): void => {
		for (const char of unit) {
			const charWidth = measureWidth(char);
			if (
				!isSpaceCharacter(char) &&
				filledWidth > 0 &&
				filledWidth + charWidth > availableWidth
			) {
				lineCount += 1;
				filledWidth = 0;
			}
			filledWidth += charWidth;
		}
	};

	for (const unit of splitIntoWrapUnits(line)) {
		const unitWidth = measureWidth(unit);
		// Trailing spaces hang past the edge under pre-wrap, so they never decide a break.
		const breakWidth = measureWidth(unit.trimEnd());
		if (filledWidth + breakWidth <= availableWidth) {
			filledWidth += unitWidth;
			continue;
		}
		if (filledWidth > 0) {
			lineCount += 1;
			filledWidth = 0;
			if (breakWidth <= availableWidth) {
				filledWidth = unitWidth;
				continue;
			}
		}
		placeCharacters(unit);
	}

	return lineCount;
};

/**
 * Number of lines the text occupies once wrapped into a box of the given width,
 * counting authored newlines and automatic wrapping alike. Simulates the
 * `white-space: pre-wrap; word-break: break-word` the text boxes are drawn with
 * (TextOverlayFrameStyled / ConnectorLabelStyled 参照): lines break at spaces, a
 * word longer than the line breaks between characters, and CJK breaks between
 * characters. Multiply by `fontSize × line-height` for a box height that does
 * not clip the text.
 *
 * Measurement runs on an offscreen canvas, so this can be called every frame;
 * the count matches the drawing only while the drawn font matches `font`.
 *
 * @param text - The whole text, authored newlines included; an empty string counts as one line, as does each empty line
 * @param font - Font the text is drawn with; a family other than the drawn one moves where lines break
 * @param availableWidth - Content width the text wraps in (box width minus its horizontal padding and border), in local pixels; anything below 1 is treated as 1
 * @returns The line count, always at least 1. Outside a browser the widths are estimated (see measureTextWidth), so the count is proportional rather than faithful
 */
export const calcVisualLineCount = (
	text: string,
	font: TextMeasureFont,
	availableWidth: number,
): number => {
	const measureWidth = createTextWidthMeasurer(font);
	const wrapWidth = Math.max(1, availableWidth);
	return text
		.split("\n")
		.reduce(
			(count, line) => count + countWrappedLines(line, wrapWidth, measureWidth),
			0,
		);
};
