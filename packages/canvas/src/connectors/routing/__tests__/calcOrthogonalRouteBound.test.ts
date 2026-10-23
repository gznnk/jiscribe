import type {
	ConnectPointId,
	AnchorSpec,
} from "@jiscribe/doc/model/objects/types/EndpointRef";
import type { Point, TransformedFrame } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcConnectPoint } from "../../calcConnectPoint";
import { calcOrthogonalRouteBound } from "../calcOrthogonalRouteBound";
import { resolveOrthogonalRoute } from "../resolveOrthogonalRoute";

const FACES: ConnectPointId[] = [
	"topCenter",
	"rightCenter",
	"bottomCenter",
	"leftCenter",
];

const frameObj = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
	rotation: number,
): ObjectState & TransformedFrame =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState & TransformedFrame;

const connectPoint = (id: ConnectPointId): AnchorSpec => ({
	kind: "connectPoint",
	id,
});

const isWithin = (
	path: Point[],
	bound: ReturnType<typeof calcOrthogonalRouteBound>,
): boolean =>
	path.every(
		(point) =>
			point.x >= bound.left &&
			point.x <= bound.right &&
			point.y >= bound.top &&
			point.y <= bound.bottom,
	);

describe("calcOrthogonalRouteBound", () => {
	it("contains the route over every face pair, a grid of offsets, sizes and rotations", () => {
		const escapedLayouts: string[] = [];
		for (const rotation of [0, 30, 90]) {
			for (const [width, height] of [
				[100, 100],
				[20, 160],
			]) {
				const source = frameObj("s", 0, 0, 100, 60, 0);
				for (let dx = -400; dx <= 400; dx += 100) {
					for (let dy = -400; dy <= 400; dy += 100) {
						const target = frameObj("t", dx, dy, width, height, rotation);
						for (const sourceFace of FACES) {
							for (const targetFace of FACES) {
								const sourcePoint = calcConnectPoint(source, sourceFace);
								const targetPoint = calcConnectPoint(target, targetFace);
								const path = resolveOrthogonalRoute(
									connectPoint(sourceFace),
									connectPoint(targetFace),
									sourcePoint,
									targetPoint,
									source,
									target,
								);
								const bound = calcOrthogonalRouteBound(
									sourcePoint,
									targetPoint,
									source,
									target,
								);
								if (!isWithin(path, bound)) {
									escapedLayouts.push(
										`${rotation}° ${width}x${height} at (${dx}, ${dy}) ${sourceFace}→${targetFace}`,
									);
								}
							}
						}
					}
				}
			}
		}
		expect(escapedLayouts).toEqual([]);
	});

	it("contains a self-loop's ring", () => {
		const shape = frameObj("s", 0, 0, 120, 80, 0);
		for (const sourceFace of FACES) {
			for (const targetFace of FACES) {
				if (sourceFace === targetFace) {
					continue;
				}
				const sourcePoint = calcConnectPoint(shape, sourceFace);
				const targetPoint = calcConnectPoint(shape, targetFace);
				const path = resolveOrthogonalRoute(
					connectPoint(sourceFace),
					connectPoint(targetFace),
					sourcePoint,
					targetPoint,
					shape,
					shape,
				);
				expect(
					isWithin(
						path,
						calcOrthogonalRouteBound(sourcePoint, targetPoint, shape, shape),
					),
				).toBe(true);
			}
		}
	});

	it("contains a route between free endpoints, whose crossover is rounded", () => {
		const sourcePoint = { x: 0.3, y: 0.3 };
		const targetPoint = { x: 0.4, y: 120.7 };
		const path = resolveOrthogonalRoute(
			{ kind: "free", point: sourcePoint },
			{ kind: "free", point: targetPoint },
			sourcePoint,
			targetPoint,
			null,
			null,
		);
		expect(
			isWithin(
				path,
				calcOrthogonalRouteBound(sourcePoint, targetPoint, null, null),
			),
		).toBe(true);
	});
});
