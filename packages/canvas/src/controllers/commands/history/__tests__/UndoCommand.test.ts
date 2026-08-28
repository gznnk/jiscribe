import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { CanvasControllerState, DocSnapshot } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import {
	createDocSnapshotFromDoc,
	resolveDocSnapshot,
} from "../../../utils/resolveDocSnapshot";
import { UndoCommand } from "../UndoCommand";

const registries = createTestRegistries();

const rect = (id: string, x = 0, y = 0) =>
	({ id, type: "rect", x, y, width: 100, height: 100 }) as never;

const docPrev = { version: 1, root: [rect("r1")] } as unknown as CanvasDoc;
const docCurrent = {
	version: 1,
	root: [rect("r1"), rect("r2")],
} as unknown as CanvasDoc;
const snapshotPrev = createDocSnapshotFromDoc(docPrev);
const snapshotCurrent = createDocSnapshotFromDoc(docCurrent);

const makeState = (params: {
	past: DocSnapshot[];
	present: DocSnapshot;
	future: DocSnapshot[];
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
		objects: {},
		internalClipboard: null,
		commitVersion: 5,
		saveVersion: 0,
		registries,
	}) as unknown as CanvasControllerState;

describe("UndoCommand", () => {
	it("restores the previous history entry and rolls present back", () => {
		const state = makeState({
			past: [snapshotPrev],
			present: snapshotCurrent,
			future: [],
		});
		const next = UndoCommand.execute(state, registries);

		// docPrev (r1 only) is restored
		expect(Object.keys(next.objects)).toEqual(["r1"]);
		expect(next.history.present).toBe(snapshotPrev);
		expect(
			resolveDocSnapshot(next.history.present, registries.objectMapper),
		).toBe(docPrev);
		expect(next.history.past).toEqual([]);
		// the rolled-back present is stashed into future as-is (still a snapshot)
		expect(next.history.future).toEqual([snapshotCurrent]);
	});

	it("clears the selection, increments saveVersion, and leaves commitVersion unchanged", () => {
		const state = makeState({
			past: [snapshotPrev],
			present: snapshotCurrent,
			future: [],
		});
		const next = UndoCommand.execute(state, registries);
		expect(next.selectedIds).toEqual([]);
		expect(next.saveVersion).toBe(1);
		// restoring history is not a commit, so commitVersion is not changed
		expect(next.commitVersion).toBe(5);
	});

	it("leaves the viewport alone when the restored change is already on screen", () => {
		const state = makeState({
			past: [snapshotPrev],
			present: snapshotCurrent,
			future: [],
		});
		expect(UndoCommand.execute(state, registries).viewport).toEqual(
			state.viewport,
		);
	});

	it("reveals a restored change that would land off screen", () => {
		// The ids come off the entry being left, since that is the commit undo is
		// taking back — r1 is where the restore puts it, far outside the viewport.
		const offScreenDoc = {
			version: 1,
			root: [rect("r1", 5000, 5000)],
		} as unknown as CanvasDoc;
		const state = makeState({
			past: [createDocSnapshotFromDoc(offScreenDoc)],
			present: { ...snapshotCurrent, changedIds: ["r1"] },
			future: [],
		});

		const { viewport } = UndoCommand.execute(state, registries);

		expect(viewport.zoom).toBe(1);
		expect(viewport.minX).toBeGreaterThan(4000);
		expect(viewport.minY).toBeGreaterThan(4000);
	});

	it("returns the state unchanged when past is empty", () => {
		const state = makeState({ past: [], present: snapshotCurrent, future: [] });
		expect(UndoCommand.execute(state, registries)).toBe(state);
	});

	describe("canExecute", () => {
		it("is executable when there is a past", () => {
			expect(
				UndoCommand.canExecute(
					makeState({
						past: [snapshotPrev],
						present: snapshotCurrent,
						future: [],
					}),
					registries,
				),
			).toBe(true);
		});

		it("is not executable when past is empty", () => {
			expect(
				UndoCommand.canExecute(
					makeState({ past: [], present: snapshotCurrent, future: [] }),
					registries,
				),
			).toBe(false);
		});

		it("is not executable during a drag", () => {
			expect(
				UndoCommand.canExecute(
					makeState({
						past: [snapshotPrev],
						present: snapshotCurrent,
						future: [],
						eventStartSnapshot: { foo: 1 },
					}),
					registries,
				),
			).toBe(false);
		});

		it("is not executable while editing text", () => {
			expect(
				UndoCommand.canExecute(
					makeState({
						past: [snapshotPrev],
						present: snapshotCurrent,
						future: [],
						textEditState: {
							kind: "shape",
							objectId: "r1",
							slotId: "body",
							text: "",
						},
					}),
					registries,
				),
			).toBe(false);
		});
	});
});
