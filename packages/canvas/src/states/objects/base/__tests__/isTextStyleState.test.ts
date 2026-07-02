import { describe, it, expect } from "vitest";

import { isTextStyleState } from "../TextStyleState";

// NOTE: Validation of concrete CSS colors depends on isCssColor (CSS.supports), which
// cannot be verified because this package's vitest environment (node) has no CSS.
// Here we cover the acceptance of the sentinel "auto" (a path short-circuited independent of env).
describe("isTextStyleState", () => {
	it('accepts a fontColor of the sentinel "auto" (theme-following)', () => {
		// Rejecting auto would prevent TextEditorLayer from rendering and break text editing (issue #38)
		expect(isTextStyleState({ fontColor: "auto" })).toBe(true);
	});

	it("can validate via other text properties even without fontColor", () => {
		expect(
			isTextStyleState({
				text: "hello",
				textAlign: "center",
				verticalAlign: "middle",
				fontSize: 16,
			}),
		).toBe(true);
	});

	it("rejects an invalid textAlign before reaching fontColor validation", () => {
		expect(isTextStyleState({ textAlign: "justify" })).toBe(false);
	});
});
