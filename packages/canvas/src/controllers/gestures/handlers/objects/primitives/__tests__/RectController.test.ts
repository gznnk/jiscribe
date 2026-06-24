import { describe, expect, it } from "vitest";

import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { RectState } from "../../../../../../states/objects/primitives/rect/RectState";
import {
	rotateFrameByGroup,
	transformFrameByGroup,
} from "../../base/FrameTransform";
import {
	moveByDelta,
	rotateByGroup,
	transformByGroup,
} from "../RectController";

const makeRect = (overrides?: Partial<RectState>): RectState =>
	({
		id: "rect-1",
		type: "rect",
		cx: 50,
		cy: 50,
		width: 20,
		height: 20,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...overrides,
	}) as unknown as RectState;

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
		childIds: [],
		...overrides,
	}) as unknown as GroupState;

describe("RectController.moveByDelta", () => {
	it("cx/cy を delta だけ移動する", () => {
		const result = moveByDelta(makeRect({ cx: 50, cy: 50 }), { x: 10, y: -5 });
		expect(result.cx).toBe(60);
		expect(result.cy).toBe(45);
	});

	it("元の state を破壊しない", () => {
		const src = makeRect({ cx: 0, cy: 0 });
		moveByDelta(src, { x: 5, y: 5 });
		expect(src.cx).toBe(0);
		expect(src.cy).toBe(0);
	});
});

describe("RectController group 変形の委譲", () => {
	it("transformByGroup は transformFrameByGroup に委譲する", () => {
		const rect = makeRect();
		const start = makeGroup({ width: 200 });
		const end = makeGroup({ width: 400 });
		expect(transformByGroup(rect, start, end)).toEqual(
			transformFrameByGroup(rect, start, end),
		);
	});

	it("rotateByGroup は rotateFrameByGroup に委譲する", () => {
		const rect = makeRect();
		const group = makeGroup({ rotation: 0 });
		expect(rotateByGroup(rect, group, 90)).toEqual(
			rotateFrameByGroup(rect, group, 90),
		);
	});
});
