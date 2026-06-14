import type { TransformedFrame } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { transformFrameByGroup } from "../FrameTransform";

const makeGroup = (overrides: Partial<GroupState>): GroupState =>
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

const makeFrame = (overrides?: Partial<TransformedFrame>): TransformedFrame => ({
	cx: 100,
	cy: 100,
	width: 50,
	height: 50,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	...overrides,
});

describe("transformFrameByGroup", () => {
	describe("通常ケース", () => {
		it("グループが2倍に拡大されたとき、子オブジェクトのサイズも2倍になる", () => {
			const startGroup = makeGroup({ cx: 100, cy: 100, width: 100, height: 100 });
			const endGroup = makeGroup({ cx: 100, cy: 100, width: 200, height: 200 });
			const frame = makeFrame({ cx: 100, cy: 100, width: 50, height: 50 });

			const result = transformFrameByGroup(frame, startGroup, endGroup);

			expect(result.width).toBe(100);
			expect(result.height).toBe(100);
		});

		it("グループのwidthのみ2倍に変化したとき、子オブジェクトのwidthも2倍になる", () => {
			const startGroup = makeGroup({ cx: 0, cy: 0, width: 100, height: 100 });
			const endGroup = makeGroup({ cx: 0, cy: 0, width: 200, height: 100 });
			const frame = makeFrame({ cx: 0, cy: 0, width: 50, height: 50 });

			const result = transformFrameByGroup(frame, startGroup, endGroup);

			expect(result.width).toBe(100);
			expect(result.height).toBe(50);
		});
	});

	describe("ゼロ除算ガード（issue #12）", () => {
		it("startGroupのwidthが0のとき、NaN/InfinityではなくgroupScaleX=1として扱う", () => {
			const startGroup = makeGroup({ cx: 0, cy: 0, width: 0, height: 100 });
			const endGroup = makeGroup({ cx: 0, cy: 0, width: 50, height: 100 });
			const frame = makeFrame({ cx: 0, cy: 0, width: 50, height: 50 });

			const result = transformFrameByGroup(frame, startGroup, endGroup);

			expect(Number.isFinite(result.cx)).toBe(true);
			expect(Number.isFinite(result.cy)).toBe(true);
			expect(Number.isFinite(result.width)).toBe(true);
			expect(Number.isFinite(result.height)).toBe(true);
		});

		it("startGroupのheightが0のとき、NaN/InfinityではなくgroupScaleY=1として扱う", () => {
			const startGroup = makeGroup({ cx: 0, cy: 0, width: 100, height: 0 });
			const endGroup = makeGroup({ cx: 0, cy: 0, width: 100, height: 50 });
			const frame = makeFrame({ cx: 0, cy: 0, width: 50, height: 50 });

			const result = transformFrameByGroup(frame, startGroup, endGroup);

			expect(Number.isFinite(result.cx)).toBe(true);
			expect(Number.isFinite(result.cy)).toBe(true);
			expect(Number.isFinite(result.width)).toBe(true);
			expect(Number.isFinite(result.height)).toBe(true);
		});

		it("startGroupのwidthとheightが両方0のとき、すべての値が有限数になる", () => {
			const startGroup = makeGroup({ cx: 0, cy: 0, width: 0, height: 0 });
			const endGroup = makeGroup({ cx: 0, cy: 0, width: 50, height: 50 });
			const frame = makeFrame({ cx: 0, cy: 0, width: 50, height: 50 });

			const result = transformFrameByGroup(frame, startGroup, endGroup);

			expect(Number.isFinite(result.cx)).toBe(true);
			expect(Number.isFinite(result.cy)).toBe(true);
			expect(Number.isFinite(result.width)).toBe(true);
			expect(Number.isFinite(result.height)).toBe(true);
		});
	});
});
