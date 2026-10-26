import {
	canonicalizeFontWeight,
	defineObjectAiTool,
	inlineTextStyleSchema,
	textMatchSchema,
} from "@jiscribe/canvas-sdk/tools";
import {
	type InlineTextStyle,
	isRichText,
	styleRichTextMatches,
} from "@jiscribe/doc";

import {
	describeTableCellRange,
	resolveTableCellRange,
} from "./resolveTableCellRange";
import { tableCellRangeSchema } from "./tableToolSchemas";
import { TABLE_ADDRESSING_NOTE } from "./tableToolText";
import { writeTableDocGrid } from "./writeTableDocGrid";
import { readTableDocGrid } from "../grid/readTableDocGrid";
import type { TableDoc } from "../schema/TableDoc";

/** The most decorated cells a result lists by address; past it, only their count is given. */
const MAX_LISTED_CELL_COUNT = 20;

/** The style arguments, named in the refusal of a call that gives none. */
const INLINE_TEXT_STYLE_ARG_NAMES = Object.keys(inlineTextStyleSchema);

/** table_set_text_style: a stretch of characters decorated in every cell of a range that holds it. */
export const tableSetTextStyleTool = defineObjectAiTool({
	name: "table_set_text_style",
	description: [
		"Decorate part of the text in a rectangle of cells — a few words in bold, one term in another color, a phrase struck through — leaving the rest of each cell's text as it was.",
		"For whole cells use table_set_cell_style instead: it sets the background, the alignment and the typography of all of a cell's text. A later table_set_cell_style setting the same property on the cell overrides what you set here.",
		"The stretch is named by the characters themselves (match), never by an offset; occurrence picks which one when a cell holds several, counted within each cell, and omitting it decorates every occurrence.",
		"Only typography a run of characters carries on its own is settable: fontColor, fontSize, fontFamily, fontWeight, fontStyle, textDecoration.",
		"A cell of the range that does not hold match, or holds fewer than occurrence of it, is left as it was; the call fails only when no cell of the range is decorated.",
		TABLE_ADDRESSING_NOTE,
	].join(" "),
	objectType: "table",
	inputSchema: {
		...tableCellRangeSchema,
		...textMatchSchema,
		match: textMatchSchema.match.describe(
			"The characters to decorate, matched literally against each cell's text.",
		),
		...inlineTextStyleSchema,
	},
	apply: (
		table: TableDoc,
		{ row, column, rowCount, columnCount, match, occurrence, ...style },
	) => {
		const inlineStyle: InlineTextStyle = Object.fromEntries(
			Object.entries(style).filter(([, value]) => value !== undefined),
		);
		const styledFields = Object.keys(inlineStyle);
		if (styledFields.length === 0) {
			throw new Error(
				`no style given: pass at least one of ${INLINE_TEXT_STYLE_ARG_NAMES.join(", ")}`,
			);
		}
		if (inlineStyle.fontWeight !== undefined) {
			inlineStyle.fontWeight = canonicalizeFontWeight(inlineStyle.fontWeight);
		}

		const grid = readTableDocGrid(table);
		const range = resolveTableCellRange(grid, {
			row,
			column,
			rowCount,
			columnCount,
		});
		const text = { ...grid.text };
		const decoratedCells: string[] = [];
		let mostOccurrences = 0;
		range.cellIds.forEach((cellId, index) => {
			const cell = text[cellId];
			const styling = styleRichTextMatches(
				isRichText(cell.text) ? cell.text : "",
				{ match, occurrence },
				inlineStyle,
			);
			if (styling.kind === "emptyMatch") {
				throw new Error("match must not be empty");
			}
			if (styling.kind === "notFound") {
				return;
			}
			mostOccurrences = Math.max(mostOccurrences, styling.occurrenceCount);
			if (styling.kind === "styled") {
				text[cellId] = { ...cell, text: styling.styled };
				decoratedCells.push(
					`[${range.row + Math.floor(index / range.columnCount)},${range.column + (index % range.columnCount)}]`,
				);
			}
		});

		const quotedMatch = JSON.stringify(match);
		const rangeText = describeTableCellRange(range);
		const isSingleCell = range.cellIds.length === 1;
		if (mostOccurrences === 0) {
			throw new Error(
				isSingleCell
					? `${rangeText} does not contain ${quotedMatch}`
					: `no cell of ${rangeText} contains ${quotedMatch}`,
			);
		}
		if (decoratedCells.length === 0) {
			throw new Error(
				isSingleCell
					? `${rangeText} contains ${quotedMatch} ${mostOccurrences} time(s), so occurrence ${occurrence} does not exist`
					: `no cell of ${rangeText} contains ${quotedMatch} more than ${mostOccurrences} time(s), so occurrence ${occurrence} does not exist in any of them`,
			);
		}
		const stretchText =
			occurrence === undefined
				? quotedMatch
				: `occurrence ${occurrence} of ${quotedMatch}`;
		const decoratedCellsText =
			decoratedCells.length > MAX_LISTED_CELL_COUNT
				? `${decoratedCells.length} of ${rangeText}`
				: `${decoratedCells.length} of ${rangeText}: ${decoratedCells.join(", ")}`;
		const cellsText = isSingleCell ? rangeText : decoratedCellsText;
		return {
			doc: writeTableDocGrid(table, { ...grid, text }),
			text: `set ${styledFields.join(", ")} on ${stretchText} in ${cellsText}`,
		};
	},
});
