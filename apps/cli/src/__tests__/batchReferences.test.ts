import { describe, expect, it } from "vitest";

import {
	BATCH_NAME_PATTERN,
	BatchReferenceError,
	resolveBatchReferences,
} from "../batchReferences";

const createdIdsByName = new Map<string, readonly string[]>([
	["box", ["rect-1"]],
	["pair", ["rect-2", "ellipse-1"]],
	["nothing", []],
]);

describe("resolveBatchReferences", () => {
	it("substitutes references at any depth, leaving object keys alone", () => {
		expect(
			resolveBatchReferences(
				{
					$box: "$box",
					entries: [
						{ sourceId: "$pair", targetId: "$pair.1" },
						["$box", { nested: ["$pair.0"] }],
					],
				},
				createdIdsByName,
			),
		).toEqual({
			$box: "rect-1",
			entries: [
				{ sourceId: "rect-2", targetId: "ellipse-1" },
				["rect-1", { nested: ["rect-2"] }],
			],
		});
	});

	it("passes a $ string that is not a reference in form through as it is", () => {
		for (const text of ["$5", "$a.b", "$", "$box.", "$box.1.2", "a $box"]) {
			expect(resolveBatchReferences(text, createdIdsByName)).toBe(text);
		}
	});

	it("takes one $ off a string starting with $$", () => {
		expect(resolveBatchReferences("$$box", createdIdsByName)).toBe("$box");
		expect(resolveBatchReferences("$$", createdIdsByName)).toBe("$");
		expect(resolveBatchReferences("$$$box", createdIdsByName)).toBe("$$box");
	});

	it("leaves numbers, booleans and null alone", () => {
		expect(resolveBatchReferences([1, true, null], createdIdsByName)).toEqual([
			1,
			true,
			null,
		]);
	});

	it("throws for an unknown name, an entry that created nothing and an index out of range", () => {
		expect(() => resolveBatchReferences("$other", createdIdsByName)).toThrow(
			BatchReferenceError,
		);
		expect(() => resolveBatchReferences("$nothing", createdIdsByName)).toThrow(
			/created no objects/,
		);
		expect(() => resolveBatchReferences("$pair.2", createdIdsByName)).toThrow(
			/out of range: \$pair created 2 object\(s\), so its index runs from 0 to 1/,
		);
	});
});

describe("BATCH_NAME_PATTERN", () => {
	it("takes identifiers only", () => {
		expect(BATCH_NAME_PATTERN.test("_api2")).toBe(true);
		for (const name of ["2api", "a-b", "a.b", "", "$a"]) {
			expect(BATCH_NAME_PATTERN.test(name)).toBe(false);
		}
	});
});
