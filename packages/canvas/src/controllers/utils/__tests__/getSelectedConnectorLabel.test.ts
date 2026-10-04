import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { getSelectedConnectorLabel } from "../getSelectedConnectorLabel";

describe("getSelectedConnectorLabel", () => {
	it("no connector selected (empty selection) → undefined", () => {
		expect(
			getSelectedConnectorLabel({ selectedIds: [], objects: {} }),
		).toBeUndefined();
	});

	it("a selected id exists but the target does not → undefined", () => {
		expect(
			getSelectedConnectorLabel({ selectedIds: ["missing"], objects: {} }),
		).toBeUndefined();
	});

	it("a connector with a label → returns its label", () => {
		const label = { text: "Yes", fill: "#fff" };
		const objects = {
			c1: { id: "c1", type: "connector", label },
		} as unknown as Record<string, ObjectState>;
		expect(getSelectedConnectorLabel({ selectedIds: ["c1"], objects })).toEqual(
			label,
		);
	});

	it("a connector without a label → undefined", () => {
		const objects = {
			c1: { id: "c1", type: "connector" },
		} as unknown as Record<string, ObjectState>;
		expect(
			getSelectedConnectorLabel({ selectedIds: ["c1"], objects }),
		).toBeUndefined();
	});
});
