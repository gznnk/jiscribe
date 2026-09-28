import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../rendering/Viewport";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestState } from "./support/createTestState";
import { applyActions, runCommands } from "./support/dispatch";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import { calcObjectBoundingBox } from "../../utils/calcObjectBoundingBox";
import { createDocSnapshotFromDoc } from "../../utils/resolveDocSnapshot";

/**
 * Undo, redo and revert pan the camera to what they changed when it is off
 * screen, and never touch the zoom (calcViewportToRevealHistoryChange).
 */

/** An 800x600 view at the given camera, far from every fixture rect by default. */
const viewAt = (minX: number, minY: number, zoom = 1): Viewport => ({
	minX,
	minY,
	width: 800,
	height: 600,
	zoom,
});

/** Whether the object's box lies wholly inside the visible world rect. */
const isInView = (state: CanvasControllerState, id: string): boolean => {
	const box = calcObjectBoundingBox(state.objects[id], state.objects);
	const { minX, minY, width, height, zoom } = state.viewport;
	return (
		box !== null &&
		box.left >= minX &&
		box.top >= minY &&
		box.right <= minX + width / zoom &&
		box.bottom <= minY + height / zoom
	);
};

const docOf = (...root: unknown[]): CanvasDoc =>
	({ version: 1, root }) as unknown as CanvasDoc;

/** rect-1 alone in the past, then rect-3 added far away from it. */
const withoutRect3 = docOf(rectDoc("rect-1", 0, 0));
const withRect3 = docOf(rectDoc("rect-1", 0, 0), rectDoc("rect-3", 3000, 2000));

/** A state whose last commit added rect-3, seen from `viewport`. */
const createdRect3State = (viewport: Viewport): CanvasControllerState =>
	createTestState(withRect3, {
		viewport,
		history: {
			past: [createDocSnapshotFromDoc(withoutRect3)],
			present: createDocSnapshotFromDoc(withRect3),
			future: [],
		},
	});

describe("canvasReducer (integration)", () => {
	describe("history reveal", () => {
		it("pans to an object moved back off screen by undo", () => {
			let state = createTestState(twoRectsDoc, { selectedIds: ["rect-1"] });
			state = runCommands(state, "move-right");
			state = { ...state, viewport: viewAt(5000, 5000) };

			const undone = runCommands(state, "undo");

			expect(isInView(undone, "rect-1")).toBe(true);
			expect(undone.viewport.zoom).toBe(1);
			expect(undone.viewport.width).toBe(800);
			expect(undone.viewport.height).toBe(600);
		});

		it("keeps the viewport itself when the change is already in view", () => {
			let state = createTestState(twoRectsDoc, { selectedIds: ["rect-1"] });
			state = runCommands(state, "move-right");
			state = { ...state, viewport: viewAt(-100, -100) };

			expect(runCommands(state, "undo").viewport).toBe(state.viewport);
		});

		it("reveals where an object was when undo removes its creation", () => {
			const state = createdRect3State(viewAt(0, 0));
			const rect3Box = calcObjectBoundingBox(
				state.objects["rect-3"],
				state.objects,
			);

			const undone = runCommands(state, "undo");

			expect(undone.objects["rect-3"]).toBeUndefined();
			const { minX, minY, width, height } = undone.viewport;
			expect(rect3Box).not.toBeNull();
			expect(rect3Box!.left).toBeGreaterThanOrEqual(minX);
			expect(rect3Box!.right).toBeLessThanOrEqual(minX + width);
			expect(rect3Box!.top).toBeGreaterThanOrEqual(minY);
			expect(rect3Box!.bottom).toBeLessThanOrEqual(minY + height);
		});

		it("reveals what redo brings back", () => {
			let state = runCommands(createdRect3State(viewAt(0, 0)), "undo");
			state = { ...state, viewport: viewAt(-5000, -5000) };

			const redone = runCommands(state, "redo");

			expect(isInView(redone, "rect-3")).toBe(true);
		});

		it("reveals what REVERT_HISTORY restores", () => {
			const target = createDocSnapshotFromDoc(
				docOf(rectDoc("rect-1", 4000, 0)),
			);
			const state = createTestState(docOf(rectDoc("rect-1", 0, 0)), {
				viewport: viewAt(0, 0),
				history: {
					past: [
						target,
						createDocSnapshotFromDoc(docOf(rectDoc("rect-1", 10, 0))),
					],
					present: createDocSnapshotFromDoc(docOf(rectDoc("rect-1", 0, 0))),
					future: [],
				},
			});

			const reverted = applyActions(state, [
				{ type: "REVERT_HISTORY", entry: target },
			]);

			expect(isInView(reverted, "rect-1")).toBe(true);
		});

		it("keeps the zoom and centres a change larger than the view", () => {
			// Two rects 4000 apart, both nudged: their union cannot fit at zoom 2.
			let state = createTestState(
				docOf(rectDoc("rect-1", 0, 0), rectDoc("rect-2", 4000, 0)),
				{ selectedIds: ["rect-1", "rect-2"] },
			);
			state = runCommands(state, "move-down");
			state = { ...state, viewport: viewAt(-3000, 0, 2) };

			const undone = runCommands(state, "undo");

			expect(undone.viewport.zoom).toBe(2);
			// Centre of the union (0..4010) minus half of the 400 units shown.
			expect(undone.viewport.minX).toBe(1805);
			// y fits, so it takes the smallest pan: the 24-unit margin above the rects.
			expect(undone.viewport.minY).toBe(-24);
		});
	});
});
