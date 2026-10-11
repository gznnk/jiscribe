import { describe, it, expect } from "vitest";

import { TABLE_MIN_COLUMN_WIDTH } from "../TableDoc";
import { validateTableFields } from "../validateTableFields";

const baseTable = {
	id: "t-1",
	type: "table",
	x: 100,
	y: 100,
	columns: [{ width: 110 }, { width: 90 }],
	rows: [{ height: 36 }, {}],
	cells: [
		["項目", "担当"],
		[{ text: "設計", textAlign: "left" }, "中川"],
	],
};

const validate = (table: Record<string, unknown>) =>
	validateTableFields(table, "root[0]");

describe("validateTableFields", () => {
	it("accepts a grid written in both cell forms", () => {
		expect(validate(baseTable)).toEqual([]);
	});

	it("accepts a cell written as runs, and one carrying a fill", () => {
		expect(
			validate({
				...baseTable,
				cells: [
					[[{ text: "項", fontWeight: "bold" }, { text: "目" }], "担当"],
					[{ text: "設計", fill: "#ffeeaa" }, ""],
				],
			}),
		).toEqual([]);
	});

	describe("the two axes", () => {
		it("rejects a missing or empty columns", () => {
			expect(validate({ ...baseTable, columns: undefined })).toEqual([
				{
					path: "root[0].columns",
					message: "must be an array of columns",
					severity: "error",
				},
			]);
			expect(validate({ ...baseTable, columns: [], cells: [[], []] })).toEqual([
				{
					path: "root[0].columns",
					message: "must hold at least one column",
					severity: "error",
				},
			]);
		});

		it("rejects a missing or empty rows", () => {
			expect(validate({ ...baseTable, rows: undefined })).toEqual([
				{
					path: "root[0].rows",
					message: "must be an array of rows",
					severity: "error",
				},
			]);
			expect(validate({ ...baseTable, rows: [], cells: [] })).toEqual([
				{
					path: "root[0].rows",
					message: "must hold at least one row",
					severity: "error",
				},
			]);
		});

		it("rejects a column without a numeric width", () => {
			expect(validate({ ...baseTable, columns: [{ width: 110 }, {}] })).toEqual(
				[
					{
						path: "root[0].columns[1].width",
						message: "must be a number",
						severity: "error",
					},
				],
			);
		});

		it("rejects a column narrower than a cell can wrap text in", () => {
			expect(
				validate({
					...baseTable,
					columns: [{ width: TABLE_MIN_COLUMN_WIDTH - 1 }, { width: 90 }],
				}),
			).toEqual([
				{
					path: "root[0].columns[0].width",
					message: `must be >= ${TABLE_MIN_COLUMN_WIDTH}`,
					severity: "error",
				},
			]);
			expect(
				validate({
					...baseTable,
					columns: [{ width: TABLE_MIN_COLUMN_WIDTH }, { width: 90 }],
				}),
			).toEqual([]);
		});

		it("accepts a row with no height and rejects a negative one", () => {
			expect(validate({ ...baseTable, rows: [{}, {}] })).toEqual([]);
			expect(validate({ ...baseTable, rows: [{ height: -1 }, {}] })).toEqual([
				{
					path: "root[0].rows[0].height",
					message: "must be >= 0",
					severity: "error",
				},
			]);
		});
	});

	describe("the cell grid", () => {
		it("rejects a row count that does not match rows", () => {
			expect(validate({ ...baseTable, cells: [["項目", "担当"]] })).toEqual([
				{
					path: "root[0].cells",
					message: 'must hold exactly one row per entry of "rows": 2, not 1',
					severity: "error",
					beyondSchema: true,
				},
			]);
		});

		it("rejects a cell count that does not match columns", () => {
			expect(
				validate({
					...baseTable,
					cells: [
						["項目", "担当"],
						["設計", "中川", "余り"],
					],
				}),
			).toEqual([
				{
					path: "root[0].cells[1]",
					message:
						'must hold exactly one cell per entry of "columns": 2, not 3',
					severity: "error",
					beyondSchema: true,
				},
			]);
		});

		it("rejects cells that are not a grid at all", () => {
			expect(validate({ ...baseTable, cells: "項目" })).toEqual([
				{
					path: "root[0].cells",
					message: "must be an array of rows of cells",
					severity: "error",
				},
			]);
			expect(
				validate({ ...baseTable, cells: [["項目", "担当"], "設計"] }),
			).toEqual([
				{
					path: "root[0].cells[1]",
					message: "must be an array of cells",
					severity: "error",
				},
			]);
		});

		it("names the cell a malformed value sits in", () => {
			expect(
				validate({
					...baseTable,
					cells: [
						["項目", "担当"],
						["設計", 42],
					],
				}),
			).toEqual([
				{
					path: "root[0].cells[1][1]",
					message: "must be a string, or an array of runs to style parts of it",
					severity: "error",
				},
			]);
		});

		it("rejects a cell object whose text is not one body", () => {
			expect(
				validate({
					...baseTable,
					cells: [
						["項目", "担当"],
						[{ text: ["設計", "実装"] }, "中川"],
					],
				}),
			).toEqual([
				{
					path: "root[0].cells[1][0].text[0]",
					message: "must be an object with a text field",
					severity: "error",
				},
				{
					path: "root[0].cells[1][0].text[1]",
					message: "must be an object with a text field",
					severity: "error",
				},
			]);
		});

		it("rejects a fill that is not a color at all", () => {
			expect(
				validate({
					...baseTable,
					cells: [
						["項目", "担当"],
						[{ text: "設計", fill: 16711680 }, "中川"],
					],
				}),
			).toEqual([
				{
					path: "root[0].cells[1][0].fill",
					message: "must be a safe CSS color value",
					severity: "error",
					beyondSchema: true,
				},
			]);
		});

		it("rejects a fill that could close its CSS declaration", () => {
			expect(
				validate({
					...baseTable,
					cells: [
						["項目", "担当"],
						[{ text: "設計", fill: "red; position: fixed" }, "中川"],
					],
				}),
			).toEqual([
				{
					path: "root[0].cells[1][0].fill",
					message: "must be a safe CSS color value",
					severity: "error",
					beyondSchema: true,
				},
			]);
		});

		it("validates a cell's own typography", () => {
			expect(
				validate({
					...baseTable,
					cells: [
						["項目", "担当"],
						[{ text: "設計", textAlign: "middle" }, "中川"],
					],
				}),
			).toEqual([
				{
					path: "root[0].cells[1][0].textAlign",
					message: "must be one of: left, center, right",
					severity: "error",
				},
			]);
		});

		it("checks every cell rather than stopping at the first", () => {
			expect(
				validate({
					...baseTable,
					cells: [
						[42, "担当"],
						["設計", 43],
					],
				}).map((diagnostic) => diagnostic.path),
			).toEqual(["root[0].cells[0][0]", "root[0].cells[1][1]"]);
		});
	});

	describe("root text styling", () => {
		it("rejects typography written on the table itself", () => {
			expect(
				validate({ ...baseTable, fontSize: 18, textAlign: "left" }),
			).toEqual([
				{
					path: "root[0].textAlign",
					message:
						'is not a field of a table: set it on a cell of "cells" instead',
					severity: "error",
				},
				{
					path: "root[0].fontSize",
					message:
						'is not a field of a table: set it on a cell of "cells" instead',
					severity: "error",
				},
			]);
		});
	});

	it("does not compare the grid against an axis it could not read", () => {
		// A broken `columns` would otherwise make every row report a count mismatch
		// on top of the one real error.
		expect(
			validate({ ...baseTable, columns: "110,90" }).map(
				(diagnostic) => diagnostic.path,
			),
		).toEqual(["root[0].columns"]);
	});
});
