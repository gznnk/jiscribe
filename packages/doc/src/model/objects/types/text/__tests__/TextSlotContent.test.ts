import { describe, expect, it } from "vitest";

import type { RichText } from "../RichText";
import { readTextSlotContent, writeTextSlotContent } from "../TextSlot";

describe("readTextSlotContent", () => {
	it("returns one body as it is, runs included", () => {
		const styled: RichText = [{ text: "a\nb", fontWeight: "bold" }];
		expect(readTextSlotContent("a\nb")).toBe("a\nb");
		expect(readTextSlotContent(styled)).toBe(styled);
	});

	it("joins rows with a newline, keeping each row's runs", () => {
		expect(readTextSlotContent(["id", "name"])).toBe("id\nname");
		expect(
			readTextSlotContent(["id", [{ text: "name", fontWeight: "bold" }]]),
		).toEqual([{ text: "id\n" }, { text: "name", fontWeight: "bold" }]);
	});

	it("reads empty rows and an empty body alike as an empty body", () => {
		expect(readTextSlotContent([])).toBe("");
		expect(readTextSlotContent("")).toBe("");
	});
});

describe("writeTextSlotContent", () => {
	it("writes into one body without splitting at newlines", () => {
		expect(writeTextSlotContent("old", "a\nb")).toBe("a\nb");
		expect(
			writeTextSlotContent("old", [{ text: "a\nb", fontWeight: "bold" }]),
		).toEqual([{ text: "a\nb", fontWeight: "bold" }]);
	});

	it("splits into one row per line when the slot holds rows", () => {
		expect(writeTextSlotContent(["old"], "id\nname")).toEqual(["id", "name"]);
		expect(writeTextSlotContent([], "id")).toEqual(["id"]);
		expect(
			writeTextSlotContent(
				["old"],
				[{ text: "id\n" }, { text: "name", fontWeight: "bold" }],
			),
		).toEqual(["id", [{ text: "name", fontWeight: "bold" }]]);
	});

	it("keeps an empty line between rows as an empty row", () => {
		expect(writeTextSlotContent(["old"], "a\n\nb")).toEqual(["a", "", "b"]);
		expect(writeTextSlotContent(["old"], "a\n")).toEqual(["a", ""]);
	});

	it('writes an emptied row slot as [] (not [""]) and an emptied body as ""', () => {
		expect(writeTextSlotContent(["id"], "")).toEqual([]);
		expect(
			writeTextSlotContent(["id"], [{ text: "", fontWeight: "bold" }]),
		).toEqual([]);
		expect(writeTextSlotContent("old", "")).toBe("");
		expect(
			writeTextSlotContent("old", [{ text: "", fontWeight: "bold" }]),
		).toBe("");
	});

	it("stores the body in canonical form", () => {
		expect(writeTextSlotContent("old", [{ text: "a" }, { text: "b" }])).toBe(
			"ab",
		);
		expect(
			writeTextSlotContent(
				["old"],
				[
					{ text: "a", fontWeight: "bold" },
					{ text: "b", fontWeight: "bold" },
				],
			),
		).toEqual([[{ text: "ab", fontWeight: "bold" }]]);
	});

	it("reads only the kind of the previous content", () => {
		const styledBody: RichText = [{ text: "x", fontWeight: "bold" }];
		expect(writeTextSlotContent(styledBody, "y")).toBe("y");
	});

	it("round-trips through readTextSlotContent", () => {
		const rows = ["id", [{ text: "name", fontWeight: "bold" as const }]];
		expect(writeTextSlotContent(rows, readTextSlotContent(rows))).toEqual(rows);
		const body: RichText = [{ text: "a\nb", fontStyle: "italic" }];
		expect(writeTextSlotContent(body, readTextSlotContent(body))).toEqual(body);
	});
});
