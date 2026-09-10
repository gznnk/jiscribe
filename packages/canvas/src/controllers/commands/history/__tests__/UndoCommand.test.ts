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

const rect = (id: string) =>
	({ id, type: "rect", x: 0, y: 0, width: 100, height: 100 }) as never;

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
	selectedIds?: string[];
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
		selectedIds: params.selectedIds ?? [],
		selectedConnectorId: null,
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

	it("keeps the selection the restored entry still holds, and drops the rest", () => {
		const state = makeState({
			past: [snapshotPrev],
			present: snapshotCurrent,
			future: [],
			selectedIds: ["r1", "r2"],
		});
		// r2 does not exist in docPrev, so only r1 stays selected
		expect(UndoCommand.execute(state, registries).selectedIds).toEqual(["r1"]);
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

	it("preserves the viewport", () => {
		const state = makeState({
			past: [snapshotPrev],
			present: snapshotCurrent,
			future: [],
		});
		expect(UndoCommand.execute(state, registries).viewport).toEqual(
			state.viewport,
		);
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
