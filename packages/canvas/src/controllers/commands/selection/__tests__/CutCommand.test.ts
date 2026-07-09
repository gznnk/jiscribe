import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { CutCommand } from "../CutCommand";

const makeRect = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
}): CanvasControllerState =>
	({
		selectedVertex: null,
		selectedConnectorId: null,
		multiSelectGroup: null,
		internalClipboard: null,
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("CutCommand", () => {
	it("stashes the selection to the clipboard and then deletes it (copy + delete combined)", () => {
		const state = makeState({
			selectedIds: ["a"],
			objects: { a: makeRect("a"), b: makeRect("b") },
			rootIds: ["a", "b"],
		});
		const next = CutCommand.execute(state);

		// copy: stashed to the clipboard
		expect(next.internalClipboard?.rootIds).toEqual(["a"]);
		expect(next.internalClipboard?.objects["a"]).toBeDefined();

		// delete: removed from the canvas
		expect(next.objects["a"]).toBeUndefined();
		expect(next.rootIds).toEqual(["b"]);
		expect(next.selectedIds).toEqual([]);
	});

	describe("canExecute", () => {
		it("is executable when there is a selection", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a") },
				rootIds: ["a"],
			});
			expect(CutCommand.canExecute(state)).toBe(true);
		});

		it("is not executable when there is no selection", () => {
			expect(
				CutCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
				),
			).toBe(false);
		});
	});
});
