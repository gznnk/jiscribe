import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { describe, expect, it } from "vitest";

import { theme } from "../../../../../../constants/theme";
import { resolveLabelFill } from "../resolveLabelFill";

describe("resolveLabelFill", () => {
	it("omitted (undefined) resolves to the canvas background color (knockout)", () => {
		expect(resolveLabelFill(undefined)).toBe(theme.canvasBg);
	});

	it('"auto" also resolves to the canvas background color (decision: auto→canvasBg)', () => {
		expect(resolveLabelFill(AUTO_COLOR)).toBe(theme.canvasBg);
	});

	it("returns a concrete color as-is", () => {
		expect(resolveLabelFill("#ff0000")).toBe("#ff0000");
	});

	it('"transparent" is returned as-is (choosing to show the line through)', () => {
		expect(resolveLabelFill("transparent")).toBe("transparent");
	});
});
