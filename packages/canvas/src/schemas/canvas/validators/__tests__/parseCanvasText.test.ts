import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initializeObjectDocValidatorRegistry } from "../../../registry/initializeObjectDocValidatorRegistry";
import { objectDocValidatorRegistry } from "../../../registry/ObjectDocValidatorRegistry";
import { parseCanvasText } from "../parseCanvasText";

// parseCanvasText is a sociable orchestrator that ties together JSON.parse →
// validateStructure → validateSemantics along with registry initialization.
// It verifies the "wiring" (kind dispatch, ordering, self-initialization, the
// no-throw contract) rather than the internals of the individual validators.

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

// Each test starts from an empty registry (cold start). This keeps tests
// isolated while also ensuring every test exercises parseCanvasText's
// self-initialization contract.
beforeEach(() => {
	objectDocValidatorRegistry.clear();
});
afterEach(() => {
	objectDocValidatorRegistry.clear();
});

describe("parseCanvasText", () => {
	describe("result kind dispatch", () => {
		it("returns ok for a valid doc, with doc matching the input", () => {
			const doc = validDoc([rect("r1"), rect("r2")]);
			const result = parseCanvasText(text(doc));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc).toEqual(doc);
			}
		});

		it("passes an ok doc through untouched, preserving metadata such as $schema", () => {
			const doc = { $schema: "https://example/s.json", ...validDoc() };
			const result = parseCanvasText(text(doc));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc).toEqual(doc);
			}
		});

		it("returns syntax-error (with a message) for broken JSON", () => {
			const result = parseCanvasText("{ not valid json");
			expect(result.kind).toBe("syntax-error");
			if (result.kind === "syntax-error") {
				expect(result.message.length).toBeGreaterThan(0);
			}
		});

		it("returns structure-error for a structural error (missing required fields)", () => {
			const result = parseCanvasText(
				text(validDoc([{ id: "x", type: "rect" }])),
			);
			expect(result.kind).toBe("structure-error");
			if (result.kind === "structure-error") {
				expect(result.diagnostics.length).toBeGreaterThan(0);
			}
		});

		it("returns ok with warnings for an unknown type (the object is stripped)", () => {
			const result = parseCanvasText(
				text(validDoc([rect("r1"), { id: "u", type: "rectangle" }])),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root.map((o) => o.id)).toEqual(["r1"]);
				expect(result.warnings).toHaveLength(1);
				expect(result.warnings[0].message).toContain(
					'Unknown object type "rectangle"',
				);
			}
		});

		it("returns ok with an empty root when every entry has an unknown type", () => {
			const result = parseCanvasText(
				text(validDoc([{ id: "u1", type: "hexagram" }])),
			);
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc.root).toEqual([]);
				expect(result.warnings).toHaveLength(1);
			}
		});

		it("returns semantic-error when structure is OK but semantics fail (duplicate id)", () => {
			const result = parseCanvasText(
				text(validDoc([rect("dup"), rect("dup")])),
			);
			expect(result.kind).toBe("semantic-error");
			if (result.kind === "semantic-error") {
				expect(
					result.diagnostics.some((d) => d.message.includes("duplicated")),
				).toBe(true);
			}
		});
	});

	describe("structure → semantics ordering (short-circuit)", () => {
		it("returns only structure-error when both structural and semantic errors exist (semantics does not run)", () => {
			// Combine a missing required field (structural) with a duplicate id (semantic)
			const result = parseCanvasText(
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
			const result = parseCanvasText(text({ version: 1, root: 5 }));
			expect(result.kind).toBe("structure-error");
		});
	});

	describe("lazy registry initialization", () => {
		it("returns ok for a valid doc even when called with an empty registry (self-initialization)", () => {
			expect(objectDocValidatorRegistry.isEmpty()).toBe(true);
			const result = parseCanvasText(text(validDoc()));
			expect(result.kind).toBe("ok");
			// After the call the registry is populated
			expect(objectDocValidatorRegistry.isEmpty()).toBe(false);
		});

		it("connectable checks work correctly from a cold start (group is not connectable)", () => {
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
			const result = parseCanvasText(text(doc));
			expect(result.kind).toBe("semantic-error");
			if (result.kind === "semantic-error") {
				expect(
					result.diagnostics.some((d) => d.message.includes("not connectable")),
				).toBe(true);
			}
		});

		it("works idempotently even when already initialized", () => {
			initializeObjectDocValidatorRegistry();
			expect(objectDocValidatorRegistry.isEmpty()).toBe(false);
			expect(parseCanvasText(text(validDoc())).kind).toBe("ok");
			// Repeated calls do not break it
			expect(parseCanvasText(text(validDoc())).kind).toBe("ok");
		});
	});

	describe("no-throw contract", () => {
		it.each(["", "null", "123", "true", '"str"', "[]", "{}", "[1,2,3]"])(
			"returns a union without throwing for input %j",
			(input) => {
				let result: ReturnType<typeof parseCanvasText> | undefined;
				expect(() => {
					result = parseCanvasText(input);
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
				const { parseCanvasText: freshParse } =
					await import("../parseCanvasText");
				const result = freshParse(text(validDoc()));
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
