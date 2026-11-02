import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { applyActions } from "./support/dispatch";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import type { CanvasControllerState } from "../../CanvasTypes";
import { twoRectsWithConnectorDoc } from "../../commands/__tests__/support/fixtures";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import type { CanvasAction } from "../CanvasActions";

/**
 * Escape mid-marquee (CANCEL_DRAG): the selection goes back to what the
 * marquee's dragStart claimed, and the drag drops to "inert" so the frames
 * still to come until release select nothing.
 */

/** rect-1 (0, 0), rect-2 (100, 100) and rect-3 (200, 0), each 10 wide. */
const threeRectsDoc: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		rectDoc("rect-2", 100, 100),
		rectDoc("rect-3", 200, 0),
	],
} as unknown as CanvasDoc;

const cancelDrag: CanvasAction = { type: "CANCEL_DRAG" };

const NO_MODS = { shift: false, alt: false, ctrl: false, meta: false };
const SHIFT_MODS = { ...NO_MODS, shift: true };

/**
 * A left-button mouse gesture on the canvas background from `start` to `last`.
 * `mods` defaults to none; pass SHIFT_MODS for an additive marquee.
 */
const canvasGesture = (
	type: "pressed" | "dragStart" | "drag" | "dragEnd",
	start: { x: number; y: number },
	last: { x: number; y: number },
	mods = NO_MODS,
): CanvasAction =>
	({
		type: "GESTURE",
		gesture: {
			type,
			button: 0,
			pointerType: "mouse",
			targetKind: "canvas",
			targetId: "canvas",
			start,
			last,
			clientLast: last,
			delta: { x: last.x - start.x, y: last.y - start.y },
			clientDelta: { x: last.x - start.x, y: last.y - start.y },
			mods,
		},
	}) as unknown as CanvasAction;

/** Presses at `start` and drags to `last` without releasing. */
const startMarquee = (
	state: CanvasControllerState,
	start: { x: number; y: number },
	last: { x: number; y: number },
	mods = NO_MODS,
): CanvasControllerState =>
	applyActions(state, [
		canvasGesture("pressed", start, start, mods),
		canvasGesture("dragStart", start, { x: start.x + 5, y: start.y + 5 }, mods),
		canvasGesture("drag", start, last, mods),
	]);

describe("canvasReducer (integration)", () => {
	describe("CANCEL_DRAG", () => {
		it("returns the same state with no drag under way", () => {
			const state = createTestState(twoRectsDoc, {
				selection: selectionOf(["rect-1"]),
			});
			expect(applyActions(state, [cancelDrag])).toBe(state);
		});

		it("empties the selection of a plain marquee and drops the drag to inert", () => {
			const state = createTestState(twoRectsDoc, {
				selection: selectionOf(["rect-2"]),
			});
			// rect-1 spans (0, 0)-(10, 10); the marquee from (-20, -20) encloses it.
			const marqueeing = startMarquee(
				state,
				{ x: -20, y: -20 },
				{ x: 30, y: 30 },
			);
			expect(marqueeing.drag?.kind).toBe("marquee");
			expect(marqueeing.selection.objectIds).toEqual(["rect-1"]);

			const cancelled = applyActions(marqueeing, [cancelDrag]);

			expect(cancelled.selection).toEqual(selectionOf([]));
			expect(cancelled.multiSelectGroup).toBeNull();
			expect(cancelled.drag?.kind).toBe("inert");
			expect(cancelled.drag?.startSnapshot).toBe(
				marqueeing.drag?.startSnapshot,
			);
			expect(cancelled.drag?.snapFeedback).toBeNull();
			expect(cancelled.drag?.axisLockFeedback).toBeNull();
			expect(cancelled.drag?.edgeScrollEnabled).toBe(false);
			expect(cancelled.history.past).toHaveLength(
				marqueeing.history.past.length,
			);
		});

		it("restores the base selection and its group for an additive marquee", () => {
			// rect-1 and rect-2 selected by a released marquee, which builds their group.
			const based = applyActions(createTestState(threeRectsDoc), [
				canvasGesture("pressed", { x: -20, y: -20 }, { x: -20, y: -20 }),
				canvasGesture("dragStart", { x: -20, y: -20 }, { x: -15, y: -15 }),
				canvasGesture("drag", { x: -20, y: -20 }, { x: 120, y: 120 }),
				canvasGesture("dragEnd", { x: -20, y: -20 }, { x: 120, y: 120 }),
			]);
			expect(based.selection.objectIds).toEqual(["rect-1", "rect-2"]);
			expect(based.multiSelectGroup).not.toBeNull();

			// Shift-dragged around rect-3 alone.
			const marqueeing = startMarquee(
				based,
				{ x: 190, y: -10 },
				{ x: 220, y: 20 },
				SHIFT_MODS,
			);
			expect(marqueeing.drag?.kind).toBe("marquee");
			expect(marqueeing.selection.objectIds).toEqual([
				"rect-1",
				"rect-2",
				"rect-3",
			]);
			const startGroup = marqueeing.drag?.startSnapshot.multiSelectGroup;
			expect(startGroup).not.toBeNull();

			const cancelled = applyActions(marqueeing, [cancelDrag]);

			expect(cancelled.selection).toEqual(selectionOf(["rect-1", "rect-2"]));
			expect(cancelled.multiSelectGroup).toBe(startGroup);
			expect(cancelled.drag?.kind).toBe("inert");
		});

		it("does not bring back a connector an additive marquee dropped", () => {
			const state = createTestState(twoRectsWithConnectorDoc, {
				selection: selectionOf(["conn-1"]),
			});
			const marqueeing = startMarquee(
				state,
				{ x: -20, y: -20 },
				{ x: 30, y: 30 },
				SHIFT_MODS,
			);
			expect(marqueeing.drag?.kind).toBe("marquee");
			expect(marqueeing.drag?.startSnapshot.selectedIds).toEqual(["conn-1"]);
			expect(marqueeing.selection.objectIds).toEqual(["rect-1"]);

			const cancelled = applyActions(marqueeing, [cancelDrag]);

			expect(cancelled.selection).toEqual(selectionOf([]));
			expect(cancelled.multiSelectGroup).toBeNull();
		});

		it("returns the same state during a drag other than a marquee", () => {
			const moving = createTestState(twoRectsDoc, {
				selection: selectionOf(["rect-1"]),
				drag: {
					kind: "move",
					startSnapshot: {},
					snapFeedback: null,
					axisLockFeedback: null,
					edgeScrollEnabled: true,
				} as unknown as CanvasControllerState["drag"],
			});
			expect(applyActions(moving, [cancelDrag])).toBe(moving);
		});

		it("selects nothing in the frames left before release", () => {
			const marqueeing = startMarquee(
				createTestState(twoRectsDoc),
				{ x: -20, y: -20 },
				{ x: 30, y: 30 },
			);
			const cancelled = applyActions(marqueeing, [cancelDrag]);

			// Encloses rect-2 as well as rect-1: a hit set other than the last
			// frame's, which a live marquee would select.
			const dragged = applyActions(cancelled, [
				canvasGesture("drag", { x: -20, y: -20 }, { x: 120, y: 120 }),
			]);
			expect(dragged.selection.objectIds).toEqual([]);

			const released = applyActions(dragged, [
				canvasGesture("dragEnd", { x: -20, y: -20 }, { x: 120, y: 120 }),
			]);
			expect(released.selection.objectIds).toEqual([]);
			expect(released.drag).toBeNull();
		});
	});
});
