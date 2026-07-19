import { beforeAll, describe, it, expect } from "vitest";

import { initializeObjectDocValidatorRegistry } from "../../../registry/initializeObjectDocValidatorRegistry";
import { objectDocValidatorRegistry } from "../../../registry/ObjectDocValidatorRegistry";
import type { SemanticDiagnostic } from "../types";
import { validateStructure as validateStructureWithRegistry } from "../validateStructure";

// validateStructure now takes a registry argument (createCanvasParser can supply a
// non-global one); this suite still exercises it against the global registry, so wrap it
// to keep every existing single-arg call site below unchanged.
const validateStructure = (doc: unknown): SemanticDiagnostic[] =>
	validateStructureWithRegistry(doc, objectDocValidatorRegistry);

// validateStructure delegates per-type validation and known-type checks to the registry.
// In production parseCanvasText guarantees initialization, so we set up the same precondition in unit tests.
beforeAll(() => {
	initializeObjectDocValidatorRegistry();
});

// ─── Fixture helpers ─────────────────────────────────────────
const rect = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	type: "rect",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	...over,
});
const ellipse = (id: string) => ({
	id,
	type: "ellipse",
	cx: 0,
	cy: 0,
	rx: 5,
	ry: 5,
});
const polyline = (id: string) => ({
	id,
	type: "polyline",
	points: [
		{ x: 0, y: 0 },
		{ x: 1, y: 1 },
	],
});
const group = (id: string, children: unknown[]) => ({
	id,
	type: "group",
	children,
});
const ownedRef = (ownerId: string) => ({
	owner: { id: ownerId },
	anchor: { kind: "center" },
});
const connector = (id: string, source: unknown, target: unknown) => ({
	id,
	type: "connector",
	points: [],
	source,
	target,
});
const doc = (root: unknown[], over: Record<string, unknown> = {}) => ({
	version: 1,
	root,
	...over,
});

const has = (
	errors: SemanticDiagnostic[],
	path: string,
	substr: string,
): boolean => errors.some((e) => e.path === path && e.message.includes(substr));

// ─── Top-level document structure ───────────────────────────────────────
describe("validateStructure: top-level document", () => {
	it.each([
		["null", null],
		["array", []],
		["string", "x"],
		["number", 42],
	])("a non-object (%s) yields a '/' error", (_label, input) => {
		const errors = validateStructure(input);
		expect(has(errors, "/", "must be an object")).toBe(true);
	});

	it("a missing version is an error", () => {
		expect(has(validateStructure({ root: [] }), "version", "must be 1")).toBe(
			true,
		);
	});

	it.each([
		["string '1'", "1"],
		["v2 (strict: only v1 format is supported)", 2],
		["decimal 1.5", 1.5],
		["0", 0],
		["negative", -1],
	])("an invalid version (%s) is an error", (_label, version) => {
		const errors = validateStructure({ version, root: [] });
		expect(has(errors, "version", "must be 1")).toBe(true);
	});

	it("version=1 + empty root yields no structural error (an empty canvas is valid)", () => {
		expect(validateStructure(doc([]))).toEqual([]);
	});

	it.each([
		["missing", {}],
		["object", { root: {} }],
		["string", { root: "x" }],
	])("root not being an array (%s) is an error", (_label, partial) => {
		const errors = validateStructure({ version: 1, ...partial });
		expect(has(errors, "root", "must be an array")).toBe(true);
	});

	it("multiple defects accumulate (version + root)", () => {
		const errors = validateStructure({ version: 2, root: 5 });
		expect(has(errors, "version", "must be 1")).toBe(true);
		expect(has(errors, "root", "must be an array")).toBe(true);
	});
});

// ─── Legacy connectors field ─────────────────────────
describe("validateStructure: legacy connectors field", () => {
	it("fails fast with an error when a top-level connectors field is present", () => {
		const errors = validateStructure({ version: 1, root: [], connectors: [] });
		expect(errors.some((e) => e.path === "connectors")).toBe(true);
	});

	it("is not an error when the connectors key is absent", () => {
		expect(
			validateStructure(doc([])).some((e) => e.path === "connectors"),
		).toBe(false);
	});
});

// ─── Common node fields (validateObjectNode) ───────────────────
describe("validateStructure: common node fields", () => {
	it.each([
		["null", null],
		["string", "x"],
		["number", 1],
		["array", []],
	])(
		"a non-object root element (%s) is 'must be an object'",
		(_label, node) => {
			const errors = validateStructure(doc([node]));
			expect(has(errors, "root[0]", "must be an object")).toBe(true);
		},
	);

	it.each([
		["missing", {}],
		["empty string", { id: "" }],
		["number", { id: 1 }],
	])("an invalid id (%s) is a non-empty string error", (_label, idPart) => {
		const errors = validateStructure(doc([{ type: "rect", ...idPart }]));
		expect(has(errors, "root[0].id", "non-empty string")).toBe(true);
	});

	it("a missing type yields only a type error and skips per-type validation (early return)", () => {
		// Even with a broken width, without a type it does not proceed to rect validation
		const errors = validateStructure(doc([{ id: "x", width: "bad" }]));
		expect(has(errors, "root[0].type", "must be a string")).toBe(true);
		expect(errors.some((e) => e.path === "root[0].width")).toBe(false);
	});

	it("a numeric type is a type error", () => {
		const errors = validateStructure(doc([{ id: "x", type: 1 }]));
		expect(has(errors, "root[0].type", "must be a string")).toBe(true);
	});
});

// ─── Unknown type ────────────────────────────────────────────────────
describe("validateStructure: unknown type", () => {
	it("yields an Unknown object type error for an unknown type at the root", () => {
		const errors = validateStructure(doc([{ id: "x1", type: "rectangle" }]));
		expect(has(errors, "root[0].type", 'Unknown object type "rectangle"')).toBe(
			true,
		);
	});

	it("also rejects an unknown type in a group's children", () => {
		const errors = validateStructure(
			doc([group("g1", [{ id: "c1", type: "nope" }])]),
		);
		expect(
			has(errors, "root[0].children[0].type", 'Unknown object type "nope"'),
		).toBe(true);
	});

	it("does not emit an Unknown error for a known type", () => {
		const errors = validateStructure(doc([group("g1", [rect("r1")])]));
		expect(errors.some((e) => e.message.includes("Unknown object type"))).toBe(
			false,
		);
	});
});

// ─── Delegation to per-type validation ─────────────────────────────────────────────
describe("validateStructure: delegation to per-type validation", () => {
	it("surfaces a missing rect width via structure validation", () => {
		const errors = validateStructure(
			doc([{ id: "r", type: "rect", x: 0, y: 0, height: 10 }]),
		);
		expect(has(errors, "root[0].width", "must be a number")).toBe(true);
	});

	it("surfaces a missing ellipse cx", () => {
		const errors = validateStructure(
			doc([{ id: "e", type: "ellipse", cy: 0, rx: 5, ry: 5 }]),
		);
		expect(has(errors, "root[0].cx", "must be a number")).toBe(true);
	});

	it("yields no per-type error for a valid rect", () => {
		expect(validateStructure(doc([rect("r")]))).toEqual([]);
	});
});

// ─── group children ────────────────────────────────────────────
describe("validateStructure: group children", () => {
	it("missing children is 'must be an array'", () => {
		const errors = validateStructure(doc([{ id: "g1", type: "group" }]));
		expect(has(errors, "root[0].children", "must be an array")).toBe(true);
	});

	it("empty children is an error", () => {
		const errors = validateStructure(doc([group("g1", [])]));
		expect(has(errors, "root[0].children", "at least one child")).toBe(true);
	});

	it("also rejects a nested empty group", () => {
		const errors = validateStructure(
			doc([group("g1", [rect("r1"), group("g2", [])])]),
		);
		expect(
			has(errors, "root[0].children[1].children", "at least one child"),
		).toBe(true);
	});

	it("a non-object child is 'must be an object'", () => {
		const errors = validateStructure(doc([group("g1", [null])]));
		expect(has(errors, "root[0].children[0]", "must be an object")).toBe(true);
	});

	it("surfaces a child's per-type error at the correct path", () => {
		const errors = validateStructure(
			doc([group("g1", [{ id: "r", type: "rect", x: 0, y: 0, width: 10 }])]),
		);
		expect(has(errors, "root[0].children[0].height", "must be a number")).toBe(
			true,
		);
	});

	it("computes an accurate path for deep nesting (group>group>rect)", () => {
		const errors = validateStructure(
			doc([
				group("g1", [
					group("g2", [{ id: "r", type: "rect", x: 0, y: 0, width: 10 }]),
				]),
			]),
		);
		expect(
			has(errors, "root[0].children[0].children[0].height", "must be a number"),
		).toBe(true);
	});

	it("a group with children is not an error", () => {
		expect(validateStructure(doc([group("g1", [rect("r1")])]))).toEqual([]);
	});
});

// ─── Connectors are top-level only ──────────────────────────────────
describe("validateStructure: connector placement", () => {
	const conn = connector("c1", ownedRef("r1"), ownedRef("r2"));

	it("is an error when a connector appears in a group's children", () => {
		const errors = validateStructure(doc([group("g1", [conn])]));
		expect(has(errors, "root[0].children[0]", "top-level")).toBe(true);
	});

	it("a connector at the root does not yield an 'inside a group' error", () => {
		const errors = validateStructure(doc([conn]));
		expect(errors.some((e) => e.message.includes("inside a group"))).toBe(
			false,
		);
	});

	it("a connector with both endpoints free is rejected by per-type validation (free-free rejected at the boundary)", () => {
		const freeRef = (x: number, y: number) => ({
			anchor: { kind: "free", point: { x, y } },
		});
		const errors = validateStructure(
			doc([connector("c1", freeRef(0, 0), freeRef(9, 9))]),
		);
		expect(has(errors, "root[0]", "at least one owned endpoint")).toBe(true);
	});
});

// ─── Happy path ────────────────────────────────────────
describe("validateStructure: happy path", () => {
	it("a mix of rect / ellipse / polyline / group (with children) / connector has no errors", () => {
		const valid = doc([
			rect("r1"),
			ellipse("e1"),
			polyline("p1"),
			group("g1", [rect("gr1")]),
			connector("c1", ownedRef("r1"), ownedRef("e1")),
		]);
		expect(validateStructure(valid)).toEqual([]);
	});
});
