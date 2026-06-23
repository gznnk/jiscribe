import { describe, expect, it } from "vitest";

import {
	hasOwnedEndpoint,
	hasValidIdAndType,
	isValidArrowFields,
	isValidChildIds,
	isValidFillStyleState,
	isValidFrameState,
	isValidPolyState,
	isValidRadiusStyleState,
	isValidStrokeStyleState,
	isValidTextStyleState,
	isValidTransformState,
	isValidWaypointState,
} from "../validateStateUtils";

describe("validateStateUtils", () => {
	describe("hasValidIdAndType", () => {
		it("非空 id と一致する type は true", () => {
			expect(hasValidIdAndType({ id: "a", type: "rect" }, "rect")).toBe(true);
		});
		it("空 id / 型不一致 / id 非文字列は false", () => {
			expect(hasValidIdAndType({ id: "", type: "rect" }, "rect")).toBe(false);
			expect(hasValidIdAndType({ id: "a", type: "ellipse" }, "rect")).toBe(
				false,
			);
			expect(hasValidIdAndType({ id: 1, type: "rect" }, "rect")).toBe(false);
		});
	});

	describe("isValidFrameState", () => {
		it("cx/cy/width/height が数値なら true", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10, height: 10 })).toBe(
				true,
			);
		});
		it("cx/cy は負値でも true（位置に下限なし）", () => {
			expect(isValidFrameState({ cx: -5, cy: -5, width: 10, height: 10 })).toBe(
				true,
			);
		});
		it("width/height が負値なら false（スキーマ minimum: 0）", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: -1, height: 10 })).toBe(
				false,
			);
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10, height: -1 })).toBe(
				false,
			);
		});
		it("いずれか欠落/非数値なら false", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10 })).toBe(false);
			expect(isValidFrameState({ cx: 0, cy: 0, width: "10", height: 10 })).toBe(
				false,
			);
		});
	});

	describe("isValidTransformState", () => {
		it("rotation/scaleX/scaleY が数値なら true", () => {
			expect(isValidTransformState({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
				true,
			);
		});
		it("欠落なら false", () => {
			expect(isValidTransformState({ rotation: 0, scaleX: 1 })).toBe(false);
		});
	});

	describe("isValidStrokeStyleState", () => {
		it("妥当な stroke はエラーなし", () => {
			expect(isValidStrokeStyleState({ stroke: "#000", strokeWidth: 2 })).toBe(
				true,
			);
			expect(isValidStrokeStyleState({})).toBe(true);
		});
		it("strokeWidth が負値なら false（スキーマ minimum: 0）", () => {
			expect(isValidStrokeStyleState({ strokeWidth: -1 })).toBe(false);
		});
		it("strokeWidth が 0 は true", () => {
			expect(isValidStrokeStyleState({ strokeWidth: 0 })).toBe(true);
		});
		it("CSS インジェクションを含む stroke は false", () => {
			expect(isValidStrokeStyleState({ stroke: "red; } body {" })).toBe(false);
		});
		it("不正な strokeDashType は false", () => {
			expect(isValidStrokeStyleState({ strokeDashType: "double" })).toBe(false);
		});
	});

	describe("isValidFillStyleState", () => {
		it("妥当な fill / 省略は true", () => {
			expect(isValidFillStyleState({ fill: "transparent" })).toBe(true);
			expect(isValidFillStyleState({})).toBe(true);
		});
		it("インジェクションを含む fill は false", () => {
			expect(isValidFillStyleState({ fill: "url(http://evil/x)" })).toBe(false);
		});
	});

	describe("isValidTextStyleState", () => {
		it("テキスト無し/妥当なフォントは true", () => {
			expect(isValidTextStyleState({})).toBe(true);
			expect(
				isValidTextStyleState({
					fontFamily: "Noto Sans JP",
					fontWeight: "600",
				}),
			).toBe(true);
		});
		it("fontSize が 1 以上なら true、1 未満は false（スキーマ minimum: 1）", () => {
			expect(isValidTextStyleState({ fontSize: 1 })).toBe(true);
			expect(isValidTextStyleState({ fontSize: 12 })).toBe(true);
			expect(isValidTextStyleState({ fontSize: 0 })).toBe(false);
			expect(isValidTextStyleState({ fontSize: -3 })).toBe(false);
		});
		it("fontFamily / fontWeight のインジェクションは false", () => {
			expect(isValidTextStyleState({ fontFamily: "Arial; } body {" })).toBe(
				false,
			);
			expect(isValidTextStyleState({ fontWeight: "bold } html {" })).toBe(
				false,
			);
		});
	});

	describe("isValidRadiusStyleState", () => {
		it("rx が数値 / 省略は true", () => {
			expect(isValidRadiusStyleState({ rx: 4 })).toBe(true);
			expect(isValidRadiusStyleState({ rx: 0 })).toBe(true);
			expect(isValidRadiusStyleState({})).toBe(true);
		});
		it("rx が負値なら false（スキーマ minimum: 0）", () => {
			expect(isValidRadiusStyleState({ rx: -1 })).toBe(false);
		});
		it("rx が非数値なら false", () => {
			expect(isValidRadiusStyleState({ rx: "4" })).toBe(false);
		});
	});

	describe("isValidArrowFields", () => {
		it("妥当な ArrowType / 省略は true", () => {
			expect(isValidArrowFields({ startArrow: "None" })).toBe(true);
			expect(isValidArrowFields({})).toBe(true);
		});
		it("不正な ArrowType は false", () => {
			expect(isValidArrowFields({ endArrow: "diamond" })).toBe(false);
		});
	});

	describe("isValidChildIds", () => {
		it("非空の文字列配列は true", () => {
			expect(isValidChildIds({ childIds: ["a", "b"] })).toBe(true);
		});
		it("空配列は false（空 group は退化状態として弾く）", () => {
			expect(isValidChildIds({ childIds: [] })).toBe(false);
		});
		it("非配列/非文字列要素は false", () => {
			expect(isValidChildIds({ childIds: "a" })).toBe(false);
			expect(isValidChildIds({ childIds: ["a", 1] })).toBe(false);
		});
	});

	describe("isValidPolyState", () => {
		const pts = (n: number) =>
			Array.from({ length: n }, (_v, i) => ({ x: i, y: i }));

		it("minPoints を満たす points 配列は true", () => {
			expect(isValidPolyState({ points: pts(2) }, 2)).toBe(true);
			expect(isValidPolyState({ points: pts(3) }, 3)).toBe(true);
		});
		it("minPoints 未満は false（polyline:2 / polygon:3 の閾値）", () => {
			expect(isValidPolyState({ points: pts(1) }, 2)).toBe(false);
			expect(isValidPolyState({ points: pts(2) }, 3)).toBe(false);
		});
		it("points 無しは false", () => {
			expect(isValidPolyState({}, 2)).toBe(false);
		});
	});

	describe("isValidWaypointState", () => {
		it("空配列の経由点も true（端点は source/target が持つ）", () => {
			expect(isValidWaypointState({ points: [] })).toBe(true);
			expect(isValidWaypointState({ points: [{ x: 0, y: 0 }] })).toBe(true);
		});
		it("points 無しは false", () => {
			expect(isValidWaypointState({})).toBe(false);
		});
	});

	describe("hasOwnedEndpoint", () => {
		const owned = {
			owner: { id: "r1", type: "rect" },
			anchor: { kind: "center" },
		};
		const free = { anchor: { kind: "free", point: { x: 0, y: 0 } } };

		it("いずれかの端点が owned なら true", () => {
			expect(hasOwnedEndpoint(owned, free)).toBe(true);
			expect(hasOwnedEndpoint(free, owned)).toBe(true);
			expect(hasOwnedEndpoint(owned, owned)).toBe(true);
		});
		it("両端 free なら false", () => {
			expect(hasOwnedEndpoint(free, free)).toBe(false);
		});
	});
});
