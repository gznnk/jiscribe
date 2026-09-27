import type { TextSlot } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { describe, expect, it } from "vitest";

import type { TextSlots } from "../TextSlots";
import {
	blankTextSlots,
	getFirstTextSlotId,
	isTextSlots,
	readRichTextSlot,
	readTextSlot,
	resolveTextSlotId,
	writeRichTextSlot,
	writeTextSlot,
} from "../TextSlots";

describe("isTextSlots", () => {
	it("accepts slots with either content kind, including an empty map", () => {
		expect(isTextSlots({})).toBe(true);
		expect(isTextSlots({ body: { text: "" } })).toBe(true);
		expect(
			isTextSlots({ name: { text: "User" }, rows: { text: ["id", "name"] } }),
		).toBe(true);
		expect(isTextSlots({ body: { text: "x", fontSize: 12 } })).toBe(true);
	});

	it("rejects a bare content, a bare string, and a malformed style", () => {
		expect(isTextSlots("hello")).toBe(false);
		expect(isTextSlots(undefined)).toBe(false);
		expect(isTextSlots({ body: "hello" })).toBe(false);
		expect(isTextSlots({ rows: ["id"] })).toBe(false);
		expect(isTextSlots({ body: { text: 1 } })).toBe(false);
		expect(isTextSlots({ body: { text: "x", fontSize: "12" } })).toBe(false);
	});
});

describe("getFirstTextSlotId", () => {
	it("returns the first key in insertion order", () => {
		expect(
			getFirstTextSlotId({ name: { text: "User" }, rows: { text: [] } }),
		).toBe("name");
	});

	it("returns undefined when there is no slot", () => {
		expect(getFirstTextSlotId({})).toBeUndefined();
		expect(getFirstTextSlotId(undefined)).toBeUndefined();
	});
});

describe("resolveTextSlotId", () => {
	const slots = { name: { text: "User" }, rows: { text: ["id"] } };

	it("honors a targetPart that names an actual slot", () => {
		expect(resolveTextSlotId(slots, "rows")).toBe("rows");
	});

	it("falls back to the first slot for an absent or unknown targetPart", () => {
		expect(resolveTextSlotId(slots, undefined)).toBe("name");
		expect(resolveTextSlotId(slots, "bogus")).toBe("name");
	});

	it("does not resolve inherited property names", () => {
		expect(resolveTextSlotId(slots, "toString")).toBe("name");
	});

	it("returns undefined for a shape with no slot", () => {
		expect(resolveTextSlotId(undefined, "body")).toBeUndefined();
	});
});

describe("readTextSlot", () => {
	it("returns a string slot as is and joins a row slot with newlines", () => {
		expect(readTextSlot({ body: { text: "a\nb" } }, "body")).toBe("a\nb");
		expect(readTextSlot({ rows: { text: ["id", "name"] } }, "rows")).toBe(
			"id\nname",
		);
	});

	it("reads an absent slot as an empty string", () => {
		expect(readTextSlot({ body: { text: "x" } }, "rows")).toBe("");
		expect(readTextSlot(undefined, "body")).toBe("");
	});

	it("flattens a slot styled per range to its characters", () => {
		expect(
			readTextSlot(
				{
					body: { text: [{ text: "he" }, { text: "llo", fontWeight: "bold" }] },
				},
				"body",
			),
		).toBe("hello");
	});
});

describe("readRichTextSlot", () => {
	it("keeps the runs a slot is styled in", () => {
		const runs = [{ text: "he" }, { text: "llo", fontWeight: "bold" }];
		expect(readRichTextSlot({ body: { text: runs } }, "body")).toEqual(runs);
	});

	it("joins a row slot with newlines, like the plain reader", () => {
		expect(readRichTextSlot({ rows: { text: ["id", "name"] } }, "rows")).toBe(
			"id\nname",
		);
		expect(readRichTextSlot(undefined, "body")).toBe("");
	});

	it("keeps the styling of a row that carries some", () => {
		expect(
			readRichTextSlot(
				{ rows: { text: ["id", [{ text: "name", fontWeight: "bold" }]] } },
				"rows",
			),
		).toEqual([{ text: "id\n" }, { text: "name", fontWeight: "bold" }]);
	});
});

describe("writeTextSlot", () => {
	it("splits on newlines only for a slot that holds rows", () => {
		expect(
			writeTextSlot({ rows: { text: ["id"] } }, "rows", "id\nname"),
		).toEqual({ rows: { text: ["id", "name"] } });
		expect(writeTextSlot({ body: { text: "" } }, "body", "a\nb")).toEqual({
			body: { text: "a\nb" },
		});
	});

	it("keeps the written slot's styling", () => {
		expect(
			writeTextSlot(
				{ body: { text: "old", fontSize: 24, textAlign: "right" } },
				"body",
				"new",
			),
		).toEqual({ body: { text: "new", fontSize: 24, textAlign: "right" } });
	});

	it("keeps the other slots and the key order", () => {
		const written = writeTextSlot(
			{ name: { text: "User" }, rows: { text: ["id"] } },
			"name",
			"Account",
		);
		expect(written).toEqual({
			name: { text: "Account" },
			rows: { text: ["id"] },
		});
		expect(Object.keys(written)).toEqual(["name", "rows"]);
	});

	it("appends an unstyled slot for a key the shape does not have", () => {
		expect(writeTextSlot({ body: { text: "x" } }, "note", "hi")).toEqual({
			body: { text: "x" },
			note: { text: "hi" },
		});
	});

	it("does not mutate the input", () => {
		const slots = { body: { text: "old" } };
		writeTextSlot(slots, "body", "new");
		expect(slots).toEqual({ body: { text: "old" } });
	});

	it("round-trips through readTextSlot for a row slot", () => {
		const slots = { rows: { text: ["id", "name"] } };
		expect(writeTextSlot(slots, "rows", readTextSlot(slots, "rows"))).toEqual(
			slots,
		);
	});

	it('writes [] (not [""]) when a row slot is emptied', () => {
		expect(writeTextSlot({ rows: { text: ["id"] } }, "rows", "")).toEqual({
			rows: { text: [] },
		});
	});

	it("keeps the per-range styling of the characters the edit left alone", () => {
		expect(
			writeTextSlot(
				{
					body: { text: [{ text: "he" }, { text: "llo", fontWeight: "bold" }] },
				},
				"body",
				"hello!",
			),
		).toEqual({
			body: { text: [{ text: "he" }, { text: "llo!", fontWeight: "bold" }] },
		});
	});

	it("carries a styled row's styling through an edit, row by row", () => {
		expect(
			writeTextSlot(
				{ rows: { text: ["id", [{ text: "name", fontWeight: "bold" }]] } },
				"rows",
				"id\nname: string",
			),
		).toEqual({
			rows: {
				text: ["id", [{ text: "name: string", fontWeight: "bold" }]],
			},
		});
	});

	it("does not split a styled body into rows", () => {
		expect(
			writeTextSlot(
				{ body: { text: [{ text: "a", fontWeight: "bold" }] } },
				"body",
				"a\nb",
			),
		).toEqual({
			body: { text: [{ text: "a\nb", fontWeight: "bold" }] },
		});
	});
});

/**
 * A slot may carry fields of its own type beyond the ones TextSlot names — a table
 * cell carries `fill` — and the shared writes keep them only because each copies
 * the slot with `{ ...slot }` (TextSlots). A write narrowed to TextSlot's own
 * fields would drop a cell's background colour with nothing reporting it, so the
 * contract is pinned here rather than in the type that relies on it.
 */
describe("a slot's type-specific fields survive the shared writes", () => {
	/** A table-like cell: one body of text plus the type's own `fill`. */
	const cell: TextSlot & { fill: string } = { text: "id", fill: "#eef" };
	/** The row-partitioned counterpart, for the write that splits at newlines. */
	const rowCell: TextSlot & { fill: string } = { text: ["id"], fill: "#eef" };

	it("writeRichTextSlot keeps them, runs included", () => {
		const slots: TextSlots = { cell };
		expect(
			writeRichTextSlot(slots, "cell", [{ text: "name", fontWeight: "bold" }]),
		).toEqual({
			cell: { text: [{ text: "name", fontWeight: "bold" }], fill: "#eef" },
		});
	});

	it("writeTextSlot keeps them", () => {
		const slots: TextSlots = { cell };
		expect(writeTextSlot(slots, "cell", "name")).toEqual({
			cell: { text: "name", fill: "#eef" },
		});
	});

	it("writeTextSlot keeps them when the slot is split into rows", () => {
		const slots: TextSlots = { cell: rowCell };
		expect(writeTextSlot(slots, "cell", "id\nname")).toEqual({
			cell: { text: ["id", "name"], fill: "#eef" },
		});
	});

	it("blankTextSlots keeps them", () => {
		const slots: TextSlots = { cell, row: rowCell };
		expect(blankTextSlots(slots)).toEqual({
			cell: { text: "", fill: "#eef" },
			row: { text: [], fill: "#eef" },
		});
	});
});

describe("blankTextSlots", () => {
	it("empties each content while keeping the keys, kinds, and styling", () => {
		expect(
			blankTextSlots({
				name: { text: "User", fontWeight: "bold" },
				rows: { text: ["id"] },
			}),
		).toEqual({
			name: { text: "", fontWeight: "bold" },
			rows: { text: [] },
		});
	});

	it('empties a styled body to "", not to an empty run list', () => {
		expect(
			blankTextSlots({ body: { text: [{ text: "hi", fontWeight: "bold" }] } }),
		).toEqual({ body: { text: "" } });
	});
});
