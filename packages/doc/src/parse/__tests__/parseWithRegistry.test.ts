import { describe, expect, it, vi } from "vitest";

import { createCanvasParser } from "../createCanvasParser";
import type { CanvasParseResult } from "../parseWithRegistry";

// parseWithRegistry is the sociable orchestrator behind every parser: JSON.parse →
// stripUnknownContent → validateStructure → validateSemantics. It is exercised here
// through the default `createCanvasParser()` (every built-in type, no plugin), which
// verifies the "wiring" (kind dispatch, ordering, the no-throw contract) rather than the
// internals of the individual validators. The preset/plugin composition on top of it is
// covered by createCanvasParser.test.ts.

const parse = (text: string): CanvasParseResult =>
	createCanvasParser().parse(text);

const rect = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	type: "rect",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	...over,
});
const validDoc = (root: unknown[] = [rect("r1")]) => ({ version: 1, root });
const text = (doc: unknown) => JSON.stringify(doc);

describe("parseWithRegistry", () => {
	describe("result kind dispatch", () => {
		it("returns ok for a valid doc, with doc matching the input", () => {
			const doc = validDoc([rect("r1"), rect("r2")]);
			const result = parse(text(doc));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc).toEqual(doc);
			}
		});

		it("passes an ok doc through untouched, preserving metadata such as $schema", () => {
			const doc = { $schema: "https://example/s.json", ...validDoc() };
			const result = parse(text(doc));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc).toEqual(doc);
			}
		});

		it("returns syntax-error (with a message) for broken JSON", () => {
			const result = parse("{ not valid json");
			expect(result.kind).toBe("syntax-error");
			if (result.kind === "syntax-error") {
				expect(result.message.length).toBeGreaterThan(0);
			}
		});

		it("returns structure-error for a structural error (missing required fields)", () => {
			const result = parse(text(validDoc([{ id: "x", type: "rect" }])));
			expect(result.kind).toBe("structure-error");
			if (result.kind === "structure-error") {
				expect(result.diagnostics.length).toBeGreaterThan(0);
			}
		});

		it("returns ok with warnings for an unknown type (the object is kept as it is)", () => {
			const unknownObject = {
				id: "u",
				type: "rectangle",
				strokeDashType: "wavy",
				children: [{ id: "inner", type: "nope" }],
			};
			const result = parse(text(validDoc([rect("r1"), unknownObject])));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root.map((o) => o.id)).toEqual(["r1", "u"]);
				// Nothing inside it is ours: not even an unknown enum value is stripped.
				expect(result.doc.root[1]).toEqual(unknownObject);
				expect(result.warnings).toHaveLength(1);
				expect(result.warnings[0].message).toBe(
					'Object type "rectangle" is not a type this build knows: the object is kept as it is but not drawn.',
				);
			}
		});

		it("drops an unknown-type object that has no id, which nothing could keep in place", () => {
			const result = parse(
				text(validDoc([rect("r1"), { type: "rectangle", x: 0 }])),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root.map((o) => o.id)).toEqual(["r1"]);
				expect(result.warnings[0].message).toContain("will be dropped on save");
			}
		});

		it("accepts a connector attached to an unknown-type object or to what it holds", () => {
			const result = parse(
				text(
					validDoc([
						rect("r1"),
						{ id: "u1", type: "hexagram", children: [{ id: "u1-inner" }] },
						{
							id: "c1",
							type: "connector",
							points: [],
							source: { owner: { id: "r1" }, anchor: { kind: "center" } },
							target: { owner: { id: "u1" }, anchor: { kind: "center" } },
						},
						{
							id: "c2",
							type: "connector",
							points: [],
							source: { owner: { id: "r1" }, anchor: { kind: "center" } },
							target: {
								owner: { id: "u1-inner" },
								anchor: { kind: "center" },
							},
						},
					]),
				),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root.map((o) => o.id)).toEqual([
					"r1",
					"u1",
					"c1",
					"c2",
				]);
			}
		});

		it("still rejects an id an unknown-type object shares with another object", () => {
			const result = parse(
				text(validDoc([rect("dup"), { id: "dup", type: "hexagram" }])),
			);
			expect(result.kind).toBe("semantic-error");
		});

		it("returns ok with warnings for an unknown enum value (the field is stripped)", () => {
			const result = parse(
				text(validDoc([rect("r1", { strokeDashType: "wavy" })])),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect("strokeDashType" in result.doc.root[0]).toBe(false);
				expect(result.warnings).toHaveLength(1);
				expect(result.warnings[0].path).toBe("root[0].strokeDashType");
			}
		});

		it("returns ok with warnings for an unknown anchor kind (the connector is stripped)", () => {
			const result = parse(
				text(
					validDoc([
						rect("r1"),
						{
							id: "c1",
							type: "connector",
							points: [],
							source: { owner: { id: "r1" }, anchor: { kind: "magnetic" } },
							target: { anchor: { kind: "free", point: { x: 5, y: 5 } } },
						},
					]),
				),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root.map((o) => o.id)).toEqual(["r1"]);
				expect(result.warnings[0].message).toContain(
					'Unknown anchor kind "magnetic"',
				);
			}
		});

		it("keeps every entry when all of them have an unknown type", () => {
			const result = parse(text(validDoc([{ id: "u1", type: "hexagram" }])));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root).toEqual([{ id: "u1", type: "hexagram" }]);
				expect(result.warnings).toHaveLength(1);
			}
		});

		it("returns semantic-error when structure is OK but semantics fail (duplicate id)", () => {
			const result = parse(text(validDoc([rect("dup"), rect("dup")])));
			expect(result.kind).toBe("semantic-error");
			if (result.kind === "semantic-error") {
				expect(
					result.diagnostics.some((d) => d.message.includes("duplicated")),
				).toBe(true);
			}
		});

		it("reads connectability from the registry's features (a group is not connectable)", () => {
			const doc = validDoc([
				rect("a"),
				{ id: "g", type: "group", children: [rect("gc")] },
				{
					id: "c",
					type: "connector",
					points: [],
					source: {
						owner: { id: "a" },
						anchor: { kind: "center" },
					},
					target: {
						owner: { id: "g" },
						anchor: { kind: "center" },
					},
				},
			]);
			const result = parse(text(doc));
			expect(result.kind).toBe("semantic-error");
			if (result.kind === "semantic-error") {
				expect(
					result.diagnostics.some((d) => d.message.includes("not connectable")),
				).toBe(true);
			}
		});
	});

	describe("unknown properties on a known type", () => {
		it("reads the document, warns, and takes the property out of ok.doc", () => {
			const result = parse(text(validDoc([rect("r1", { zzUnknown: 1 })])));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root[0]).toEqual(rect("r1"));
				expect(result.warnings).toEqual([
					{
						path: "root[0].zzUnknown",
						message:
							'Unknown property "zzUnknown" on a "rect": it was ignored and will be dropped on save.',
						severity: "warning",
						unknownKeyPath: ["zzUnknown"],
					},
				]);
			}
		});

		it.each(["a.b", "x[0]", "", "constructor"])(
			"removes a property named %j, which no path string could be read back into",
			(name) => {
				const result = parse(text(validDoc([rect("r1", { [name]: 1 })])));
				expect(result.kind).toBe("ok");
				if (result.kind === "ok") {
					expect(Object.keys(result.doc.root[0])).not.toContain(name);
					expect(result.warnings).toHaveLength(1);
				}
			},
		);

		it("reaches a group's children", () => {
			const result = parse(
				text(
					validDoc([
						{
							id: "g",
							type: "group",
							children: [rect("gc", { zzUnknown: 1 })],
						},
					]),
				),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				const group = result.doc.root[0] as unknown as {
					children: Record<string, unknown>[];
				};
				expect(group.children[0]).toEqual(rect("gc"));
				expect(result.warnings[0].path).toBe("root[0].children[0].zzUnknown");
			}
		});

		it("leaves an opaque object's own fields alone", () => {
			const opaque = { id: "u", type: "hexagram", zzUnknown: 1 };
			const result = parse(text(validDoc([opaque])));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root[0]).toEqual(opaque);
			}
		});

		it("lists the strip's warnings first, then the validators'", () => {
			const result = parse(
				text(validDoc([rect("r1", { strokeDashType: "wavy", zzUnknown: 1 })])),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.warnings.map((warning) => warning.path)).toEqual([
					"root[0].strokeDashType",
					"root[0].zzUnknown",
				]);
			}
		});

		it("reports structure-error, warning-free, when an error sits beside it", () => {
			const result = parse(
				text(validDoc([{ id: "r1", type: "rect", zzUnknown: 1 }])),
			);
			expect(result.kind).toBe("structure-error");
			if (result.kind === "structure-error") {
				expect(
					result.diagnostics.every(
						(diagnostic) => diagnostic.severity !== "warning",
					),
				).toBe(true);
			}
		});
	});

	describe("structure → semantics ordering (short-circuit)", () => {
		it("returns only structure-error when both structural and semantic errors exist (semantics does not run)", () => {
			// Combine a missing required field (structural) with a duplicate id (semantic)
			const result = parse(
				text(validDoc([rect("dup"), rect("dup"), { id: "u", type: "rect" }])),
			);
			expect(result.kind).toBe("structure-error");
			if (result.kind === "structure-error") {
				// semantics did not run, so "duplicated" is not included
				expect(
					result.diagnostics.some((d) => d.message.includes("duplicated")),
				).toBe(false);
			}
		});

		it("returns structure-error when root is not an array (not internal-error)", () => {
			// Without short-circuiting, validateSemantics would throw on 5.forEach and yield internal-error.
			const result = parse(text({ version: 1, root: 5 }));
			expect(result.kind).toBe("structure-error");
		});
	});

	describe("no-throw contract", () => {
		it.each(["", "null", "123", "true", '"str"', "[]", "{}", "[1,2,3]"])(
			"returns a union without throwing for input %j",
			(input) => {
				let result: CanvasParseResult | undefined;
				expect(() => {
					result = parse(input);
				}).not.toThrow();
				expect([
					"ok",
					"syntax-error",
					"structure-error",
					"semantic-error",
					"internal-error",
				]).toContain(result?.kind);
			},
		);
	});

	describe("internal-error path", () => {
		it("returns internal-error (with a message) when an unexpected exception occurs during validation", async () => {
			// Make a validator throw temporarily. vi.doMock + dynamic import confines it to this test.
			vi.resetModules();
			vi.doMock("../validateSemantics", () => ({
				validateSemantics: () => {
					throw new Error("boom from semantics");
				},
			}));
			try {
				const { createCanvasParser: freshCreateCanvasParser } =
					await import("../createCanvasParser");
				const result = freshCreateCanvasParser().parse(text(validDoc()));
				expect(result.kind).toBe("internal-error");
				if (result.kind === "internal-error") {
					expect(result.message).toContain("boom from semantics");
				}
			} finally {
				vi.doUnmock("../validateSemantics");
				vi.resetModules();
			}
		});
	});
});
