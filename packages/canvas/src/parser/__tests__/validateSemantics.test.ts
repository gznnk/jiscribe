import { describe, it, expect } from "vitest";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { ConnectorDoc } from "../../schemas/objects/connector/ConnectorDoc";
import type { GroupDoc } from "../../schemas/objects/primitives/group/GroupDoc";
import type { RectDoc } from "../../schemas/objects/primitives/rect/RectDoc";
import type { ObjectFeatures } from "../../schemas/objects/types/ObjectFeatures";
import { createObjectDocValidatorRegistry } from "../../schemas/registry/ObjectDocValidatorRegistry";
import type { SemanticDiagnostic } from "../../schemas/types/SemanticDiagnostic";
import { createDocValidatorRegistry } from "../createDocValidatorRegistry";
import { validateSemantics as validateSemanticsWithRegistry } from "../validateSemantics";

// connectable checks read the registry's features, so register a minimal set for tests.
const noopValidate = () => [];
const features = (type: string, connectable: boolean): ObjectFeatures =>
	({ type, geometry: "rect", connectable }) as unknown as ObjectFeatures;

const mockRegistry = createObjectDocValidatorRegistry();
mockRegistry.register("rect", noopValidate, features("rect", true));
mockRegistry.register("group", noopValidate, features("group", false));
mockRegistry.register("connector", noopValidate, features("connector", false));

// validateSemantics takes a registry argument (the parser builds one per instance). Most
// of this suite runs against the mock registry above, so wrap it to keep every existing
// single-arg call site unchanged; the last describe passes the built-in one explicitly.
const validateSemantics = (
	doc: CanvasDoc,
	registry = mockRegistry,
): SemanticDiagnostic[] => validateSemanticsWithRegistry(doc, registry);

const rect = (id: string): RectDoc =>
	({ id, type: "rect" }) as unknown as RectDoc;

const group = (id: string, children: unknown[]): GroupDoc =>
	({ id, type: "group", children }) as unknown as GroupDoc;

const ownedEndpoint = (id: string) => ({
	owner: { id },
	anchor: { kind: "center" },
});

const connectPointEndpoint = (id: string, connectPointId = "topCenter") => ({
	owner: { id },
	anchor: { kind: "connectPoint", id: connectPointId },
});

const connector = (
	id: string,
	source: unknown,
	target: unknown,
): ConnectorDoc =>
	({ id, type: "connector", source, target }) as unknown as ConnectorDoc;

describe("validateSemantics", () => {
	describe("A. ID uniqueness", () => {
		it("returns no errors for a valid tree", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [group("g1", [rect("r1")])],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("reports duplicate sibling ids as duplicates", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("dup"), rect("dup")],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toContain("duplicated");
		});

		it("reports an id reused within its own ancestor chain as a duplicate", () => {
			// In a nested tree, cycles cannot occur structurally, so a reused ID is treated as a duplicate.
			const doc: CanvasDoc = {
				version: 1,
				root: [group("g1", [group("g1", [])])],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].id).toBe("g1");
			expect(errors[0].message).toContain("duplicated");
		});

		it("reports a connector id that collides with an object id", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("x"),
					connector("x", ownedEndpoint("x"), ownedEndpoint("x")),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors.some((e) => e.message.includes("duplicated"))).toBe(true);
		});

		it("reports a deeply nested duplicate id with the correct path", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("dup"), group("g", [group("g2", [rect("dup")])])],
			};
			const errors = validateSemantics(doc);
			const hit = errors.find((e) => e.message.includes("duplicated"));
			expect(hit?.path).toBe("root[1].children[0].children[0]");
			expect(hit?.id).toBe("dup");
		});

		it("reports 2 duplicates when the same id appears 3 times", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("a"), rect("a"), rect("a")],
			};
			const errors = validateSemantics(doc).filter((e) =>
				e.message.includes("duplicated"),
			);
			expect(errors).toHaveLength(2);
		});
	});

	describe("B. connector reference integrity", () => {
		it("accepts a connector between two connectable objects", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					rect("b"),
					connector("c1", ownedEndpoint("a"), ownedEndpoint("b")),
				],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("accepts free endpoints (no owner) without cross-document checks", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector("c1", ownedEndpoint("a"), {
						anchor: { kind: "free", point: { x: 0, y: 0 } },
					}),
				],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("flags an endpoint owner that does not exist", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector("c1", ownedEndpoint("a"), ownedEndpoint("missing")),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("root[1].target");
			expect(errors[0].message).toContain("does not exist");
		});

		it("flags an endpoint pointing at a non-connectable object", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					group("g1", []),
					connector("c1", ownedEndpoint("a"), ownedEndpoint("g1")),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("root[2].target");
			expect(errors[0].message).toContain("not connectable");
		});

		it("flags a connector pointing at another connector as not connectable", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector("c1", ownedEndpoint("a"), ownedEndpoint("a")),
					connector("c2", ownedEndpoint("a"), ownedEndpoint("c1")),
				],
			};

			const errors = validateSemantics(doc);
			expect(
				errors.some(
					(e) =>
						e.path === "root[2].target" &&
						e.message.includes("not connectable"),
				),
			).toBe(true);
		});

		it("accepts a self-loop when both ends are pinned to a connectPoint", () => {
			// Self-loops are allowed: rendered as a rectangular loop via a dedicated orthogonal route.
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector(
						"c1",
						connectPointEndpoint("a", "topCenter"),
						connectPointEndpoint("a", "bottomCenter"),
					),
				],
			};

			expect(validateSemantics(doc)).toEqual([]);
		});

		it("rejects a self-loop that uses a center anchor on both ends", () => {
			// A center anchor collapses to null on a self-loop, leaving the connector silently undrawn.
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector("c1", ownedEndpoint("a"), ownedEndpoint("a")),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("root[1]");
			expect(errors[0].id).toBe("c1");
			expect(errors[0].message).toContain("center anchor");
		});

		it("rejects a self-loop when only one end uses a center anchor", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector("c1", ownedEndpoint("a"), connectPointEndpoint("a")),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toContain("center anchor");
		});

		it("does not flag a center anchor between two distinct objects", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					rect("b"),
					connector("c1", ownedEndpoint("a"), ownedEndpoint("b")),
				],
			};

			expect(validateSemantics(doc)).toEqual([]);
		});

		it("reports a dangling reference on the source side with a path", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector("c1", ownedEndpoint("missing"), ownedEndpoint("a")),
				],
			};
			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("root[1].source");
			expect(errors[0].message).toContain("does not exist");
		});

		it("reports 2 errors when both endpoints are invalid (source / target)", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [connector("c1", ownedEndpoint("m1"), ownedEndpoint("m2"))],
			};
			const errors = validateSemantics(doc);
			expect(errors.map((e) => e.path)).toEqual([
				"root[0].source",
				"root[0].target",
			]);
		});

		it("reports both endpoints as does not exist when they point to the same dangling owner", () => {
			// The self-loop itself is allowed, but endpoints pointing to a nonexistent owner are still errors.
			const doc: CanvasDoc = {
				version: 1,
				root: [connector("c1", ownedEndpoint("z"), ownedEndpoint("z"))],
			};
			const errors = validateSemantics(doc);
			expect(errors.every((e) => e.message.includes("does not exist"))).toBe(
				true,
			);
			expect(errors.map((e) => e.path)).toEqual([
				"root[0].source",
				"root[0].target",
			]);
		});

		it("reports not connectable when both endpoints point to the same non-connectable owner", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					group("g1", []),
					connector("c1", ownedEndpoint("g1"), ownedEndpoint("g1")),
				],
			};
			const errors = validateSemantics(doc);
			expect(errors.every((e) => e.message.includes("not connectable"))).toBe(
				true,
			);
		});

		it("reports no error for a connectPoint self-loop on a connectable owner", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector(
						"c1",
						connectPointEndpoint("a", "leftCenter"),
						connectPointEndpoint("a", "rightCenter"),
					),
				],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("reports no error when both endpoints are free (no owner)", () => {
			const freeEndpoint = { anchor: { kind: "free", point: { x: 0, y: 0 } } };
			const doc: CanvasDoc = {
				version: 1,
				root: [connector("c1", freeEndpoint, freeEndpoint)],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("accepts a connector referencing a group's (nested) child", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					group("g", [rect("gr")]),
					rect("a"),
					connector("c1", ownedEndpoint("gr"), ownedEndpoint("a")),
				],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});
	});
});

// The describe above assumes connectable via a mock registry. This one verifies
// connectable checks against the real registry (production features) to guard
// against regressions if someone flips Features.connectable.
describe("validateSemantics (connectable via the real registry)", () => {
	const builtinRegistry = createDocValidatorRegistry();

	const targetDoc = (type: string): CanvasDoc => ({
		version: 1,
		root: [
			rect("a"),
			{ id: "t", type } as unknown as ObjectDoc,
			connector("c", ownedEndpoint("a"), ownedEndpoint("t")),
		],
	});

	it.each(["rect", "ellipse", "text"])(
		"%s is connectable (no error)",
		(type) => {
			expect(validateSemantics(targetDoc(type), builtinRegistry)).toEqual([]);
		},
	);

	it.each(["polyline", "polygon", "svg", "group"])(
		"%s is not connectable (not connectable)",
		(type) => {
			const errors = validateSemantics(targetDoc(type), builtinRegistry);
			expect(
				errors.some(
					(e) =>
						e.path === "root[2].target" &&
						e.message.includes("not connectable"),
				),
			).toBe(true);
		},
	);
});
