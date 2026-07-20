import { describe, it, expect } from "vitest";

import { defaultCanvasRegistries } from "../../../../../../controllers/setup/createCanvasRegistries";
import type { EndpointRef } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../states/objects/connections/connector/ConnectorState";
import { resolveConnectorPoints } from "../resolveConnectorPoints";

/**
 * Integration coverage for the shape-outline connector attachment: a connector
 * to a non-rectangular shape must land on the shape's true outline, not its
 * bounding box. Uses the real per-canvas OutlineRegistry so registration in
 * ALL_OBJECT_DEFINITIONS is exercised too.
 */

const outlineRegistry = defaultCanvasRegistries.outline;

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

describe("resolveConnectorPoints — shape outline attachment", () => {
	it("registers outline calculators for non-rect shapes but not for rect/ellipse", () => {
		expect(outlineRegistry.get("diamond")).toBeTypeOf("function");
		expect(outlineRegistry.get("parallelogram")).toBeTypeOf("function");
		expect(outlineRegistry.get("db")).toBeTypeOf("function");
		expect(outlineRegistry.get("callout")).toBeTypeOf("function");
		// rect / ellipse keep their analytic handling — no polygon provider.
		expect(outlineRegistry.get("rect")).toBeUndefined();
		expect(outlineRegistry.get("ellipse")).toBeUndefined();
	});

	it("center anchor on a diamond snaps onto the slanted edge, not the bounding box", () => {
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

	it("connectPoint on a parallelogram lands on the slanted edge, not the box midpoint", () => {
		// Parallelogram 100x60 centered at origin: skew 0.22 → left edge slants.
		const para = frameObj("p1", "parallelogram", 100, 60);
		const conn = connector(
			connectPointEndpoint("p1", "leftCenter"),
			freeEndpoint(-300, 0),
		);

		const result = resolveConnectorPoints(conn, para, null, outlineRegistry);
		expect(result).not.toBeNull();

		// The left slant at mid-height sits at x = -39, inside the box edge x = -50.
		expect(result!.source.x).toBeCloseTo(-39, 0);
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
