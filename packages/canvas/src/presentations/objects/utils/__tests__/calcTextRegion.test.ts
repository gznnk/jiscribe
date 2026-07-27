import type { Dimensions } from "@workspace/geometry";
import { describe, it, expect } from "vitest";

import { BODY_TEXT_SLOT_ID } from "../../../../constants/textSlotId";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { calcTextRegion } from "../calcTextRegion";

const makeState = (width: number, height: number): ObjectState & Dimensions =>
	({ id: "obj-1", type: "rect", width, height }) as unknown as ObjectState &
		Dimensions;

describe("calcTextRegion", () => {
	it("calculator 省略時は bbox 全体（中心原点のローカル座標）を返す", () => {
		const result = calcTextRegion(makeState(100, 60), BODY_TEXT_SLOT_ID);
		expect(result).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("calculator が指定されたらその結果を返す", () => {
		const result = calcTextRegion(
			makeState(100, 60),
			BODY_TEXT_SLOT_ID,
			({ width }) => ({
				x: 0,
				y: 0,
				width: width / 2,
				height: 10,
			}),
		);
		expect(result).toEqual({ x: 0, y: 0, width: 50, height: 10 });
	});

	it("slotId を calculator にそのまま渡す（区画ごとに領域を返せる）", () => {
		const calculator = (state: ObjectState & Dimensions, slotId: string) =>
			slotId === "header"
				? { x: 0, y: 0, width: state.width, height: 20 }
				: { x: 0, y: 20, width: state.width, height: state.height - 20 };

		expect(calcTextRegion(makeState(100, 60), "header", calculator)).toEqual({
			x: 0,
			y: 0,
			width: 100,
			height: 20,
		});
		expect(calcTextRegion(makeState(100, 60), "rows", calculator)).toEqual({
			x: 0,
			y: 20,
			width: 100,
			height: 40,
		});
	});
});
