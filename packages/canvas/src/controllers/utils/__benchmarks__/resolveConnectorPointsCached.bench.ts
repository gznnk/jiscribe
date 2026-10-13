import type { EndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";
import { sampleCubicBezier, type Point } from "@jiscribe/geometry";
import { bench, describe } from "vitest";

import {
	resolveConnectorPoints,
	listConnectorPathPoints,
	resolveConnectorPointsCached,
} from "../../../connectors/endpoints";
import type { ObjectOutlineCalculator } from "../../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import {
	calcConnectorBoundingBox,
	calcConnectorPathBoundingBox,
} from "../calcConnectorBoundingBox";

const SPOKE_COUNT = 20;
// OUTLINE_CURVE_SEGMENTS in @jiscribe/canvas-sdk
const CURVE_SEGMENTS = 12;

// The cloud's outline (general-shapes cloudOutline): six cubic Béziers sampled
// at the SDK's resolution, 72 points.
const cloudLikeOutline: ObjectOutlineCalculator = (object) => {
	const { width, height } = object as unknown as {
		width: number;
		height: number;
	};
	const p = (u: number, v: number): Point => ({
		x: width * (u - 0.5),
		y: height * (v - 0.5),
	});
	const anchors = [
		p(0.25, 0.25),
		p(0.16, 0.55),
		p(0.31, 0.8),
		p(0.8, 0.8),
		p(0.875, 0.5),
		p(0.625, 0.2),
	];
	const points: Point[] = [];
	for (let index = 0; index < anchors.length; index++) {
		const from = anchors[index];
		const to = anchors[(index + 1) % anchors.length];
		points.push(
			...sampleCubicBezier(
				from,
				{ x: from.x - width * 0.1, y: from.y },
				{ x: to.x, y: to.y - height * 0.1 },
				to,
				CURVE_SEGMENTS,
			).slice(1),
		);
	}
	return points;
};

const registries = {
	outline: {
		get: (type: string) => (type === "cloud" ? cloudLikeOutline : undefined),
	},
	anchorRegion: { get: () => undefined },
	extraConnectPoints: { get: () => undefined },
};

const cloud = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "cloud",
		features: { type: "cloud", geometry: "rect" },
		cx,
		cy,
		width: 160,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const centerOf = (id: string): EndpointRef =>
	({ owner: { id }, anchor: { kind: "center" } }) as EndpointRef;

const hubConnectors = Array.from(
	{ length: SPOKE_COUNT },
	(_, index): ConnectorState =>
		({
			source: centerOf("hub"),
			target: centerOf(`spoke-${index}`),
			points: [],
			routing: "orthogonal",
		}) as unknown as ConnectorState,
);
const spokes = Array.from({ length: SPOKE_COUNT }, (_, index) => {
	const angle = (index / SPOKE_COUNT) * Math.PI * 2;
	return cloud(`spoke-${index}`, Math.cos(angle) * 600, Math.sin(angle) * 600);
});

const spokeObjects = Object.fromEntries(
	spokes.map((spoke) => [spoke.id, spoke]),
);

// One frame of dragging the hub: it is a new object at a new place, so viewport
// culling re-boxes every connector hanging off it and the renderer resolves
// each of them again (useResolvedConnectorPoints misses).
describe(`drag a hub with ${SPOKE_COUNT} connectors: culling + render (one frame)`, () => {
	let step = 0;
	bench("before: culling resolves on the boxes, the renderer again", () => {
		const hub = cloud("hub", ++step % 50, 0);
		const objects = { ...spokeObjects, hub };
		for (let index = 0; index < SPOKE_COUNT; index++) {
			calcConnectorBoundingBox(hubConnectors[index], objects);
			resolveConnectorPoints(
				hubConnectors[index],
				hub,
				spokes[index],
				registries.outline,
				registries.anchorRegion,
				registries.extraConnectPoints,
			);
		}
	});
	bench("after: both read one cached resolve", () => {
		const hub = cloud("hub", ++step % 50, 0);
		for (let index = 0; index < SPOKE_COUNT; index++) {
			const resolved = resolveConnectorPointsCached(
				hubConnectors[index],
				hub,
				spokes[index],
				registries.outline,
				registries.anchorRegion,
				registries.extraConnectPoints,
			);
			if (resolved) {
				calcConnectorPathBoundingBox(
					hubConnectors[index],
					listConnectorPathPoints(resolved),
				);
			}
			resolveConnectorPointsCached(
				hubConnectors[index],
				hub,
				spokes[index],
				registries.outline,
				registries.anchorRegion,
				registries.extraConnectPoints,
			);
		}
	});
});

// Where a resolve spends its time: the outline lookup is a small part of it.
describe("breakdown: one connector resolve", () => {
	const hub = cloud("hub", 0, 0);
	const straight = {
		...hubConnectors[3],
		routing: "straight",
	} as ConnectorState;
	const noOutline = { get: () => undefined };
	bench("orthogonal + outline", () => {
		resolveConnectorPoints(
			hubConnectors[3],
			hub,
			spokes[3],
			registries.outline,
		);
	});
	bench("orthogonal, no outline", () => {
		resolveConnectorPoints(hubConnectors[3], hub, spokes[3], noOutline);
	});
	bench("straight + outline", () => {
		resolveConnectorPoints(straight, hub, spokes[3], registries.outline);
	});
	bench("straight, no outline", () => {
		resolveConnectorPoints(straight, hub, spokes[3], noOutline);
	});
});
