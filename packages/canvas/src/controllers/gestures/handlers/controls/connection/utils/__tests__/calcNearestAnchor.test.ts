import { describe, expect, it } from "vitest";

import { calcNearestAnchor } from "../calcNearestAnchor";

/** An unrotated, unscaled frame (center 100,100 / width 40 / height 20). */
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
	it("returns center for an object without a frame", () => {
		expect(calcNearestAnchor({}, 0, 0)).toEqual({ kind: "center" });
	});

	it("returns center for a cursor near the center", () => {
		expect(calcNearestAnchor(frame, 100, 100)).toEqual({ kind: "center" });
	});

	it("topCenter is nearest outside the top edge", () => {
		expect(calcNearestAnchor(frame, 100, 70)).toEqual({
			kind: "connectPoint",
			id: "topCenter",
		});
	});

	it("rightCenter is nearest outside the right edge", () => {
		expect(calcNearestAnchor(frame, 200, 100)).toEqual({
			kind: "connectPoint",
			id: "rightCenter",
		});
	});

	it("bottomCenter is nearest outside the bottom edge", () => {
		expect(calcNearestAnchor(frame, 100, 200)).toEqual({
			kind: "connectPoint",
			id: "bottomCenter",
		});
	});

	it("leftCenter is nearest outside the left edge", () => {
		expect(calcNearestAnchor(frame, 0, 100)).toEqual({
			kind: "connectPoint",
			id: "leftCenter",
		});
	});

	describe("exclude (candidate exclusion for self-loops)", () => {
		it("picks the nearest edge midpoint even near the center when center is excluded", () => {
			const result = calcNearestAnchor(frame, 100, 100, { center: true });
			expect(result.kind).toBe("connectPoint");
		});

		it("does not select an edge when its connectPoint is excluded", () => {
			// Outside the bottom edge, but bottomCenter is excluded -> a different edge midpoint.
			const result = calcNearestAnchor(frame, 100, 200, {
				center: true,
				connectPointId: "bottomCenter",
			});
			expect(result.kind).toBe("connectPoint");
			if (result.kind === "connectPoint") {
				expect(result.id).not.toBe("bottomCenter");
			}
		});

		it("can still choose from the remaining 3 edges when center and 1 edge are excluded", () => {
			const result = calcNearestAnchor(frame, 0, 100, {
				center: true,
				connectPointId: "leftCenter",
			});
			expect(result.kind).toBe("connectPoint");
			if (result.kind === "connectPoint") {
				expect(result.id).not.toBe("leftCenter");
			}
		});
	});
});
