import { describe, expect, it } from "vitest";

import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import { collectErEntityTextSlotRange } from "../collectErEntityTextSlotRange";

/** Four columns, so a range can stop short of the last row. */
const ENTITY = erEntityToState({
	id: "e-1",
	type: "erEntity",
	x: 0,
	y: 0,
	name: "users",
	columns: [
		{ key: "PK", name: "id" },
		{ name: "email" },
		{ name: "name" },
		{ name: "created_at" },
	],
} as ErEntityDoc);

describe("collectErEntityTextSlotRange", () => {
	it("takes the rectangle the two corners span, row by row key, name, type", () => {
		expect(
			collectErEntityTextSlotRange(ENTITY, "col:2:type", "col:1:name"),
		).toEqual(["col:1:name", "col:1:type", "col:2:name", "col:2:type"]);
		// Not col:1:type … col:2:key, which the slot order puts between them.
		expect(
			collectErEntityTextSlotRange(ENTITY, "col:1:name", "col:2:key"),
		).toEqual(["col:1:key", "col:1:name", "col:2:key", "col:2:name"]);
	});

	it("keeps a reach down one field to that field", () => {
		expect(
			collectErEntityTextSlotRange(ENTITY, "col:0:name", "col:3:name"),
		).toEqual(["col:0:name", "col:1:name", "col:2:name", "col:3:name"]);
	});

	it("takes one slot for a range from a slot to itself", () => {
		expect(
			collectErEntityTextSlotRange(ENTITY, "col:1:type", "col:1:type"),
		).toEqual(["col:1:type"]);
	});

	it("covers the title and every field down to the other corner's row when the range touches the title", () => {
		const expected = [
			"name",
			"col:0:key",
			"col:0:name",
			"col:0:type",
			"col:1:key",
			"col:1:name",
			"col:1:type",
		];
		expect(collectErEntityTextSlotRange(ENTITY, "name", "col:1:key")).toEqual(
			expected,
		);
		expect(collectErEntityTextSlotRange(ENTITY, "col:1:type", "name")).toEqual(
			expected,
		);
	});

	it("takes the title alone for a range from the title to itself", () => {
		expect(collectErEntityTextSlotRange(ENTITY, "name", "name")).toEqual([
			"name",
		]);
	});

	it("collapses to the focus when either corner is no slot the entity holds", () => {
		expect(
			collectErEntityTextSlotRange(ENTITY, "col:9:name", "col:0:name"),
		).toEqual(["col:0:name"]);
		expect(collectErEntityTextSlotRange(ENTITY, "r0c0", "col:1:type")).toEqual([
			"col:1:type",
		]);
		expect(
			collectErEntityTextSlotRange(ENTITY, "toString", "col:1:type"),
		).toEqual(["col:1:type"]);
		expect(
			collectErEntityTextSlotRange(ENTITY, "col:0:name", "col:4:key"),
		).toEqual(["col:4:key"]);
	});
});
