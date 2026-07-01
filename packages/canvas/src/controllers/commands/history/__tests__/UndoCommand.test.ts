import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { UndoCommand } from "../UndoCommand";

// canvasToState uses objectMapperRegistry, so initialize it
beforeAll(() => {
	initializeObjectRegistry();
});

const rect = (id: string) =>
	({ id, type: "rect", x: 0, y: 0, width: 100, height: 100 }) as never;

const docPrev = { version: 1, root: [rect("r1")] } as unknown as CanvasDoc;
const docCurrent = {
	version: 1,
	root: [rect("r1"), rect("r2")],
} as unknown as CanvasDoc;

const makeState = (params: {
	past: CanvasDoc[];
	present: CanvasDoc;
	future: CanvasDoc[];
	eventStartSnapshot?: unknown;
	textEditState?: unknown;
}): CanvasControllerState =>
	({
		history: {
			past: params.past,
			present: params.present,
			future: params.future,
		},
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: params.eventStartSnapshot ?? null,
		textEditState: params.textEditState ?? null,
		internalClipboard: null,
		commitVersion: 5,
		saveVersion: 0,
	}) as unknown as CanvasControllerState;

describe("UndoCommand", () => {
	it("restores the previous history entry and rolls present back", () => {
		const state = makeState({
			past: [docPrev],
			present: docCurrent,
			future: [],
		});
		const next = UndoCommand.execute(state);

		// docPrev (r1 only) is restored
		expect(Object.keys(next.objects)).toEqual(["r1"]);
		expect(next.history.present).toBe(docPrev);
		expect(next.history.past).toEqual([]);
		// the rolled-back present is stashed into future
		expect(next.history.future).toEqual([docCurrent]);
	});

	it("clears the selection, increments saveVersion, and leaves commitVersion unchanged", () => {
		const state = makeState({
			past: [docPrev],
			present: docCurrent,
			future: [],
		});
		const next = UndoCommand.execute(state);
		expect(next.selectedIds).toEqual([]);
		expect(next.saveVersion).toBe(1);
		// restoring history is not a commit, so commitVersion is not changed
		expect(next.commitVersion).toBe(5);
	});

	it("preserves the viewport", () => {
		const state = makeState({
			past: [docPrev],
			present: docCurrent,
			future: [],
		});
		expect(UndoCommand.execute(state).viewport).toEqual(state.viewport);
	});

	it("returns the state unchanged when past is empty", () => {
		const state = makeState({ past: [], present: docCurrent, future: [] });
		expect(UndoCommand.execute(state)).toBe(state);
	});

	describe("canExecute", () => {
		it("is executable when there is a past", () => {
			expect(
				UndoCommand.canExecute(
					makeState({ past: [docPrev], present: docCurrent, future: [] }),
				),
			).toBe(true);
		});

		it("is not executable when past is empty", () => {
			expect(
				UndoCommand.canExecute(
					makeState({ past: [], present: docCurrent, future: [] }),
				),
			).toBe(false);
		});

		it("is not executable during a drag", () => {
			expect(
				UndoCommand.canExecute(
					makeState({
						past: [docPrev],
						present: docCurrent,
						future: [],
						eventStartSnapshot: { foo: 1 },
					}),
				),
			).toBe(false);
		});

		it("is not executable while editing text", () => {
			expect(
				UndoCommand.canExecute(
					makeState({
						past: [docPrev],
						present: docCurrent,
						future: [],
						textEditState: { objectId: "r1", text: "" },
					}),
				),
			).toBe(false);
		});
	});
});
