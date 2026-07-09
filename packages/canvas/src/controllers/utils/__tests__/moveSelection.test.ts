import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { createTestRegistries } from "../../setup/createCanvasRegistries";
import { moveSelection } from "../moveSelection";

const registries = createTestRegistries();

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 10,
		height: 10,
	}) as unknown as ObjectState;

const makeGroup = (
	id: string,
	cx: number,
	cy: number,
	childIds: string[],
): GroupState =>
	({
		id,
		type: "group",
		cx,
		cy,
		width: 100,
		height: 100,
		childIds,
	}) as unknown as GroupState;

describe("moveSelection", () => {
	it("translates a non-group shape by delta", () => {
		const srcObjects = { r1: makeRect("r1", 100, 100) };

		const { objects } = moveSelection({
			objectBehavior: registries.objectBehavior,
			selectedIds: ["r1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 10, y: -5 },
		});

		expect(objects.r1).toMatchObject({ cx: 110, cy: 95 });
	});

	it("returns a clone without mutating srcObjects", () => {
		const srcObjects = { r1: makeRect("r1", 0, 0) };

		const { objects } = moveSelection({
			objectBehavior: registries.objectBehavior,
			selectedIds: ["r1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 5, y: 5 },
		});

		expect(srcObjects.r1).toMatchObject({ cx: 0, cy: 0 });
		expect(objects).not.toBe(srcObjects);
	});

	it("leaves objects outside the selection as-is", () => {
		const srcObjects = {
			r1: makeRect("r1", 0, 0),
			r2: makeRect("r2", 50, 50),
		};

		const { objects } = moveSelection({
			objectBehavior: registries.objectBehavior,
			selectedIds: ["r1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 10, y: 10 },
		});

		expect(objects.r1).toMatchObject({ cx: 10, cy: 10 });
		expect(objects.r2).toBe(srcObjects.r2);
	});

	it("silently skips nonexistent selected IDs", () => {
		const srcObjects = { r1: makeRect("r1", 0, 0) };

		const { objects } = moveSelection({
			objectBehavior: registries.objectBehavior,
			selectedIds: ["ghost", "r1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 1, y: 1 },
		});

		expect(objects.ghost).toBeUndefined();
		expect(objects.r1).toMatchObject({ cx: 1, cy: 1 });
	});

	it("a group recursively moves its descendants too", () => {
		const srcObjects = {
			g1: makeGroup("g1", 50, 50, ["r1"]),
			r1: makeRect("r1", 30, 30),
		};

		const { objects } = moveSelection({
			objectBehavior: registries.objectBehavior,
			selectedIds: ["g1"],
			srcObjects,
			srcMultiSelectGroup: null,
			delta: { x: 20, y: 0 },
		});

		expect(objects.g1).toMatchObject({ cx: 70, cy: 50 });
		expect(objects.r1).toMatchObject({ cx: 50, cy: 30 });
	});

	it("also syncs the multiSelectGroup's center by delta", () => {
		const srcMultiSelectGroup = makeGroup("ms", 10, 20, ["r1"]);

		const { multiSelectGroup } = moveSelection({
			objectBehavior: registries.objectBehavior,
			selectedIds: ["r1"],
			srcObjects: { r1: makeRect("r1", 0, 0) },
			srcMultiSelectGroup,
			delta: { x: 5, y: 7 },
		});

		expect(multiSelectGroup).toMatchObject({ cx: 15, cy: 27 });
		// the original multiSelectGroup is not mutated
		expect(srcMultiSelectGroup).toMatchObject({ cx: 10, cy: 20 });
	});

	it("returns null when multiSelectGroup is null", () => {
		const { multiSelectGroup } = moveSelection({
			objectBehavior: registries.objectBehavior,
			selectedIds: [],
			srcObjects: {},
			srcMultiSelectGroup: null,
			delta: { x: 1, y: 1 },
		});

		expect(multiSelectGroup).toBeNull();
	});
});
