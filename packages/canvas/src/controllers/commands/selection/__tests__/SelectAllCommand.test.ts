import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../selection/__tests__/support/vertexPartSelection";
import { reconcileSelection } from "../../../selection/writers/reconcileSelection";
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
		selection: selectionOf(["stale"], vertexPartSelection(0)),
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
		expect(next.selection.objectIds).toEqual(["a", "b"]);
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

	it("replaces the previous selection and clears the part selection", () => {
		const state = makeState({
			rootIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 200) },
		});
		const next = SelectAllCommand.execute(state, registries);
		expect(next.selection.objectIds).not.toContain("stale");
		expect(next.objectMenuOpenId).toBeNull();
		// The part selection is the reducer's to drop, which it does for every
		// command result (reconcileSelection).
		expect(
			reconcileSelection(next, registries.objectPartKind).selection.part,
		).toBeNull();
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
