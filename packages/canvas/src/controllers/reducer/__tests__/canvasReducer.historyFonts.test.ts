import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { TextMeasurement } from "@jiscribe/doc/text/measure/TextMeasurement";
import {
	advanceTextMeasurementGeneration,
	offerTextMeasurement,
	resetTextMeasurementForTests,
} from "@jiscribe/doc/text/measure/textMeasurementSlot";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import {
	applyActions,
	runCommands,
	testReducerRegistries,
} from "./support/dispatch";
import { rectDoc } from "./support/fixtures";
import type { Viewport } from "../../../rendering/Viewport";
import type { CanvasControllerState } from "../../CanvasTypes";
import { UndoCommand } from "../../commands/history/UndoCommand";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";

/**
 * Undo / redo across a web font arriving (the text measurement generation
 * moving on): the entry's boxes were measured against the faces loaded back
 * then, so the restore re-measures them, and only them.
 */

/** The family whose face arrives mid-session; every other one measures the same throughout. */
const LATE_FAMILY = "Late Font";

/** Width per character per px of font size, before and after the late face loads. */
const FALLBACK_RATIO = 0.5;
const LOADED_RATIO = 0.9;
const STEADY_RATIO = 0.6;

let lateFamilyRatio = FALLBACK_RATIO;

/** The renderer stand-in: answers for LATE_FAMILY change once its face loads. */
const switchingMeasurement: TextMeasurement = {
	source: "renderer",
	createMeasurer: (font) => (text) =>
		text.length *
		font.fontSize *
		(font.fontFamily.includes(LATE_FAMILY) ? lateFamilyRatio : STEADY_RATIO),
};

resetTextMeasurementForTests();
offerTextMeasurement(switchingMeasurement);

/** What the browser host does when a face finishes loading (Canvas, useDocFonts). */
const loadLateFace = (): void => {
	lateFamilyRatio = LOADED_RATIO;
	advanceTextMeasurementGeneration();
};

beforeEach(() => {
	lateFamilyRatio = FALLBACK_RATIO;
});

/**
 * rect-1 off screen to the left of the view, rect-2 and a steady text in it,
 * and a text in the late family far off screen.
 */
const fontDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		rectDoc("rect-2", 600, 100),
		{ id: "text-steady", type: "text", x: 700, y: 300, text: "Steady" },
		{
			id: "text-late",
			type: "text",
			x: -2000,
			y: 100,
			text: "Arrives late",
			fontFamily: LATE_FAMILY,
		},
	],
} as unknown as CanvasDoc;

/** Shows rect-2 and the steady text; rect-1 and the late text are left of it. */
const VIEW: Viewport = { minX: 300, minY: 0, width: 800, height: 600, zoom: 1 };

/** The document committed once: `ids` nudged right, measured before the face loads. */
const nudged = (ids: string[]): CanvasControllerState =>
	runCommands(
		createTestState(fontDoc, { selection: selectionOf(ids), viewport: VIEW }),
		"move-right",
	);

const widthOf = (state: CanvasControllerState, id: string): number =>
	(state.objects[id] as unknown as { width: number }).width;

describe("canvasReducer (integration)", () => {
	describe("history restore across a font load", () => {
		it("re-measures only the boxes the new face changes, and hands back every other object as it was", () => {
			const moved = nudged(["rect-2"]);
			const entry = moved.history.past[0];
			loadLateFace();

			const undone = UndoCommand.execute(moved, testReducerRegistries);

			for (const id of ["rect-1", "rect-2", "text-steady"]) {
				expect(undone.objects[id]).toBe(entry.source.objects[id]);
			}
			expect(undone.objects["text-late"]).not.toBe(
				entry.source.objects["text-late"],
			);
			expect(widthOf(undone, "text-late")).toBeGreaterThan(
				widthOf(moved, "text-late"),
			);
		});

		it("lands on the state a rebuild of the entry re-measured after the load gives", () => {
			const moved = nudged(["rect-2"]);
			loadLateFace();

			const undone = runCommands(moved, "undo");
			// The opened document loaded under the new face, then re-measured the
			// way the canvas does when a face arrives.
			const rebuilt = applyActions(createTestState(fontDoc), [
				{ type: "REMEASURE_TEXT" },
			]);

			expect(undone.objects).toStrictEqual(rebuilt.objects);
			expect(undone.rootIds).toStrictEqual(rebuilt.rootIds);
		});

		it("keeps the entry's very map when the generation moved but no box did", () => {
			const moved = nudged(["rect-2"]);
			const entry = moved.history.past[0];
			// A face that changes no answer: the generation moves all the same.
			advanceTextMeasurementGeneration();

			const undone = UndoCommand.execute(moved, testReducerRegistries);

			expect(undone.objects).toBe(entry.source.objects);
		});

		it("does not pan for boxes a re-measure renewed off screen when the change is in view", () => {
			let state = nudged(["rect-2"]);
			loadLateFace();
			// The canvas re-measures its live state as soon as the face arrives.
			state = applyActions(state, [{ type: "REMEASURE_TEXT" }]);
			expect(state.objects["text-late"]).not.toBe(
				state.history.present.source.objects["text-late"],
			);

			const undone = runCommands(state, "undo");

			expect(undone.viewport).toEqual(VIEW);
			const redone = runCommands(undone, "redo");
			expect(redone.viewport).toEqual(VIEW);
		});

		it("still reveals a change off screen after the load", () => {
			const moved = nudged(["rect-1"]);
			loadLateFace();

			const undone = runCommands(moved, "undo");

			// rect-1 (0..10 wide) left of the view: panned to show it with the margin.
			expect(undone.viewport.minX).toBe(-48);
		});
	});
});
