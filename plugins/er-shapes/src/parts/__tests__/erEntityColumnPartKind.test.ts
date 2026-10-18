import { TEXT_STYLE_INTENT_KINDS } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import {
	erEntityColumnPartId,
	parseErEntityColumnPartId,
} from "../../schema/erEntityColumnIds";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import { ER_ENTITY_COLUMN_PART_DEFINITION } from "../erEntityColumnPartKind";

const state = erEntityToState({
	id: "e-1",
	type: "erEntity",
	x: 0,
	y: 0,
	// With the 29 px key gutter "PK" sets, 220 wide.
	nameWidth: 91,
	typeWidth: 100,
	name: "users",
	columns: [{ name: "email" }, { key: "PK", name: "id" }],
} as ErEntityDoc);

describe("erEntityColumn part ids", () => {
	it("round-trips an index and refuses a slot id", () => {
		expect(parseErEntityColumnPartId(erEntityColumnPartId(12))).toBe(12);
		expect(parseErEntityColumnPartId("col:2:name")).toBeNull();
		expect(parseErEntityColumnPartId("col:-1")).toBeNull();
		expect(parseErEntityColumnPartId(undefined)).toBeNull();
	});
});

describe("ER_ENTITY_COLUMN_PART_DEFINITION", () => {
	it("has the entity's columns and nothing past them", () => {
		expect(ER_ENTITY_COLUMN_PART_DEFINITION.has(state, "col:1")).toBe(true);
		expect(ER_ENTITY_COLUMN_PART_DEFINITION.has(state, "col:2")).toBe(false);
	});

	it("lists the columns in declared order, which is the order a range runs over", () => {
		expect(ER_ENTITY_COLUMN_PART_DEFINITION.list?.(state)).toEqual([
			"col:0",
			"col:1",
		]);
		expect(ER_ENTITY_COLUMN_PART_DEFINITION.multiPick).toBe(true);
	});

	it("outlines a column on its row, a PK one where it is declared", () => {
		const firstRow = ER_ENTITY_COLUMN_PART_DEFINITION.region?.(state, "col:0");
		const primaryKeyRow = ER_ENTITY_COLUMN_PART_DEFINITION.region?.(
			state,
			"col:1",
		);
		expect(primaryKeyRow?.width).toBe(220);
		expect(primaryKeyRow!.y).toBe(firstRow!.y + firstRow!.height);
	});

	it("removes the picked column on delete, the last one included", () => {
		const removed = ER_ENTITY_COLUMN_PART_DEFINITION.delete?.(state, ["col:0"]);
		expect(removed?.text["col:0:name"].text).toBe("id");
		const emptied = ER_ENTITY_COLUMN_PART_DEFINITION.delete?.(removed!, [
			"col:0",
		]);
		expect(Object.keys(emptied!.text)).toEqual(["name"]);
	});

	it("sends a text style to the picked column's three slots", () => {
		expect(
			ER_ENTITY_COLUMN_PART_DEFINITION.textSlotIds?.(state, ["col:1"]),
		).toEqual(["col:1:key", "col:1:name", "col:1:type"]);
	});

	it("receives what a slot pick does, leaving the entity's fill and border out", () => {
		expect(
			[...(ER_ENTITY_COLUMN_PART_DEFINITION.styleIntentKinds ?? [])].sort(),
		).toEqual([...TEXT_STYLE_INTENT_KINDS].sort());
	});
});
