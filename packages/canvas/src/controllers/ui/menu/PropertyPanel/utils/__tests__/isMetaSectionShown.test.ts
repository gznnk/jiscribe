import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { isMetaSectionShown } from "../isMetaSectionShown";

/** A shape whose text lives in named slots, which is what a slot selection needs. */
const slottedShape = (id: string): ObjectState =>
	({
		id,
		type: "card",
		features: { text: "slots" },
		text: { body: { text: "hello" } },
	}) as unknown as ObjectState;

const makeState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		selectedIds: [],
		selectedConnectorId: null,
		selectedTextSlot: null,
		textEditState: null,
		objects: {},
		...overrides,
	}) as unknown as CanvasControllerState;

describe("isMetaSectionShown", () => {
	it("shows the section for a single selected object", () => {
		expect(isMetaSectionShown(makeState({ selectedIds: ["rect-1"] }))).toBe(
			true,
		);
	});

	it("shows it for a selected connector", () => {
		expect(
			isMetaSectionShown(makeState({ selectedConnectorId: "conn-1" })),
		).toBe(true);
	});

	it("hides it for a multi-selection, which names no single note", () => {
		expect(
			isMetaSectionShown(makeState({ selectedIds: ["rect-1", "rect-2"] })),
		).toBe(false);
	});

	it("hides it while nothing is selected", () => {
		expect(isMetaSectionShown(makeState({}))).toBe(false);
	});

	it("hides it while a text slot is selected", () => {
		const state = makeState({
			selectedIds: ["card-1"],
			selectedTextSlot: { objectId: "card-1", slotId: "body" },
			objects: { "card-1": slottedShape("card-1") },
		});

		expect(isMetaSectionShown(state)).toBe(false);
	});

	it("hides it while a shape's text is being edited", () => {
		const state = makeState({
			selectedIds: ["rect-1"],
			textEditState: {
				kind: "shape",
				objectId: "rect-1",
				slotId: "body",
				text: [],
			},
		});

		expect(isMetaSectionShown(state)).toBe(false);
	});
});
