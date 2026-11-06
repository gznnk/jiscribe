import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { describe, expect, it } from "vitest";

import { resolveLabelFill } from "../resolveLabelFill";

const DOCUMENT_SURFACE = "#0b1220";

describe("resolveLabelFill", () => {
	it("omitted (undefined) resolves to the document surface (knockout)", () => {
		expect(resolveLabelFill(undefined, DOCUMENT_SURFACE)).toBe(
			DOCUMENT_SURFACE,
		);
	});

	it('"auto" also resolves to the document surface', () => {
		expect(resolveLabelFill(AUTO_COLOR, DOCUMENT_SURFACE)).toBe(
			DOCUMENT_SURFACE,
		);
	});

	it("returns a concrete color as-is", () => {
		expect(resolveLabelFill("#ff0000", DOCUMENT_SURFACE)).toBe("#ff0000");
	});

	it('"transparent" is returned as-is (choosing to show the line through)', () => {
		expect(resolveLabelFill("transparent", DOCUMENT_SURFACE)).toBe(
			"transparent",
		);
	});
});
