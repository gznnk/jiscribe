import { describe, expect, it } from "vitest";

import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import { isCanvasSectionShown } from "../isCanvasSectionShown";

describe("isCanvasSectionShown", () => {
	it("shows the section while nothing is selected", () => {
		expect(isCanvasSectionShown({ selection: selectionOf([]) })).toBe(true);
	});

	it("hides it once an object is selected", () => {
		expect(isCanvasSectionShown({ selection: selectionOf(["rect-1"]) })).toBe(
			false,
		);
	});

	it("hides it once a connector is selected", () => {
		expect(isCanvasSectionShown({ selection: selectionOf(["conn-1"]) })).toBe(
			false,
		);
	});
});
