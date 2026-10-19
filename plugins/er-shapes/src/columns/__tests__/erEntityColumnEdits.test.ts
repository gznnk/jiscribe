import { describe, expect, it } from "vitest";

import { calcErEntityConnectPoints } from "../../presentation/calcErEntityConnectPoints";
import { erEntityTextSlotIds } from "../../schema/erEntityColumnIds";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToDoc, erEntityToState } from "../../state/ErEntityMapper";
import { insertErEntityColumn } from "../insertErEntityColumn";
import { removeErEntityColumns } from "../removeErEntityColumns";

const makeState = () =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 96,
		typeWidth: 100,
		name: "users",
		columns: [
			{ key: "PK", name: "id", type: "bigint" },
			{ name: "email", type: "text" },
			{ key: "FK", name: "org_id", type: "bigint" },
		],
	} as ErEntityDoc);

/** The column names, in declared order, as the doc writes them back. */
const columnNamesOf = (state: ReturnType<typeof makeState>): unknown[] =>
	(erEntityToDoc(state) as ErEntityDoc).columns.map((column) => column.name);

describe("insertErEntityColumn", () => {
	it("inserts an empty column and renumbers the slots behind it", () => {
		const state = makeState();
		const inserted = insertErEntityColumn(state, 1);

		expect(columnNamesOf(inserted)).toEqual(["id", "", "email", "org_id"]);
		expect(Object.keys(inserted.text)).toEqual(erEntityTextSlotIds(4));
		expect(inserted.text["col:1:key"].text).toBe("");
		expect(inserted.text["col:1:type"].text).toBe("");
		expect(inserted.text["col:2:type"].text).toBe("text");
		expect(inserted.text["col:3:key"].text).toBe("FK");
		// The new row grows the box downwards from the same drawn top edge.
		expect(inserted.height).toBe(state.height + 25);
		expect(inserted.cy - inserted.height / 2).toBeCloseTo(
			state.cy - state.height / 2,
		);
	});

	it("keeps the connect point ids on the index, so a later column takes over an id", () => {
		const inserted = insertErEntityColumn(makeState(), 0);
		const ids = calcErEntityConnectPoints(inserted).map((point) => point.id);
		expect(ids).toEqual([
			"col:0:left",
			"col:0:right",
			"col:1:left",
			"col:1:right",
			"col:2:left",
			"col:2:right",
			"col:3:left",
			"col:3:right",
		]);
		expect(inserted.text["col:1:name"].text).toBe("id");
	});

	it("appends at the column count, and clamps a position past it", () => {
		expect(columnNamesOf(insertErEntityColumn(makeState(), 3))).toEqual([
			"id",
			"email",
			"org_id",
			"",
		]);
		expect(columnNamesOf(insertErEntityColumn(makeState(), 9))).toEqual([
			"id",
			"email",
			"org_id",
			"",
		]);
	});

	it("leaves the state it was given untouched", () => {
		const state = makeState();
		const textBefore = state.text;
		insertErEntityColumn(state, 0);
		expect(state.text).toBe(textBefore);
		expect(Object.keys(state.text)).toEqual(erEntityTextSlotIds(3));
	});
});

describe("removeErEntityColumns", () => {
	it("removes a column and renumbers the ones behind it", () => {
		const state = makeState();
		const removed = removeErEntityColumns(state, [1]);
		expect(removed).not.toBeNull();
		expect(columnNamesOf(removed!)).toEqual(["id", "org_id"]);
		expect(Object.keys(removed!.text)).toEqual(erEntityTextSlotIds(2));
		expect(removed!.text["col:1:key"].text).toBe("FK");
		expect(removed!.height).toBe(state.height - 25);
	});

	it("removes every column, leaving one empty row's height", () => {
		const removed = removeErEntityColumns(makeState(), [0, 1, 2]);
		expect(removed).not.toBeNull();
		expect(Object.keys(removed!.text)).toEqual(["name"]);
		// The title band and the one empty row.
		expect(removed!.height).toBe(28 + 25);
	});

	it("ignores repeats and indices the entity does not have", () => {
		expect(
			columnNamesOf(removeErEntityColumns(makeState(), [2, 2, 7])!),
		).toEqual(["id", "email"]);
	});

	it("refuses a removal naming no column", () => {
		expect(removeErEntityColumns(makeState(), [3, -1])).toBeNull();
		expect(removeErEntityColumns(makeState(), [])).toBeNull();
	});
});
