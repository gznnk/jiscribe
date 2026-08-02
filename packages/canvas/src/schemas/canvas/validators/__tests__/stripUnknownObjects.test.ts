import { beforeAll, describe, expect, it } from "vitest";

import { initializeObjectDocValidatorRegistry } from "../../../registry/initializeObjectDocValidatorRegistry";
import { objectDocValidatorRegistry } from "../../../registry/ObjectDocValidatorRegistry";
import { stripUnknownObjects } from "../stripUnknownObjects";

// stripUnknownObjects decides known/unknown via the registry, so set up the same
// precondition as production (parseCanvasText guarantees initialization).
beforeAll(() => {
	initializeObjectDocValidatorRegistry();
});

const strip = (data: unknown) =>
	stripUnknownObjects(data, objectDocValidatorRegistry);

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
const unknownShape = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	type: "hexagram",
	x: 0,
	y: 0,
	...over,
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
const freeRef = (x: number, y: number) => ({ position: { x, y } });
const connector = (id: string, source: unknown, target: unknown) => ({
	id,
	type: "connector",
	points: [],
	source,
	target,
});
const doc = (root: unknown[]) => ({ version: 1, root });
const rootIds = (data: unknown) =>
	((data as { root: { id: string }[] }).root ?? []).map((o) => o.id);

describe("stripUnknownObjects", () => {
	it("returns the input unchanged when every type is known", () => {
		const input = doc([rect("r1"), group("g1", [rect("r2")])]);
		const result = strip(input);
		expect(result.data).toBe(input);
		expect(result.warnings).toEqual([]);
	});

	it("returns non-document input unchanged (left to validateStructure)", () => {
		expect(strip(null).data).toBe(null);
		expect(strip({ version: 1 }).warnings).toEqual([]);
	});

	it("preserves top-level fields such as $schema and background when stripping", () => {
		const result = strip({
			$schema: "https://example/s.json",
			version: 1,
			background: "#fff",
			root: [rect("r1"), unknownShape("u1")],
		});
		const stripped = result.data as Record<string, unknown>;
		expect(stripped.$schema).toBe("https://example/s.json");
		expect(stripped.version).toBe(1);
		expect(stripped.background).toBe("#fff");
		expect(rootIds(result.data)).toEqual(["r1"]);
	});

	it("removes an unknown-type object at the root with a warning", () => {
		const result = strip(doc([rect("r1"), unknownShape("u1")]));
		expect(rootIds(result.data)).toEqual(["r1"]);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].path).toBe("root[1].type");
		expect(result.warnings[0].id).toBe("u1");
		expect(result.warnings[0].message).toContain(
			'Unknown object type "hexagram"',
		);
	});

	it("removes an unknown-type child but keeps the group and its siblings", () => {
		const result = strip(doc([group("g1", [rect("r1"), unknownShape("u1")])]));
		const g = (result.data as { root: { children: { id: string }[] }[] })
			.root[0];
		expect(g.children.map((c) => c.id)).toEqual(["r1"]);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].path).toBe("root[0].children[1].type");
	});

	it("removes a group whose children were all removed", () => {
		const result = strip(doc([group("g1", [unknownShape("u1")]), rect("r1")]));
		expect(rootIds(result.data)).toEqual(["r1"]);
		expect(result.warnings.map((w) => w.path)).toEqual([
			"root[0].children[0].type",
			"root[0]",
		]);
	});

	it("cascades emptied-group removal through nested groups", () => {
		const result = strip(
			doc([group("g1", [group("g2", [unknownShape("u1")])])]),
		);
		expect(rootIds(result.data)).toEqual([]);
		expect(result.warnings.map((w) => w.id)).toEqual(["u1", "g2", "g1"]);
	});

	it("removes a connector whose endpoint owner was removed", () => {
		const result = strip(
			doc([
				rect("r1"),
				unknownShape("u1"),
				connector("c1", ownedRef("r1"), ownedRef("u1")),
				connector("c2", ownedRef("r1"), freeRef(5, 5)),
			]),
		);
		expect(rootIds(result.data)).toEqual(["r1", "c2"]);
		const connectorWarning = result.warnings.find((w) => w.id === "c1");
		expect(connectorWarning?.path).toBe("root[2]");
	});

	it("removes a connector attached to a descendant of a removed subtree", () => {
		// The unknown type carries children of its own: the whole subtree goes,
		// and connectors to any of its descendants go with it.
		const result = strip(
			doc([
				rect("r1"),
				unknownShape("u1", { children: [rect("r2")] }),
				connector("c1", ownedRef("r1"), ownedRef("r2")),
			]),
		);
		expect(rootIds(result.data)).toEqual(["r1"]);
	});

	it("keeps a connector whose owner never existed (left to validateSemantics)", () => {
		const result = strip(
			doc([rect("r1"), connector("c1", ownedRef("r1"), ownedRef("ghost"))]),
		);
		expect(rootIds(result.data)).toEqual(["r1", "c1"]);
		expect(result.warnings).toEqual([]);
	});

	it("leaves corrupt entries in place (left to validateStructure)", () => {
		const result = strip(
			doc(["not-an-object", { id: "x", type: 1 }, rect("r1")]),
		);
		expect((result.data as { root: unknown[] }).root).toHaveLength(3);
		expect(result.warnings).toEqual([]);
	});
});
