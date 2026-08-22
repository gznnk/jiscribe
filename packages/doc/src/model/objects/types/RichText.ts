import { isNumber, isObject, isString } from "@jiscribe/basic-validators";

import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * The typography that may differ *inside* one body of text. Alignment is
 * deliberately absent: it places the whole block, so it stays on the slot
 * (TextSlot), and only what a run of characters can carry on its own lives here.
 */
export type InlineTextStyle = {
	/** Text color (CSS color string) */
	fontColor?: string;
	/** Font size in pixels */
	fontSize?: number;
	/** Font family */
	fontFamily?: string;
	/** Font weight */
	fontWeight?: string;
	/** Font style ("normal" | "italic"; CSS font-style value) */
	fontStyle?: string;
	/**
	 * Text decoration lines: "underline" / "line-through", space-separated when
	 * both apply (canonical order: underline first). "none" or absent means no
	 * decoration.
	 */
	textDecoration?: string;
};

/** Field names of the inline typography, in the order a slot declares them. */
export const TEXT_INLINE_STYLE_KEYS = exhaustiveKeysOf<InlineTextStyle>()([
	"fontColor",
	"fontSize",
	"fontFamily",
	"fontWeight",
	"fontStyle",
	"textDecoration",
] as const);

/**
 * One stretch of characters drawn with the same typography — the piece a body of
 * text is styled in. What the run leaves unset is drawn with the slot's own
 * styling, so a run holds the difference and not the whole style.
 */
export type TextRun = InlineTextStyle & {
	/**
	 * The run's characters. A "\n" in it is an authored newline like any other:
	 * runs partition the text, they do not partition it into lines.
	 */
	text: string;
};

/**
 * One body of text: a plain string when all of it is drawn with the slot's own
 * typography, a list of runs when parts of it are not. Both forms hold the same
 * characters (`richTextToPlain` is the bridge), and the plain string is the
 * canonical form whenever no run carries styling ({@link normalizeRichText}) —
 * so a text nobody styled is stored exactly as it was before runs existed, and
 * an unstyled document never grows an array.
 *
 * Offsets into a rich text are UTF-16 code units, the unit `String.length` and a
 * textarea's `selectionStart` already count in.
 */
export type RichText = string | TextRun[];

/**
 * Structural check of the inline styling fields, shared by the run and the slot
 * guards. Strings are only checked as strings: whether one is a real CSS color
 * and safe to inline is the state layer's boundary check (isValidTextStyleState),
 * which needs browser APIs this layer cannot reach.
 *
 * @param value - The object carrying the fields; each is checked only when present
 * @returns True when every present inline style field has its declared type
 */
export const hasValidInlineTextStyle = (
	value: Record<string, unknown>,
): boolean => {
	if (value.fontColor !== undefined && !isString(value.fontColor)) {
		return false;
	}
	if (value.fontSize !== undefined && !isNumber(value.fontSize)) {
		return false;
	}
	if (value.fontFamily !== undefined && !isString(value.fontFamily)) {
		return false;
	}
	if (value.fontWeight !== undefined && !isString(value.fontWeight)) {
		return false;
	}
	if (value.fontStyle !== undefined && !isString(value.fontStyle)) {
		return false;
	}
	if (value.textDecoration !== undefined && !isString(value.textDecoration)) {
		return false;
	}
	return true;
};

/**
 * Type guard for one run.
 *
 * @param value - Value to check; a bare string is rejected (it is a whole body, not a run)
 * @returns True when `text` is a string and every present style field has its declared type
 */
export const isTextRun = (value: unknown): value is TextRun =>
	isObject(value) && isString(value.text) && hasValidInlineTextStyle(value);

/**
 * Type guard for one body of text.
 *
 * @param value - Value to check; `[]` passes as an empty run list, which is also
 *   how an empty row list reads — the slot's declared content decides which
 *   (TextSlot)
 * @returns True for a string, or for an array whose every entry is a run
 */
export const isRichText = (value: unknown): value is RichText =>
	isString(value) || (Array.isArray(value) && value.every(isTextRun));

/**
 * Whether a body is styled per range, i.e. whether it is drawn as runs rather
 * than as one uniformly styled string. Answers it for any slot content, so it
 * also tells a body apart from a row list (whose entries are strings).
 *
 * @param value - Any slot content; `[]` is not a styled body (normalization never
 *   leaves one, and an empty array is the empty row list)
 * @returns True for a non-empty array of runs
 */
export const isStyledRichText = (value: unknown): value is TextRun[] =>
	Array.isArray(value) && value.length > 0 && value.every(isTextRun);

/** Whether any inline style field is set, i.e. whether the run differs from the slot at all. */
export const hasInlineTextStyle = (style: InlineTextStyle): boolean =>
	TEXT_INLINE_STYLE_KEYS.some((key) => style[key] !== undefined);

/** Whether two runs are drawn identically, and so may be merged into one. */
export const isSameInlineTextStyle = (
	a: InlineTextStyle,
	b: InlineTextStyle,
): boolean => TEXT_INLINE_STYLE_KEYS.every((key) => a[key] === b[key]);

/** Copies the inline fields that are actually set, so a run gains no `undefined`-valued keys. */
export const pickDefinedInlineTextStyle = (
	source: InlineTextStyle,
): InlineTextStyle => {
	const style: Record<string, unknown> = {};
	for (const key of TEXT_INLINE_STYLE_KEYS) {
		const value = source[key];
		if (value !== undefined) {
			style[key] = value;
		}
	}
	return style;
};

/**
 * The characters of a body of text, with the styling dropped: what the plain-text
 * readers (the editor, measurement, search, export) work with.
 *
 * @param rich - The body to flatten
 * @returns The concatenated run texts, or the string itself
 */
export const richTextToPlain = (rich: RichText): string =>
	isString(rich) ? rich : rich.map((run) => run.text).join("");

/**
 * Character count of a body of text, in UTF-16 code units.
 *
 * @param rich - The body to measure; counted without building the flattened string
 */
export const richTextLength = (rich: RichText): number =>
	isString(rich)
		? rich.length
		: rich.reduce((total, run) => total + run.text.length, 0);

/**
 * The run list form, for the interval arithmetic below. An empty text yields no
 * run at all, which is what keeps `[]` and `""` from being two different empties.
 */
const toRuns = (rich: RichText): TextRun[] => {
	if (!isString(rich)) {
		return rich;
	}
	return rich === "" ? [] : [{ text: rich }];
};

/** Runs covering `[start, end)`, each cut to the part inside it; offsets outside the text are ignored. */
const sliceRuns = (runs: TextRun[], start: number, end: number): TextRun[] => {
	const sliced: TextRun[] = [];
	let runStart = 0;
	for (const run of runs) {
		const runEnd = runStart + run.text.length;
		const from = Math.max(start, runStart);
		const to = Math.min(end, runEnd);
		if (from < to) {
			sliced.push({
				...run,
				text: run.text.slice(from - runStart, to - runStart),
			});
		}
		runStart = runEnd;
	}
	return sliced;
};

/**
 * The body with the given fields dropped from every run that overrode them, so a
 * value set on the whole text actually shows: a property set on the shape wins
 * over the ranges it was set on part of the text, rather than leaving them
 * untouched and the shape looking unchanged.
 *
 * @param rich - The body to strip; a plain string has no override to drop
 * @param keys - The fields to drop; the rest of a run's styling stays
 * @returns The stripped body, in canonical form
 */
export const clearInlineStyleFromRuns = (
	rich: RichText,
	keys: readonly (keyof InlineTextStyle)[],
): RichText => {
	if (isString(rich) || keys.length === 0) {
		return rich;
	}
	return normalizeRichText(
		rich.map((run) => {
			const stripped: TextRun = { ...run };
			for (const key of keys) {
				delete stripped[key];
			}
			return stripped;
		}),
	);
};

/**
 * The lines of a body, split at its authored newlines, each keeping the styling
 * of its own characters. The inverse of {@link joinRichTextLines}, and what turns
 * one edited body back into the rows a row-partitioned slot holds.
 *
 * @param rich - The body to split; the newlines themselves are dropped
 * @returns One entry per line, never empty (an empty body is one empty line)
 */
export const splitRichTextLines = (rich: RichText): RichText[] => {
	const plain = richTextToPlain(rich);
	const lines: RichText[] = [];
	let start = 0;
	for (let offset = 0; offset <= plain.length; offset += 1) {
		if (offset === plain.length || plain[offset] === "\n") {
			lines.push(sliceRichText(rich, start, offset));
			start = offset + 1;
		}
	}
	return lines;
};

/**
 * One body from several, joined by newlines: how a row-partitioned slot reads as
 * the single text the editor and the drawing work with.
 *
 * @param lines - The lines to join, in order; an empty list yields ""
 * @returns The joined body, in canonical form
 */
export const joinRichTextLines = (lines: readonly RichText[]): RichText =>
	normalizeRichText(
		lines.flatMap((line, index) =>
			index === 0 ? toRuns(line) : [{ text: "\n" }, ...toRuns(line)],
		),
	);

/**
 * The canonical form of a body of text: empty runs dropped, adjacent runs drawn
 * alike merged, and the whole thing collapsed back to a plain string as soon as
 * nothing is styled. Applied on every write, so one styled text has exactly one
 * representation — which is what keeps doc → state → doc the identity and keeps
 * an unstyled text a plain string forever.
 *
 * @param rich - The body to normalize; already-canonical input is returned as an equal value
 * @returns The canonical form, a plain string whenever no run carries styling
 */
export const normalizeRichText = (rich: RichText): RichText => {
	if (isString(rich)) {
		return rich;
	}
	const merged: TextRun[] = [];
	for (const run of rich) {
		if (run.text === "") {
			continue;
		}
		const previous = merged[merged.length - 1];
		if (previous !== undefined && isSameInlineTextStyle(previous, run)) {
			merged[merged.length - 1] = {
				...previous,
				text: previous.text + run.text,
			};
			continue;
		}
		merged.push({ text: run.text, ...pickDefinedInlineTextStyle(run) });
	}
	if (merged.length === 0) {
		return "";
	}
	// A lone unstyled run is the plain string it came from.
	if (merged.length === 1 && !hasInlineTextStyle(merged[0])) {
		return merged[0].text;
	}
	return merged;
};

/**
 * Whether two bodies are the same text drawn the same way, whichever form each is
 * held in: they are compared in canonical form, so `"ab"` and `[{ text: "ab" }]`
 * are the same body. What an editor drawing a body compares the incoming one
 * against, to tell the echo of its own edit from a change made elsewhere.
 *
 * @param a - One body
 * @param b - The other; the order does not matter
 * @returns True when the canonical forms hold the same characters cut into the
 *   same runs, each with the same inline styling
 */
export const isSameRichText = (a: RichText, b: RichText): boolean => {
	const canonicalA = normalizeRichText(a);
	const canonicalB = normalizeRichText(b);
	if (isString(canonicalA) || isString(canonicalB)) {
		return canonicalA === canonicalB;
	}
	return (
		canonicalA.length === canonicalB.length &&
		canonicalA.every(
			(run, index) =>
				run.text === canonicalB[index].text &&
				isSameInlineTextStyle(run, canonicalB[index]),
		)
	);
};

/**
 * The part of a body of text between two offsets, styling included.
 *
 * @param rich - The body to cut
 * @param start - First offset kept, in UTF-16 code units; clamped to the text
 * @param end - First offset dropped; an `end` at or before `start` yields `""`
 * @returns The cut piece, in canonical form
 */
export const sliceRichText = (
	rich: RichText,
	start: number,
	end: number,
): RichText => normalizeRichText(sliceRuns(toRuns(rich), start, end));

/**
 * Moves an offset off the middle of a surrogate pair, so a cut never leaves a
 * lone half of a character behind. `direction` decides which way it moves: -1 to
 * the pair's start (for a range's start), +1 past its end (for a range's end).
 */
const alignToCharacterBoundary = (
	plain: string,
	offset: number,
	direction: -1 | 1,
): number => {
	const clamped = Math.min(Math.max(offset, 0), plain.length);
	const isSplitPair =
		clamped > 0 &&
		clamped < plain.length &&
		plain.charCodeAt(clamped - 1) >= 0xd800 &&
		plain.charCodeAt(clamped - 1) <= 0xdbff &&
		plain.charCodeAt(clamped) >= 0xdc00 &&
		plain.charCodeAt(clamped) <= 0xdfff;
	return isSplitPair ? clamped + direction : clamped;
};

/**
 * Styles the characters between two offsets, leaving the rest of the text as it
 * is: the operation behind "select a word and make it bold".
 *
 * An omitted field of `style` leaves whatever the covered runs already carry —
 * as with the doc-ops' `setStyle`, there is no way to unset a property back to
 * the slot's own styling through here.
 *
 * @param rich - The body to style
 * @param start - First styled offset, in UTF-16 code units; clamped to the text, and moved off the middle of a surrogate pair
 * @param end - First offset past the styled part; an `end` at or before `start` styles nothing
 * @param style - The fields to override on the covered characters
 * @returns The styled body, in canonical form
 */
export const styleRichTextRange = (
	rich: RichText,
	start: number,
	end: number,
	style: InlineTextStyle,
): RichText => {
	const plain = richTextToPlain(rich);
	const from = alignToCharacterBoundary(plain, start, -1);
	const to = alignToCharacterBoundary(plain, end, 1);
	if (from >= to) {
		return normalizeRichText(rich);
	}
	const runs = toRuns(rich);
	const applied = pickDefinedInlineTextStyle(style);
	return normalizeRichText([
		...sliceRuns(runs, 0, from),
		...sliceRuns(runs, from, to).map((run) => ({ ...run, ...applied })),
		...sliceRuns(runs, to, plain.length),
	]);
};

/**
 * The styling every character of a range shares: a field carries a value only
 * when all of them are drawn with the same one, and is `undefined` when the range
 * mixes two — which is what a format toggle reads to decide whether pressing it
 * turns the styling on or off, and what a "mixed" indicator shows.
 *
 * Each character's value is its run's, falling back to `base`, so a range of
 * unstyled text reads back as the slot's own styling rather than as nothing.
 *
 * @param rich - The body to read
 * @param start - First offset read, in UTF-16 code units; clamped to the text
 * @param end - First offset past the range; an empty range reads the slot's own styling
 * @param base - The slot's styling, which a run that sets no value is drawn with
 * @returns One value per field, or `undefined` for a field the range is not uniform in
 */
export const readRichTextRangeStyle = (
	rich: RichText,
	start: number,
	end: number,
	base: InlineTextStyle,
): InlineTextStyle => {
	const covered = sliceRuns(toRuns(rich), start, end);
	if (covered.length === 0) {
		return pickDefinedInlineTextStyle(base);
	}
	const shared: Record<string, unknown> = {};
	for (const key of TEXT_INLINE_STYLE_KEYS) {
		const first = covered[0][key] ?? base[key];
		const isUniform = covered.every((run) => (run[key] ?? base[key]) === first);
		if (isUniform && first !== undefined) {
			shared[key] = first;
		}
	}
	return shared;
};

/**
 * Carries the styling of an edited text over to its new content. The editing
 * side hands back the whole text as one plain string (an edit reads back as
 * characters, not as runs), so what changed is recovered by matching the unchanged head and
 * tail: everything outside the changed part keeps the styling it had, and the
 * inserted characters take the styling the browser draws them with — an edit
 * that replaced a stretch (select-and-type) continues the styling that stretch
 * began with, a pure insertion the character before it (the behavior of typing
 * at the end of a bold word).
 *
 * This is deliberately a heuristic on the *result*, not a record of the edit:
 * two edits that produce the same string are remapped the same way. It is exact
 * for the ordinary cases (typing, deleting, pasting into one place) and is what
 * every write goes through, so styling cannot drift away from the text.
 *
 * @param previous - The body before the edit, whose styling is carried over
 * @param nextPlain - The whole edited text
 * @returns The edited text with the previous styling on the characters it kept, in canonical form
 */
export const remapRichText = (
	previous: RichText,
	nextPlain: string,
): RichText => {
	// Nothing was styled, so nothing can be carried over.
	if (isString(previous)) {
		return nextPlain;
	}
	const previousPlain = richTextToPlain(previous);
	if (previousPlain === nextPlain) {
		return normalizeRichText(previous);
	}

	const maxCommon = Math.min(previousPlain.length, nextPlain.length);
	let head = 0;
	while (head < maxCommon && previousPlain[head] === nextPlain[head]) {
		head += 1;
	}
	let tail = 0;
	while (
		tail < maxCommon - head &&
		previousPlain[previousPlain.length - 1 - tail] ===
			nextPlain[nextPlain.length - 1 - tail]
	) {
		tail += 1;
	}

	const runs = toRuns(previous);
	const keptHead = sliceRuns(runs, 0, head);
	const keptTail = sliceRuns(
		runs,
		previousPlain.length - tail,
		previousPlain.length,
	);
	const inserted = nextPlain.slice(head, nextPlain.length - tail);
	// Text typed over a selection is drawn by the browser with the styling the
	// replaced stretch began with, so that styling is what carries over — without
	// it, typing over a just-bolded selection would silently commit unstyled (the
	// surface extends the bold span, which the markup check cannot tell apart).
	// A pure insertion continues the run it was typed into; at the very start of
	// the text there is nothing before it, so it takes what follows instead.
	const replacedSource =
		previousPlain.length - head - tail > 0
			? sliceRuns(runs, head, head + 1)[0]
			: undefined;
	const styleSource =
		replacedSource ?? keptHead[keptHead.length - 1] ?? keptTail[0] ?? {};
	return normalizeRichText([
		...keptHead,
		...(inserted === ""
			? []
			: [{ text: inserted, ...pickDefinedInlineTextStyle(styleSource) }]),
		...keptTail,
	]);
};
