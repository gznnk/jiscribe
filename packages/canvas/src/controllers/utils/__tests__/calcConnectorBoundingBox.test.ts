import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { outlinedPlugin } from "../../__tests__/support/outlinedPlugin";
import { createCanvasRegistries } from "../../registries/createCanvasRegistries";
import {
	calcConnectorBoundingBox,
	collectConnectorPoints,
} from "../calcConnectorBoundingBox";

const freeConnector = (
	overrides: Partial<Record<string, unknown>> = {},
): ConnectorState =>
	({
		id: "connector-1",
		type: "connector",
		points: [],
		source: { anchor: { kind: "free", point: { x: 10, y: 20 } } },
		target: { anchor: { kind: "free", point: { x: 110, y: 70 } } },
		...overrides,
	}) as unknown as ConnectorState;

const rectObj = (
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

/** A straight connector along y = 0 from x 0 to x 100, carrying the given label. */
const labeledHorizontalConnector = (
	label: Record<string, unknown>,
): ConnectorState =>
	freeConnector({
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 100, y: 0 } } },
		label,
	});

/**
 * An outline shape 200x100 centered on the origin (support/outlinedPlugin). Its
 * silhouette gives up the bottom quarter of the box, so the +y ray leaves it at
 * y = 25 — inside the box edge at y = 50, so the two resolutions are told apart
 * by the endpoint alone.
 */
const outlinedObjects = (): Record<string, ObjectState> => ({
	ol1: {
		id: "ol1",
		type: "outlined",
		features: { type: "outlined", geometry: "rect" },
		cx: 0,
		cy: 0,
		width: 200,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	} as unknown as ObjectState,
});

/** Straight connector from the outline shape's center anchor to a free point below it. */
const outlinedCenteredConnector = (): ConnectorState =>
	freeConnector({
		routing: "straight",
		source: { owner: { id: "ol1" }, anchor: { kind: "center" } },
		target: { anchor: { kind: "free", point: { x: 0, y: 500 } } },
	});

// In a non-browser environment calcConnectorLabelBox falls back to a character
// count estimate, so "Yes" (16px, no border) is a fixed 40.8 x 28 box.
const LABEL_HALF_WIDTH = 20.4;
const LABEL_HALF_HEIGHT = 14;

describe("calcConnectorBoundingBox", () => {
	it("a connector with only free endpoints computes its bound from both endpoints", () => {
		const bbox = calcConnectorBoundingBox(
			freeConnector({ routing: "straight" }),
			{},
		);

		expect(bbox).toEqual({ left: 10, right: 110, top: 20, bottom: 70 });
	});

	it("with straight routing, includes intermediate waypoints when they widen the bound", () => {
		const connector = freeConnector({
			routing: "straight",
			points: [
				{ x: -50, y: 40 },
				{ x: 60, y: 200 },
			],
		});

		const bbox = calcConnectorBoundingBox(connector, {});

		expect(bbox).toEqual({ left: -50, right: 110, top: 20, bottom: 200 });
	});

	it("includes the bend points (waypoints) of orthogonal routing in the range", () => {
		// connectPoints that face outward from each other. Since the route wraps around the
		// shapes at both ends, the bend points bulge outside the endpoints' x range (50-350).
		const src = rectObj("r1", 300, 100, 100, 60); // rightCenter = (350, 100)
		const tgt = rectObj("r2", 100, 300, 100, 60); // leftCenter = (50, 300)
		const connector = freeConnector({
			routing: "orthogonal",
			source: {
				owner: { id: "r1" },
				anchor: { kind: "connectPoint", id: "rightCenter" },
			},
			target: {
				owner: { id: "r2" },
				anchor: { kind: "connectPoint", id: "leftCenter" },
			},
		});

		const bbox = calcConnectorBoundingBox(connector, { r1: src, r2: tgt });

		// With endpoints alone it would be {left:50, right:350, top:100, bottom:300}, but
		// the orthogonal route's stubs (edge + margin 30) bulge out on both sides, widening it.
		expect(bbox).not.toBeNull();
		expect(bbox!.left).toBe(20); // target left edge 50 - margin 30
		expect(bbox!.right).toBe(380); // source right edge 350 + margin 30
		expect(bbox!.left).toBeLessThan(50);
		expect(bbox!.right).toBeGreaterThan(350);
		expect(bbox!.top).toBeLessThanOrEqual(100);
		expect(bbox!.bottom).toBeGreaterThanOrEqual(300);
	});

	it("a label at the default midpoint widens the range above and below the line", () => {
		const bbox = calcConnectorBoundingBox(
			labeledHorizontalConnector({ text: "Yes" }),
			{},
		);

		// The path alone is a zero-height segment; the label box centered on the
		// midpoint grows it vertically and stays inside the endpoints horizontally.
		expect(bbox).toEqual({
			left: 0,
			right: 100,
			top: -LABEL_HALF_HEIGHT,
			bottom: LABEL_HALF_HEIGHT,
		});
	});

	it("the range follows a label displaced by position and offset", () => {
		const offsetBBox = calcConnectorBoundingBox(
			labeledHorizontalConnector({ text: "Yes", offset: 50 }),
			{},
		);

		// Offset is a signed perpendicular distance, so the label sits 50 below the line.
		expect(offsetBBox).toEqual({
			left: 0,
			right: 100,
			top: 0,
			bottom: 50 + LABEL_HALF_HEIGHT,
		});

		const sourceEndBBox = calcConnectorBoundingBox(
			labeledHorizontalConnector({ text: "Yes", position: 0 }),
			{},
		);

		// At the source end, half the label box hangs past the endpoint.
		expect(sourceEndBBox).toEqual({
			left: -LABEL_HALF_WIDTH,
			right: 100,
			top: -LABEL_HALF_HEIGHT,
			bottom: LABEL_HALF_HEIGHT,
		});
	});

	it("a style-only label with empty text leaves the range at the path", () => {
		const bbox = calcConnectorBoundingBox(
			labeledHorizontalConnector({ text: "", fill: "#fff", strokeWidth: 2 }),
			{},
		);

		expect(bbox).toEqual({ left: 0, right: 100, top: 0, bottom: 0 });
	});

	it("resolves the path without the registries, so an outline shape contributes its bounding box", () => {
		const bbox = calcConnectorBoundingBox(
			outlinedCenteredConnector(),
			outlinedObjects(),
		);

		// The silhouette would put the endpoint at y = 25 (see the
		// collectConnectorPoints suite); the box edge at 50 is what lands here.
		expect(bbox).toEqual({ left: 0, right: 0, top: 50, bottom: 500 });
	});

	it("returns null when an owned endpoint's referenced object does not exist", () => {
		const connector = freeConnector({
			source: {
				owner: { id: "missing-rect" },
				anchor: { kind: "center" },
			},
		});

		expect(calcConnectorBoundingBox(connector, {})).toBeNull();
	});
});

describe("collectConnectorPoints", () => {
	const registries = createCanvasRegistries({ plugins: [outlinedPlugin] });

	it("attaches a center anchor to the drawn silhouette when the registries are passed", () => {
		const points = collectConnectorPoints(
			outlinedCenteredConnector(),
			outlinedObjects(),
			registries.objectOutline,
			registries.objectAnchorRegion,
		);

		expect(points).not.toBeNull();
		expect(points![0].x).toBeCloseTo(0, 5);
		expect(points![0].y).toBeCloseTo(25, 5);
	});

	it("falls back to the bounding box when they are omitted", () => {
		const points = collectConnectorPoints(
			outlinedCenteredConnector(),
			outlinedObjects(),
		);

		expect(points).not.toBeNull();
		expect(points![0]).toEqual({ x: 0, y: 50 });
	});
});
