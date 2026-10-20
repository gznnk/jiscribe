// The table's tools run the way a host runs them: declared and resolved by
// createCanvasToolSet, their arguments parsed by the declared schema, and applied
// by applyCanvasOp, whose write goes through docOps.replaceObject — so every
// result below has also passed the table's validateDoc and the unknown-key check.

import {
	createCanvasToolSet,
	isAiDocOp,
	toCanvasCapabilities,
	type AiCanvasOpOutcome,
	type CanvasToolArgs,
} from "@jiscribe/ai-tools";
import {
	applyCanvasOp,
	createCanvasOpHistory,
	type AiDocBridge,
} from "@jiscribe/ai-tools/apply";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import {
	createDocOps,
	isRichText,
	richTextToPlain,
	type CanvasDoc,
} from "@jiscribe/doc";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { tableDocPlugin } from "../../doc";
import { TABLE_MIN_COLUMN_WIDTH } from "../../schema/TableDoc";
import type { TableDoc } from "../../schema/TableDoc";
import { tableAiToolPlugin } from "../../tools";

// A replaced object is measured for its bounds, and measuring with nothing offered
// throws (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

const docOps = createDocOps({ plugins: [tableDocPlugin] });
const toolSet = createCanvasToolSet(toCanvasCapabilities([tableDocPlugin]), [
	tableAiToolPlugin,
]);

/**
 * A 3x2 table whose every cell says where it is, with distinct column widths and
 * one styled cell, so a renumbering or a dropped style is visible
 */
const makeTableDoc = (): TableDoc =>
	({
		id: "t1",
		type: "table",
		x: 0,
		y: 0,
		columns: [{ width: 80 }, { width: 120 }],
		rows: [{}, { height: 40 }, {}],
		cells: [
			["r0c0", { text: "r0c1", fill: "#eeeeee" }],
			["r1c0", "r1c1"],
			["r2c0", "r2c1"],
		],
	}) as TableDoc;

/** A document holding the table, and a call that goes the whole way a host's does */
const setUp = () => {
	let doc: CanvasDoc = {
		version: 1,
		root: [makeTableDoc(), { id: "box", type: "rect", x: 300, y: 0 }],
	} as CanvasDoc;
	const bridge: AiDocBridge = {
		getDoc: () => doc,
		replaceDoc: (nextDoc) => {
			doc = nextDoc;
		},
	};
	const history = createCanvasOpHistory();
	const callTool = (name: string, args: CanvasToolArgs): AiCanvasOpOutcome => {
		const descriptor = toolSet.descriptors.find(
			(candidate) => candidate.name === name,
		);
		if (descriptor === undefined) {
			throw new Error(`tool ${name} is not declared`);
		}
		const parsedArgs = z.object(descriptor.inputSchema).strict().parse(args);
		const op = descriptor.toOp(parsedArgs);
		if (!isAiDocOp(op)) {
			throw new Error(`tool ${name} did not build a document op`);
		}
		return applyCanvasOp(op, bridge, history, docOps, toolSet);
	};
	const readTable = (): TableDoc =>
		docOps.getObject(doc, "t1") as Readonly<TableDoc>;
	/** The cells' text alone, `[row][column]` */
	const readTexts = (): string[][] =>
		readTable().cells.map((rowCells) =>
			rowCells.map((cell) =>
				richTextToPlain(isRichText(cell) ? cell : cell.text),
			),
		);
	return {
		callTool,
		readTable,
		readTexts,
		currentDoc: () => doc,
		undo: () =>
			applyCanvasOp({ kind: "undo" }, bridge, history, docOps, toolSet),
	};
};

describe("the table's tool bundle", () => {
	it("declares its eight tools after the built-ins, each taking the target id", () => {
		const tableToolNames = toolSet.descriptors
			.map((descriptor) => descriptor.name)
			.filter((name) => name.startsWith("table_"));

		expect(tableToolNames).toEqual([
			"table_read",
			"table_insert_tracks",
			"table_delete_tracks",
			"table_fill_cells",
			"table_clear_cells",
			"table_set_track_sizes",
			"table_set_cell_style",
			"table_set_text_style",
		]);
	});

	it("refuses an object that is not a table", () => {
		const { callTool } = setUp();

		expect(callTool("table_read", { id: "box" })).toEqual({
			ok: false,
			text: 'table_read acts on table objects only, but "box" is of type rect',
		});
	});
});

describe("table_read", () => {
	it("lists the extent, the track sizes and every cell, a styled one with what it sets", () => {
		const { callTool, currentDoc } = setUp();
		const before = structuredClone(currentDoc());

		const outcome = callTool("table_read", { id: "t1" });

		expect(outcome).toEqual({
			ok: true,
			text: [
				'table "t1": 3 rows (0-2) x 2 columns (0-1)',
				"column widths: 80, 120 px",
				"row heights: auto, 40, auto (px; auto = as tall as the text needs, a number = at least that tall)",
				'row 0: "r0c0" | "r0c1" {fill=#eeeeee}',
				'row 1: "r1c0" | "r1c1"',
				'row 2: "r2c0" | "r2c1"',
			].join("\n"),
		});
		expect(currentDoc()).toEqual(before);
	});
});

describe("table_insert_tracks", () => {
	it("inserts rows before the first, moving every cell down", () => {
		const { callTool, readTexts, readTable } = setUp();

		const outcome = callTool("table_insert_tracks", {
			id: "t1",
			axis: "row",
			at: 0,
			count: 2,
		});

		expect(outcome).toEqual({
			ok: true,
			text: "inserted 2 rows (now rows 0-1, empty); the table is now 5 rows (0-4) x 2 columns (0-1)",
		});
		expect(readTexts()).toEqual([
			["", ""],
			["", ""],
			["r0c0", "r0c1"],
			["r1c0", "r1c1"],
			["r2c0", "r2c1"],
		]);
		expect(readTable().rows).toEqual([{}, {}, {}, { height: 40 }, {}]);
		expect(readTable().cells[2][1]).toEqual({ text: "r0c1", fill: "#eeeeee" });
	});

	it("appends a column after the last, as wide as the last", () => {
		const { callTool, readTexts, readTable } = setUp();

		const outcome = callTool("table_insert_tracks", {
			id: "t1",
			axis: "column",
			at: 2,
		});

		expect(outcome.ok).toBe(true);
		expect(readTexts()[0]).toEqual(["r0c0", "r0c1", ""]);
		expect(readTable().columns).toEqual([
			{ width: 80 },
			{ width: 120 },
			{ width: 120 },
		]);
	});

	it("refuses an insertion point past the end, naming the range it may take", () => {
		const { callTool, readTexts } = setUp();

		expect(
			callTool("table_insert_tracks", { id: "t1", axis: "column", at: 3 }),
		).toEqual({
			ok: false,
			text: "at 3 is past the end: the table has 3 rows (0-2) x 2 columns (0-1), so a column can be inserted at 0 to 2",
		});
		expect(readTexts()[0]).toEqual(["r0c0", "r0c1"]);
	});

	it("is taken back by undo", () => {
		const { callTool, readTable, undo } = setUp();
		const before = structuredClone(readTable());

		callTool("table_insert_tracks", { id: "t1", axis: "row", at: 1 });

		expect(undo().ok).toBe(true);
		expect(readTable()).toEqual(before);
	});
});

describe("table_delete_tracks", () => {
	it("deletes rows in any order, the rest moving up", () => {
		const { callTool, readTexts, readTable } = setUp();

		const outcome = callTool("table_delete_tracks", {
			id: "t1",
			axis: "row",
			indices: [2, 0, 2],
		});

		expect(outcome).toEqual({
			ok: true,
			text: "deleted rows 0, 2; the table is now 1 row (0-0) x 2 columns (0-1)",
		});
		expect(readTexts()).toEqual([["r1c0", "r1c1"]]);
		expect(readTable().rows).toEqual([{ height: 40 }]);
	});

	it("refuses to delete every column", () => {
		const { callTool, readTexts } = setUp();

		const outcome = callTool("table_delete_tracks", {
			id: "t1",
			axis: "column",
			indices: [0, 1],
		});

		expect(outcome.ok).toBe(false);
		expect(outcome.text).toContain("at least one row and one column");
		expect(outcome.text).toContain("delete_objects");
		expect(readTexts()[0]).toEqual(["r0c0", "r0c1"]);
	});

	it("refuses an index the table does not have", () => {
		const { callTool } = setUp();

		expect(
			callTool("table_delete_tracks", {
				id: "t1",
				axis: "row",
				indices: [1, 3],
			}),
		).toEqual({
			ok: false,
			text: "the table has no row 3: it has 3 rows (0-2) x 2 columns (0-1)",
		});
	});
});

describe("table_fill_cells", () => {
	it("writes a block from one cell, keeping a written cell's fill", () => {
		const { callTool, readTexts, readTable } = setUp();

		const outcome = callTool("table_fill_cells", {
			id: "t1",
			row: 0,
			column: 1,
			values: [["A"], ["B"]],
		});

		expect(outcome).toEqual({
			ok: true,
			text: "wrote 2 cells from [0,1] to [1,1]; the table is now 3 rows (0-2) x 2 columns (0-1)",
		});
		expect(readTexts()).toEqual([
			["r0c0", "A"],
			["r1c0", "B"],
			["r2c0", "r2c1"],
		]);
		expect(readTable().cells[0][1]).toEqual({ text: "A", fill: "#eeeeee" });
	});

	it("refuses a block reaching past the table, pointing at grow and table_insert_tracks", () => {
		const { callTool, readTexts } = setUp();

		const outcome = callTool("table_fill_cells", {
			id: "t1",
			row: 2,
			column: 0,
			values: [["x", "y", "z"]],
		});

		expect(outcome).toEqual({
			ok: false,
			text: "the values reach row 2 and column 2, past the table, which has 3 rows (0-2) x 2 columns (0-1); pass grow: true to append what they need, or insert tracks with table_insert_tracks first",
		});
		expect(readTexts()[2]).toEqual(["r2c0", "r2c1"]);
	});

	it("appends the rows and columns a block needs with grow", () => {
		const { callTool, readTexts, readTable } = setUp();

		const outcome = callTool("table_fill_cells", {
			id: "t1",
			row: 2,
			column: 1,
			values: [
				["a", "b"],
				["c", "d"],
			],
			grow: true,
		});

		expect(outcome).toEqual({
			ok: true,
			text: "wrote 4 cells from [2,1] to [3,2], appending 1 row and 1 column; the table is now 4 rows (0-3) x 3 columns (0-2)",
		});
		expect(readTexts()).toEqual([
			["r0c0", "r0c1", ""],
			["r1c0", "r1c1", ""],
			["r2c0", "a", "b"],
			["", "c", "d"],
		]);
		expect(readTable().columns).toEqual([
			{ width: 80 },
			{ width: 120 },
			{ width: 120 },
		]);
	});

	it("refuses a start that would leave a gap even with grow", () => {
		const { callTool } = setUp();

		const outcome = callTool("table_fill_cells", {
			id: "t1",
			row: 4,
			column: 0,
			values: [["x"]],
			grow: true,
		});

		expect(outcome.ok).toBe(false);
		expect(outcome.text).toContain("does not border the table");
	});
});

describe("table_clear_cells", () => {
	it("empties the text of a range and keeps the cells' fill", () => {
		const { callTool, readTexts, readTable } = setUp();

		const outcome = callTool("table_clear_cells", {
			id: "t1",
			row: 0,
			column: 1,
			rowCount: 2,
		});

		expect(outcome).toEqual({
			ok: true,
			text: "emptied 2 cells (rows 0-1 x column 1)",
		});
		expect(readTexts()).toEqual([
			["r0c0", ""],
			["r1c0", ""],
			["r2c0", "r2c1"],
		]);
		expect(readTable().cells[0][1]).toEqual({ text: "", fill: "#eeeeee" });
	});

	it("refuses a range of cells that hold no text, rather than leaving an undo step that does nothing", () => {
		const { callTool } = setUp();
		callTool("table_clear_cells", { id: "t1", row: 0, column: 0 });

		expect(
			callTool("table_clear_cells", { id: "t1", row: 0, column: 0 }),
		).toEqual({
			ok: false,
			text: "cell [0,0] had no text to empty; nothing was changed",
		});
	});

	it("refuses a range running past the table", () => {
		const { callTool } = setUp();

		expect(
			callTool("table_clear_cells", {
				id: "t1",
				row: 1,
				column: 0,
				rowCount: 3,
				columnCount: 2,
			}),
		).toEqual({
			ok: false,
			text: "the range of 3 rows x 2 columns from cell [1,0] runs past the table, which has 3 rows (0-2) x 2 columns (0-1)",
		});
	});
});

describe("table_set_track_sizes", () => {
	it("sets column widths", () => {
		const { callTool, readTable } = setUp();

		const outcome = callTool("table_set_track_sizes", {
			id: "t1",
			axis: "column",
			sizes: [{ index: 1, size: 200 }],
		});

		expect(outcome).toEqual({
			ok: true,
			text: "resized 1 column; column widths are now 80, 200 px",
		});
		expect(readTable().columns).toEqual([{ width: 80 }, { width: 200 }]);
	});

	it("sets a row's floor, and takes one away with auto", () => {
		const { callTool, readTable } = setUp();

		const outcome = callTool("table_set_track_sizes", {
			id: "t1",
			axis: "row",
			sizes: [
				{ index: 0, size: 60 },
				{ index: 1, size: "auto" },
			],
		});

		expect(outcome).toEqual({
			ok: true,
			text: "resized 2 rows; row heights are now 60, auto, auto (px; auto = as tall as the text needs, a number = at least that tall)",
		});
		expect(readTable().rows).toEqual([{ height: 60 }, {}, {}]);
	});

	it("refuses a column narrower than the minimum", () => {
		const { callTool, readTable } = setUp();

		expect(
			callTool("table_set_track_sizes", {
				id: "t1",
				axis: "column",
				sizes: [{ index: 0, size: TABLE_MIN_COLUMN_WIDTH - 1 }],
			}),
		).toEqual({
			ok: false,
			text: `column 0 cannot be ${TABLE_MIN_COLUMN_WIDTH - 1}px: a column is at least ${TABLE_MIN_COLUMN_WIDTH}px`,
		});
		expect(readTable().columns[0]).toEqual({ width: 80 });
	});

	it("refuses auto on a column, and a track named twice", () => {
		const { callTool } = setUp();

		expect(
			callTool("table_set_track_sizes", {
				id: "t1",
				axis: "column",
				sizes: [{ index: 0, size: "auto" }],
			}).text,
		).toContain('a column has no "auto" width');
		expect(
			callTool("table_set_track_sizes", {
				id: "t1",
				axis: "row",
				sizes: [
					{ index: 0, size: 20 },
					{ index: 0, size: 30 },
				],
			}).text,
		).toBe("row 0 is given more than one size");
	});
});

describe("table_set_cell_style", () => {
	it("lays the style over every cell of a range, a design-token weight stored as its word", () => {
		const { callTool, readTable } = setUp();

		const outcome = callTool("table_set_cell_style", {
			id: "t1",
			row: 0,
			column: 0,
			columnCount: 2,
			fill: "#dbeafe",
			fontWeight: "700",
			textAlign: "left",
		});

		expect(outcome).toEqual({
			ok: true,
			text: "set fill, fontWeight, textAlign on 2 cells (row 0 x columns 0-1)",
		});
		expect(readTable().cells[0]).toEqual([
			{ text: "r0c0", fill: "#dbeafe", fontWeight: "bold", textAlign: "left" },
			{ text: "r0c1", fill: "#dbeafe", fontWeight: "bold", textAlign: "left" },
		]);
		expect(readTable().cells[1]).toEqual(["r1c0", "r1c1"]);
	});

	it("refuses a call giving no style", () => {
		const { callTool } = setUp();

		expect(
			callTool("table_set_cell_style", { id: "t1", row: 0, column: 0 }).text,
		).toBe(
			"no style given: pass at least one of fill, fontColor, fontSize, fontFamily, fontWeight, fontStyle, textDecoration, textAlign, verticalAlign",
		);
	});

	it("refuses a fill the table's validateDoc rejects, leaving the document as it was", () => {
		const { callTool, currentDoc } = setUp();
		const before = structuredClone(currentDoc());

		const outcome = callTool("table_set_cell_style", {
			id: "t1",
			row: 1,
			column: 1,
			fill: "red; background: url(x)",
		});

		expect(outcome.ok).toBe(false);
		expect(outcome.text).toContain("must be a safe CSS color value");
		expect(currentDoc()).toEqual(before);
	});
});

describe("table_set_text_style", () => {
	it("decorates the stretch in one cell, a design-token weight stored as its word", () => {
		const { callTool, readTable } = setUp();

		const outcome = callTool("table_set_text_style", {
			id: "t1",
			row: 1,
			column: 1,
			match: "c1",
			fontWeight: "700",
		});

		expect(outcome).toEqual({
			ok: true,
			text: 'set fontWeight on "c1" in cell [1,1]',
		});
		// A cell carrying nothing but its text keeps the short form, runs and all.
		expect(readTable().cells[1][1]).toEqual([
			{ text: "r1" },
			{ text: "c1", fontWeight: "bold" },
		]);
	});

	it("decorates every cell of a range that holds the stretch and leaves the rest", () => {
		const { callTool, readTable } = setUp();

		const outcome = callTool("table_set_text_style", {
			id: "t1",
			row: 0,
			column: 0,
			rowCount: 3,
			columnCount: 2,
			match: "r1",
			fontColor: "#d33",
		});

		expect(outcome).toEqual({
			ok: true,
			text: 'set fontColor on "r1" in 2 of 6 cells (rows 0-2 x columns 0-1): [1,0], [1,1]',
		});
		expect(readTable().cells[0]).toEqual([
			"r0c0",
			{ text: "r0c1", fill: "#eeeeee" },
		]);
		expect(readTable().cells[1][0]).toEqual([
			{ text: "r1", fontColor: "#d33" },
			{ text: "c0" },
		]);
	});

	it("decorates only the occurrence picked, counted within each cell", () => {
		const { callTool, readTable } = setUp();
		callTool("table_fill_cells", {
			id: "t1",
			row: 2,
			column: 0,
			values: [["a-a", "a"]],
		});

		const outcome = callTool("table_set_text_style", {
			id: "t1",
			row: 2,
			column: 0,
			columnCount: 2,
			match: "a",
			occurrence: 2,
			textDecoration: "underline",
		});

		expect(outcome).toEqual({
			ok: true,
			text: 'set textDecoration on occurrence 2 of "a" in 1 of 2 cells (row 2 x columns 0-1): [2,0]',
		});
		expect(readTable().cells[2]).toEqual([
			[{ text: "a-" }, { text: "a", textDecoration: "underline" }],
			"a",
		]);
	});

	it("refuses a range where no cell holds the stretch, or none holds the occurrence", () => {
		const { callTool, currentDoc } = setUp();
		const before = structuredClone(currentDoc());

		expect(
			callTool("table_set_text_style", {
				id: "t1",
				row: 0,
				column: 0,
				columnCount: 2,
				match: "zz",
				fontWeight: "bold",
			}),
		).toEqual({
			ok: false,
			text: 'no cell of 2 cells (row 0 x columns 0-1) contains "zz"',
		});
		expect(
			callTool("table_set_text_style", {
				id: "t1",
				row: 0,
				column: 0,
				match: "c0",
				occurrence: 2,
				fontWeight: "bold",
			}),
		).toEqual({
			ok: false,
			text: 'cell [0,0] contains "c0" 1 time(s), so occurrence 2 does not exist',
		});
		expect(currentDoc()).toEqual(before);
	});

	it("refuses a call giving no style", () => {
		const { callTool } = setUp();

		expect(
			callTool("table_set_text_style", {
				id: "t1",
				row: 0,
				column: 0,
				match: "r0",
			}).text,
		).toBe(
			"no style given: pass at least one of fontColor, fontSize, fontFamily, fontWeight, fontStyle, textDecoration",
		);
	});

	it("names the one cell a single-cell call misses", () => {
		const { callTool } = setUp();

		expect(
			callTool("table_set_text_style", {
				id: "t1",
				row: 0,
				column: 0,
				match: "zz",
				fontWeight: "bold",
			}).text,
		).toBe('cell [0,0] does not contain "zz"');
	});

	it("gives only the count once more cells are decorated than a result lists", () => {
		const { callTool } = setUp();
		callTool("table_fill_cells", {
			id: "t1",
			row: 0,
			column: 0,
			values: Array.from({ length: 7 }, () => ["x", "x", "x"]),
			grow: true,
		});

		expect(
			callTool("table_set_text_style", {
				id: "t1",
				row: 0,
				column: 0,
				rowCount: 7,
				columnCount: 3,
				match: "x",
				fontWeight: "bold",
			}),
		).toEqual({
			ok: true,
			text: 'set fontWeight on "x" in 21 of 21 cells (rows 0-6 x columns 0-2)',
		});
	});

	it("keeps the cell's fill and own style, until a later table_set_cell_style sets the same property on the cell", () => {
		const { callTool, readTable } = setUp();

		callTool("table_set_text_style", {
			id: "t1",
			row: 0,
			column: 1,
			match: "c1",
			fontWeight: "bold",
		});
		expect(readTable().cells[0][1]).toEqual({
			text: [{ text: "r0" }, { text: "c1", fontWeight: "bold" }],
			fill: "#eeeeee",
		});

		callTool("table_set_cell_style", {
			id: "t1",
			row: 0,
			column: 1,
			fontColor: "#ff0000",
		});
		expect(readTable().cells[0][1]).toEqual({
			text: [{ text: "r0" }, { text: "c1", fontWeight: "bold" }],
			fill: "#eeeeee",
			fontColor: "#ff0000",
		});

		callTool("table_set_cell_style", {
			id: "t1",
			row: 0,
			column: 1,
			fontWeight: "normal",
		});
		expect(readTable().cells[0][1]).toEqual({
			text: "r0c1",
			fill: "#eeeeee",
			fontColor: "#ff0000",
			fontWeight: "normal",
		});
		expect(readTable().cells[0][0]).toBe("r0c0");
	});
});
