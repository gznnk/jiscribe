import { describe, expect, it } from "vitest";

import { diagnoseErEntityLineBreaks } from "../diagnoseErEntityLineBreaks";

/** An entity titled "users" over the given columns. */
const entityDoc = (fields: Record<string, unknown>) => ({
	id: "users",
	type: "erEntity",
	x: 0,
	y: 0,
	name: "users",
	...fields,
});

const FIX = "rewrite it on one line with er_entity_set_texts";

describe("diagnoseErEntityLineBreaks", () => {
	it("reports nothing for columns written on one line each", () => {
		expect(
			diagnoseErEntityLineBreaks(
				entityDoc({
					columns: [
						{ key: "PK", name: "id", type: "uuid" },
						{
							name: "email",
							type: { text: "varchar(80)", fontWeight: "bold" },
						},
					],
				}),
			),
		).toEqual([]);
	});

	it("reports a name written as a plain string", () => {
		expect(
			diagnoseErEntityLineBreaks(
				entityDoc({ columns: [{ name: "first\nname" }] }),
			),
		).toEqual([
			`line break in column 0 name: a column's key, name and type are one line tall, so the text after the line break is clipped and not drawn; ${FIX}`,
		]);
	});

	it("reports a type written as a slot object, naming its column", () => {
		expect(
			diagnoseErEntityLineBreaks(
				entityDoc({
					columns: [
						{ name: "id" },
						{ name: "email", type: { text: "varchar(80)\nnull" } },
					],
				}),
			),
		).toEqual([
			`line break in column 1 type (of column "email"): a column's key, name and type are one line tall, so the text after the line break is clipped and not drawn; ${FIX}`,
		]);
	});

	it("reports a key written as runs, cut at both edges as the key is centered", () => {
		expect(
			diagnoseErEntityLineBreaks(
				entityDoc({
					columns: [
						{
							key: [{ text: "PK\n" }, { text: "FK", fontWeight: "normal" }],
							name: "org_id",
						},
					],
				}),
			),
		).toEqual([
			`line break in column 0 key (of column "org_id"): a column's key, name and type are one line tall, so its lines are cut at the row's top and bottom edges; ${FIX}`,
		]);
	});

	it("reads the alignment a slot states over its role's", () => {
		expect(
			diagnoseErEntityLineBreaks(
				entityDoc({
					columns: [{ name: { text: "first\nname", verticalAlign: "bottom" } }],
				}),
			),
		).toEqual([
			`line break in column 0 name: a column's key, name and type are one line tall, so the text before the line break is clipped and not drawn; ${FIX}`,
		]);
	});

	it("counts a CRLF and a lone carriage return as line breaks", () => {
		expect(
			diagnoseErEntityLineBreaks(
				entityDoc({ columns: [{ name: "first\r\nname" }, { name: "a\rb" }] }),
			),
		).toHaveLength(2);
	});

	it("passes over a line break in the title, whose band grows with it", () => {
		expect(
			diagnoseErEntityLineBreaks(
				entityDoc({ name: "user\naccounts", columns: [{ name: "id" }] }),
			),
		).toEqual([]);
	});

	it("reports every offending slot in column order, then key, name, type", () => {
		const messages = diagnoseErEntityLineBreaks(
			entityDoc({
				columns: [
					{ name: "id", type: "big\nint" },
					{ key: "P\nK", name: "e\nmail", type: "text\n" },
				],
			}),
		);
		expect(
			messages.map(
				(message) => /^line break in (column \d+ \w+)/.exec(message)?.[1],
			),
		).toEqual([
			"column 0 type",
			"column 1 key",
			"column 1 name",
			"column 1 type",
		]);
	});

	it("quotes a column name holding a line break on one line", () => {
		expect(
			diagnoseErEntityLineBreaks(
				entityDoc({ columns: [{ name: "e\nmail", type: "text\n" }] }),
			)[1],
		).toContain('(of column "e\\nmail")');
	});

	it("passes over a doc whose columns are not an array", () => {
		expect(diagnoseErEntityLineBreaks(entityDoc({ columns: "id" }))).toEqual(
			[],
		);
		expect(diagnoseErEntityLineBreaks(entityDoc({}))).toEqual([]);
	});
});
