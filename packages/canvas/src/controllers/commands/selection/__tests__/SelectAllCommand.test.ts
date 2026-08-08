import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { SelectAllCommand } from "../SelectAllCommand";

const registries = createTestRegistries();

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makeState = (params: {
	rootIds: string[];
	objects: Record<string, ObjectState>;
}): CanvasControllerState =>
	({
		rootIds: params.rootIds,
		objects: params.objects,
		selectedIds: [],
		selectedConnectorId: "stale",
		selectedVertex: { objectId: "x", vertexIndex: 0 },
		multiSelectGroup: null,
		objectMenuOpenId: "x",
	}) as unknown as CanvasControllerState;

describe("SelectAllCommand", () => {
	it("selects all of rootIds", () => {
		const state = makeState({
			rootIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 200) },
		});
		const next = SelectAllCommand.execute(state, registries);
		expect(next.selectedIds).toEqual(["a", "b"]);
	});

	it("creates a multiSelectGroup for a multi-selection", () => {
		const state = makeState({
			rootIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 200) },
		});
		expect(
			SelectAllCommand.execute(state, registries).multiSelectGroup,
		).not.toBeNull();
	});

	it("clears the mutually-exclusive connector and vertex selections", () => {
		const state = makeState({
			rootIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 200) },
		});
		const next = SelectAllCommand.execute(state, registries);
		expect(next.selectedConnectorId).toBeNull();
		expect(next.selectedVertex).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
	});

	describe("canExecute", () => {
		it("is executable when there are objects at the root", () => {
			const state = makeState({
				rootIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
			});
			expect(SelectAllCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable on an empty canvas", () => {
			expect(
				SelectAllCommand.canExecute(
					makeState({ rootIds: [], objects: {} }),
					registries,
				),
			).toBe(false);
		});
	});
});
