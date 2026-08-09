import { describe, expect, it } from "vitest";

import type { ObjectDocDefinition } from "../../../plugin/ObjectDocDefinition";
import { builtinObjectDocDefinitions } from "../../../registry/builtinObjectDocDefinitions";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createCanvasParser } from "../createCanvasParser";
import { parseCanvasText } from "../parseCanvasText";
import type { SemanticDiagnostic } from "../types";

// createCanvasParser builds a dedicated (non-global) registry from a preset/plugin
// composition. These tests exercise that composition contract; the individual
// structure/semantics validation rules themselves are covered by validateStructure.test.ts /
// validateSemantics.test.ts.

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
		it("strips the plugin-type object and reports it as an ok warning", () => {
			const parser = createCanvasParser();
			const result = parser.parse(
				text({ version: 1, root: [rect("r1"), star("s1")] }),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root.map((o) => o.id)).toEqual(["r1"]);
				expect(result.warnings).toHaveLength(1);
				expect(result.warnings[0].message).toContain(
					'Unknown object type "star"',
				);
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
					{ path, message: "rect is disabled by this parser configuration" },
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

	describe("default configuration (config omitted)", () => {
		it("returns the same result as parseCanvasText for a valid doc", () => {
			const doc = { version: 1, root: [rect("r1")] };
			const parser = createCanvasParser();
			expect(parser.parse(text(doc))).toEqual(parseCanvasText(text(doc)));
		});

		it("returns the same result as parseCanvasText for a structurally invalid doc", () => {
			const doc = { version: 1, root: [{ id: "x", type: "rectangle" }] };
			const parser = createCanvasParser();
			expect(parser.parse(text(doc))).toEqual(parseCanvasText(text(doc)));
		});

		it("returns the same result as parseCanvasText for a semantically invalid doc (duplicate id)", () => {
			const doc = { version: 1, root: [rect("dup"), rect("dup")] };
			const parser = createCanvasParser();
			expect(parser.parse(text(doc))).toEqual(parseCanvasText(text(doc)));
		});
	});
});
