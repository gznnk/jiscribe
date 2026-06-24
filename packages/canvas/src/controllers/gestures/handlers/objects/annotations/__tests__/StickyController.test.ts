import { describe, expect, it } from "vitest";

import type { StickyState } from "../../../../../../states/objects/annotations/sticky/StickyState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import {
	rotateFrameByGroup,
	transformFrameByGroup,
} from "../../base/FrameTransform";
import {
	moveByDelta,
	rotateByGroup,
	transformByGroup,
} from "../StickyController";

const makeSticky = (overrides?: Partial<StickyState>): StickyState =>
	({
		id: "sticky-1",
		type: "sticky",
		cx: 50,
		cy: 50,
		width: 160,
		height: 120,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...overrides,
	}) as unknown as StickyState;

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

describe("StickyController.moveByDelta", () => {
	it("cx/cy を delta だけ移動する", () => {
		const result = moveByDelta(makeSticky({ cx: 50, cy: 50 }), {
			x: 7,
			y: -3,
		});
		expect(result.cx).toBe(57);
		expect(result.cy).toBe(47);
	});

	it("元の state を破壊しない", () => {
		const src = makeSticky({ cx: 0, cy: 0 });
		moveByDelta(src, { x: 1, y: 1 });
		expect(src.cx).toBe(0);
		expect(src.cy).toBe(0);
	});
});

describe("StickyController group 変形の委譲", () => {
	it("transformByGroup は transformFrameByGroup に委譲する", () => {
		const sticky = makeSticky();
		const start = makeGroup({ width: 200 });
		const end = makeGroup({ width: 400 });
		expect(transformByGroup(sticky, start, end)).toEqual(
			transformFrameByGroup(sticky, start, end),
		);
	});

	it("rotateByGroup は rotateFrameByGroup に委譲する", () => {
		const sticky = makeSticky();
		const group = makeGroup({ rotation: 0 });
		expect(rotateByGroup(sticky, group, 90)).toEqual(
			rotateFrameByGroup(sticky, group, 90),
		);
	});
});
