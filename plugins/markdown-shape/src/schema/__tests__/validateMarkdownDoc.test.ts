import { describe, it, expect } from "vitest";

import { MARKDOWN_DOC_DEFAULTS } from "../MarkdownDoc";
import { MarkdownObjectFactory } from "../MarkdownObjectFactory";
import { validateMarkdownDoc } from "../validateMarkdownDoc";

const validMarkdown = {
	x: 10,
	y: 20,
	width: 300,
	height: 200,
	stroke: "auto",
	fill: "auto",
	rx: 0,
	text: "# Title\n\nBody with **bold**.",
	textAlign: "left",
	verticalAlign: "top",
};

describe("validateMarkdownDoc", () => {
	it("yields no error for a valid Markdown card", () => {
		expect(validateMarkdownDoc(validMarkdown, "root")).toEqual([]);
	});

	it("accepts a corner radius (the type declares the radius feature)", () => {
		expect(validateMarkdownDoc({ ...validMarkdown, rx: 8 }, "root")).toEqual(
			[],
		);
	});

	it("is an error when the body is not a string", () => {
		const errors = validateMarkdownDoc({ ...validMarkdown, text: 42 }, "root");
		expect(errors.some((e) => e.path === "root.text")).toBe(true);
	});

	it("is an error when textAlign has an invalid value", () => {
		const errors = validateMarkdownDoc(
			{ ...validMarkdown, textAlign: "justify" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.textAlign")).toBe(true);
	});
});

describe("MarkdownObjectFactory", () => {
	it("creates a doc that passes its own validator", () => {
		const created = MarkdownObjectFactory.createDoc({ x: 100, y: 50 });
		expect(validateMarkdownDoc(created, "root")).toEqual([]);
	});

	it("is drag-drawable (createDocFromBounds is present)", () => {
		expect(MarkdownObjectFactory.createDocFromBounds).toBeTypeOf("function");
	});

	it("starts with an empty body — the sample text belongs to the stencil", () => {
		expect(MARKDOWN_DOC_DEFAULTS.text).toBe("");
	});

	it("defaults to a document-shaped card: left/top aligned and theme-following", () => {
		expect(MARKDOWN_DOC_DEFAULTS).toMatchObject({
			width: 300,
			height: 200,
			textAlign: "left",
			verticalAlign: "top",
			fill: "auto",
		});
	});
});
