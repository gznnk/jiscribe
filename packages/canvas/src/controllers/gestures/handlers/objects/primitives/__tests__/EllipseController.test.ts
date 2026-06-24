import { describe, expect, it } from "vitest";

import type { EllipseState } from "../../../../../../states/objects/primitives/ellipse/EllipseState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import {
	rotateFrameByGroup,
	transformFrameByGroup,
} from "../../base/FrameTransform";
import {
	moveByDelta,
	rotateByGroup,
	transformByGroup,
} from "../EllipseController";

const makeEllipse = (overrides?: Partial<EllipseState>): EllipseState =>
	({
		id: "ellipse-1",
		type: "ellipse",
		cx: 50,
		cy: 50,
		width: 20,
		height: 20,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...overrides,
	}) as unknown as EllipseState;

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

describe("EllipseController.moveByDelta", () => {
	it("cx/cy を delta だけ移動する", () => {
		const result = moveByDelta(makeEllipse({ cx: 50, cy: 50 }), {
			x: -10,
			y: 20,
		});
		expect(result.cx).toBe(40);
		expect(result.cy).toBe(70);
	});

	it("元の state を破壊しない", () => {
		const src = makeEllipse({ cx: 0, cy: 0 });
		moveByDelta(src, { x: 1, y: 1 });
		expect(src.cx).toBe(0);
		expect(src.cy).toBe(0);
	});
});

describe("EllipseController group 変形の委譲", () => {
	it("transformByGroup は transformFrameByGroup に委譲する", () => {
		const ellipse = makeEllipse();
		const start = makeGroup({ width: 200 });
		const end = makeGroup({ width: 400 });
		expect(transformByGroup(ellipse, start, end)).toEqual(
			transformFrameByGroup(ellipse, start, end),
		);
	});

	it("rotateByGroup は rotateFrameByGroup に委譲する", () => {
		const ellipse = makeEllipse();
		const group = makeGroup({ rotation: 0 });
		expect(rotateByGroup(ellipse, group, 90)).toEqual(
			rotateFrameByGroup(ellipse, group, 90),
		);
	});
});
