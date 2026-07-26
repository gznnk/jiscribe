import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import {
	createDocSnapshotFromDoc,
	resolveDocSnapshot,
	type DocSnapshot,
} from "../../../../states/canvas/DocSnapshot";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
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

	it("clears the selection, increments saveVersion, and leaves commitVersion unchanged", () => {
		const state = makeState({
			past: [],
			present: snapshotPrev,
			future: [snapshotNext],
		});
		const next = RedoCommand.execute(state, registries);
		expect(next.selectedIds).toEqual([]);
		expect(next.saveVersion).toBe(1);
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
						eventStartSnapshot: { foo: 1 },
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
						textEditState: { kind: "shape", objectId: "r1", text: "" },
					}),
					registries,
				),
			).toBe(false);
		});
	});
});
