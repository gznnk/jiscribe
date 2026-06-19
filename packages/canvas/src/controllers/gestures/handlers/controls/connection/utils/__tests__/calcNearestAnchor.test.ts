import { describe, expect, it } from "vitest";

import { calcNearestAnchor } from "../calcNearestAnchor";

/** 非回転・等倍のフレーム（中心 100,100 / 幅40 / 高20）。 */
const frame = {
	cx: 100,
	cy: 100,
	width: 40,
	height: 20,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};
// keyPoints: top(100,90) right(120,100) bottom(100,110) left(80,100)

describe("calcNearestAnchor", () => {
	it("フレームを持たないオブジェクトは center を返す", () => {
		expect(calcNearestAnchor({}, 0, 0)).toEqual({ kind: "center" });
	});

	it("中心付近のカーソルでは center を返す", () => {
		expect(calcNearestAnchor(frame, 100, 100)).toEqual({ kind: "center" });
	});

	it("上辺の外側では topCenter が最近接になる", () => {
		expect(calcNearestAnchor(frame, 100, 70)).toEqual({
			kind: "connectPoint",
			id: "topCenter",
		});
	});

	it("右辺の外側では rightCenter が最近接になる", () => {
		expect(calcNearestAnchor(frame, 200, 100)).toEqual({
			kind: "connectPoint",
			id: "rightCenter",
		});
	});

	it("下辺の外側では bottomCenter が最近接になる", () => {
		expect(calcNearestAnchor(frame, 100, 200)).toEqual({
			kind: "connectPoint",
			id: "bottomCenter",
		});
	});

	it("左辺の外側では leftCenter が最近接になる", () => {
		expect(calcNearestAnchor(frame, 0, 100)).toEqual({
			kind: "connectPoint",
			id: "leftCenter",
		});
	});
});
