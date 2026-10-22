import { describe, expect, it } from "vitest";

import type { ExtraConnectPoint } from "../../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcEndpointDirection } from "../endpointDirection";

/** A 100x60 frame centered at (200, 200), rotated by `rotation` degrees. */
const frameShape = (rotation = 0, scaleX = 1, scaleY = 1): ObjectState =>
	({
		id: "shape",
		type: "rect",
		cx: 200,
		cy: 200,
		width: 100,
		height: 60,
		rotation,
		scaleX,
		scaleY,
	}) as unknown as ObjectState;

const origin = { x: 0, y: 0 };
// A `toward` that, used as the fallback, points left of `origin`.
const towardLeft = { x: -10, y: 1 };

const TAIL: ExtraConnectPoint = {
	id: "tail",
	point: { x: 0, y: 30 },
	direction: { x: 0, y: 1 },
};

describe("calcEndpointDirection", () => {
	it("takes an edge anchor's side normal, ignoring where the line goes next", () => {
		expect(
			calcEndpointDirection(
				{ kind: "edge", side: "top", t: 0.2 },
				origin,
				{ x: 0, y: 500 },
				frameShape(),
			),
		).toBe("up");
	});

	it("turns an edge anchor's normal with the shape's rotation", () => {
		expect(
			calcEndpointDirection(
				{ kind: "edge", side: "top", t: 0.5 },
				origin,
				towardLeft,
				frameShape(90),
			),
		).toBe("right");
	});

	it("takes a built-in connect point's normal, flipped with the shape", () => {
		expect(
			calcEndpointDirection(
				{ kind: "connectPoint", id: "rightCenter" },
				origin,
				{ x: 10, y: 0 },
				frameShape(0, -1, 1),
			),
		).toBe("left");
	});

	it("takes a declared extra connect point's direction", () => {
		expect(
			calcEndpointDirection(
				{ kind: "connectPoint", id: "tail" },
				origin,
				towardLeft,
				frameShape(),
				[TAIL],
			),
		).toBe("down");
	});

	it("falls back to the direction toward the next point for a connect point the shape does not declare", () => {
		expect(
			calcEndpointDirection(
				{ kind: "connectPoint", id: "tail" },
				origin,
				towardLeft,
				frameShape(),
				[{ ...TAIL, id: "head" }],
			),
		).toBe("left");
		expect(
			calcEndpointDirection(
				{ kind: "connectPoint", id: "tail" },
				origin,
				towardLeft,
				frameShape(),
			),
		).toBe("left");
	});

	it("falls back to the direction toward the next point for a center or free anchor", () => {
		expect(
			calcEndpointDirection(
				{ kind: "center" },
				origin,
				{ x: 1, y: -10 },
				frameShape(),
			),
		).toBe("up");
		expect(
			calcEndpointDirection(
				{ kind: "free", point: origin },
				origin,
				{ x: 1, y: 10 },
				null,
			),
		).toBe("down");
	});

	it("falls back when the owner is missing or is not a frame", () => {
		const anchor = { kind: "edge", side: "top", t: 0.5 } as const;
		expect(calcEndpointDirection(anchor, origin, towardLeft, undefined)).toBe(
			"left",
		);
		const polyline = {
			id: "poly",
			type: "polyline",
			points: [],
		} as unknown as ObjectState;
		expect(calcEndpointDirection(anchor, origin, towardLeft, polyline)).toBe(
			"left",
		);
	});
});
