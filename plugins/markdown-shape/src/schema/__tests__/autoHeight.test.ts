import { supportsAutoHeight } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { markdownDocDefinition } from "../../doc";

describe("markdown auto height", () => {
	it("is denied, its body being rendered rather than wrapped as plain text", () => {
		// The shared text layout would measure the source, not the headings, lists
		// and code blocks the shape actually draws. The denial follows from the
		// source body rather than from a declaration of its own.
		expect(markdownDocDefinition.autoHeight).toBeUndefined();
		expect(supportsAutoHeight(markdownDocDefinition)).toBe(false);
	});
});
