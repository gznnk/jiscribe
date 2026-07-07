import type { FrameKeyPoints } from "@workspace/geometry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { calcSnapCandidates } from "../calcSnapCandidates";

/** Helper that generates FrameKeyPoints from an axis-aligned BBox. */
const makeKeyPoints = (
	left: number,
	top: number,
	right: number,
	bottom: number,
): FrameKeyPoints => {
	const cx = (left + right) / 2;
	const cy = (top + bottom) / 2;
	return {
		topLeft: { x: left, y: top },
		topCenter: { x: cx, y: top },
		topRight: { x: right, y: top },
		rightCenter: { x: right, y: cy },
		bottomRight: { x: right, y: bottom },
		bottomCenter: { x: cx, y: bottom },
		bottomLeft: { x: left, y: bottom },
		leftCenter: { x: left, y: cy },
	};
};

/** The function only reads `type`, so a minimal stub is enough. */
const rectStub = { type: "rect" } as unknown as ObjectState;

describe("calcSnapCandidates", () => {
	it("generates left/right/hCenter and top/bottom/vCenter for each object", () => {
		const objects = { a: rectStub };
		const keyPoints = { a: makeKeyPoints(10, 20, 30, 60) };

		const { x, y } = calcSnapCandidates(objects, keyPoints);

		const xEdges = x.map((c) => ({ edge: c.edge, coordinate: c.coordinate }));
		expect(xEdges).toEqual(
			expect.arrayContaining([
				{ edge: "left", coordinate: 10 },
				{ edge: "right", coordinate: 30 },
				{ edge: "hCenter", coordinate: 20 },
			]),
		);

		const yEdges = y.map((c) => ({ edge: c.edge, coordinate: c.coordinate }));
		expect(yEdges).toEqual(
			expect.arrayContaining([
				{ edge: "top", coordinate: 20 },
				{ edge: "bottom", coordinate: 60 },
				{ edge: "vCenter", coordinate: 40 },
			]),
		);
	});

	it("the perpendicular range of hCenter/vCenter matches the object's opposite edges", () => {
		const objects = { a: rectStub };
		const keyPoints = { a: makeKeyPoints(10, 20, 30, 60) };

		const { x, y } = calcSnapCandidates(objects, keyPoints);

		const hCenter = x.find((c) => c.edge === "hCenter");
		expect(hCenter).toMatchObject({
			perpendicularMin: 20,
			perpendicularMax: 60,
		});

		const vCenter = y.find((c) => c.edge === "vCenter");
		expect(vCenter).toMatchObject({
			perpendicularMin: 10,
			perpendicularMax: 30,
		});
	});

	it("does not include groups in the candidates", () => {
		const objects = {
			g: { type: "group" } as unknown as ObjectState,
		};
		const keyPoints = { g: makeKeyPoints(0, 0, 10, 10) };

		const { x, y } = calcSnapCandidates(objects, keyPoints);

		expect(x).toHaveLength(0);
		expect(y).toHaveLength(0);
	});

	it("candidates are sorted in ascending order of coordinate", () => {
		const objects = { a: rectStub };
		const keyPoints = { a: makeKeyPoints(10, 20, 30, 60) };

		const { x, y } = calcSnapCandidates(objects, keyPoints);

		const xCoords = x.map((c) => c.coordinate);
		const yCoords = y.map((c) => c.coordinate);
		expect(xCoords).toEqual([...xCoords].sort((p, q) => p - q));
		expect(yCoords).toEqual([...yCoords].sort((p, q) => p - q));
	});
});
