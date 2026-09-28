import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../../../registries/CanvasRegistries";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import type { SelectionControlDefinition } from "../../../ui/controls/SelectionControlTypes";
import { collectCowChangedKeys } from "../../../utils/cowObjects";
import { createDocSnapshotFromDoc } from "../../../utils/resolveDocSnapshot";
import type { Gesture } from "../../recognizer/GestureRecognizerTypes";
import { handleGesture } from "../handleGesture";

/**
 * The commit that closes out a gesture, exercised through the one handler that
 * can change the document on any gesture kind it asks for: a type's selection
 * control. A click that edits has to land in history exactly as a drag that
 * edits does, and a click that edits nothing has to leave no trace at all.
 *
 * The undo button is the counter-case, and the one reason the commit is not
 * simply "the objects changed": it rewrites the document on a click and must not
 * be recorded as an edit of its own.
 */

const emptyDoc: CanvasDoc = {
	version: 1,
	root: [],
} as unknown as CanvasDoc;

/** The part the control below renders, which is what routes the gesture to it. */
const CONTROL_PART = "selection:rect:probe";

/**
 * Registries with one selection control on `rect`, taking every gesture kind so
 * the same control answers a click and a drag.
 *
 * @param handle - What the control does with the event; returning null is "no change"
 */
const registriesWithControl = (
	handle: SelectionControlDefinition["handle"],
): CanvasRegistries => {
	const registries = createTestRegistries();
	registries.selectionControl.register("rect", [
		{
			name: "probe",
			events: ["click", "doubleClick", "drag", "dragEnd"],
			Component: () => null,
			handle,
		},
	]);
	return registries;
};

/** Stamps a counter on the control's own object, so every call is a fresh document. */
let markCount = 0;
const markObject: SelectionControlDefinition["handle"] = (context) => {
	markCount += 1;
	return {
		object: {
			...context.startObject,
			width: 40 + markCount,
		} as unknown as ObjectState,
	};
};

/** A single selected rect, which every gesture below acts on. */
const stateWithSelectedRect = (
	registries: CanvasRegistries,
): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc, registries);
	const rect = {
		id: "r1",
		type: "rect",
		cx: 100,
		cy: 100,
		width: 40,
		height: 40,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	} as unknown as ObjectState;
	return {
		...base,
		objects: { ...base.objects, r1: rect },
		rootIds: [...base.rootIds, "r1"],
		selectedIds: ["r1"],
	};
};

/** The document before and after one edit, to put in the history stacks below. */
const docWithRect = {
	version: 1,
	root: [{ id: "r1", type: "rect", x: 0, y: 0, width: 100, height: 100 }],
} as unknown as CanvasDoc;
const snapshotEmpty = createDocSnapshotFromDoc(emptyDoc);
const snapshotWithRect = createDocSnapshotFromDoc(docWithRect);

/** A gesture aimed at the control, with the fields every handler on the way reads. */
const controlGesture = (
	type: "click" | "doubleClick" | "dragStart" | "drag" | "dragEnd",
): Gesture =>
	({
		type,
		button: 0,
		targetKind: "control",
		targetId: "r1",
		targetPart: CONTROL_PART,
		start: { x: 100, y: 100 },
		last: { x: 120, y: 120 },
		clientLast: { x: 120, y: 120 },
		delta: { x: 20, y: 20 },
		clientDelta: { x: 20, y: 20 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

/** A click on one of the toolbar's command buttons. */
const toolbarClick = (commandId: string): Gesture =>
	({
		type: "click",
		button: 0,
		targetKind: "menu",
		targetId: "toolbar",
		targetPart: `command:${commandId}`,
		last: { x: 10, y: 10 },
		clientLast: { x: 10, y: 10 },
		delta: { x: 0, y: 0 },
		clientDelta: { x: 0, y: 0 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

/**
 * Whether the map is still a copy-on-write view: collectCowChangedKeys answers
 * with a set only for a view diffed against one sharing its backing record, and
 * a view always shares its own.
 */
const isCowView = (objects: Record<string, ObjectState>): boolean =>
	collectCowChangedKeys(objects, objects) !== null;

describe("handleGesture - commit", () => {
	it("commits a click that changed the document", () => {
		const registries = registriesWithControl(markObject);
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(state, controlGesture("click"), registries);

		expect(next.objects.r1).not.toBe(state.objects.r1);
		expect(next.commitVersion).toBe(state.commitVersion + 1);
	});

	it("materializes the copy-on-write view a click leaves behind", () => {
		const registries = registriesWithControl(markObject);
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(state, controlGesture("click"), registries);

		expect(isCowView(next.objects)).toBe(false);
	});

	it("commits a double click that changed the document", () => {
		const registries = registriesWithControl(markObject);
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(
			state,
			controlGesture("doubleClick"),
			registries,
		);

		expect(next.commitVersion).toBe(state.commitVersion + 1);
	});

	it("leaves a click that changed nothing alone", () => {
		const registries = registriesWithControl(() => null);
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(state, controlGesture("click"), registries);

		expect(next.commitVersion).toBe(state.commitVersion);
		expect(next).toBe(state);
	});

	it("does not commit a click that only moved the part selection", () => {
		const registries = registriesWithControl(() => ({
			selection: { kind: "textSlot", partIds: ["body"] },
		}));
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(state, controlGesture("click"), registries);

		expect(next.objectPartSelection?.partIds).toEqual(["body"]);
		expect(next.commitVersion).toBe(state.commitVersion);
	});

	it("does not record an undo click as an edit of its own", () => {
		const registries = createTestRegistries();
		const base = createInitialControllerState(docWithRect, registries);
		const state: CanvasControllerState = {
			...base,
			history: {
				past: [snapshotEmpty],
				present: snapshotWithRect,
				future: [],
			},
		};

		const next = handleGesture(state, toolbarClick("undo"), registries);

		// The rect is gone, and the stacks are the ones the command left: nothing
		// pushed the undone document back onto `past`, and the version stands still.
		expect(Object.keys(next.objects)).toEqual([]);
		expect(next.history.past).toEqual([]);
		expect(next.history.future).toEqual([snapshotWithRect]);
		expect(next.commitVersion).toBe(state.commitVersion);
	});

	it("still commits a drag once, at its end", () => {
		const registries = registriesWithControl(markObject);
		const state = stateWithSelectedRect(registries);

		const started = handleGesture(
			state,
			controlGesture("dragStart"),
			registries,
		);
		expect(started.activeDrag).not.toBeNull();

		const dragged = handleGesture(started, controlGesture("drag"), registries);
		expect(dragged.commitVersion).toBe(state.commitVersion);

		const ended = handleGesture(dragged, controlGesture("dragEnd"), registries);
		expect(ended.activeDrag).toBeNull();
		expect(ended.commitVersion).toBe(state.commitVersion + 1);
		expect(isCowView(ended.objects)).toBe(false);
	});
});
