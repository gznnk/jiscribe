import { describe, expect, it } from "vitest";

import { validateMetaFields } from "../validateMetaFields";

describe("validateMetaFields", () => {
	it("accepts an absent meta and one whose named members are strings", () => {
		expect(validateMetaFields({}, "root[0]")).toEqual([]);
		expect(
			validateMetaFields(
				{ meta: { name: "n", description: "d", reference: "r", zz: 1 } },
				"root[0]",
			),
		).toEqual([]);
	});

	it("rejects a meta that is not an object", () => {
		expect(validateMetaFields({ meta: "n" }, "root[0]")).toEqual([
			{ path: "root[0].meta", message: "must be an object", severity: "error" },
		]);
	});

	it("rejects a named member that is not a string, one diagnostic each", () => {
		expect(
			validateMetaFields({ meta: { name: 3, reference: null } }, "root[0]").map(
				(diagnostic) => diagnostic.path,
			),
		).toEqual(["root[0].meta.name", "root[0].meta.reference"]);
	});
});
