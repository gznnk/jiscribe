import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { CanvasControllerState, DocSnapshot } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import {
	createDocSnapshotFromDoc,
	resolveDocSnapshot,
} from "../../../utils/resolveDocSnapshot";
import { RedoCommand } from "../RedoCommand";

const registries = createTestRegistries();

const rect = (id: string) =>
	({ id, type: "rect", x: 0, y: 0, width: 100, height: 100 }) as never;

const docPrev = { version: 1, root: [rect("r1")] } as unknown as CanvasDoc;
const docNext = {
	version: 1,
	root: [rect("r1"), rect("r2")],
} as unknown as CanvasDoc;
const snapshotPrev = createDocSnapshotFromDoc(docPrev);
const snapshotNext = createDocSnapshotFromDoc(docNext);

const makeState = (params: {
	past: DocSnapshot[];
	present: DocSnapshot;
	future: DocSnapshot[];
	activeDrag?: unknown;
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
		activeDrag: params.activeDrag ?? null,
		textEditState: params.textEditState ?? null,
		selectedIds: params.selectedIds ?? [],
		selectedConnectorId: null,
		multiSelectGroup: null,
		internalClipboard: null,
		commitVersion: 5,
		saveRequest: { version: 0, nonce: "" },
		registries,
	}) as unknown as CanvasControllerState;

describe("RedoCommand", () => {
	it("restores the head of future and advances present", () => {
		const state = makeState({
			past: [],
			present: snapshotPrev,
			future: [snapshotNext],
		});
		const next = RedoCommand.execute(state, registries);

		// docNext (r1, r2) is restored
		expect(Object.keys(next.objects).sort()).toEqual(["r1", "r2"]);
		expect(next.history.present).toBe(snapshotNext);
		expect(
			resolveDocSnapshot(next.history.present, registries.objectMapper),
		).toBe(docNext);
		// the advanced-from present is pushed onto past as-is (still a snapshot)
		expect(next.history.past).toEqual([snapshotPrev]);
		expect(next.history.future).toEqual([]);
	});

	it("keeps the selection the restored entry still holds", () => {
		const state = makeState({
			past: [],
			present: snapshotPrev,
			future: [snapshotNext],
			selectedIds: ["r1"],
		});
		expect(RedoCommand.execute(state, registries).selectedIds).toEqual(["r1"]);
	});

	it("raises a save request and leaves commitVersion unchanged", () => {
		const state = makeState({
			past: [],
			present: snapshotPrev,
			future: [snapshotNext],
		});
		const next = RedoCommand.execute(state, registries);
		expect(next.saveRequest.version).toBe(1);
		expect(next.commitVersion).toBe(5);
	});

	it("returns the state unchanged when future is empty", () => {
		const state = makeState({ past: [], present: snapshotPrev, future: [] });
		expect(RedoCommand.execute(state, registries)).toBe(state);
	});

	describe("canExecute", () => {
		it("is executable when there is a future", () => {
			expect(
				RedoCommand.canExecute(
					makeState({
						past: [],
						present: snapshotPrev,
						future: [snapshotNext],
					}),
					registries,
				),
			).toBe(true);
		});

		it("is not executable when future is empty", () => {
			expect(
				RedoCommand.canExecute(
					makeState({ past: [], present: snapshotPrev, future: [] }),
					registries,
				),
			).toBe(false);
		});

		it("is not executable during a drag", () => {
			expect(
				RedoCommand.canExecute(
					makeState({
						past: [],
						present: snapshotPrev,
						future: [snapshotNext],
						activeDrag: { startSnapshot: { foo: 1 }, kind: "other" },
					}),
					registries,
				),
			).toBe(false);
		});

		it("is not executable while editing text", () => {
			expect(
				RedoCommand.canExecute(
					makeState({
						past: [],
						present: snapshotPrev,
						future: [snapshotNext],
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
