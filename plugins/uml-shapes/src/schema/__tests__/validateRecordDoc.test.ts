import { describe, it, expect } from "vitest";

import { validateRecordDoc } from "../validateRecordDoc";

const baseDoc = {
	id: "r-1",
	type: "record",
	x: 0,
	y: 0,
	width: 180,
	height: 100,
};

const validate = (doc: Record<string, unknown>) =>
	validateRecordDoc(doc, "root[0]");

describe("validateRecordDoc", () => {
	it("accepts the keyed text with both slots", () => {
		expect(
			validate({
				...baseDoc,
				text: { name: { text: "User" }, rows: { text: ["id: string"] } },
			}),
		).toEqual([]);
	});

	it("accepts an absent text and empty slot contents", () => {
		expect(validate(baseDoc)).toEqual([]);
		expect(
			validate({
				...baseDoc,
				text: { name: { text: "" }, rows: { text: [] } },
			}),
		).toEqual([]);
	});

	it("accepts a partially spelled out text (one slot only)", () => {
		expect(validate({ ...baseDoc, text: { name: { text: "User" } } })).toEqual(
			[],
		);
		expect(validate({ ...baseDoc, text: { rows: { text: ["a"] } } })).toEqual(
			[],
		);
	});

	it("accepts per-slot styling", () => {
		expect(
			validate({
				...baseDoc,
				text: {
					name: { text: "User", fontWeight: "bold", textAlign: "center" },
					rows: { text: ["id"], fontSize: 12 },
				},
			}),
		).toEqual([]);
	});

	it("rejects the single-body form other shapes take", () => {
		const errors = validate({ ...baseDoc, text: "User" });
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root[0].text");
		expect(errors[0].message).toContain("name");
		expect(errors[0].message).toContain("rows");
	});

	it("rejects a bare content in place of a slot object", () => {
		const errors = validate({ ...baseDoc, text: { name: "User" } });
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root[0].text.name");
		expect(errors[0].message).toContain("text");
	});

	it("rejects an unknown slot id", () => {
		const errors = validate({
			...baseDoc,
			text: { name: { text: "User" }, body: { text: "oops" } },
		});
		expect(errors).toEqual([
			{
				path: "root[0].text.body",
				message: 'is not a slot of a record: use "name" or "rows"',
			},
		]);
	});

	it("rejects a mistyped name", () => {
		expect(
			validate({ ...baseDoc, text: { name: { text: 1 }, rows: { text: [] } } }),
		).toEqual([
			{ path: "root[0].text.name.text", message: "must be a string" },
		]);
	});

	it("rejects rows that are not an array of strings", () => {
		expect(validate({ ...baseDoc, text: { rows: { text: "a\nb" } } })).toEqual([
			{
				path: "root[0].text.rows.text",
				message: "must be an array of strings",
			},
		]);
		expect(
			validate({ ...baseDoc, text: { rows: { text: ["a", 2] } } }),
		).toEqual([
			{ path: "root[0].text.rows.text[1]", message: "must be a string" },
		]);
	});

	it("rejects a newline inside a row, which would silently split it", () => {
		const errors = validate({ ...baseDoc, text: { rows: { text: ["a\nb"] } } });
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root[0].text.rows.text[0]");
		expect(errors[0].message).toContain("newline");
		// The one record rule the JSON schema cannot express; without the flag
		// the VSCode extension would suppress it (structure-error filtering).
		expect(errors[0].beyondSchema).toBe(true);
	});

	it("rejects a malformed style inside a slot", () => {
		expect(
			validate({
				...baseDoc,
				text: { name: { text: "User", textAlign: "justify" } },
			}),
		).toEqual([
			{
				path: "root[0].text.name.textAlign",
				message: "must be one of: left, center, right",
			},
		]);
	});

	it("rejects text styling written at the root, which a record has no place for", () => {
		const errors = validate({ ...baseDoc, fontSize: 12, textAlign: "left" });
		expect(errors.map((entry) => entry.path)).toEqual([
			"root[0].textAlign",
			"root[0].fontSize",
		]);
	});

	it("still applies the shared frame checks", () => {
		expect(validate({ ...baseDoc, width: "wide" })).toContainEqual({
			path: "root[0].width",
			message: "must be a number",
		});
	});
});
