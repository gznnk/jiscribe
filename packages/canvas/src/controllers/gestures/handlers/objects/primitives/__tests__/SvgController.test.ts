import { describe, expect, it } from "vitest";

import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { SvgState } from "../../../../../../states/objects/primitives/svg/SvgState";
import {
	rotateFrameByGroup,
	transformFrameByGroup,
} from "../../base/FrameTransform";
import { moveByDelta, rotateByGroup, transformByGroup } from "../SvgController";

const makeSvg = (overrides?: Partial<SvgState>): SvgState =>
	({
		id: "svg-1",
		type: "svg",
		cx: 50,
		cy: 50,
		width: 20,
		height: 20,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		svgText: "<svg/>",
		...overrides,
	}) as unknown as SvgState;

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

describe("SvgController.moveByDelta", () => {
	it("cx/cy を delta だけ移動する", () => {
		const result = moveByDelta(makeSvg({ cx: 50, cy: 50 }), { x: 3, y: 4 });
		expect(result.cx).toBe(53);
		expect(result.cy).toBe(54);
	});

	it("svgText など他フィールドを保持する", () => {
		const result = moveByDelta(makeSvg({ svgText: "<svg id='a'/>" }), {
			x: 1,
			y: 1,
		});
		expect(result.svgText).toBe("<svg id='a'/>");
	});
});

describe("SvgController group 変形の委譲", () => {
	it("transformByGroup は transformFrameByGroup に委譲する", () => {
		const svg = makeSvg();
		const start = makeGroup({ width: 200 });
		const end = makeGroup({ width: 400 });
		expect(transformByGroup(svg, start, end)).toEqual(
			transformFrameByGroup(svg, start, end),
		);
	});

	it("rotateByGroup は rotateFrameByGroup に委譲する", () => {
		const svg = makeSvg();
		const group = makeGroup({ rotation: 0 });
		expect(rotateByGroup(svg, group, 90)).toEqual(
			rotateFrameByGroup(svg, group, 90),
		);
	});
});
