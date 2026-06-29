import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { createFrameBehavior } from "../FrameController";
import { rotateFrameByGroup, transformFrameByGroup } from "../FrameTransform";

type FrameState = ObjectState & {
	cx: number;
	cy: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
};

const makeFrame = (overrides?: Partial<FrameState>): FrameState =>
	({
		id: "frame-1",
		type: "rect",
		cx: 50,
		cy: 50,
		width: 20,
		height: 20,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...overrides,
	}) as unknown as FrameState;

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

const behavior = createFrameBehavior<FrameState>();

describe("createFrameBehavior().moveByDelta", () => {
	it("cx/cy を delta だけ移動する", () => {
		const result = behavior.moveByDelta(makeFrame({ cx: 50, cy: 50 }), {
			x: 10,
			y: -5,
		});
		expect(result.cx).toBe(60);
		expect(result.cy).toBe(45);
	});

	it("元の state を破壊しない", () => {
		const src = makeFrame({ cx: 0, cy: 0 });
		behavior.moveByDelta(src, { x: 5, y: 5 });
		expect(src.cx).toBe(0);
		expect(src.cy).toBe(0);
	});

	it("他フィールドを保持する", () => {
		const result = behavior.moveByDelta(makeFrame({ width: 33 }), {
			x: 1,
			y: 1,
		});
		expect(result.width).toBe(33);
	});

	// 図形固有の pass-through フィールド（svg の svgText 等）が move で失われない
	// ことを明示的に固定する。統合前 SvgController.test.ts が持っていた保証の引き継ぎ。
	it("図形固有フィールド（svgText / text）を保持する", () => {
		const src = makeFrame({} as Partial<FrameState>);
		const withFields = {
			...src,
			svgText: "<svg id='a'/>",
			text: "label",
		} as FrameState;
		const result = behavior.moveByDelta(withFields, { x: 2, y: 2 }) as Record<
			string,
			unknown
		>;
		expect(result.svgText).toBe("<svg id='a'/>");
		expect(result.text).toBe("label");
	});
});

describe("createFrameBehavior() group 変形の委譲", () => {
	it("transformByGroup は transformFrameByGroup に委譲する", () => {
		const frame = makeFrame();
		const start = makeGroup({ width: 200 });
		const end = makeGroup({ width: 400 });
		expect(behavior.transformByGroup(frame, start, end)).toEqual(
			transformFrameByGroup(frame, start, end),
		);
	});

	it("rotateByGroup は rotateFrameByGroup に委譲する", () => {
		const frame = makeFrame();
		const group = makeGroup({ rotation: 0 });
		expect(behavior.rotateByGroup(frame, group, 90)).toEqual(
			rotateFrameByGroup(frame, group, 90),
		);
	});
});
