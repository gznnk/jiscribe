import { describe, expect, it } from "vitest";

import { bracketDocDefinition } from "../../../doc";
import { BRACKET_DOC_DEFAULTS } from "../BracketDoc";

const validateBracketDoc = bracketDocDefinition.validateDoc;
// A group marker always drag-draws (createGroupMarkerObjectFactory), and its
// factory is what bracketDocDefinition carries.
const createBracketDocFromBounds =
	bracketDocDefinition.factory!.createDocFromBounds!;

const baseDoc = { ...BRACKET_DOC_DEFAULTS, id: "bracket-1" } as Record<
	string,
	unknown
>;

describe("validateBracketDoc", () => {
	it("accepts the defaults", () => {
		expect(validateBracketDoc(baseDoc, "root[0]")).toEqual([]);
	});

	it("accepts a doc that leaves direction out", () => {
		const { direction, ...withoutDirection } = baseDoc;
		expect(direction).toBeDefined();
		expect(validateBracketDoc(withoutDirection, "root[0]")).toEqual([]);
	});

	it("rejects a direction outside the enum", () => {
		const errors = validateBracketDoc(
			{ ...baseDoc, direction: "top" },
			"root[0]",
		);
		expect(errors.map((error) => error.path)).toEqual(["root[0].direction"]);
	});

	/**
	 * The bracket declares no tipPosition, so a validator has nothing to check
	 * here. The name is reported by the parser's registry instead, which answers
	 * by taking the field out of the document it hands back, and the published
	 * JSON Schema refuses it outright (additionalProperties:false).
	 */
	it.each([0.25, 1.5])(
		"stays silent about a tipPosition of %s, which it does not declare",
		(tipPosition) => {
			expect(
				validateBracketDoc({ ...baseDoc, tipPosition }, "root[0]"),
			).toEqual([]);
		},
	);
});

describe("BracketObjectFactory", () => {
	it("draws a tall drag as the typographic bracket", () => {
		const doc = createBracketDocFromBounds(0, 0, 24, 160) as {
			direction: string;
		} | null;
		expect(doc?.direction).toBe("left");
	});

	it("draws a wide drag along the horizontal axis instead", () => {
		const doc = createBracketDocFromBounds(0, 0, 300, 30) as {
			direction: string;
		} | null;
		expect(doc?.direction).toBe("down");
	});

	it("keeps an explicit direction override", () => {
		const doc = createBracketDocFromBounds(0, 0, 300, 30, {
			direction: "up",
		}) as { direction: string } | null;
		expect(doc?.direction).toBe("up");
	});
});
