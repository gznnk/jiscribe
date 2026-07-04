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
		it("non-empty id and matching type is true", () => {
			expect(hasValidIdAndType({ id: "a", type: "rect" }, "rect")).toBe(true);
		});
		it("empty id / type mismatch / non-string id is false", () => {
			expect(hasValidIdAndType({ id: "", type: "rect" }, "rect")).toBe(false);
			expect(hasValidIdAndType({ id: "a", type: "ellipse" }, "rect")).toBe(
				false,
			);
			expect(hasValidIdAndType({ id: 1, type: "rect" }, "rect")).toBe(false);
		});
	});

	describe("isValidFrameState", () => {
		it("is true when cx/cy/width/height are numbers", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10, height: 10 })).toBe(
				true,
			);
		});
		it("is true even when cx/cy are negative (no lower bound on position)", () => {
			expect(isValidFrameState({ cx: -5, cy: -5, width: 10, height: 10 })).toBe(
				true,
			);
		});
		it("is false when width/height are negative (schema minimum: 0)", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: -1, height: 10 })).toBe(
				false,
			);
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10, height: -1 })).toBe(
				false,
			);
		});
		it("is false when any field is missing / non-numeric", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10 })).toBe(false);
			expect(isValidFrameState({ cx: 0, cy: 0, width: "10", height: 10 })).toBe(
				false,
			);
		});
	});

	describe("isValidTransformState", () => {
		it("is true when rotation/scaleX/scaleY are numbers", () => {
			expect(isValidTransformState({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
				true,
			);
		});
		it("is false when a field is missing", () => {
			expect(isValidTransformState({ rotation: 0, scaleX: 1 })).toBe(false);
		});
	});

	describe("isValidStrokeStyleState", () => {
		it("valid stroke has no errors", () => {
			expect(isValidStrokeStyleState({ stroke: "#000", strokeWidth: 2 })).toBe(
				true,
			);
			expect(isValidStrokeStyleState({})).toBe(true);
		});
		it("is false when strokeWidth is negative (schema minimum: 0)", () => {
			expect(isValidStrokeStyleState({ strokeWidth: -1 })).toBe(false);
		});
		it("strokeWidth of 0 is true", () => {
			expect(isValidStrokeStyleState({ strokeWidth: 0 })).toBe(true);
		});
		it("stroke containing CSS injection is false", () => {
			expect(isValidStrokeStyleState({ stroke: "red; } body {" })).toBe(false);
		});
		it("invalid strokeDashType is false", () => {
			expect(isValidStrokeStyleState({ strokeDashType: "double" })).toBe(false);
		});
	});

	describe("isValidFillStyleState", () => {
		it("valid fill / omitted is true", () => {
			expect(isValidFillStyleState({ fill: "transparent" })).toBe(true);
			expect(isValidFillStyleState({})).toBe(true);
		});
		it("fill containing injection is false", () => {
			expect(isValidFillStyleState({ fill: "url(http://evil/x)" })).toBe(false);
		});
	});

	describe("isValidTextStyleState", () => {
		it("no text / valid font is true", () => {
			expect(isValidTextStyleState({})).toBe(true);
			expect(
				isValidTextStyleState({
					fontFamily: "Noto Sans JP",
					fontWeight: "600",
				}),
			).toBe(true);
		});
		it("fontSize >= 1 is true, < 1 is false (schema minimum: 1)", () => {
			expect(isValidTextStyleState({ fontSize: 1 })).toBe(true);
			expect(isValidTextStyleState({ fontSize: 12 })).toBe(true);
			expect(isValidTextStyleState({ fontSize: 0 })).toBe(false);
			expect(isValidTextStyleState({ fontSize: -3 })).toBe(false);
		});
		it("injection in fontFamily / fontWeight is false", () => {
			expect(isValidTextStyleState({ fontFamily: "Arial; } body {" })).toBe(
				false,
			);
			expect(isValidTextStyleState({ fontWeight: "bold } html {" })).toBe(
				false,
			);
		});
	});

	describe("isValidRadiusStyleState", () => {
		it("rx as a number / omitted is true", () => {
			expect(isValidRadiusStyleState({ rx: 4 })).toBe(true);
			expect(isValidRadiusStyleState({ rx: 0 })).toBe(true);
			expect(isValidRadiusStyleState({})).toBe(true);
		});
		it("is false when rx is negative (schema minimum: 0)", () => {
			expect(isValidRadiusStyleState({ rx: -1 })).toBe(false);
		});
		it("is false when rx is non-numeric", () => {
			expect(isValidRadiusStyleState({ rx: "4" })).toBe(false);
		});
	});

	describe("isValidArrowFields", () => {
		it("valid ArrowType / omitted is true", () => {
			expect(isValidArrowFields({ startArrow: "None" })).toBe(true);
			expect(isValidArrowFields({})).toBe(true);
		});
		it("invalid ArrowType is false", () => {
			expect(isValidArrowFields({ endArrow: "diamond" })).toBe(false);
		});
	});

	describe("isValidChildIds", () => {
		it("non-empty string array is true", () => {
			expect(isValidChildIds({ childIds: ["a", "b"] })).toBe(true);
		});
		it("empty array is false (reject empty group as a degenerate state)", () => {
			expect(isValidChildIds({ childIds: [] })).toBe(false);
		});
		it("non-array / non-string elements is false", () => {
			expect(isValidChildIds({ childIds: "a" })).toBe(false);
			expect(isValidChildIds({ childIds: ["a", 1] })).toBe(false);
		});
	});

	describe("isValidPolyState", () => {
		const pts = (n: number) =>
			Array.from({ length: n }, (_v, i) => ({ x: i, y: i }));

		it("points array meeting minPoints is true", () => {
			expect(isValidPolyState({ points: pts(2) }, 2)).toBe(true);
			expect(isValidPolyState({ points: pts(3) }, 3)).toBe(true);
		});
		it("below minPoints is false (thresholds polyline:2 / polygon:3)", () => {
			expect(isValidPolyState({ points: pts(1) }, 2)).toBe(false);
			expect(isValidPolyState({ points: pts(2) }, 3)).toBe(false);
		});
		it("no points is false", () => {
			expect(isValidPolyState({}, 2)).toBe(false);
		});
	});

	describe("isValidWaypointState", () => {
		it("empty waypoint array is also true (endpoints are held by source/target)", () => {
			expect(isValidWaypointState({ points: [] })).toBe(true);
			expect(isValidWaypointState({ points: [{ x: 0, y: 0 }] })).toBe(true);
		});
		it("no points is false", () => {
			expect(isValidWaypointState({})).toBe(false);
		});
	});

	describe("hasOwnedEndpoint", () => {
		const owned = {
			owner: { id: "r1" },
			anchor: { kind: "center" },
		};
		const free = { anchor: { kind: "free", point: { x: 0, y: 0 } } };

		it("is true when either endpoint is owned", () => {
			expect(hasOwnedEndpoint(owned, free)).toBe(true);
			expect(hasOwnedEndpoint(free, owned)).toBe(true);
			expect(hasOwnedEndpoint(owned, owned)).toBe(true);
		});
		it("is false when both endpoints are free", () => {
			expect(hasOwnedEndpoint(free, free)).toBe(false);
		});
	});
});
