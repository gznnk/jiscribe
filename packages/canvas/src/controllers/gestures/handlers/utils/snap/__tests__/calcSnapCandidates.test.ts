import type { FrameKeyPoints } from "@jiscribe/geometry";
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

	describe("poly objects", () => {
		const polyline = {
			type: "polyline",
			points: [
				{ x: 0, y: 0 },
				{ x: 30, y: 20 },
				{ x: 100, y: 60 },
			],
		} as unknown as ObjectState;
		const polyKeyPoints = makeKeyPoints(0, 0, 100, 60);

		it("emits one x and one y vertex candidate per point, plus the bbox center, and no bbox edges", () => {
			const { x, y } = calcSnapCandidates(
				{ p: polyline },
				{ p: polyKeyPoints },
			);

			expect(x).toEqual([
				{
					objectId: "p",
					coordinate: 0,
					edge: "vertex",
					perpendicularMin: 0,
					perpendicularMax: 0,
				},
				{
					objectId: "p",
					coordinate: 30,
					edge: "vertex",
					perpendicularMin: 20,
					perpendicularMax: 20,
				},
				{
					objectId: "p",
					coordinate: 50,
					edge: "hCenter",
					perpendicularMin: 0,
					perpendicularMax: 60,
				},
				{
					objectId: "p",
					coordinate: 100,
					edge: "vertex",
					perpendicularMin: 60,
					perpendicularMax: 60,
				},
			]);
			expect(y).toEqual([
				{
					objectId: "p",
					coordinate: 0,
					edge: "vertex",
					perpendicularMin: 0,
					perpendicularMax: 0,
				},
				{
					objectId: "p",
					coordinate: 20,
					edge: "vertex",
					perpendicularMin: 30,
					perpendicularMax: 30,
				},
				{
					objectId: "p",
					coordinate: 30,
					edge: "vCenter",
					perpendicularMin: 0,
					perpendicularMax: 100,
				},
				{
					objectId: "p",
					coordinate: 60,
					edge: "vertex",
					perpendicularMin: 100,
					perpendicularMax: 100,
				},
			]);
		});

		it("treats a polygon the same way", () => {
			const polygon = { ...polyline, type: "polygon" } as ObjectState;

			const { x, y } = calcSnapCandidates({ p: polygon }, { p: polyKeyPoints });

			expect(x.map((c) => c.edge)).toEqual([
				"vertex",
				"vertex",
				"hCenter",
				"vertex",
			]);
			expect(y.map((c) => c.edge)).toEqual([
				"vertex",
				"vertex",
				"vCenter",
				"vertex",
			]);
		});

		it("contributes nothing when it has no keyPoints", () => {
			const { x, y } = calcSnapCandidates({ p: polyline }, {});

			expect(x).toHaveLength(0);
			expect(y).toHaveLength(0);
		});
	});
});
