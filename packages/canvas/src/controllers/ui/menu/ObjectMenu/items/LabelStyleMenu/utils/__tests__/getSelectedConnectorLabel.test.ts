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
	it("コネクター未選択（selectedConnectorId が null）→ undefined", () => {
		expect(getSelectedConnectorLabel(makeState({}))).toBeUndefined();
	});

	it("選択 id はあるが対象が存在しない → undefined", () => {
		const state = makeState({ selectedConnectorId: "missing" });
		expect(getSelectedConnectorLabel(state)).toBeUndefined();
	});

	it("ラベルを持つコネクター → その label を返す", () => {
		const label = { text: "Yes", fill: "#fff" };
		const state = makeState({
			selectedConnectorId: "c1",
			objects: {
				c1: { id: "c1", type: "connector", label },
			} as unknown as CanvasControllerState["objects"],
		});
		expect(getSelectedConnectorLabel(state)).toEqual(label);
	});

	it("ラベルを持たないコネクター → undefined", () => {
		const state = makeState({
			selectedConnectorId: "c1",
			objects: {
				c1: { id: "c1", type: "connector" },
			} as unknown as CanvasControllerState["objects"],
		});
		expect(getSelectedConnectorLabel(state)).toBeUndefined();
	});
});
