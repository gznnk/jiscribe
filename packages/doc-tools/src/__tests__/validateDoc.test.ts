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
