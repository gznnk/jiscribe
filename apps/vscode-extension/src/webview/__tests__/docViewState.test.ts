import type { CanvasDoc } from "@jiscribe/canvas";
import type { CanvasParseResult } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { applyParseResult, initialDocViewState } from "../docViewState";

const doc = (id: string): CanvasDoc =>
	({ version: "1.0", objects: [{ id, type: "rect" }] }) as unknown as CanvasDoc;

const loaded = applyParseResult(initialDocViewState, {
	kind: "ok",
	doc: doc("a"),
	warnings: [],
});

describe("applyParseResult", () => {
	it("adopts the parsed doc on success", () => {
		expect(loaded).toEqual({
			doc: doc("a"),
			error: null,
		});
	});

	it("clears a standing error once the text parses again", () => {
		const broken = applyParseResult(loaded, {
			kind: "syntax-error",
			message: "Unexpected end of JSON input",
		});
		const recovered = applyParseResult(broken, {
			kind: "ok",
			doc: doc("b"),
			warnings: [],
		});
		expect(recovered).toEqual({
			doc: doc("b"),
			error: null,
		});
	});

	// The point of #136: the canvas must stay mounted on the last valid doc while
	// the editor holds broken text, so it is not rebuilt (and the viewport lost)
	// on every recovery.
	it.each<[string, CanvasParseResult]>([
		["syntax-error", { kind: "syntax-error", message: "bad" }],
		["internal-error", { kind: "internal-error", message: "boom" }],
		["structure-error", { kind: "structure-error", diagnostics: [] }],
		["semantic-error", { kind: "semantic-error", diagnostics: [] }],
	])("keeps the last valid doc on a %s", (_kind, result) => {
		const next = applyParseResult(loaded, result);
		expect(next.doc).toBe(loaded.doc);
		expect(next.error).not.toBeNull();
	});

	it("reports a parse failure with the parser's message", () => {
		const next = applyParseResult(loaded, {
			kind: "syntax-error",
			message: "Unexpected token }",
		});
		expect(next.error).toEqual({
			kind: "parse",
			message: "Unexpected token }",
		});
	});

	it("reports a structure or semantic failure as a validation error", () => {
		const next = applyParseResult(loaded, {
			kind: "semantic-error",
			diagnostics: [],
		});
		expect(next.error).toEqual({ kind: "validation" });
	});

	// Every keystroke on broken text re-parses; an unchanged error must not
	// produce a new state object, or the mounted canvas re-renders for nothing.
	it("returns the same state object while the error is unchanged", () => {
		const broken = applyParseResult(loaded, {
			kind: "syntax-error",
			message: "same",
		});
		expect(
			applyParseResult(broken, { kind: "syntax-error", message: "same" }),
		).toBe(broken);
		expect(
			applyParseResult(broken, { kind: "syntax-error", message: "other" }),
		).not.toBe(broken);
		expect(
			applyParseResult(broken, { kind: "structure-error", diagnostics: [] }),
		).not.toBe(broken);
	});
});
