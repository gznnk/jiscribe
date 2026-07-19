import { describe, expect, it } from "vitest";

import { defaultObjectParserExtensions } from "../../../registry/defaultObjectParserExtensions";
import type { ObjectParserExtension } from "../../../registry/ObjectDocValidatorRegistry";
import { createCanvasParser } from "../createCanvasParser";
import { parseCanvasText } from "../parseCanvasText";
import type { SemanticDiagnostic } from "../types";

// createCanvasParser builds a dedicated (non-global) registry from a preset/extensions
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

const validateStarDoc: ObjectParserExtension["validateDoc"] = (obj, path) => {
	const errors: SemanticDiagnostic[] = [];
	if ("points" in obj && (typeof obj.points !== "number" || obj.points <= 0)) {
		errors.push({
			path: `${path}.points`,
			message: "must be a positive number",
		});
	}
	return errors;
};

const starParserExtension: ObjectParserExtension = {
	type: "star",
	features: starFeatures,
	validateDoc: validateStarDoc,
};

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
	describe("without the plugin extension registered", () => {
		it("rejects a doc containing the plugin type (Unknown object type, structure-error)", () => {
			const parser = createCanvasParser();
			const result = parser.parse(text({ version: 1, root: [star("s1")] }));
			expect(result.kind).toBe("structure-error");
			if (result.kind === "structure-error") {
				expect(
					result.diagnostics.some((d) =>
						d.message.includes('Unknown object type "star"'),
					),
				).toBe(true);
			}
		});
	});

	describe("with the plugin extension registered (via extensions)", () => {
		const buildParser = () =>
			createCanvasParser({ extensions: [starParserExtension] });

		it("accepts the same doc that was rejected without the extension", () => {
			const parser = buildParser();
			const result = parser.parse(text({ version: 1, root: [star("s1")] }));
			expect(result.kind).toBe("ok");
		});

		it("surfaces the extension's own validateDoc diagnostics (invalid points)", () => {
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

	describe("preset filter + extension: replacing a built-in type", () => {
		it("lets an extension override a built-in type once the preset entry is filtered out", () => {
			const strictRectExtension: ObjectParserExtension = {
				type: "rect",
				features: defaultObjectParserExtensions.find((e) => e.type === "rect")!
					.features,
				validateDoc: (_obj, path) => [
					{ path, message: "rect is disabled by this parser configuration" },
				],
			};
			const parser = createCanvasParser({
				presetExtensions: defaultObjectParserExtensions.filter(
					(e) => e.type !== "rect",
				),
				extensions: [strictRectExtension],
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
		it("throws when extensions duplicates a preset type", () => {
			expect(() =>
				createCanvasParser({
					extensions: [
						defaultObjectParserExtensions.find((e) => e.type === "rect")!,
					],
				}),
			).toThrow(/rect/);
		});

		it("throws when extensions itself contains a duplicate type", () => {
			expect(() =>
				createCanvasParser({
					presetExtensions: [],
					extensions: [starParserExtension, starParserExtension],
				}),
			).toThrow(/star/);
		});

		it("throws when presetExtensions itself contains a duplicate type", () => {
			expect(() =>
				createCanvasParser({
					presetExtensions: [starParserExtension, starParserExtension],
				}),
			).toThrow(/star/);
		});

		it("does not throw for a valid non-overlapping composition", () => {
			expect(() =>
				createCanvasParser({ extensions: [starParserExtension] }),
			).not.toThrow();
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
