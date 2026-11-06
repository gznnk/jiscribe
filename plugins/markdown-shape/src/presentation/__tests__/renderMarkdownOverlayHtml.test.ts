import { renderMarkdown } from "@jiscribe/markdown";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderMarkdownOverlayHtml } from "../renderMarkdownOverlayHtml";

// The real renderer's sanitizer needs a DOM this package's tests run without.
vi.mock("@jiscribe/markdown", () => ({
	renderMarkdown: vi.fn((source: string) => `<p>${source}</p>`),
}));

describe("renderMarkdownOverlayHtml", () => {
	beforeEach(() => {
		vi.mocked(renderMarkdown).mockClear();
	});

	it("renders the source when the body is not being edited", () => {
		expect(renderMarkdownOverlayHtml("# Title", false)).toBe("<p># Title</p>");
		expect(renderMarkdown).toHaveBeenCalledWith("# Title");
	});

	it("does not render the source while the body is being edited", () => {
		expect(renderMarkdownOverlayHtml("# Title", true)).toBe("");
		expect(renderMarkdown).not.toHaveBeenCalled();
	});

	it("does not render an empty source", () => {
		expect(renderMarkdownOverlayHtml("", false)).toBe("");
		expect(renderMarkdown).not.toHaveBeenCalled();
	});
});
