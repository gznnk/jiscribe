import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { validateDoc } from "../validateDoc";

const readFixture = (name: string): string =>
	readFileSync(
		fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
		"utf8",
	);

describe("validateDoc", () => {
	it("accepts a document of shipped shapes and hands back the parsed doc", () => {
		const result = validateDoc(readFixture("fitting.jis.json"));
		expect(result.ok).toBe(true);
		expect(result.diagnostics).toEqual([]);
		expect(result.doc?.root).toHaveLength(3);
	});

	it("reports a JSON syntax error as one error and reads no further", () => {
		const result = validateDoc('{"version": 1, "root": [');
		expect(result.ok).toBe(false);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0].severity).toBe("error");
		expect(result.doc).toBeUndefined();
	});

	it("catches what only the parser can see, a duplicate id here", () => {
		const result = validateDoc(readFixture("broken.jis.json"));
		expect(result.ok).toBe(false);
		expect(
			result.diagnostics.some((diagnostic) =>
				/duplicat/i.test(diagnostic.message),
			),
		).toBe(true);
	});

	it("catches what only the schema can see, an unknown property here", () => {
		// The parser drops a property no type declares; the schema refuses it, which
		// is the half of the pair that catches a misspelling.
		const result = validateDoc(
			JSON.stringify({
				version: 1,
				root: [
					{
						id: "a",
						type: "rect",
						x: 0,
						y: 0,
						width: 100,
						height: 60,
						fontSizes: 14,
					},
				],
			}),
		);
		expect(result.ok).toBe(false);
		expect(
			result.diagnostics.some((diagnostic) =>
				diagnostic.message.startsWith("schema:"),
			),
		).toBe(true);
	});

	it("names the object a schema error falls in, not only its position", () => {
		const result = validateDoc(
			JSON.stringify({
				version: 1,
				root: [
					{ id: "first", type: "rect", x: 0, y: 0, width: 100, height: 60 },
					{
						id: "second",
						type: "rect",
						x: 0,
						y: 0,
						width: "wide",
						height: 60,
					},
				],
			}),
		);
		expect(
			result.diagnostics.some((diagnostic) => diagnostic.objectId === "second"),
		).toBe(true);
	});
});

/**
 * Every placeable object is checked against a ~50-branch `oneOf`, so ajv's
 * `allErrors` reports one missing property as every branch's reason for not
 * fitting. What survives should be the branch the object's own `type` named.
 */
describe("validateDoc: schema errors of the object union", () => {
	const schemaMessages = (text: string): string[] =>
		validateDoc(text)
			.diagnostics.filter((diagnostic) =>
				diagnostic.message.startsWith("schema:"),
			)
			.map((diagnostic) => diagnostic.message);

	it("reports one missing property per object, not every branch's complaint", () => {
		const messages = schemaMessages(
			JSON.stringify({
				version: 1,
				root: [
					{ id: "frame", type: "container", x: 40, y: 40, width: 300 },
					{ id: "card", type: "markdown", x: 400, y: 40, width: 300 },
				],
			}),
		);
		expect(messages).toEqual([
			"schema: /root/0 must have required property 'height'",
			"schema: /root/1 must have required property 'height'",
		]);
	});

	it("folds a type no branch declares into one error naming it", () => {
		const messages = schemaMessages(
			JSON.stringify({
				version: 1,
				root: [
					{ id: "a", type: "rectangle", x: 0, y: 0, width: 100, height: 60 },
				],
			}),
		);
		expect(messages).toEqual([
			'schema: /root/0/type must be a known object type, got "rectangle"',
		]);
	});

	it("keeps every violation of the branch that was named", () => {
		const messages = schemaMessages(
			JSON.stringify({
				version: 1,
				root: [
					{ id: "a", type: "container", x: 0, y: 0, width: 100, widht: 60 },
				],
			}),
		);
		expect(messages).toEqual([
			"schema: /root/0 must have required property 'height'",
			"schema: /root/0 must NOT have additional properties",
		]);
	});

	it("narrows a group's children too, not just the top level", () => {
		const messages = schemaMessages(
			JSON.stringify({
				version: 1,
				root: [
					{
						id: "g",
						type: "group",
						children: [{ id: "c", type: "container", x: 0, y: 0, width: 10 }],
					},
				],
			}),
		);
		expect(messages).toEqual([
			"schema: /root/0/children/0 must have required property 'height'",
		]);
	});

	it("passes errors outside the object union through untouched", () => {
		const messages = schemaMessages(JSON.stringify({ version: "1", root: [] }));
		expect(messages).toEqual([
			"schema: /version must be integer",
			"schema: /version must be equal to constant",
		]);
	});

	it("leaves a sound document with no diagnostics at all", () => {
		const result = validateDoc(
			JSON.stringify({
				version: 1,
				root: [
					{ id: "a", type: "rect", x: 0, y: 0, width: 100, height: 60 },
					{ id: "b", type: "container", x: 0, y: 200, width: 100, height: 60 },
				],
			}),
		);
		expect(result.ok).toBe(true);
		expect(result.diagnostics).toEqual([]);
	});
});
