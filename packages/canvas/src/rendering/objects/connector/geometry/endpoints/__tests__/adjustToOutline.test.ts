import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { adjustToOutline } from "../adjustToOutline";

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
		features: { type: "rect", geometry: "rect" },
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const ellipseObj = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "ellipse",
		features: { type: "ellipse", geometry: "ellipse" },
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const framedObj = (
	type: string,
	geometry: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id: `${type}-1`,
		type,
		features: { type, geometry },
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const point = (x: number, y: number) => ({ x, y });

describe("adjustToOutline", () => {
	it("obj is null → returns point as-is", () => {
		const p = point(10, 20);
		const toward = point(50, 50);
		expect(adjustToOutline(p, toward, null)).toEqual(p);
	});

	it("obj is undefined → returns point as-is", () => {
		const p = point(10, 20);
		const toward = point(50, 50);
		expect(adjustToOutline(p, toward, undefined)).toEqual(p);
	});

	it("type without features (group) → returns point as-is", () => {
		const groupObj = {
			id: "g1",
			type: "group",
			childIds: [],
		} as unknown as ObjectState;
		const p = point(0, 0);
		const toward = point(100, 0);
		expect(adjustToOutline(p, toward, groupObj)).toEqual(p);
	});

	it("rect center → returns the outward-facing outline point (horizontal)", () => {
		// rect: cx=0, cy=0, width=100, height=100
		// toward is (200, 0) (rightward) → near the right edge of the outline (50, 0)
		const obj = rectObj("r1", 0, 0, 100, 100);
		const p = point(0, 0);
		const toward = point(200, 0);
		const result = adjustToOutline(p, toward, obj);
		expect(result).not.toBeNull();
		// heading toward the right edge, so x ≈ 50
		expect(result!.x).toBeCloseTo(50, 0);
		expect(result!.y).toBeCloseTo(0, 0);
	});

	it("ellipse center → returns the outward-facing outline point (vertical)", () => {
		// ellipse: cx=0, cy=0, rx=60, ry=40
		const obj = ellipseObj("e1", 0, 0, 120, 80);
		const p = point(0, 0);
		const toward = point(0, 100);
		const result = adjustToOutline(p, toward, obj);
		expect(result).not.toBeNull();
		// heading toward the bottom edge, so y ≈ 40
		expect(result!.y).toBeCloseTo(40, 0);
		expect(result!.x).toBeCloseTo(0, 0);
	});

	it("point geometry → snaps onto the box the content derived, like a rect", () => {
		const obj = framedObj("text", "point", 0, 0, 100, 100);
		const result = adjustToOutline(point(0, 0), point(200, 0), obj);
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(50, 0);
		expect(result!.y).toBeCloseTo(0, 0);
	});

	it("poly geometry without an outline → returns point as-is", () => {
		// A poly shape is only ever adjusted through the real polygon its registry
		// supplies; its bounding box is not an outline to snap to.
		const obj = framedObj("polygon", "poly", 0, 0, 100, 100);
		const p = point(0, 0);
		expect(adjustToOutline(p, point(200, 0), obj)).toEqual(p);
	});

	it("toward is inside the shape → returns null (no intersection)", () => {
		// rect 100x100, toward is the interior point (10, 10)
		const obj = rectObj("r1", 0, 0, 100, 100);
		const p = point(0, 0);
		const toward = point(10, 10);
		// the direction from center to interior has no intersection → null
		const result = adjustToOutline(p, toward, obj);
		expect(result).toBeNull();
	});

	it("object that is not a TransformedFrame (connector) → returns point as-is", () => {
		const connObj = {
			id: "c1",
			type: "connector",
			source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
			target: { anchor: { kind: "free", point: { x: 100, y: 0 } } },
		} as unknown as ObjectState;
		const p = point(0, 0);
		const toward = point(200, 0);
		expect(adjustToOutline(p, toward, connObj)).toEqual(p);
	});
});
