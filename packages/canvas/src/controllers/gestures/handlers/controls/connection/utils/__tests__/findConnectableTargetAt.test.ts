import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { BoundingBox } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import { findConnectableTargetAt } from "../findConnectableTargetAt";

// Connectability comes from the registered features of the type
// (RectFeatures.connectable = true, ConnectorFeatures.connectable = false).
const featuresByType = new Map<ObjectType, ObjectFeatures>([
	["rect", RectFeatures],
	["connector", ConnectorFeatures],
]);

// No outline / anchor-region / declared points, so every shape is judged by the
// box its geometry implies — which is what the prefilter's survivors go through.
const registries = {
	objectOutline: { get: () => undefined },
	objectAnchorRegion: { get: () => undefined },
	objectExtraConnectPoints: { get: () => undefined },
	objectMapper: { getFeatures: (type: ObjectType) => featuresByType.get(type) },
};

const rect = (
	id: string,
	cx: number,
	cy: number,
	overrides: Record<string, unknown> = {},
): ObjectState =>
	({
		id,
		type: "rect",
		features: RectFeatures,
		cx,
		cy,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...overrides,
	}) as unknown as ObjectState;

/** Axis-aligned box of an unrotated 100×100 rect centered on (cx, cy). */
const box = (cx: number, cy: number, half = 50): BoundingBox => ({
	left: cx - half,
	right: cx + half,
	top: cy - half,
	bottom: cy + half,
});

describe("findConnectableTargetAt", () => {
	it("returns the connectable shape drawn at the point", () => {
		const objects = { a: rect("a", 0, 0) };
		const result = findConnectableTargetAt({
			point: { x: 10, y: 10 },
			bboxes: { a: box(0, 0) },
			objects,
			rootIds: ["a"],
			registries,
		});
		expect(result).toEqual({ id: "a", object: objects.a });
	});

	it("returns null when the point is outside every box", () => {
		const objects = { a: rect("a", 0, 0) };
		const result = findConnectableTargetAt({
			point: { x: 400, y: 400 },
			bboxes: { a: box(0, 0) },
			objects,
			rootIds: ["a"],
			registries,
		});
		expect(result).toBeNull();
	});

	it("skips a non-connectable type under the point", () => {
		const objects = {
			c: {
				id: "c",
				type: "connector",
				features: ConnectorFeatures,
				points: [],
			} as unknown as ObjectState,
		};
		const result = findConnectableTargetAt({
			point: { x: 0, y: 0 },
			bboxes: { c: box(0, 0) },
			objects,
			rootIds: ["c"],
			registries,
		});
		expect(result).toBeNull();
	});

	it("treats a type the registry does not know as not connectable", () => {
		const objects = {
			u: rect("u", 0, 0, { type: "unregistered" as ObjectType }),
		};
		const result = findConnectableTargetAt({
			point: { x: 0, y: 0 },
			bboxes: { u: box(0, 0) },
			objects,
			rootIds: ["u"],
			registries,
		});
		expect(result).toBeNull();
	});

	it("ignores a box whose id is absent from objects", () => {
		const objects = { a: rect("a", 0, 0) };
		const result = findConnectableTargetAt({
			point: { x: 0, y: 0 },
			bboxes: { ghost: box(0, 0), a: box(0, 0) },
			objects,
			rootIds: ["a"],
			registries,
		});
		expect(result).toEqual({ id: "a", object: objects.a });
	});

	it("picks the front-most of two overlapping shapes", () => {
		const objects = { back: rect("back", 0, 0), front: rect("front", 20, 0) };
		const result = findConnectableTargetAt({
			point: { x: 10, y: 0 },
			bboxes: { back: box(0, 0), front: box(20, 0) },
			objects,
			// Later in rootIds paints on top.
			rootIds: ["back", "front"],
			registries,
		});
		expect(result?.id).toBe("front");
	});

	it("rejects a point inside the box but off the rotated shape", () => {
		// A 100×100 rect turned 45° has an axis-aligned box of half-extent ~70.7,
		// so its corners lie well outside the shape the user sees.
		const objects = { a: rect("a", 0, 0, { rotation: 45 }) };
		const args = {
			bboxes: { a: box(0, 0, 70.71) },
			objects,
			rootIds: ["a"],
			registries,
		};
		expect(
			findConnectableTargetAt({ ...args, point: { x: 65, y: 65 } }),
		).toBeNull();
		expect(findConnectableTargetAt({ ...args, point: { x: 0, y: 0 } })).toEqual(
			{
				id: "a",
				object: objects.a,
			},
		);
	});
});
