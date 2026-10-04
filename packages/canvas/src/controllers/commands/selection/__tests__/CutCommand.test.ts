import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { CutCommand } from "../CutCommand";

const registries = createTestRegistries();

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
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	rootIds: string[];
}): CanvasControllerState =>
	({
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
			selection: selectionOf(["a"]),
			objects: { a: makeRect("a"), b: makeRect("b") },
			rootIds: ["a", "b"],
		});
		const next = CutCommand.execute(state, registries);

		// copy: stashed to the clipboard
		expect(next.internalClipboard?.rootIds).toEqual(["a"]);
		expect(next.internalClipboard?.objects["a"]).toBeDefined();

		// delete: removed from the canvas
		expect(next.objects["a"]).toBeUndefined();
		expect(next.rootIds).toEqual(["b"]);
		expect(next.selection.objectIds).toEqual([]);
	});

	describe("canExecute", () => {
		it("is executable when there is a selection", () => {
			const state = makeState({
				selection: selectionOf(["a"]),
				objects: { a: makeRect("a") },
				rootIds: ["a"],
			});
			expect(CutCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable when there is no selection", () => {
			expect(
				CutCommand.canExecute(
					makeState({ selection: selectionOf([]), objects: {}, rootIds: [] }),
					registries,
				),
			).toBe(false);
		});
	});
});
