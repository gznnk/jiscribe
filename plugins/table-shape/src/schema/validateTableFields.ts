import {
	isArray,
	isCssSafeValue,
	isNumber,
	isObject,
} from "@jiscribe/basic-validators";
import type { ObjectDocValidateFn } from "@jiscribe/canvas-sdk/doc";
import {
	validateRichTextContent,
	validateTextSlotStyleFields,
} from "@jiscribe/canvas-sdk/doc";
import type { SemanticDiagnostic } from "@jiscribe/doc";
import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";

import { TABLE_MIN_COLUMN_WIDTH, TABLE_MIN_ROW_HEIGHT } from "./TableDoc";

/** The grid's extent, as far as the columns and rows could be read. */
type GridExtent = {
	/** Rows counted, or undefined when `rows` is not a usable array. */
	rowCount: number | undefined;
	/** Columns counted, or undefined when `columns` is not a usable array. */
	columnCount: number | undefined;
};

/** Validates one column: the width nothing else derives. */
const validateColumn = (value: unknown, path: string): SemanticDiagnostic[] => {
	if (!isObject(value)) {
		return [
			{
				path,
				message: 'must be an object with a "width"',
				severity: "error",
			},
		];
	}
	if (!isNumber(value.width)) {
		return [
			{ path: `${path}.width`, message: "must be a number", severity: "error" },
		];
	}
	if (value.width < TABLE_MIN_COLUMN_WIDTH) {
		return [
			{
				path: `${path}.width`,
				message: `must be >= ${TABLE_MIN_COLUMN_WIDTH}`,
				severity: "error",
			},
		];
	}
	return [];
};

/** Validates one row: nothing, or the lower bound on how tall it is drawn. */
const validateRow = (value: unknown, path: string): SemanticDiagnostic[] => {
	if (!isObject(value)) {
		return [
			{
				path,
				message: 'must be an object, with an optional "height"',
				severity: "error",
			},
		];
	}
	if (value.height === undefined) {
		return [];
	}
	if (!isNumber(value.height)) {
		return [
			{
				path: `${path}.height`,
				message: "must be a number",
				severity: "error",
			},
		];
	}
	if (value.height < TABLE_MIN_ROW_HEIGHT) {
		return [
			{
				path: `${path}.height`,
				message: `must be >= ${TABLE_MIN_ROW_HEIGHT}`,
				severity: "error",
			},
		];
	}
	return [];
};

/**
 * Validates one axis of the grid. An empty list is refused along with a missing
 * one: a table with no column, or no row, has no cell to hold text in and draws
 * as a bare stroke.
 */
const validateAxis = (
	value: unknown,
	path: string,
	entryLabel: "column" | "row",
	validateEntry: (entry: unknown, entryPath: string) => SemanticDiagnostic[],
): { errors: SemanticDiagnostic[]; count: number | undefined } => {
	if (!isArray(value)) {
		return {
			errors: [
				{
					path,
					message: `must be an array of ${entryLabel}s`,
					severity: "error",
				},
			],
			count: undefined,
		};
	}
	if (value.length === 0) {
		return {
			errors: [
				{
					path,
					message: `must hold at least one ${entryLabel}`,
					severity: "error",
				},
			],
			count: undefined,
		};
	}
	return {
		errors: value.flatMap((entry, index) =>
			validateEntry(entry, `${path}[${index}]`),
		),
		count: value.length,
	};
};

/**
 * Validates one cell, in either of the two forms a document may write: the whole
 * object, or the text alone when nothing about the cell is styled.
 */
const validateCell = (value: unknown, path: string): SemanticDiagnostic[] => {
	if (!isObject(value)) {
		return validateRichTextContent(value, path);
	}
	return [
		...validateRichTextContent(value.text, `${path}.text`),
		// Held to the same check as every other color the document names: the cell
		// background is inlined into a CSS declaration, so a value able to close
		// that declaration would write the rest of the rule (see the container's
		// headerFill, the other plugin-declared color).
		...(value.fill === undefined || isCssSafeValue(value.fill)
			? []
			: [
					{
						path: `${path}.fill`,
						message: "must be a safe CSS color value",
						severity: "error" as const,
						beyondSchema: true as const,
					},
				]),
		...validateTextSlotStyleFields(value, path),
	];
};

/**
 * Validates the cell grid: one array per row, one entry per column, and the
 * counts exactly those the two axes state. A grid that does not match is refused
 * rather than padded or trimmed — either repair would move text into a cell the
 * author did not write it in, and the mapper keys the cells off the axes, so a
 * short row would silently lose its tail on the next save.
 */
const validateCells = (
	value: unknown,
	path: string,
	{ rowCount, columnCount }: GridExtent,
): SemanticDiagnostic[] => {
	if (!isArray(value)) {
		return [
			{ path, message: "must be an array of rows of cells", severity: "error" },
		];
	}
	if (rowCount !== undefined && value.length !== rowCount) {
		return [
			{
				path,
				message: `must hold exactly one row per entry of "rows": ${rowCount}, not ${value.length}`,
				severity: "error",
				// A count taken from a sibling field is a cross-field invariant, which
				// a JSON schema cannot express.
				beyondSchema: true,
			},
		];
	}
	return value.flatMap((row, rowIndex) => {
		const rowPath = `${path}[${rowIndex}]`;
		if (!isArray(row)) {
			return [
				{
					path: rowPath,
					message: "must be an array of cells",
					severity: "error" as const,
				},
			];
		}
		if (columnCount !== undefined && row.length !== columnCount) {
			return [
				{
					path: rowPath,
					message: `must hold exactly one cell per entry of "columns": ${columnCount}, not ${row.length}`,
					severity: "error" as const,
					beyondSchema: true,
				},
			];
		}
		return row.flatMap((cell, columnIndex) =>
			validateCell(cell, `${rowPath}[${columnIndex}]`),
		);
	});
};

/**
 * Reports text styling written at the root. A table styles each cell on its own,
 * so a shape-wide value would be silently dropped by the mapper (see the record's
 * counterpart, which raises the parser's unknown-key warning to an error for the
 * same reason).
 */
const validateNoRootTextStyle: ObjectDocValidateFn = (o, path) =>
	TEXT_SLOT_STYLE_KEYS.filter((key) => key in o).map((key) => ({
		path: `${path}.${key}`,
		message: 'is not a field of a table: set it on a cell of "cells" instead',
		severity: "error" as const,
	}));

/**
 * Validates what a table declares on top of the Frame family: the two axes of the
 * grid, the cells filling it, and the absence of the shape-wide text styling a
 * single-body type would take.
 *
 * Passed as the `extra` of `createFrameDocValidator(TableFeatures, …)`, which is
 * what checks the position, the transform and the stroke; nothing here repeats
 * those.
 *
 * @param o - The object being validated, straight from the document
 * @param path - Diagnostic path of `o` (`root[2]`), which every field name and
 *   grid index below is appended to
 * @returns One diagnostic per malformed field; empty for a valid table
 */
export const validateTableFields: ObjectDocValidateFn = (o, path) => {
	const columns = validateAxis(
		o.columns,
		`${path}.columns`,
		"column",
		validateColumn,
	);
	const rows = validateAxis(o.rows, `${path}.rows`, "row", validateRow);
	return [
		...columns.errors,
		...rows.errors,
		...validateCells(o.cells, `${path}.cells`, {
			rowCount: rows.count,
			columnCount: columns.count,
		}),
		...validateNoRootTextStyle(o, path),
	];
};
