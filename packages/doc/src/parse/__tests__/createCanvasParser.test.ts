import { describe, expect, it, vi } from "vitest";

import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";
import { builtinObjectDocDefinitions } from "../../plugin/builtinObjectDocDefinitions";
import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";
import type { ObjectDocValidateFn } from "../../plugin/ObjectDocValidateFn";
import type { CanvasParseResult } from "../createCanvasParser";
import { createCanvasParser } from "../createCanvasParser";

// createCanvasParser builds a dedicated (non-global) registry from a preset/plugin
// composition and runs the staged pipeline behind `parse` (JSON.parse →
// stripUnknownContent → checkStructure → per-type checks → checkSemantics → unknown-key
// removal). The first suite exercises the composition contract, the second the
// pipeline's wiring through the default parser (kind dispatch, ordering, the no-throw
// contract); the individual validation rules are covered by checkStructure.test.ts /
// checkSemantics.test.ts.

const rect = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	type: "rect",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	...over,
});
const text = (doc: unknown) => JSON.stringify(doc);
const parse = (text: string): CanvasParseResult =>
	createCanvasParser().parse(text);

const validDoc = (root: unknown[] = [rect("r1")]) => ({ version: 1, root });

// A minimal stand-in for a plugin object type (mirrors how plugin-container-shapes
// registers "container"), used instead of importing an actual plugin so this suite has
// no dependency beyond the schema layer.
const starFeatures = {
	type: "star",
	geometry: "rect",
	transform: true,
	connectable: true,
} as const;

const validateStarDoc: ObjectDocValidateFn = (obj, path) => {
	const errors: SemanticDiagnostic[] = [];
	if ("points" in obj && (typeof obj.points !== "number" || obj.points <= 0)) {
		errors.push({
			path: `${path}.points`,
			message: "must be a positive number",
			severity: "error",
		});
	}
	return errors;
};

const starDocDefinition: ObjectDocDefinition = {
	features: starFeatures,
	validateDoc: validateStarDoc,
};

// A plugin exposing the "star" type through its `objects` map (the structural
// subset createCanvasParser reads; no `@jiscribe/canvas` controllers-layer import).
const starPlugin = { id: "star-plugin", objects: { star: starDocDefinition } };

const star = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	type: "star",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	points: 5,
	...over,
});

describe("createCanvasParser", () => {
	describe("without the plugin definition registered", () => {
		it("keeps the plugin-type object as it is and reports it as an ok warning", () => {
			const parser = createCanvasParser();
			const result = parser.parse(
				text({ version: 1, root: [rect("r1"), star("s1")] }),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root.map((o) => o.id)).toEqual(["r1", "s1"]);
				expect(result.doc.root[1]).toEqual(star("s1"));
				expect(result.warnings).toHaveLength(1);
				expect(result.warnings[0].message).toContain(
					'Object type "star" is not a type this build knows',
				);
			}
		});
	});

	describe("a document holding objects of types the parser does not know", () => {
		it("serializes back to the text it was parsed from, nesting and z-order included", () => {
			const doc = {
				version: 1,
				root: [
					star("s1"),
					rect("r1"),
					{
						id: "g1",
						type: "group",
						children: [rect("r2"), star("s2", { strokeDashType: "wavy" })],
					},
					{
						id: "c1",
						type: "connector",
						points: [],
						source: { owner: { id: "r1" }, anchor: { kind: "center" } },
						target: { owner: { id: "s2" }, anchor: { kind: "center" } },
					},
					star("s3"),
				],
			};
			const sourceText = JSON.stringify(doc, null, "\t");

			const result = createCanvasParser().parse(sourceText);

			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(JSON.stringify(result.doc, null, "\t")).toBe(sourceText);
				expect(result.warnings.map((warning) => warning.id)).toEqual([
					"s1",
					"s2",
					"s3",
				]);
			}
		});
	});

	describe("with the plugin definition registered (via plugins)", () => {
		const buildParser = () => createCanvasParser({ plugins: [starPlugin] });

		it("accepts the same doc that was rejected without the plugin", () => {
			const parser = buildParser();
			const result = parser.parse(text({ version: 1, root: [star("s1")] }));
			expect(result.kind).toBe("ok");
		});

		it("surfaces the plugin's own validateDoc diagnostics (invalid points)", () => {
			const parser = buildParser();
			const result = parser.parse(
				text({ version: 1, root: [star("s1", { points: -1 })] }),
			);
			expect(result.kind).toBe("structure-error");
			if (result.kind === "structure-error") {
				expect(
					result.diagnostics.some((d) =>
						d.message.includes("must be a positive number"),
					),
				).toBe(true);
			}
		});

		it("treats the plugin type as a connectable endpoint (features-driven isConnectable)", () => {
			const parser = buildParser();
			const doc = {
				version: 1,
				root: [
					rect("r1"),
					star("s1"),
					{
						id: "c1",
						type: "connector",
						points: [],
						source: { owner: { id: "r1" }, anchor: { kind: "center" } },
						target: { owner: { id: "s1" }, anchor: { kind: "center" } },
					},
				],
			};
			expect(parser.parse(text(doc)).kind).toBe("ok");
		});
	});

	describe("preset filter + plugin: replacing a built-in type", () => {
		it("lets a plugin override a built-in type once the preset entry is filtered out", () => {
			const strictRectDefinition: ObjectDocDefinition = {
				features: builtinObjectDocDefinitions.rect.features,
				validateDoc: (_obj, path) => [
					{
						path,
						message: "rect is disabled by this parser configuration",
						severity: "error",
					},
				],
			};
			const { rect: _omitted, ...presetsWithoutRect } =
				builtinObjectDocDefinitions;
			const parser = createCanvasParser({
				presetDefinitions: presetsWithoutRect,
				plugins: [
					{ id: "strict-rect-plugin", objects: { rect: strictRectDefinition } },
				],
			});
			const result = parser.parse(text({ version: 1, root: [rect("r1")] }));
			expect(result.kind).toBe("structure-error");
			if (result.kind === "structure-error") {
				expect(
					result.diagnostics.some((d) =>
						d.message.includes("disabled by this parser configuration"),
					),
				).toBe(true);
			}
		});
	});

	describe("duplicate type detection (throws at construction time)", () => {
		it("throws when a plugin duplicates a preset type", () => {
			expect(() =>
				createCanvasParser({
					plugins: [
						{
							id: "rect-plugin",
							objects: { rect: builtinObjectDocDefinitions.rect },
						},
					],
				}),
			).toThrow(/rect-plugin/);
		});

		it("does not throw for a valid non-overlapping composition", () => {
			expect(() => createCanvasParser({ plugins: [starPlugin] })).not.toThrow();
		});
	});

	describe("plugins", () => {
		const moonDocDefinition: ObjectDocDefinition = {
			features: { ...starFeatures, type: "moon" },
			validateDoc: () => [],
		};
		const moonPlugin = {
			id: "moon-plugin",
			objects: { moon: moonDocDefinition },
		};

		it("accepts a doc using a plugin-supplied type", () => {
			const parser = createCanvasParser({ plugins: [moonPlugin] });
			const result = parser.parse(
				text({ version: 1, root: [{ ...star("m1"), type: "moon" }] }),
			);
			expect(result.kind).toBe("ok");
		});

		it("merges presetDefinitions and multiple plugins together", () => {
			const parser = createCanvasParser({
				plugins: [starPlugin, moonPlugin],
			});
			const doc = {
				version: 1,
				root: [rect("r1"), star("s1"), { ...star("m1"), type: "moon" }],
			};
			expect(parser.parse(text(doc)).kind).toBe("ok");
		});

		it("throws (with both plugin ids) when two plugins duplicate a type", () => {
			expect(() =>
				createCanvasParser({
					plugins: [
						{ id: "plugin-a", objects: { star: starDocDefinition } },
						{ id: "plugin-b", objects: { star: starDocDefinition } },
					],
				}),
			).toThrow(/plugin-a.*plugin-b|plugin-b.*plugin-a/);
		});
	});

	// Omitting config falls back to every built-in type and nothing else, which is what
	// a host that ships no plugin gets.
	describe("default configuration (config omitted)", () => {
		it("accepts a doc built from built-in types only", () => {
			const doc = { version: 1, root: [rect("r1")] };
			const result = createCanvasParser().parse(text(doc));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc).toEqual(doc);
			}
		});

		it("keeps a type no built-in supplies and reports it as an ok warning", () => {
			const doc = { version: 1, root: [{ id: "x", type: "rectangle" }] };
			const result = createCanvasParser().parse(text(doc));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root).toEqual(doc.root);
				expect(result.warnings).toHaveLength(1);
			}
		});

		it("still runs the semantic rules (duplicate id)", () => {
			const doc = { version: 1, root: [rect("dup"), rect("dup")] };
			const result = createCanvasParser().parse(text(doc));
			expect(result.kind).toBe("semantic-error");
		});
	});
});

describe("parse: the staged pipeline", () => {
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
						(diagnostic) => diagnostic.severity === "error",
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
			// Without short-circuiting, checkSemantics would throw on 5.forEach and yield internal-error.
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
			vi.doMock("../checkSemantics", () => ({
				checkSemantics: () => {
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
				vi.doUnmock("../checkSemantics");
				vi.resetModules();
			}
		});
	});
});
