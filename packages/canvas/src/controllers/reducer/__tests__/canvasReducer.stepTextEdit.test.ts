import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { describe, expect, it, vi } from "vitest";

import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import type { ObjectPartKindDefinition } from "../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { readRichTextSlot } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../selection/__tests__/support/textSlotPartSelection";
import { createTextSlotPartKindDefinition } from "../../selection/partKinds/textSlotPartKind";
import { readTextEditDraft } from "../../utils/readTextEditDraft";
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
		mode: {
			kind: "textEdit",
			draft: {
				kind: "shape",
				text: readRichTextSlot(
					(slottedObjects["rect-1"] as unknown as { text: TextSlots }).text,
					slotId,
				),
			},
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
		expect(readTextEditDraft(after)).toEqual({ kind: "shape", text: "B" });
	});

	it("steps back on -1, wrapping from the first slot to the last", () => {
		const after = run(editingState("a"), reportEdit("x"), shiftTab);

		expect(slotOf(after, "a")).toBe("x");
		expect(after.selection).toEqual(
			selectionOf(["rect-1"], textSlotPartSelection("c")),
		);
		expect(readTextEditDraft(after)).toEqual({ kind: "shape", text: "C" });
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
				mode: { kind: "textEdit", draft: { kind: "shape", text: "hi!" } },
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

/** rect-1 grown by two empty slots after its last, as a table appends a row of two cells. */
const appendTwoSlotsTo = (object: ObjectState): ObjectState => {
	const { text } = object as unknown as { text: TextSlots };
	return {
		...object,
		text: { ...text, d: { text: "" }, e: { text: "" } },
	} as unknown as ObjectState;
};

/** The `extend` answer for {@link appendTwoSlotsTo}, landing on the first new slot. */
const appendTwoSlots = (object: ObjectState) => ({
	object: appendTwoSlotsTo(object),
});

/**
 * A reducer whose "rect" slot kind declares `extend`, and whose content resizer
 * makes the height follow the slot count — so a test can see the growth settled
 * the way a structural edit is.
 */
const createExtendingReducer = (
	extend: NonNullable<ObjectPartKindDefinition["extend"]>,
) => {
	const extendingRegistries = createTestRegistries();
	extendingRegistries.objectPartKind.register("rect", [
		{ ...createTextSlotPartKindDefinition(), extend },
	]);
	extendingRegistries.objectContentResizer.register("rect", (object) => {
		const { text, height } = object as unknown as {
			text: TextSlots;
			height: number;
		};
		const slotHeight = 10 * Object.keys(text).length;
		return slotHeight === height
			? object
			: ({ ...object, height: slotHeight } as ObjectState);
	});
	return createCanvasReducer(extendingRegistries);
};

const heightOf = (state: CanvasControllerState): number =>
	(state.objects["rect-1"] as unknown as { height: number }).height;

const slotIdsOf = (state: CanvasControllerState): string[] =>
	Object.keys((state.objects["rect-1"] as unknown as { text: TextSlots }).text);

const undo: CanvasAction = { type: "COMMAND", commandId: "undo" };
const redo: CanvasAction = { type: "COMMAND", commandId: "redo" };
const cancelEdit: CanvasAction = { type: "END_TEXT_EDIT", commit: false };

describe("canvasReducer STEP_TEXT_EDIT past the last slot", () => {
	it("grows the object by the kind's extend and opens the first new slot", () => {
		const extend = vi.fn(appendTwoSlots);
		const extendingReducer = createExtendingReducer(extend);

		const after = [reportEdit("x"), tab].reduce(
			extendingReducer,
			editingState("c"),
		);

		expect(extend).toHaveBeenCalledTimes(1);
		expect(slotIdsOf(after)).toEqual(["a", "b", "c", "d", "e"]);
		expect(slotOf(after, "c")).toBe("x");
		expect(after.selection).toEqual(
			selectionOf(["rect-1"], textSlotPartSelection("d")),
		);
		expect(readTextEditDraft(after)).toEqual({ kind: "shape", text: "" });
		// Settled by the content resizer, as a structural edit is.
		expect(heightOf(after)).toBe(50);
	});

	it("grows the object even when the last slot is left unchanged", () => {
		const extendingReducer = createExtendingReducer(appendTwoSlots);

		const after = extendingReducer(editingState("c"), tab);

		expect(slotIdsOf(after)).toEqual(["a", "b", "c", "d", "e"]);
		expect(after.history.past).toHaveLength(1);
	});

	it("takes the commit and the growth back in one undo step, and redoes both", () => {
		const extendingReducer = createExtendingReducer(appendTwoSlots);
		const start = editingState("c");
		const stepped = [reportEdit("x"), tab].reduce(extendingReducer, start);

		// One entry, recorded against the state before the commit, whose present
		// holds both the committed slot and the grown ones. Asserted on the
		// snapshots: a rect's document has one body, so restoring one would fold
		// the slots this test gives it.
		expect(stepped.history.past.map((entry) => entry.source)).toEqual([
			start.history.present.source,
		]);
		const steppedObject = stepped.history.present.source?.objects["rect-1"];
		expect(steppedObject).toBe(stepped.objects["rect-1"]);
		expect(slotOf(stepped, "c")).toBe("x");
		expect(slotIdsOf(stepped)).toEqual(["a", "b", "c", "d", "e"]);

		const undone = [cancelEdit, undo].reduce(extendingReducer, stepped);
		expect(undone.history.past).toEqual([]);
		expect(undone.history.present.source).toBe(start.history.present.source);
		expect(undone.history.future.map((entry) => entry.source)).toEqual([
			stepped.history.present.source,
		]);

		const redone = extendingReducer(undone, redo);
		expect(redone.history.past.map((entry) => entry.source)).toEqual([
			start.history.present.source,
		]);
		expect(redone.history.present.source).toBe(stepped.history.present.source);
	});

	it("wraps to the first slot when extend declines", () => {
		const extendingReducer = createExtendingReducer(() => null);

		const after = [reportEdit("x"), tab].reduce(
			extendingReducer,
			editingState("c"),
		);

		expect(slotIdsOf(after)).toEqual(["a", "b", "c"]);
		expect(slotOf(after, "c")).toBe("x");
		expect(after.selection).toEqual(
			selectionOf(["rect-1"], textSlotPartSelection("a")),
		);
	});

	it("does not ask extend on a step that leaves no last slot", () => {
		const extend = vi.fn(appendTwoSlots);
		const extendingReducer = createExtendingReducer(extend);

		const steppedForward = extendingReducer(editingState("b"), tab);
		const steppedBackFromFirst = extendingReducer(editingState("a"), shiftTab);

		expect(extend).not.toHaveBeenCalled();
		expect(steppedForward.selection).toEqual(
			selectionOf(["rect-1"], textSlotPartSelection("c")),
		);
		expect(steppedBackFromFirst.selection).toEqual(
			selectionOf(["rect-1"], textSlotPartSelection("c")),
		);
	});

	it("leaves Tab on the canvas, with no edit open, wrapping", () => {
		const extend = vi.fn(appendTwoSlots);
		const extendingReducer = createExtendingReducer(extend);
		const state = createTestState(twoRectsDoc, {
			objects: slottedObjects,
			selection: selectionOf(["rect-1"], textSlotPartSelection("c")),
		});

		const after = extendingReducer(state, {
			type: "COMMAND",
			commandId: "selectNextTextSlot",
		});

		expect(extend).not.toHaveBeenCalled();
		expect(after.objects).toBe(state.objects);
		expect(after.selection).toEqual(
			selectionOf(["rect-1"], textSlotPartSelection("a")),
		);
	});

	it("throws when extend lists no slot after the old last one", () => {
		const extendingReducer = createExtendingReducer((object) => ({ object }));

		expect(() => extendingReducer(editingState("c"), tab)).toThrow(
			/without listing a slot after "c"/,
		);
	});

	it("opens the added slot extend names to land on", () => {
		const extendingReducer = createExtendingReducer((object) => ({
			object: appendTwoSlotsTo(object),
			landingPartId: "e",
		}));

		const after = [reportEdit("x"), tab].reduce(
			extendingReducer,
			editingState("c"),
		);

		expect(slotIdsOf(after)).toEqual(["a", "b", "c", "d", "e"]);
		expect(slotOf(after, "c")).toBe("x");
		expect(after.selection).toEqual(
			selectionOf(["rect-1"], textSlotPartSelection("e")),
		);
		expect(readTextEditDraft(after)).toEqual({ kind: "shape", text: "" });
	});

	describe("on an object of one slot", () => {
		/** rect-1 mid-edit on its sole slot `a`, the draft still the committed body. */
		const soleSlotEditingState = (): CanvasControllerState =>
			createTestState(twoRectsDoc, {
				objects: {
					...baseObjects,
					"rect-1": {
						...baseObjects["rect-1"],
						text: { a: { text: "A" } },
					} as unknown as ObjectState,
				},
				selection: selectionOf(["rect-1"], textSlotPartSelection("a")),
				mode: { kind: "textEdit", draft: { kind: "shape", text: "A" } },
			});

		it("grows the object on Tab, the sole slot being the last", () => {
			const extendingReducer = createExtendingReducer(appendTwoSlots);

			const after = [reportEdit("x"), tab].reduce(
				extendingReducer,
				soleSlotEditingState(),
			);

			expect(slotIdsOf(after)).toEqual(["a", "d", "e"]);
			expect(slotOf(after, "a")).toBe("x");
			expect(after.selection).toEqual(
				selectionOf(["rect-1"], textSlotPartSelection("d")),
			);
			expect(readTextEditDraft(after)).toEqual({ kind: "shape", text: "" });
			expect(after.history.past).toHaveLength(1);
		});

		it("neither grows nor commits on Tab while a drag holds the session open", () => {
			// A menu slider holds an uncommitted preview in the objects mid-drag,
			// which a history entry recorded by the commit would keep.
			const extend = vi.fn(appendTwoSlots);
			const extendingReducer = createExtendingReducer(extend);
			const typedState = extendingReducer(
				soleSlotEditingState(),
				reportEdit("x"),
			);
			const underDrag: CanvasControllerState = {
				...typedState,
				drag: {
					kind: "menu",
					startSnapshot: {},
					snapFeedback: null,
					axisLockFeedback: null,
					edgeScrollEnabled: false,
				} as unknown as CanvasControllerState["drag"],
			};

			expect(extendingReducer(underDrag, tab)).toBe(underDrag);
			expect(extend).not.toHaveBeenCalled();
		});

		it("leaves the edit as it is on Shift+Tab, with nowhere to wrap to", () => {
			const extend = vi.fn(appendTwoSlots);
			const extendingReducer = createExtendingReducer(extend);
			const state = extendingReducer(soleSlotEditingState(), reportEdit("x"));

			expect(extendingReducer(state, shiftTab)).toBe(state);
			expect(extend).not.toHaveBeenCalled();
		});

		it("leaves the edit as it is on Tab when extend declines", () => {
			const extendingReducer = createExtendingReducer(() => null);
			const state = extendingReducer(soleSlotEditingState(), reportEdit("x"));

			expect(extendingReducer(state, tab)).toBe(state);
		});

		it("leaves Tab on the canvas, with no edit open, without growing", () => {
			const extend = vi.fn(appendTwoSlots);
			const extendingReducer = createExtendingReducer(extend);
			const state: CanvasControllerState = {
				...soleSlotEditingState(),
				mode: { kind: "normal" },
			};

			const after = extendingReducer(state, {
				type: "COMMAND",
				commandId: "selectNextTextSlot",
			});

			expect(extend).not.toHaveBeenCalled();
			expect(after.objects).toBe(state.objects);
		});
	});

	it.each(["b", "c", "z"])(
		"throws when extend names %s, not a slot it added, to land on",
		(landingPartId) => {
			const extendingReducer = createExtendingReducer((object) => ({
				object: appendTwoSlotsTo(object),
				landingPartId,
			}));

			expect(() => extendingReducer(editingState("c"), tab)).toThrow(
				`the "textSlot" part kind of "rect" extended the object to land on "${landingPartId}", which is not a slot it added`,
			);
		},
	);
});
