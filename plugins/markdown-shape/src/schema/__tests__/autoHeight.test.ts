import { supportsAutoHeight } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { markdownDocDefinition } from "../../doc";

describe("markdown auto height", () => {
	it("is denied, its body being rendered rather than wrapped as plain text", () => {
		// The shared text layout would measure the source, not the headings, lists
		// and code blocks the shape actually draws.
		expect(markdownDocDefinition.autoHeight).toBe(false);
		expect(supportsAutoHeight(markdownDocDefinition)).toBe(false);
	});
});
