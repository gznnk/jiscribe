import { describe, expect, it } from "vitest";

import { validateErEntityFields } from "../validateErEntityFields";

const validate = (fields: Record<string, unknown>) =>
	validateErEntityFields(
		{
			id: "e-1",
			type: "erEntity",
			x: 0,
			y: 0,
			name: "users",
			columns: [],
			...fields,
		},
		"root[0]",
	);

describe("validateErEntityFields: stated slot widths", () => {
	it("accepts every slot width left out, or stated at least its minimum", () => {
		expect(validate({})).toEqual([]);
		expect(validate({ keyWidth: 24, nameWidth: 24, typeWidth: 60 })).toEqual(
			[],
		);
		expect(
			validate({ keyWidth: 500, nameWidth: 900, typeWidth: 400.5 }),
		).toEqual([]);
	});

	it("refuses a slot width that is not a number", () => {
		for (const field of ["keyWidth", "nameWidth", "typeWidth"]) {
			expect(validate({ [field]: "wide" })).toEqual([
				{
					path: `root[0].${field}`,
					message: "must be a number",
					severity: "error",
				},
			]);
		}
	});

	it("refuses a key or name width under 24, and a type width under 60", () => {
		expect(validate({ keyWidth: 23, nameWidth: 23, typeWidth: 59 })).toEqual([
			{ path: "root[0].keyWidth", message: "must be >= 24", severity: "error" },
			{
				path: "root[0].nameWidth",
				message: "must be >= 24",
				severity: "error",
			},
			{
				path: "root[0].typeWidth",
				message: "must be >= 60",
				severity: "error",
			},
		]);
	});
});

describe("validateErEntityFields: texts", () => {
	it("accepts every text as a string, as runs or as a styled slot", () => {
		expect(
			validate({
				name: { text: "users", fontWeight: "bold" },
				columns: [
					{ key: "PK", name: [{ text: "id", fontStyle: "italic" }] },
					{
						key: { text: "FK", fontColor: "#ff0000" },
						name: { text: "org_id", fontSize: 18 },
						type: { text: "bigint", textAlign: "right" },
					},
				],
			}),
		).toEqual([]);
	});

	it("refuses a malformed style value on a styled text", () => {
		expect(
			validate({
				columns: [{ name: { text: "id", fontSize: -1 } }],
			}).map((diagnostic) => diagnostic.path),
		).toEqual(["root[0].columns[0].name.fontSize"]);
		expect(
			validate({
				name: { text: "users", textAlign: "middle" },
			}).map((diagnostic) => diagnostic.path),
		).toEqual(["root[0].name.textAlign"]);
	});

	it("refuses a styled text without its text", () => {
		expect(
			validate({
				columns: [{ name: { fontWeight: "bold" } }],
			}).map((diagnostic) => diagnostic.path),
		).toEqual(["root[0].columns[0].name.text"]);
	});

	it("still refuses a field a column does not have", () => {
		expect(
			validate({
				columns: [{ name: "id", fontWeight: "bold" }],
			}).map((diagnostic) => diagnostic.path),
		).toEqual(["root[0].columns[0].fontWeight"]);
	});

	it("refuses any typography at the root and points it at the text", () => {
		const diagnostics = validate({ fontSize: 16, fontWeight: "bold" });
		expect(diagnostics.map((diagnostic) => diagnostic.path)).toEqual([
			"root[0].fontSize",
			"root[0].fontWeight",
		]);
		expect(diagnostics[1].message).toContain('"fontWeight"');
	});
});

describe("validateErEntityFields: the column list and the title", () => {
	it("refuses columns that are not an array, with one diagnostic", () => {
		expect(validate({ columns: { name: "id" } })).toEqual([
			{
				path: "root[0].columns",
				message: "must be an array of columns",
				severity: "error",
			},
		]);
	});

	it("refuses a column that is not an object, naming the fields one has", () => {
		expect(validate({ columns: [{ name: "id" }, null, "email"] })).toEqual([
			{
				path: "root[0].columns[1]",
				message: 'must be an object with "key" / "name" / "type"',
				severity: "error",
			},
			{
				path: "root[0].columns[2]",
				message: 'must be an object with "key" / "name" / "type"',
				severity: "error",
			},
		]);
	});

	it("refuses a title or a column text that is neither text nor a styled slot", () => {
		expect(
			validate({
				name: 5,
				columns: [{ key: 1, name: "id", type: false }],
			}).map((diagnostic) => diagnostic.path),
		).toEqual([
			"root[0].name",
			"root[0].columns[0].key",
			"root[0].columns[0].type",
		]);
	});

	it("refuses a text field written in place of the title and the columns", () => {
		expect(validate({ text: "users" })).toEqual([
			{
				path: "root[0].text",
				message:
					'is not a field of an entity: write the title as "name" and the columns as "columns"',
				severity: "error",
			},
		]);
	});
});
