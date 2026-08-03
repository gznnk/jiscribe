import { describe, it, expect } from "vitest";

import { recordDocDefinition } from "../../doc";

const validateRecordDoc = recordDocDefinition.validateDoc;

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
	it("accepts the keyed text with a title and a compartment", () => {
		expect(
			validate({
				...baseDoc,
				text: { name: { text: "User" }, attributes: { text: ["id: string"] } },
			}),
		).toEqual([]);
	});

	it("accepts all three compartments", () => {
		expect(
			validate({
				...baseDoc,
				text: {
					name: { text: "User" },
					attributes: { text: ["id: string"] },
					operations: { text: ["save()"] },
				},
			}),
		).toEqual([]);
	});

	it("accepts an absent text and empty slot contents", () => {
		expect(validate(baseDoc)).toEqual([]);
		expect(
			validate({
				...baseDoc,
				text: { name: { text: "" }, attributes: { text: [] } },
			}),
		).toEqual([]);
	});

	it("accepts a box that leaves compartments out", () => {
		// 区画の欠落はエラーではなく「その区画を持たない箱」。
		expect(validate({ ...baseDoc, text: { name: { text: "User" } } })).toEqual(
			[],
		);
		expect(
			validate({ ...baseDoc, text: { operations: { text: ["save()"] } } }),
		).toEqual([]);
	});

	it("accepts per-slot styling", () => {
		expect(
			validate({
				...baseDoc,
				text: {
					name: { text: "User", fontWeight: "bold", textAlign: "center" },
					attributes: { text: ["id"], fontSize: 12 },
				},
			}),
		).toEqual([]);
	});

	it("rejects the single-body form other shapes take", () => {
		const errors = validate({ ...baseDoc, text: "User" });
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root[0].text");
		expect(errors[0].message).toContain("name");
		expect(errors[0].message).toContain("attributes");
		expect(errors[0].message).toContain("operations");
	});

	it("rejects a bare content in place of a slot object", () => {
		const errors = validate({ ...baseDoc, text: { name: "User" } });
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root[0].text.name");
		expect(errors[0].message).toContain("text");
	});

	it("rejects an unknown slot id", () => {
		// 打ち間違いを黙って捨てると、区画が 1 つ足りない図が出来上がる。
		const errors = validate({
			...baseDoc,
			text: { name: { text: "User" }, rows: { text: ["oops"] } },
		});
		expect(errors).toEqual([
			{
				path: "root[0].text.rows",
				message:
					'is not a slot of a record: use "name" / "attributes" / "operations"',
			},
		]);
	});

	it("rejects a mistyped name", () => {
		expect(
			validate({
				...baseDoc,
				text: { name: { text: 1 }, attributes: { text: [] } },
			}),
		).toEqual([
			{ path: "root[0].text.name.text", message: "must be a string" },
		]);
	});

	it("rejects rows that are not an array of strings", () => {
		expect(
			validate({ ...baseDoc, text: { attributes: { text: "a\nb" } } }),
		).toEqual([
			{
				path: "root[0].text.attributes.text",
				message: "must be an array of strings",
			},
		]);
		expect(
			validate({ ...baseDoc, text: { operations: { text: ["a", 2] } } }),
		).toEqual([
			{ path: "root[0].text.operations.text[1]", message: "must be a string" },
		]);
	});

	it("rejects a newline inside a row, which would silently split it", () => {
		const errors = validate({
			...baseDoc,
			text: { attributes: { text: ["a\nb"] } },
		});
		expect(errors).toHaveLength(1);
		expect(errors[0].path).toBe("root[0].text.attributes.text[0]");
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
