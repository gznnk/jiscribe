import { describe, expect, it } from "vitest";

import { braceDocDefinition } from "../../../doc";
import { BRACE_DOC_DEFAULTS } from "../BraceDoc";

const validateBraceDoc = braceDocDefinition.validateDoc;
// A group marker always drag-draws (createGroupMarkerObjectFactory), and its
// factory is what braceDocDefinition carries.
const createBraceDocFromBounds =
	braceDocDefinition.factory!.createDocFromBounds!;

const baseDoc = { ...BRACE_DOC_DEFAULTS, id: "brace-1" } as Record<
	string,
	unknown
>;

describe("validateBraceDoc", () => {
	it("accepts the defaults", () => {
		expect(validateBraceDoc(baseDoc, "root[0]")).toEqual([]);
	});

	it("accepts a doc that leaves direction and tipPosition out", () => {
		const { direction, tipPosition, ...withoutBraceFields } = baseDoc;
		expect(direction).toBeDefined();
		expect(tipPosition).toBeDefined();
		expect(validateBraceDoc(withoutBraceFields, "root[0]")).toEqual([]);
	});

	it("rejects a direction outside the enum", () => {
		const errors = validateBraceDoc(
			{ ...baseDoc, direction: "top" },
			"root[0]",
		);
		expect(errors.map((error) => error.path)).toEqual(["root[0].direction"]);
	});

	it("rejects a tipPosition outside 0..1", () => {
		const errors = validateBraceDoc(
			{ ...baseDoc, tipPosition: 1.5 },
			"root[0]",
		);
		expect(errors.map((error) => error.path)).toEqual(["root[0].tipPosition"]);
	});
});

describe("BraceObjectFactory", () => {
	it("draws a tall drag as the typographic brace", () => {
		const doc = createBraceDocFromBounds(0, 0, 24, 160) as {
			direction: string;
		} | null;
		expect(doc?.direction).toBe("left");
	});

	it("draws a wide drag along the horizontal axis instead", () => {
		const doc = createBraceDocFromBounds(0, 0, 300, 30) as {
			direction: string;
		} | null;
		expect(doc?.direction).toBe("down");
	});

	it("keeps an explicit direction override", () => {
		const doc = createBraceDocFromBounds(0, 0, 300, 30, {
			direction: "up",
		}) as { direction: string } | null;
		expect(doc?.direction).toBe("up");
	});
});
