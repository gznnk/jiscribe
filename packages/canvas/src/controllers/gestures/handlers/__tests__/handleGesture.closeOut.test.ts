import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { clickPlacedPlugin } from "../../../__tests__/support/clickPlacedPlugin";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../../../registries/CanvasRegistries";
import {
	createCanvasRegistries,
	createTestRegistries,
} from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import type { SelectionControlDefinition } from "../../../ui/controls/SelectionControlTypes";
import { collectCowChangedKeys } from "../../../utils/cowObjects";
import { createDocSnapshotFromDoc } from "../../../utils/resolveDocSnapshot";
import type { Gesture } from "../../recognizer/GestureRecognizerTypes";
import { handleGesture } from "../handleGesture";

/**
 * The close-out of a gesture (dragEnd / click / doubleClick). It flattens the
 * copy-on-write view and drops the drag bookkeeping, and that is all: the
 * version is advanced by the writer that edited (commitEdit), never by
 * handleGesture, so a gesture whose handlers edit nothing — an undo included —
 * leaves no history entry behind.
 */

const emptyDoc: CanvasDoc = {
	version: 1,
	root: [],
} as unknown as CanvasDoc;

/** The action the control below renders, which is what routes the gesture to it. */
const CONTROL_ACTION = "selection:rect:probe";

/** The fill the swatch below writes, distinct from the rect's own. */
const SWATCH_FILL = "#dc2626";

/**
 * Registries with one selection control on `rect`, the one drag-driven writer
 * the drag case below needs.
 *
 * @param handle - What the control does with drag / dragEnd; returning null is "no change"
 */
const registriesWithControl = (
	handle: SelectionControlDefinition["handle"],
): CanvasRegistries => {
	const registries = createTestRegistries();
	registries.selectionControl.register("rect", [
		{ name: "probe", Component: () => null, handle },
	]);
	return registries;
};

/** Stamps a counter on the control's own object, so every call is a fresh document. */
let markCount = 0;
const markObject: SelectionControlDefinition["handle"] = (context) => {
	markCount += 1;
	return {
		...context.startObject,
		width: 40 + markCount,
	} as unknown as ObjectState;
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
		fill: "#ffffff",
	} as unknown as ObjectState;
	return {
		...base,
		objects: { ...base.objects, r1: rect },
		rootIds: [...base.rootIds, "r1"],
		selection: selectionOf(["r1"]),
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
const controlGesture = (type: "dragStart" | "drag" | "dragEnd"): Gesture =>
	({
		type,
		button: 0,
		targetKind: "control",
		targetId: "r1",
		targetAction: CONTROL_ACTION,
		start: { x: 100, y: 100 },
		last: { x: 120, y: 120 },
		clientLast: { x: 120, y: 120 },
		delta: { x: 20, y: 20 },
		clientDelta: { x: 20, y: 20 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

/**
 * A click on a menu item.
 *
 * @param targetId - Which menu: `object-menu`, `stencil-library` or `toolbar`
 * @param targetAction - The item's data-action; undefined for the menu's own chrome
 * @param type - doubleClick for the second of two rapid presses
 */
const menuClick = (
	targetId: string,
	targetAction: string | undefined,
	type: "click" | "doubleClick" = "click",
): Gesture =>
	({
		type,
		button: 0,
		targetKind: "menu",
		targetId,
		targetAction,
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

const fillOf = (state: CanvasControllerState): string =>
	(state.objects.r1 as unknown as { fill: string }).fill;

describe("handleGesture - close-out", () => {
	it("materializes a style swatch click, whose version is the swatch's one advance", () => {
		const registries = createTestRegistries();
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(
			state,
			menuClick("object-menu", `set:fill:${SWATCH_FILL}`),
			registries,
		);

		expect(fillOf(next)).toBe(SWATCH_FILL);
		expect(isCowView(next.objects)).toBe(false);
		expect(next.commitVersion).toBe(state.commitVersion + 1);
	});

	it("materializes a style toggle reached as a double click the same way", () => {
		const registries = createTestRegistries();
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(
			state,
			menuClick("object-menu", `set:fill:${SWATCH_FILL}`, "doubleClick"),
			registries,
		);

		expect(fillOf(next)).toBe(SWATCH_FILL);
		expect(isCowView(next.objects)).toBe(false);
		expect(next.commitVersion).toBe(state.commitVersion + 1);
	});

	it("leaves a click-placed stencil at the one advance its placement made", () => {
		const registries = createCanvasRegistries({ plugins: [clickPlacedPlugin] });
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(
			state,
			menuClick("stencil-library", "item:pin"),
			registries,
		);

		expect(next.rootIds).toHaveLength(state.rootIds.length + 1);
		expect(next.commitVersion).toBe(state.commitVersion + 1);
	});

	it("returns the same state for a click that changed nothing", () => {
		const registries = createTestRegistries();
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(
			state,
			menuClick("object-menu", undefined),
			registries,
		);

		expect(next).toBe(state);
	});

	it("does not advance the version for a click that changed only what the menu shows", () => {
		const registries = createTestRegistries();
		const state = stateWithSelectedRect(registries);

		const next = handleGesture(
			state,
			menuClick("object-menu", "toggle:fill"),
			registries,
		);

		expect(next.objectMenuOpenId).toBe("fill");
		expect(next.objects).toBe(state.objects);
		expect(next.commitVersion).toBe(state.commitVersion);
	});

	it("does not record a toolbar undo as an edit of its own", () => {
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

		const next = handleGesture(
			state,
			menuClick("toolbar", "command:undo"),
			registries,
		);

		// The rect is gone, and the stacks are the ones the command left: nothing
		// pushed the undone document back onto `past`, and the version stands still.
		expect(Object.keys(next.objects)).toEqual([]);
		expect(next.history.past).toEqual([]);
		expect(next.history.future).toEqual([snapshotWithRect]);
		expect(next.commitVersion).toBe(state.commitVersion);
	});

	it("does not record a toolbar redo as an edit of its own", () => {
		const registries = createTestRegistries();
		const base = createInitialControllerState(emptyDoc, registries);
		const state: CanvasControllerState = {
			...base,
			history: {
				past: [],
				present: snapshotEmpty,
				future: [snapshotWithRect],
			},
		};

		const next = handleGesture(
			state,
			menuClick("toolbar", "command:redo"),
			registries,
		);

		expect(Object.keys(next.objects)).toEqual(["r1"]);
		expect(next.history.past).toEqual([snapshotEmpty]);
		expect(next.history.future).toEqual([]);
		expect(next.commitVersion).toBe(state.commitVersion);
	});

	it("closes out a drag at its end, with the version its writer advanced once", () => {
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
		expect(ended.snapFeedback).toBeNull();
		expect(ended.axisLockFeedback).toBeNull();
		expect(isCowView(ended.objects)).toBe(false);
		expect(ended.commitVersion).toBe(state.commitVersion + 1);
	});

	it("never advances the version itself, even when the document changed during the gesture", () => {
		// Writes on every drag frame but reports no change for the dragEnd, so no
		// writer commits: whatever the drag frames left is materialized and stays
		// uncommitted.
		const writeOnDragOnly: SelectionControlDefinition["handle"] = (
			context,
			event,
		) => (event.type === "drag" ? markObject(context, event) : null);
		const registries = registriesWithControl(writeOnDragOnly);
		const state = stateWithSelectedRect(registries);

		const started = handleGesture(
			state,
			controlGesture("dragStart"),
			registries,
		);
		const dragged = handleGesture(started, controlGesture("drag"), registries);
		expect(dragged.objects.r1).not.toBe(state.objects.r1);

		const ended = handleGesture(dragged, controlGesture("dragEnd"), registries);
		expect(ended.activeDrag).toBeNull();
		expect(isCowView(ended.objects)).toBe(false);
		expect(ended.commitVersion).toBe(state.commitVersion);
	});
});
