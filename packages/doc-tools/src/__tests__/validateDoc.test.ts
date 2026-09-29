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

	it("catches a cross-object rule, a duplicate id here", () => {
		const result = validateDoc(readFixture("broken.jis.json"));
		expect(result.ok).toBe(false);
		expect(
			result.diagnostics.some((diagnostic) =>
				/duplicat/i.test(diagnostic.message),
			),
		).toBe(true);
	});

	it("warns about a misspelled property and opens the document without it", () => {
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
		expect(result.ok).toBe(true);
		expect(result.diagnostics).toEqual([
			{
				severity: "warning",
				objectId: "a",
				path: "root[0].fontSizes",
				message:
					'Unknown property "fontSizes" on a "rect": it was ignored and will be dropped on save.',
			},
		]);
		expect(result.doc?.root[0]).not.toHaveProperty("fontSizes");
	});

	it("warns about an object of a type the shipped set lacks and keeps it as it is", () => {
		const unknownObject = { id: "u", type: "rectangle", x: 0, y: 0 };
		const result = validateDoc(
			JSON.stringify({ version: 1, root: [unknownObject] }),
		);
		expect(result.ok).toBe(true);
		expect(result.doc?.root).toEqual([unknownObject]);
		expect(result.diagnostics).toEqual([
			{
				severity: "warning",
				objectId: "u",
				path: "root[0].type",
				message:
					'Object type "rectangle" is not a type this build knows: the object is kept as it is but not drawn.',
			},
		]);
	});

	it("reports a required property a type lacks as an error", () => {
		// A rect's height may be left out (its text region drives auto height); a
		// container's may not.
		const result = validateDoc(
			JSON.stringify({
				version: 1,
				root: [{ id: "frame", type: "container", x: 40, y: 40, width: 300 }],
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.doc).toBeUndefined();
		expect(
			result.diagnostics.map(({ severity, path, message }) => ({
				severity,
				path,
				message,
			})),
		).toEqual([
			{
				severity: "error",
				path: "root[0].height",
				message: "must be a number",
			},
		]);
	});

	it("reports a document-level field of the wrong type as an error", () => {
		const result = validateDoc(JSON.stringify({ version: "1", root: [] }));
		expect(result.ok).toBe(false);
		expect(
			result.diagnostics.map(({ severity, path, message }) => ({
				severity,
				path,
				message,
			})),
		).toEqual([{ severity: "error", path: "version", message: "must be 1" }]);
	});
});
