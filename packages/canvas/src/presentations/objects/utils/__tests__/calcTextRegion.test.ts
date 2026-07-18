import type { Dimensions } from "@workspace/geometry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { calcTextRegion } from "../calcTextRegion";

const makeState = (width: number, height: number): ObjectState & Dimensions =>
	({ id: "obj-1", type: "rect", width, height }) as unknown as ObjectState &
		Dimensions;

describe("calcTextRegion", () => {
	it("calculator 省略時は bbox 全体（中心原点のローカル座標）を返す", () => {
		const result = calcTextRegion(makeState(100, 60));
		expect(result).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("calculator が指定されたらその結果を返す", () => {
		const result = calcTextRegion(makeState(100, 60), ({ width }) => ({
			x: 0,
			y: 0,
			width: width / 2,
			height: 10,
		}));
		expect(result).toEqual({ x: 0, y: 0, width: 50, height: 10 });
	});
});
