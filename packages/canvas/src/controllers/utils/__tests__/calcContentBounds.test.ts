import { describe, it, expect } from "vitest";

import { ObjectExtraConnectPointsRegistry } from "../../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import { createVisualExtentRegistries } from "../../__tests__/support/visualExtentRegistries";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import {
	calcConnectorBoundingBox,
	collectConnectorPoints,
} from "../calcConnectorBoundingBox";
import { calcContentBounds } from "../calcContentBounds";
import type { VisualExtentRegistries } from "../VisualExtentRegistries";

const registries = createTestRegistries();

/** Axis-aligned Frame-family state: bbox is left=cx-w/2, top=cy-h/2, ... */
const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): ObjectState =>
	({
		id,
		type: "group",
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		childIds,
	}) as unknown as ObjectState;

/** Poly with no points: calcObjectBoundingBox has no extent for it. */
const emptyPolyline = (id: string): ObjectState =>
	({ id, type: "polyline", points: [] }) as unknown as ObjectState;

const toRecord = (objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((obj) => [obj.id, obj]));

describe("calcContentBounds", () => {
	it("returns null for an empty canvas", () => {
		expect(calcContentBounds({}, registries)).toBeNull();
	});

	it("returns the object's own box for a single object", () => {
		expect(
			calcContentBounds(toRecord([rect("a", 50, 50, 100, 60)]), registries),
		).toEqual({
			left: 0,
			top: 20,
			right: 100,
			bottom: 80,
		});
	});

	it("unions every object, including negative coordinates", () => {
		const objects = toRecord([
			rect("a", 0, 0, 20, 20),
			rect("b", 100, 200, 20, 20),
			rect("c", -50, -30, 20, 20),
		]);
		expect(calcContentBounds(objects, registries)).toEqual({
			left: -60,
			top: -40,
			right: 110,
			bottom: 210,
		});
	});

	it("ignores group states so their zero-sized frame cannot pull the bounds to the origin", () => {
		const objects = toRecord([
			rect("a", 500, 500, 100, 100),
			group("g", ["a"]),
		]);
		expect(calcContentBounds(objects, registries)).toEqual({
			left: 450,
			top: 450,
			right: 550,
			bottom: 550,
		});
	});

	it("counts a grouped child exactly once (the loop already visits it directly)", () => {
		const child = rect("a", 500, 500, 100, 100);
		const grouped = toRecord([child, group("g", ["a"])]);
		expect(calcContentBounds(grouped, registries)).toEqual(
			calcContentBounds(toRecord([child]), registries),
		);
	});

	it("skips objects with no extent", () => {
		const objects = toRecord([rect("a", 0, 0, 20, 20), emptyPolyline("p")]);
		expect(calcContentBounds(objects, registries)).toEqual({
			left: -10,
			top: -10,
			right: 10,
			bottom: 10,
		});
	});

	it("returns null when nothing contributes an extent", () => {
		expect(
			calcContentBounds(toRecord([group("g", [])]), registries),
		).toBeNull();
		expect(
			calcContentBounds(toRecord([emptyPolyline("p")]), registries),
		).toBeNull();
	});

	it("tolerates a hole in the map without throwing", () => {
		const objects = {
			...toRecord([rect("a", 0, 0, 20, 20)]),
			missing: undefined as unknown as ObjectState,
		};
		expect(calcContentBounds(objects, registries)).toEqual({
			left: -10,
			top: -10,
			right: 10,
			bottom: 10,
		});
	});

	it("keeps a zero-sized object as a degenerate extent rather than dropping it", () => {
		expect(
			calcContentBounds(toRecord([rect("a", 10, 10, 0, 0)]), registries),
		).toEqual({
			left: 10,
			top: 10,
			right: 10,
			bottom: 10,
		});
	});

	describe("visual bounds", () => {
		/** Stands in for a type drawing a 10px-tall strip below its box. */
		const stripBelowBox = createVisualExtentRegistries({
			get: () => (state) => ({
				x: -state.width / 2,
				y: -state.height / 2,
				width: state.width,
				height: state.height + 10,
			}),
		});

		it("includes what a type draws outside its box, so a fit cannot crop it", () => {
			const objects = toRecord([rect("a", 50, 50, 100, 60)]);
			expect(calcContentBounds(objects, stripBelowBox)).toEqual({
				left: 0,
				top: 20,
				right: 100,
				bottom: 90,
			});
		});
	});

	describe("connectors on type-declared connect points", () => {
		/** A 100x100 shape declaring `side`: a point on its right edge, 30px below the center. */
		const tipped = (id: string, cy: number): ObjectState =>
			({
				id,
				type: "tipped",
				features: { type: "tipped", geometry: "rect", connectable: true },
				cx: 0,
				cy,
				width: 100,
				height: 100,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}) as unknown as ObjectState;

		const extraConnectPoints = new ObjectExtraConnectPointsRegistry();
		extraConnectPoints.register("tipped", () => [
			{ id: "side", point: { x: 50, y: 30 }, direction: { x: 1, y: 0 } },
		]);
		const connectPointRegistries: VisualExtentRegistries = {
			...createTestRegistries(),
			objectExtraConnectPoints: extraConnectPoints,
		};

		// Leaves the upper shape rightwards and enters the lower one from the
		// right, so the route loops round outside both boxes (right edge x = 50).
		const objects = toRecord([
			tipped("upper", 0),
			tipped("lower", 300),
			{
				id: "c",
				type: "connector",
				routing: "orthogonal",
				points: [],
				source: {
					owner: { id: "upper" },
					anchor: { kind: "connectPoint", id: "side" },
				},
				target: {
					owner: { id: "lower" },
					anchor: { kind: "connectPoint", id: "side" },
				},
			} as unknown as ObjectState,
		]);

		it("includes the route where it leaves the owners' boxes", () => {
			const bounds = calcContentBounds(objects, connectPointRegistries);
			const route = collectConnectorPoints(
				objects.c as ConnectorState,
				objects,
				connectPointRegistries.objectOutline,
				connectPointRegistries.objectAnchorRegion,
				connectPointRegistries.objectExtraConnectPoints,
				connectPointRegistries.objectGeometryKey,
			);

			expect(route).not.toBeNull();
			expect(Math.max(...route!.map((point) => point.x))).toBeGreaterThan(50);
			for (const point of route!) {
				expect(point.x).toBeLessThanOrEqual(bounds!.right);
				expect(point.x).toBeGreaterThanOrEqual(bounds!.left);
				expect(point.y).toBeLessThanOrEqual(bounds!.bottom);
				expect(point.y).toBeGreaterThanOrEqual(bounds!.top);
			}
		});

		it("needs the registries: the geometry-only route stays inside the boxes", () => {
			// Without them both ends collapse onto the owners' centers.
			expect(
				calcConnectorBoundingBox(objects.c as ConnectorState, objects)!.right,
			).toBeLessThanOrEqual(50);
		});
	});
});
