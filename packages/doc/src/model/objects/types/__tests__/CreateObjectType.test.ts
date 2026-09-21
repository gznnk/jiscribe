import { describe, expect, it } from "vitest";

import type { CreateObjectType } from "../CreateObjectType";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SourceCardDocBrand: unique symbol;

type SourceCardDoc = CreateObjectType<
	{ type: "source-card"; geometry: "rect"; text: "source" },
	typeof SourceCardDocBrand
>;

/** The fields the shape does carry, which every case below starts from. */
const sourceCard = {
	id: "source-card-1",
	type: "source-card",
	x: 0,
	y: 0,
	width: 200,
	height: 100,
	text: "# title",
	fontSize: 14,
} as const as SourceCardDoc;

/**
 * Pins down what `text: "source"` subtracts from the single-body doc form. The
 * subtraction is a compile-time fact, so the assertions that matter are the
 * `@ts-expect-error`s: each fails the type check if the field comes back.
 */
describe("CreateObjectType with text: source", () => {
	it("holds its text as a plain string, never as runs", () => {
		expect(sourceCard.text).toBe("# title");

		// @ts-expect-error a source body takes no run list
		const runs: SourceCardDoc["text"] = [
			{ text: "# title", fontWeight: "bold" },
		];
		expect(runs).toHaveLength(1);
	});

	it("carries the ground typography and the body's placement", () => {
		const styled: SourceCardDoc = {
			...sourceCard,
			fontColor: "#0d47a1",
			fontFamily: "Noto Sans JP",
			textAlign: "left",
			verticalAlign: "top",
			textVerticalBasis: "frame",
		};
		expect(styled.fontColor).toBe("#0d47a1");
	});

	it("carries none of the emphasis typography", () => {
		// @ts-expect-error the source language's own syntax sets the weight
		const weighted: SourceCardDoc = { ...sourceCard, fontWeight: "bold" };
		// @ts-expect-error the source language's own syntax sets the slant
		const slanted: SourceCardDoc = { ...sourceCard, fontStyle: "italic" };
		const decorated: SourceCardDoc = {
			...sourceCard,
			// @ts-expect-error the source language's own syntax sets the decoration
			textDecoration: "underline",
		};
		expect([weighted, slanted, decorated]).toHaveLength(3);
	});
});
