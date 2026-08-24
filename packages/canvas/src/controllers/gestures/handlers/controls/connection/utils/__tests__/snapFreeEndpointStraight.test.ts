import type { EndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import { snapFreeEndpointStraight } from "../snapFreeEndpointStraight";

const connectPoint = (id: string): EndpointRef =>
	({
		owner: { id: "obj-1" },
		anchor: { kind: "connectPoint", id },
	}) as EndpointRef;

const centerEndpoint = (): EndpointRef =>
	({ owner: { id: "obj-1" }, anchor: { kind: "center" } }) as EndpointRef;

const freeEndpoint = (x: number, y: number): EndpointRef =>
	({ anchor: { kind: "free", point: { x, y } } }) as EndpointRef;

// rect 100×50 centered at (100, 100): rightCenter=(150,100), topCenter=(100,75).
const rectObj = (): ObjectState =>
	({
		id: "obj-1",
		type: "rect",
		cx: 100,
		cy: 100,
		width: 100,
		height: 50,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

describe("snapFreeEndpointStraight", () => {
	it("aligns Y to the fixed point for a horizontal (right) exit within threshold", () => {
		expect(
			snapFreeEndpointStraight(
				{ x: 300, y: 103 },
				connectPoint("rightCenter"),
				rectObj(),
				8,
			),
		).toEqual({ x: 300, y: 100 });
	});

	it("leaves the cursor unchanged when beyond the threshold", () => {
		expect(
			snapFreeEndpointStraight(
				{ x: 300, y: 120 },
				connectPoint("rightCenter"),
				rectObj(),
				8,
			),
		).toEqual({ x: 300, y: 120 });
	});

	it("aligns X to the fixed point for a vertical (up) exit within threshold", () => {
		expect(
			snapFreeEndpointStraight(
				{ x: 104, y: 20 },
				connectPoint("topCenter"),
				rectObj(),
				8,
			),
		).toEqual({ x: 100, y: 20 });
	});

	it("does not snap when the fixed end is a center anchor (straight routing, no jog)", () => {
		const cursor = { x: 300, y: 103 };
		expect(
			snapFreeEndpointStraight(cursor, centerEndpoint(), rectObj(), 8),
		).toBe(cursor);
	});

	it("does not snap when the fixed end is itself free", () => {
		const cursor = { x: 300, y: 103 };
		expect(
			snapFreeEndpointStraight(cursor, freeEndpoint(150, 100), null, 8),
		).toBe(cursor);
	});

	it("does not snap when the fixed owner object is missing", () => {
		const cursor = { x: 300, y: 103 };
		expect(
			snapFreeEndpointStraight(cursor, connectPoint("rightCenter"), null, 8),
		).toBe(cursor);
	});
});
