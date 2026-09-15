import { describe, expect, it } from "vitest";

import { isCanvasSectionShown } from "../isCanvasSectionShown";

describe("isCanvasSectionShown", () => {
	it("shows the section while nothing is selected", () => {
		expect(
			isCanvasSectionShown({ selectedIds: [], selectedConnectorId: null }),
		).toBe(true);
	});

	it("hides it once an object is selected", () => {
		expect(
			isCanvasSectionShown({
				selectedIds: ["rect-1"],
				selectedConnectorId: null,
			}),
		).toBe(false);
	});

	it("hides it once a connector is selected", () => {
		expect(
			isCanvasSectionShown({ selectedIds: [], selectedConnectorId: "conn-1" }),
		).toBe(false);
	});
});
