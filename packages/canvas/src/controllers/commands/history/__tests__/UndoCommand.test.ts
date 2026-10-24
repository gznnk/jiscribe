import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { createTestSnapshot } from "../../../__tests__/support/createTestSnapshot";
import type { CanvasControllerState, DocSnapshot } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { EMPTY_SELECTION } from "../../../selection/CanvasSelection";
import { UndoCommand } from "../UndoCommand";

const registries = createTestRegistries();

const rect = (id: string) =>
	({ id, type: "rect", x: 0, y: 0, width: 100, height: 100 }) as never;

const docPrev = { version: 1, root: [rect("r1")] } as unknown as CanvasDoc;
const docCurrent = {
	version: 1,
	root: [rect("r1"), rect("r2")],
} as unknown as CanvasDoc;
const snapshotPrev = createTestSnapshot(docPrev);
// The present entry, holding its Doc cache as one does after a save.
const snapshotCurrent = createTestSnapshot(docCurrent, docCurrent);

const makeState = (params: {
	past: DocSnapshot[];
	present: DocSnapshot;
	future: DocSnapshot[];
	drag?: unknown;
	mode?: unknown;
	selection?: CanvasSelection;
}): CanvasControllerState =>
	({
		history: {
			past: params.past,
			present: params.present,
			future: params.future,
		},
		// What the present entry holds, which is where a removed object is measured.
		objects: params.present.source.objects,
		// Shows both rects with the margin undo reveals them with.
		viewport: { minX: -100, minY: -100, width: 800, height: 600, zoom: 1 },
		scrollLimit: {
			hostConfig: null,
			rect: null,
			measuredFrom: null,
			measuredView: undefined,
		},
		drag: params.drag ?? null,
		mode: params.mode ?? { kind: "normal" },
		selection: params.selection ?? EMPTY_SELECTION,
		multiSelectGroup: null,
		internalClipboard: null,
		commitVersion: 5,
		saveRequest: { version: 0, nonce: "" },
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

		// docPrev (r1 only) is restored, as the very state the entry holds
		expect(Object.keys(next.objects)).toEqual(["r1"]);
		expect(next.objects).toBe(snapshotPrev.source.objects);
		expect(next.history.present).toBe(snapshotPrev);
		expect(next.history.past).toEqual([]);
		// the rolled-back present is stashed into future without its Doc cache,
		// as a new entry around the same state: the one being left is not written
		expect(next.history.future).toHaveLength(1);
		expect(next.history.future[0].source).toBe(snapshotCurrent.source);
		expect(next.history.future[0].doc).toBeNull();
		expect(snapshotCurrent.doc).toBe(docCurrent);
	});

	it("keeps the selection the restored entry still holds, and drops the rest", () => {
		const state = makeState({
			past: [snapshotPrev],
			present: snapshotCurrent,
			future: [],
			selection: selectionOf(["r1", "r2"]),
		});
		// r2 does not exist in docPrev, so only r1 stays selected
		expect(UndoCommand.execute(state, registries).selection.objectIds).toEqual([
			"r1",
		]);
	});

	it("raises a save request and leaves commitVersion unchanged", () => {
		const state = makeState({
			past: [snapshotPrev],
			present: snapshotCurrent,
			future: [],
		});
		const next = UndoCommand.execute(state, registries);
		expect(next.saveRequest.version).toBe(1);
		// restoring history is not a commit, so commitVersion is not changed
		expect(next.commitVersion).toBe(5);
	});

	it("keeps the viewport while what it undoes is in view", () => {
		const state = makeState({
			past: [snapshotPrev],
			present: snapshotCurrent,
			future: [],
		});
		expect(UndoCommand.execute(state, registries).viewport).toBe(
			state.viewport,
		);
	});

	it("returns the state unchanged when past is empty", () => {
		const state = makeState({ past: [], present: snapshotCurrent, future: [] });
		expect(UndoCommand.execute(state, registries)).toBe(state);
	});

	it("returns the state unchanged during a drag", () => {
		const state = makeState({
			past: [snapshotPrev],
			present: snapshotCurrent,
			future: [],
			drag: {
				kind: "inert",
				startSnapshot: { foo: 1 },
				snapFeedback: null,
				axisLockFeedback: null,
				edgeScrollEnabled: false,
			},
		});
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

		it("stays offered during a drag; the drag is guarded on execution", () => {
			expect(
				UndoCommand.canExecute(
					makeState({
						past: [snapshotPrev],
						present: snapshotCurrent,
						future: [],
						drag: {
							kind: "inert",
							startSnapshot: { foo: 1 },
							snapFeedback: null,
							axisLockFeedback: null,
							edgeScrollEnabled: false,
						},
					}),
					registries,
				),
			).toBe(true);
		});

		it("is not executable while editing text", () => {
			expect(
				UndoCommand.canExecute(
					makeState({
						past: [snapshotPrev],
						present: snapshotCurrent,
						future: [],
						mode: { kind: "textEdit", draft: { kind: "shape", text: "" } },
					}),
					registries,
				),
			).toBe(false);
		});
	});
});
