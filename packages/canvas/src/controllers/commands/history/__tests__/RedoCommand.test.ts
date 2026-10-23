import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { createTestSnapshot } from "../../../__tests__/support/createTestSnapshot";
import type { CanvasControllerState, DocSnapshot } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { EMPTY_SELECTION } from "../../../selection/CanvasSelection";
import { RedoCommand } from "../RedoCommand";

const registries = createTestRegistries();

const rect = (id: string) =>
	({ id, type: "rect", x: 0, y: 0, width: 100, height: 100 }) as never;

const docPrev = { version: 1, root: [rect("r1")] } as unknown as CanvasDoc;
const docNext = {
	version: 1,
	root: [rect("r1"), rect("r2")],
} as unknown as CanvasDoc;
// The present entry, holding its Doc cache as one does after a save.
const snapshotPrev = createTestSnapshot(docPrev, docPrev);
const snapshotNext = createTestSnapshot(docNext);

const makeState = (params: {
	past: DocSnapshot[];
	present: DocSnapshot;
	future: DocSnapshot[];
	activeDrag?: unknown;
	textEditState?: unknown;
	selection?: CanvasSelection;
}): CanvasControllerState =>
	({
		history: {
			past: params.past,
			present: params.present,
			future: params.future,
		},
		objects: params.present.source.objects,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		scrollLimit: {
			hostConfig: null,
			rect: null,
			measuredFrom: null,
			measuredView: undefined,
		},
		activeDrag: params.activeDrag ?? null,
		textEditState: params.textEditState ?? null,
		selection: params.selection ?? EMPTY_SELECTION,
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

		// docNext (r1, r2) is restored, as the very state the entry holds
		expect(Object.keys(next.objects).sort()).toEqual(["r1", "r2"]);
		expect(next.objects).toBe(snapshotNext.source.objects);
		expect(next.history.present).toBe(snapshotNext);
		// the advanced-from present is pushed onto past without its Doc cache, as
		// a new entry around the same state: the one being left is not written
		expect(next.history.past).toHaveLength(1);
		expect(next.history.past[0].source).toBe(snapshotPrev.source);
		expect(next.history.past[0].doc).toBeNull();
		expect(snapshotPrev.doc).toBe(docPrev);
		expect(next.history.future).toEqual([]);
	});

	it("keeps the selection the restored entry still holds", () => {
		const state = makeState({
			past: [],
			present: snapshotPrev,
			future: [snapshotNext],
			selection: selectionOf(["r1"]),
		});
		expect(RedoCommand.execute(state, registries).selection.objectIds).toEqual([
			"r1",
		]);
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

	it("returns the state unchanged during a drag", () => {
		const state = makeState({
			past: [],
			present: snapshotPrev,
			future: [snapshotNext],
			activeDrag: { startSnapshot: { foo: 1 }, kind: "other" },
		});
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

		it("stays offered during a drag; the drag is guarded on execution", () => {
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
			).toBe(true);
		});

		it("is not executable while editing text", () => {
			expect(
				RedoCommand.canExecute(
					makeState({
						past: [],
						present: snapshotPrev,
						future: [snapshotNext],
						textEditState: { kind: "shape", text: "" },
					}),
					registries,
				),
			).toBe(false);
		});
	});
});
