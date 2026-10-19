// Wording and listings the entity tools share, so columns are numbered, quoted and
// summed up the same way in every description and result.

import {
	isRichText,
	richTextToPlain,
	TEXT_SLOT_STYLE_KEYS,
} from "@jiscribe/doc";

import type { ErEntityColumnDoc, ErEntityTextDoc } from "../schema/ErEntityDoc";

/** How columns are numbered, and how a column maps to its connect points. */
export const ER_ENTITY_ADDRESSING_NOTE =
	'Columns are 0-based in the order of the entity\'s "columns" array, top to bottom — the same index its connect points "col:<index>:left" / "col:<index>:right" carry.';

/** What the text tools say of the generic text tools, which an entity's texts are out of reach of. */
export const ER_ENTITY_GENERIC_TOOLS_NOTE =
	"An entity keeps its texts in name and columns rather than in text slots, so set_text, set_texts, set_text_style and set_style do not reach them: these entity tools are the way.";

/**
 * A count of columns in words, singular where it is one.
 *
 * @param count - How many columns
 * @returns e.g. "1 column", "3 columns"
 */
export const formatErEntityColumnCount = (count: number): string =>
	`${count} column${count === 1 ? "" : "s"}`;

/**
 * A run of consecutive columns in words.
 *
 * @param start - The first column, 0-based
 * @param count - How many, at least 1
 * @returns e.g. "column 2", "columns 0-3"
 */
export const formatErEntityColumnSpan = (
	start: number,
	count: number,
): string =>
	count === 1 ? `column ${start}` : `columns ${start}-${start + count - 1}`;

/**
 * The plain characters of one text, in either form.
 *
 * @param text - The text as the doc writes it
 * @returns The characters, runs concatenated
 */
export const readErEntityPlainText = (text: ErEntityTextDoc): string =>
	richTextToPlain(isRichText(text) ? text : text.text);

/**
 * One text as the read listing writes it: its characters, then what it styles in
 * `{}` — the typography it states and whether it is held as styled runs.
 *
 * @param text - The text, or undefined for a key or type the column does not have
 * @param absentLabel - What stands in for an absent text, e.g. "(no key)"
 * @returns e.g. `id {fontWeight=bold}`
 */
export const describeErEntityText = (
	text: ErEntityTextDoc | undefined,
	absentLabel: string,
): string => {
	if (text === undefined) {
		return absentLabel;
	}
	const plainText = readErEntityPlainText(text);
	const styleEntries = isRichText(text)
		? []
		: TEXT_SLOT_STYLE_KEYS.flatMap((field) =>
				text[field] === undefined ? [] : [`${field}=${String(text[field])}`],
			);
	const content = isRichText(text) ? text : text.text;
	const notes = [
		...styleEntries,
		...(typeof content === "string" ? [] : ["styled runs"]),
	];
	return notes.length === 0 ? plainText : `${plainText} {${notes.join(", ")}}`;
};

/**
 * The columns as a write result ends with them, so the model can address them
 * again without reading the entity: each index with its name, its key in `[]`.
 *
 * @param columns - The columns as they stand after the call
 * @returns e.g. "3 columns: 0 id [PK], 1 email, 2 org_id [FK]"; "0 columns" for none
 */
export const formatErEntityColumnSummary = (
	columns: readonly ErEntityColumnDoc[],
): string => {
	const countText = formatErEntityColumnCount(columns.length);
	if (columns.length === 0) {
		return countText;
	}
	const entries = columns.map((column, columnIndex) => {
		const keyText =
			column.key === undefined ? "" : readErEntityPlainText(column.key);
		const keyNote = keyText === "" ? "" : ` [${keyText}]`;
		return `${columnIndex} ${readErEntityPlainText(column.name)}${keyNote}`;
	});
	return `${countText}: ${entries.join(", ")}`;
};
