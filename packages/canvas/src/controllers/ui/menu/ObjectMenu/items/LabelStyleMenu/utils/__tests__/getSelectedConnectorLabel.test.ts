import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../../../../CanvasTypes";
import { getSelectedConnectorLabel } from "../getSelectedConnectorLabel";

const makeState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		selectedConnectorId: null,
		objects: {},
		...overrides,
	}) as unknown as CanvasControllerState;

describe("getSelectedConnectorLabel", () => {
	it("no connector selected (selectedConnectorId is null) → undefined", () => {
		expect(getSelectedConnectorLabel(makeState({}))).toBeUndefined();
	});

	it("a selected id exists but the target does not → undefined", () => {
		const state = makeState({ selectedConnectorId: "missing" });
		expect(getSelectedConnectorLabel(state)).toBeUndefined();
	});

	it("a connector with a label → returns its label", () => {
		const label = { text: "Yes", fill: "#fff" };
		const state = makeState({
			selectedConnectorId: "c1",
			objects: {
				c1: { id: "c1", type: "connector", label },
			} as unknown as CanvasControllerState["objects"],
		});
		expect(getSelectedConnectorLabel(state)).toEqual(label);
	});

	it("a connector without a label → undefined", () => {
		const state = makeState({
			selectedConnectorId: "c1",
			objects: {
				c1: { id: "c1", type: "connector" },
			} as unknown as CanvasControllerState["objects"],
		});
		expect(getSelectedConnectorLabel(state)).toBeUndefined();
	});
});
