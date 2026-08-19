import type { Dimensions, Point } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import { outlinedPlugin } from "../../../../../../controllers/__tests__/support/outlinedPlugin";
import { createCanvasRegistries } from "../../../../../../controllers/registries/createCanvasRegistries";
import type { EndpointRef } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../states/objects/connector/ConnectorState";
import { ObjectOutlineRegistry } from "../../../../../objects/registry/ObjectOutlineRegistry";
import { resolveConnectorPoints } from "../resolveConnectorPoints";

/**
 * Coverage for the connector's shape-outline attachment mechanism: when an
 * ObjectOutlineRegistry supplies a polygon for the owner shape, the endpoint
 * lands on that outline (via calcOutlinePointTowardForPolygon), not the bounding
 * box. The outline is fed from a synthetic registry so this exercises
 * resolveConnectorPoints in isolation from any particular shape's geometry
 * (per-shape outline correctness is covered by each shape's own outline unit
 * test). A separate check confirms the real registries pick an `outline` up off
 * a definition, and that rect/ellipse deliberately register none.
 */

const freeEndpoint = (x: number, y: number): EndpointRef =>
	({ anchor: { kind: "free", point: { x, y } } }) as EndpointRef;

const centerEndpoint = (id: string): EndpointRef =>
	({ owner: { id }, anchor: { kind: "center" } }) as EndpointRef;

const connectPointEndpoint = (id: string, anchorId: string): EndpointRef =>
	({
		owner: { id },
		anchor: { kind: "connectPoint", id: anchorId },
	}) as EndpointRef;

const connector = (source: EndpointRef, target: EndpointRef): ConnectorState =>
	({
		source,
		target,
		points: [],
		routing: "straight",
	}) as unknown as ConnectorState;

const frameObj = (
	id: string,
	type: string,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type,
		features: { type, geometry: "rect" },
		cx: 0,
		cy: 0,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

// A centered diamond outline (top / right / bottom / left vertices): its slanted
// edges make the outline hit differ from the bounding box for a diagonal ray.
const diamondOutline = ({ width, height }: Dimensions): Point[] => [
	{ x: 0, y: -height / 2 },
	{ x: width / 2, y: 0 },
	{ x: 0, y: height / 2 },
	{ x: -width / 2, y: 0 },
];

// A centered hexagon with vertical left / right edges inset by 10% of the width,
// so a leftCenter connectPoint snaps inside the bounding box.
const insetSideOutline = ({ width, height }: Dimensions): Point[] => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const sideX = halfWidth - width * 0.1;
	return [
		{ x: 0, y: -halfHeight },
		{ x: sideX, y: -halfHeight / 2 },
		{ x: sideX, y: halfHeight / 2 },
		{ x: 0, y: halfHeight },
		{ x: -sideX, y: halfHeight / 2 },
		{ x: -sideX, y: -halfHeight / 2 },
	];
};

const outlineRegistry = new ObjectOutlineRegistry();
outlineRegistry.register("diamond", diamondOutline);
outlineRegistry.register("insetSide", insetSideOutline);

describe("resolveConnectorPoints — shape outline attachment", () => {
	it("center anchor snaps onto the slanted outline edge, not the bounding box", () => {
		// Diamond 160x120 centered at origin: half extents 80 x 60.
		const diamond = frameObj("d1", "diamond", 160, 120);
		// Target far up-right, so the center → target ray is the (1,-1) diagonal.
		const conn = connector(centerEndpoint("d1"), freeEndpoint(300, -300));

		const result = resolveConnectorPoints(conn, diamond, null, outlineRegistry);
		expect(result).not.toBeNull();

		// Ray from center along (1,-1) meets the top-right edge at (240/7, -240/7).
		expect(result!.source.x).toBeCloseTo(240 / 7, 1);
		expect(result!.source.y).toBeCloseTo(-240 / 7, 1);
		// The rectangular bounding-box hit would be (60, -60); confirm we are not there.
		expect(
			Math.hypot(result!.source.x - 60, result!.source.y + 60),
		).toBeGreaterThan(20);
	});

	it("connectPoint lands on the inset outline edge, not the box midpoint", () => {
		// insetSide 100x60: left edge sits at x = -40, inside the box edge x = -50.
		const shape = frameObj("s1", "insetSide", 100, 60);
		const conn = connector(
			connectPointEndpoint("s1", "leftCenter"),
			freeEndpoint(-300, 0),
		);

		const result = resolveConnectorPoints(conn, shape, null, outlineRegistry);
		expect(result).not.toBeNull();

		expect(result!.source.x).toBeCloseTo(-40, 5);
		expect(result!.source.y).toBeCloseTo(0, 5);
		expect(result!.source.x).toBeGreaterThan(-50);
	});

	it("falls back to the bounding box when no outline registry is supplied", () => {
		const diamond = frameObj("d1", "diamond", 160, 120);
		const conn = connector(centerEndpoint("d1"), freeEndpoint(300, -300));

		// Without the registry, the diamond is treated as its rect bounding box.
		const result = resolveConnectorPoints(conn, diamond, null);
		expect(result).not.toBeNull();
		expect(result!.source.x).toBeCloseTo(60, 0);
		expect(result!.source.y).toBeCloseTo(-60, 0);
	});
});

describe("createCanvasRegistries outline registration", () => {
	it("registers the outline a definition declares, but none for rect/ellipse", () => {
		// No built-in declares an outline any more, so the shape under test comes
		// from a plugin (support/outlinedPlugin).
		const registry = createCanvasRegistries({
			plugins: [outlinedPlugin],
		}).objectOutline;
		expect(registry.get("outlined")).toBeTypeOf("function");
		// rect / ellipse keep their analytic handling — no polygon provider.
		expect(registry.get("rect")).toBeUndefined();
		expect(registry.get("ellipse")).toBeUndefined();
	});
});
