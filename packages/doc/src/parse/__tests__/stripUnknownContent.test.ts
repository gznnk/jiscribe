import { describe, expect, it } from "vitest";

import { createDocValidatorRegistry } from "../createDocValidatorRegistry";
import { stripUnknownContent } from "../stripUnknownContent";

// stripUnknownContent decides known/unknown via the registry, so use the same
// precondition as production (the parser hands it the built-in set).
const registry = createDocValidatorRegistry();

const strip = (data: unknown) => stripUnknownContent(data, registry);

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

describe("stripUnknownContent", () => {
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

	describe("unknown anchor kinds", () => {
		const anchoredRef = (ownerId: string, kind: unknown) => ({
			owner: { id: ownerId },
			anchor: { kind },
		});

		it("removes a connector whose source anchor names an unknown kind", () => {
			const result = strip(
				doc([
					rect("r1"),
					connector("c1", anchoredRef("r1", "magnetic"), freeRef(5, 5)),
					connector("c2", ownedRef("r1"), freeRef(5, 5)),
				]),
			);
			expect(rootIds(result.data)).toEqual(["r1", "c2"]);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].path).toBe("root[1].source.anchor.kind");
			expect(result.warnings[0].id).toBe("c1");
			expect(result.warnings[0].message).toContain(
				'Unknown anchor kind "magnetic"',
			);
		});

		it("removes a connector whose target anchor names an unknown kind", () => {
			const result = strip(
				doc([
					rect("r1"),
					connector("c1", ownedRef("r1"), anchoredRef("r1", "magnetic")),
				]),
			);
			expect(rootIds(result.data)).toEqual(["r1"]);
			expect(result.warnings[0].path).toBe("root[1].target.anchor.kind");
		});

		it("keeps a known kind used in the wrong position (left to validateStructure)", () => {
			// "free" on an owned endpoint is a mismatch, not an unknown value.
			const result = strip(
				doc([
					rect("r1"),
					connector("c1", anchoredRef("r1", "free"), freeRef(5, 5)),
				]),
			);
			expect(rootIds(result.data)).toEqual(["r1", "c1"]);
			expect(result.warnings).toEqual([]);
		});

		it("keeps a non-string kind (left to validateStructure)", () => {
			const result = strip(
				doc([
					rect("r1"),
					connector("c1", anchoredRef("r1", 42), freeRef(5, 5)),
				]),
			);
			expect(rootIds(result.data)).toEqual(["r1", "c1"]);
			expect(result.warnings).toEqual([]);
		});

		it("reports the connector removal instead of its own unknown enum fields", () => {
			const result = strip(
				doc([
					rect("r1"),
					{
						...connector("c1", anchoredRef("r1", "magnetic"), freeRef(5, 5)),
						routing: "curvy",
					},
				]),
			);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].path).toBe("root[1].source.anchor.kind");
		});
	});

	describe("unknown pure-enum values", () => {
		const rootObject = (result: { data: unknown }) =>
			(result.data as { root: Record<string, unknown>[] }).root[0];

		it("drops an unknown flat enum value and keeps valid siblings", () => {
			const result = strip(
				doc([
					rect("r1", {
						strokeDashType: "wavy",
						textAlign: "left",
						verticalAlign: "everywhere",
					}),
				]),
			);
			const stripped = rootObject(result);
			expect("strokeDashType" in stripped).toBe(false);
			expect("verticalAlign" in stripped).toBe(false);
			expect(stripped.textAlign).toBe("left");
			expect(result.warnings.map((w) => w.path)).toEqual([
				"root[0].strokeDashType",
				"root[0].verticalAlign",
			]);
			expect(result.warnings[0].id).toBe("r1");
		});

		it("drops unknown startArrow/endArrow and routing on a connector", () => {
			const result = strip(
				doc([
					rect("r1"),
					{
						...connector("c1", ownedRef("r1"), freeRef(5, 5)),
						startArrow: "harpoon",
						endArrow: "OpenArrow",
						routing: "curvy",
					},
				]),
			);
			const c = (result.data as { root: Record<string, unknown>[] }).root[1];
			expect("startArrow" in c).toBe(false);
			expect("routing" in c).toBe(false);
			expect(c.endArrow).toBe("OpenArrow");
		});

		it("drops an unknown enum value in a nested object (connector label)", () => {
			const result = strip(
				doc([
					rect("r1"),
					{
						...connector("c1", ownedRef("r1"), freeRef(5, 5)),
						label: { text: "hello", strokeDashType: "wavy" },
					},
				]),
			);
			const c = (result.data as { root: Record<string, unknown>[] }).root[1];
			const label = c.label as Record<string, unknown>;
			expect("strokeDashType" in label).toBe(false);
			expect(label.text).toBe("hello");
			expect(result.warnings[0].path).toBe("root[1].label.strokeDashType");
			expect(result.warnings[0].id).toBe("c1");
		});

		it("drops an unknown enum value inside a group child", () => {
			const result = strip(
				doc([group("g1", [rect("r1", { textAlign: "justify" })])]),
			);
			const g = rootObject(result);
			const child = (g.children as Record<string, unknown>[])[0];
			expect("textAlign" in child).toBe(false);
			expect(result.warnings[0].path).toBe("root[0].children[0].textAlign");
		});

		it("returns the input unchanged when every enum value is valid", () => {
			const input = doc([
				rect("r1", { strokeDashType: "dashed", textAlign: "center" }),
			]);
			const result = strip(input);
			expect(result.data).toBe(input);
			expect(result.warnings).toEqual([]);
		});
	});
});
