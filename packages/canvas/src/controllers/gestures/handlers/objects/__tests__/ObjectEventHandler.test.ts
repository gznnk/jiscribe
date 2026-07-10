import { describe, expect, it } from "vitest";

import { RectFeatures } from "../../../../../schemas/objects/primitives/rect/RectDoc";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../setup/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ObjectEventHandler } from "../ObjectEventHandler";

const registries = createTestRegistries();

const SIZE = 10;

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		features: RectFeatures,
		cx,
		cy,
		width: SIZE,
		height: SIZE,
	}) as unknown as ObjectState;

/** Build keyPoints from the rect's four corners plus midpoints (calcKeyPointsBoundingBox only reads the four corners). */
const makeKeyPoints = (cx: number, cy: number) => {
	const half = SIZE / 2;
	const left = cx - half;
	const right = cx + half;
	const top = cy - half;
	const bottom = cy + half;
	return {
		topLeft: { x: left, y: top },
		topCenter: { x: cx, y: top },
		topRight: { x: right, y: top },
		rightCenter: { x: right, y: cy },
		bottomRight: { x: right, y: bottom },
		bottomCenter: { x: cx, y: bottom },
		bottomLeft: { x: left, y: bottom },
		leftCenter: { x: left, y: cy },
	};
};

/**
 * Build the state during a drag. Disable snap correction by leaving snapCandidates empty,
 * so that only the Shift axis-lock logic is exercised. keyPoints are used to compute the
 * line position (center coordinates) of the axis-lock feedback.
 */
const makeDragState = (cx = 0, cy = 0): CanvasControllerState => {
	const rect = makeRect("rect-1", cx, cy);
	return {
		registries,
		objects: { "rect-1": rect },
		rootIds: ["rect-1"],
		selectedIds: ["rect-1"],
		selectedConnectorId: null,
		selectedVertex: null,
		multiSelectGroup: null,
		textEditState: null,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: {
			objects: { "rect-1": rect },
			keyPoints: { "rect-1": makeKeyPoints(cx, cy) },
			snapCandidates: { x: [], y: [] },
			selectedIds: ["rect-1"],
			selectedIdsWithDescendants: new Set(["rect-1"]),
			multiSelectGroup: null,
			viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		},
	} as unknown as CanvasControllerState;
};

const makeDragEvent = (
	delta: { x: number; y: number },
	shift: boolean,
): CanvasEvent =>
	({
		type: "drag",
		targetKind: "object",
		targetId: "rect-1",
		button: 0,
		delta,
		mods: { shift, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const movedRect = (state: CanvasControllerState) =>
	state.objects["rect-1"] as unknown as { cx: number; cy: number };

const makeTextRect = (id: string, text: string): ObjectState =>
	({
		id,
		type: "rect",
		features: RectFeatures,
		cx: 0,
		cy: 0,
		width: SIZE,
		height: SIZE,
		text,
	}) as unknown as ObjectState;

/** State while editing `editingId`'s text, with a pending (uncommitted) `pendingText`. */
const makeEditState = (
	editingId: string,
	objectText: string,
	pendingText: string,
): CanvasControllerState =>
	({
		registries,
		objects: {
			[editingId]: makeTextRect(editingId, objectText),
			"rect-2": makeTextRect("rect-2", "other"),
		},
		rootIds: [editingId, "rect-2"],
		selectedIds: [],
		selectedConnectorId: null,
		selectedVertex: null,
		multiSelectGroup: null,
		textEditState: { objectId: editingId, text: pendingText },
		commitVersion: 5,
		contextMenuPosition: { x: 1, y: 1 },
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
	}) as unknown as CanvasControllerState;

const makeTapEvent = (
	type: "pressed" | "click" | "doubleClick",
	targetId: string,
): CanvasEvent =>
	({
		type,
		targetKind: "object",
		targetId,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

describe("ObjectEventHandler - text edit commit", () => {
	it("a pressed on the object being edited commits the pending edit (the editing overlay covers the shape, so a gesture-visible tap is outside it)", () => {
		const next = ObjectEventHandler.handle(
			makeEditState("rect-1", "old", "new"),
			makeTapEvent("pressed", "rect-1"),
			registries,
		);
		expect((next.objects["rect-1"] as unknown as { text: string }).text).toBe(
			"new",
		);
		expect(next.textEditState).toBeNull();
		expect(next.commitVersion).toBe(6);
	});

	it("a double click after the pressed commit re-opens editing prefilled with the committed text (exactly one commit)", () => {
		const afterPressed = ObjectEventHandler.handle(
			makeEditState("rect-1", "old", "new"),
			makeTapEvent("pressed", "rect-1"),
			registries,
		);
		const afterDouble = ObjectEventHandler.handle(
			afterPressed,
			makeTapEvent("doubleClick", "rect-1"),
			registries,
		);
		// The pending text was committed by the pressed and prefilled again — not lost.
		expect(afterDouble.textEditState).toEqual({
			objectId: "rect-1",
			text: "new",
		});
		expect(afterDouble.commitVersion).toBe(6);
	});

	it("a pressed on a different object commits the pending edit", () => {
		const next = ObjectEventHandler.handle(
			makeEditState("rect-1", "old", "new"),
			makeTapEvent("pressed", "rect-2"),
			registries,
		);
		// The edit is committed to rect-1 and the session is cleared.
		expect((next.objects["rect-1"] as unknown as { text: string }).text).toBe(
			"new",
		);
		expect(next.textEditState).toBeNull();
		expect(next.commitVersion).toBe(6);
	});
});

describe("ObjectEventHandler - Shift axis-lock drag", () => {
	it("without Shift, both axes move and no axis-lock feedback appears", () => {
		const next = ObjectEventHandler.handle(
			makeDragState(),
			makeDragEvent({ x: 30, y: 12 }, false),
			registries,
		);
		expect(movedRect(next)).toMatchObject({ cx: 30, cy: 12 });
		expect(next.axisLockFeedback).toBeNull();
	});

	it("Shift + horizontal dominant (|dx| >= |dy|) locks Y and moves only X", () => {
		const next = ObjectEventHandler.handle(
			makeDragState(),
			makeDragEvent({ x: 30, y: 12 }, true),
			registries,
		);
		expect(movedRect(next)).toMatchObject({ cx: 30, cy: 0 });
	});

	it("Shift + vertical dominant (|dy| > |dx|) locks X and moves only Y", () => {
		const next = ObjectEventHandler.handle(
			makeDragState(),
			makeDragEvent({ x: 8, y: 25 }, true),
			registries,
		);
		expect(movedRect(next)).toMatchObject({ cx: 0, cy: 25 });
	});

	it("the locked axis follows when the dominant axis of the accumulated delta swaps", () => {
		// First: horizontal dominant -> X moves, Y locked
		const afterX = ObjectEventHandler.handle(
			makeDragState(),
			makeDragEvent({ x: 20, y: 5 }, true),
			registries,
		);
		expect(movedRect(afterX)).toMatchObject({ cx: 20, cy: 0 });

		// Second: still the same drag, now switches to vertical dominant -> X locked, Y moves
		// drag uses the accumulated delta from eventStartSnapshot, so it is re-evaluated from the start state
		const afterY = ObjectEventHandler.handle(
			afterX,
			makeDragEvent({ x: 6, y: 40 }, true),
			registries,
		);
		expect(movedRect(afterY)).toMatchObject({ cx: 0, cy: 40 });
	});

	describe("axis-lock feedback", () => {
		it("horizontal move (Y locked) returns a horizontal line through center Y (y only)", () => {
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 50, y: 8 }, true),
				registries,
			);
			expect(next.axisLockFeedback).toEqual({ y: 30 });
		});

		it("vertical move (X locked) returns a vertical line through center X (x only)", () => {
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 8, y: 50 }, true),
				registries,
			);
			expect(next.axisLockFeedback).toEqual({ x: 20 });
		});

		it("the feedback axis switches when the dominant axis swaps", () => {
			const afterX = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 40, y: 5 }, true),
				registries,
			);
			expect(afterX.axisLockFeedback).toEqual({ y: 30 });

			const afterY = ObjectEventHandler.handle(
				afterX,
				makeDragEvent({ x: 5, y: 40 }, true),
				registries,
			);
			expect(afterY.axisLockFeedback).toEqual({ x: 20 });
		});
	});

	describe("origin snap (during axis lock, near start position)", () => {
		it("snaps to the start position when the free-axis movement is within the threshold", () => {
			// |dx|=4 dominant -> Y locked, X is the free axis. X movement 4 <= 6px (zoom=1), so it snaps to origin
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 4, y: 3 }, true),
				registries,
			);
			expect(movedRect(next)).toMatchObject({ cx: 20, cy: 30 });
		});

		it("returns a both-axis (crosshair) guide while origin-snapped", () => {
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 4, y: 3 }, true),
				registries,
			);
			expect(next.axisLockFeedback).toEqual({ x: 20, y: 30 });
		});

		it("beyond the threshold the snap releases and returns to single-axis lock", () => {
			// X movement 8 > 6px -> leaves the origin and does a Y-locked horizontal move
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 8, y: 3 }, true),
				registries,
			);
			expect(movedRect(next)).toMatchObject({ cx: 28, cy: 30 });
			expect(next.axisLockFeedback).toEqual({ y: 30 });
		});

		it("without Shift there is no snap even near the origin", () => {
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 4, y: 3 }, false),
				registries,
			);
			expect(movedRect(next)).toMatchObject({ cx: 24, cy: 33 });
			expect(next.axisLockFeedback).toBeNull();
		});
	});
});
