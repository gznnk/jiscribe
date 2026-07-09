import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { createTestRegistries } from "../../../../../setup/createCanvasRegistries";
import {
	rotateGroupByGroup,
	transformGroupByGroup,
} from "../../base/GroupTransform";
import {
	moveByDelta,
	moveObjectTree,
	rotateByGroup,
	transformByGroup,
} from "../GroupController";

const makeGroup = (overrides?: Partial<GroupState>): GroupState =>
	({
		id: "group-1",
		type: "group",
		cx: 100,
		cy: 100,
		width: 200,
		height: 200,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		childIds: ["a", "b"],
		...overrides,
	}) as unknown as GroupState;

describe("GroupController.moveByDelta", () => {
	it("translates the group's own center (cx, cy) by delta", () => {
		const group = makeGroup({ cx: 100, cy: 100 });
		const result = moveByDelta(group, { x: 10, y: 20 });
		expect(result.cx).toBe(110);
		expect(result.cy).toBe(120);
	});

	it("does not mutate the source group", () => {
		const group = makeGroup({ cx: 100, cy: 100 });
		moveByDelta(group, { x: 10, y: 20 });
		expect(group.cx).toBe(100);
		expect(group.cy).toBe(100);
	});
});

describe("GroupController.moveObjectTree", () => {
	// moveObjectTree resolves each node's translation through the registry
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

	it("translates a leaf object via the registry", () => {
		const src = { r1: makeRect("r1", 100, 100) };
		const dst: Record<string, ObjectState> = { ...src };

		moveObjectTree("r1", src, dst, { x: 10, y: -5 }, registries.objectBehavior);

		expect(dst.r1).toMatchObject({ cx: 110, cy: 95 });
	});

	it("moves a group's own center and its descendants recursively", () => {
		const src: Record<string, ObjectState> = {
			g1: makeGroup({ id: "g1", cx: 50, cy: 50, childIds: ["g2", "r1"] }),
			g2: makeGroup({ id: "g2", cx: 40, cy: 40, childIds: ["r2"] }),
			r1: makeRect("r1", 30, 30),
			r2: makeRect("r2", 20, 20),
		};
		const dst: Record<string, ObjectState> = { ...src };

		moveObjectTree("g1", src, dst, { x: 5, y: 0 }, registries.objectBehavior);

		expect(dst.g1).toMatchObject({ cx: 55, cy: 50 });
		expect(dst.g2).toMatchObject({ cx: 45, cy: 40 });
		expect(dst.r1).toMatchObject({ cx: 35, cy: 30 });
		expect(dst.r2).toMatchObject({ cx: 25, cy: 20 });
	});

	it("reads from srcObjects so an absolute delta is never applied twice", () => {
		const src = { r1: makeRect("r1", 0, 0) };
		const dst: Record<string, ObjectState> = { ...src };

		moveObjectTree("r1", src, dst, { x: 5, y: 5 }, registries.objectBehavior);
		expect(src.r1).toMatchObject({ cx: 0, cy: 0 });
	});

	it("silently ignores a nonexistent id", () => {
		const src: Record<string, ObjectState> = {};
		const dst: Record<string, ObjectState> = {};
		expect(() =>
			moveObjectTree(
				"ghost",
				src,
				dst,
				{ x: 1, y: 1 },
				registries.objectBehavior,
			),
		).not.toThrow();
	});
});

describe("GroupController delegation of group transforms", () => {
	it("transformByGroup delegates to transformGroupByGroup", () => {
		const group = makeGroup();
		const start = makeGroup({ id: "root", width: 200 });
		const end = makeGroup({ id: "root", width: 400 });
		expect(transformByGroup(group, start, end)).toEqual(
			transformGroupByGroup(group, start, end),
		);
	});

	it("rotateByGroup delegates to rotateGroupByGroup", () => {
		const group = makeGroup();
		const root = makeGroup({ id: "root", rotation: 0 });
		expect(rotateByGroup(group, root, 90)).toEqual(
			rotateGroupByGroup(group, root, 90),
		);
	});
});
