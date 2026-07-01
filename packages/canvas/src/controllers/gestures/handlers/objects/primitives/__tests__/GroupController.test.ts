import { describe, expect, it } from "vitest";

import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import {
	rotateGroupByGroup,
	transformGroupByGroup,
} from "../../base/GroupTransform";
import {
	moveByDelta,
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
	it("the group itself does not move and the state is returned as-is (descendants are handled by moveGroup)", () => {
		const group = makeGroup({ cx: 100, cy: 100 });
		const result = moveByDelta(group, { x: 10, y: 20 });
		expect(result).toBe(group);
		expect(result.cx).toBe(100);
		expect(result.cy).toBe(100);
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
