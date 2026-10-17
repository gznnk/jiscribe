import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { readRichTextSlot } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../selection/__tests__/support/textSlotPartSelection";
import { createTextSlotPartKindDefinition } from "../../selection/partKinds/textSlotPartKind";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

const registries = createTestRegistries();
// No built-in type spells its text out as slots, so "rect" is handed the kind
// applyObjectDefinition would have given such a type.
registries.objectPartKind.register("rect", [
	createTextSlotPartKindDefinition(),
]);
const canvasReducer = createCanvasReducer(registries);

const baseObjects = createTestState(twoRectsDoc).objects;

/** rect-1 with three slots, in this order: a, b, c. */
const slottedObjects: Record<string, ObjectState> = {
	...baseObjects,
	"rect-1": {
		...baseObjects["rect-1"],
		text: { a: { text: "A" }, b: { text: "B" }, c: { text: "C" } },
	} as unknown as ObjectState,
};

/** rect-1 mid-edit on `slotId`, the draft still the committed body. */
const editingState = (slotId: string): CanvasControllerState =>
	createTestState(twoRectsDoc, {
		objects: slottedObjects,
		selection: selectionOf(["rect-1"], textSlotPartSelection(slotId)),
		textEditState: {
			kind: "shape",
			text: readRichTextSlot(
				(slottedObjects["rect-1"] as unknown as { text: TextSlots }).text,
				slotId,
			),
		},
	});

const reportEdit = (text: RichText): CanvasAction => ({
	type: "UPDATE_TEXT_EDIT",
	text,
});
const tab: CanvasAction = { type: "STEP_TEXT_EDIT", step: 1 };
const shiftTab: CanvasAction = { type: "STEP_TEXT_EDIT", step: -1 };

const run = (
	state: CanvasControllerState,
	...actions: CanvasAction[]
): CanvasControllerState => actions.reduce(canvasReducer, state);

const slotOf = (state: CanvasControllerState, slotId: string): RichText =>
	readRichTextSlot(
		(state.objects["rect-1"] as unknown as { text: TextSlots }).text,
		slotId,
	);

describe("canvasReducer STEP_TEXT_EDIT", () => {
	it("commits the draft into the slot being edited and opens the next slot with its own text", () => {
		const after = run(editingState("a"), reportEdit("abc"), tab);

		expect(slotOf(after, "a")).toBe("abc");
		expect(slotOf(after, "b")).toBe("B");
		expect(after.selection).toEqual(
			selectionOf(["rect-1"], textSlotPartSelection("b")),
		);
		expect(after.textEditState).toEqual({ kind: "shape", text: "B" });
	});

	it("steps back on -1, wrapping from the first slot to the last", () => {
		const after = run(editingState("a"), reportEdit("x"), shiftTab);

		expect(slotOf(after, "a")).toBe("x");
		expect(after.selection).toEqual(
			selectionOf(["rect-1"], textSlotPartSelection("c")),
		);
		expect(after.textEditState).toEqual({ kind: "shape", text: "C" });
	});

	it("records one undo step per committed slot and none for a slot left unchanged", () => {
		const firstCommitted = run(editingState("a"), reportEdit("1"), tab);
		expect(firstCommitted.history.past).toHaveLength(1);

		const unchangedStepped = run(firstCommitted, tab);
		expect(unchangedStepped.history.past).toHaveLength(1);

		const secondCommitted = run(unchangedStepped, reportEdit("3"), tab);
		expect(secondCommitted.history.past).toHaveLength(2);
		expect(slotOf(secondCommitted, "c")).toBe("3");
	});

	it("leaves a one-body shape's edit as it is", () => {
		const state = createTestState(
			{ version: 1, root: [rectDoc("rect-1", 0, 0)] } as never,
			{
				objects: {
					...baseObjects,
					"rect-1": {
						...baseObjects["rect-1"],
						text: { body: { text: "hi" } },
					} as unknown as ObjectState,
				},
				selection: selectionOf(["rect-1"], textSlotPartSelection("body")),
				textEditState: { kind: "shape", text: "hi!" },
			},
		);

		expect(canvasReducer(state, tab)).toBe(state);
	});

	it("does nothing without an open edit", () => {
		const state = createTestState(twoRectsDoc, {
			objects: slottedObjects,
			selection: selectionOf(["rect-1"], textSlotPartSelection("a")),
		});

		expect(canvasReducer(state, tab)).toBe(state);
	});
});
