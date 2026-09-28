import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createTextSlotPartRegistry } from "../../../../../selection/__tests__/support/textSlotPartRegistry";
import { TEXT_SLOT_PART_KIND } from "../../../../../selection/textSlotPartKind";
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
		objectPartSelection: null,
		textEditState: null,
		objects: {},
		...overrides,
	}) as unknown as CanvasControllerState;

/** The only slotted fixture here wears the "card" type. */
const objectPart = createTextSlotPartRegistry("card");

describe("isMetaSectionShown", () => {
	it("shows the section for a single selected object", () => {
		expect(
			isMetaSectionShown(makeState({ selectedIds: ["rect-1"] }), objectPart),
		).toBe(true);
	});

	it("shows it for a selected connector", () => {
		expect(
			isMetaSectionShown(
				makeState({ selectedConnectorId: "conn-1" }),
				objectPart,
			),
		).toBe(true);
	});

	it("hides it for a multi-selection, which names no single note", () => {
		expect(
			isMetaSectionShown(
				makeState({ selectedIds: ["rect-1", "rect-2"] }),
				objectPart,
			),
		).toBe(false);
	});

	it("hides it while nothing is selected", () => {
		expect(isMetaSectionShown(makeState({}), objectPart)).toBe(false);
	});

	it("hides it while a text slot is selected", () => {
		const state = makeState({
			selectedIds: ["card-1"],
			objectPartSelection: {
				objectId: "card-1",
				kind: TEXT_SLOT_PART_KIND,
				partIds: ["body"],
			},
			objects: { "card-1": slottedShape("card-1") },
		});

		expect(isMetaSectionShown(state, objectPart)).toBe(false);
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

		expect(isMetaSectionShown(state, objectPart)).toBe(false);
	});
});
