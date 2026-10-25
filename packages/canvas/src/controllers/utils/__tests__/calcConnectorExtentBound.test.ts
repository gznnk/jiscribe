import type { BoundingBox, Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { resolveEndpointOwner } from "../../../rendering/objects/connector/geometry/endpoints";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import { createCanvasRegistries } from "../../registries/createCanvasRegistries";
import {
	calcConnectorBoundingBox,
	calcConnectorExtentBound,
} from "../calcConnectorBoundingBox";

/** Deterministic PRNG (mulberry32), so a failing layout reproduces from its seed. */
const createRandom = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let mixed = state;
		mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
};

const registries = createCanvasRegistries();
// A diamond silhouette, a tapering anchor band and a declared anchor well outside
// the frame: every way an endpoint can leave the plain bounding-box edge.
registries.objectOutline.register("diamond", (state) => {
	const { width, height } = state as unknown as {
		width: number;
		height: number;
	};
	return [
		{ x: 0, y: -height / 2 },
		{ x: width / 2, y: 0 },
		{ x: 0, y: height / 2 },
		{ x: -width / 2, y: 0 },
	];
});
registries.objectAnchorRegion.register("diamond", (state) => {
	const { width, height } = state as unknown as {
		width: number;
		height: number;
	};
	return { x: -width / 4, y: -height / 2, width: width / 2, height };
});
registries.objectExtraConnectPoints.register("brace", (state) => {
	const { width } = state as unknown as { width: number };
	return [{ id: "tip", point: { x: width, y: 0 }, direction: { x: 1, y: 0 } }];
});

const OWNER_TYPES = ["rect", "ellipse", "diamond", "brace"] as const;
const CONNECT_POINT_IDS = [
	"topCenter",
	"rightCenter",
	"bottomCenter",
	"leftCenter",
] as const;
const EDGE_SIDES = ["top", "right", "bottom", "left"] as const;

const pick = <T>(random: () => number, values: readonly T[]): T =>
	values[Math.floor(random() * values.length)];

const randomBetween = (random: () => number, min: number, max: number) =>
	min + (max - min) * random();

const createOwner = (
	random: () => number,
	id: string,
	cx: number,
	cy: number,
): ObjectState => {
	const type = pick(random, OWNER_TYPES);
	return {
		id,
		type,
		features: { type, geometry: type === "ellipse" ? "ellipse" : "rect" },
		cx,
		cy,
		width: randomBetween(random, 1, 300),
		height: randomBetween(random, 1, 300),
		rotation: random() < 0.6 ? 0 : pick(random, [90, 180, 270, 37, 151]),
		scaleX: random() < 0.8 ? 1 : -1,
		scaleY: random() < 0.8 ? 1 : -1,
	} as unknown as ObjectState;
};

const createOwnedAnchor = (random: () => number) => {
	const roll = random();
	if (roll < 0.25) {
		return { kind: "center" };
	}
	if (roll < 0.55) {
		return { kind: "connectPoint", id: pick(random, CONNECT_POINT_IDS) };
	}
	if (roll < 0.8) {
		return { kind: "edge", side: pick(random, EDGE_SIDES), t: random() };
	}
	return { kind: "connectPoint", id: "tip" };
};

const createEndpoint = (
	random: () => number,
	owner: ObjectState | null,
	freePoint: Point,
) => {
	if (!owner) {
		return { anchor: { kind: "free", point: freePoint } };
	}
	return { owner: { id: owner.id }, anchor: createOwnedAnchor(random) };
};

/** The other owner: the source itself (a self-loop), none, or a second shape. */
const createTarget = (
	random: () => number,
	source: ObjectState,
): ObjectState | null => {
	const layout = random();
	if (layout < 0.1) {
		return source;
	}
	if (layout < 0.2) {
		return null;
	}
	return createOwner(
		random,
		"target",
		// Gaps from overlapping to far apart, any relative direction.
		randomBetween(random, -700, 700),
		randomBetween(random, -700, 700),
	);
};

/**
 * One generated layout: two owners (or one, for a self-loop) at any gap
 * including overlap, either end possibly free, either routing, sometimes with
 * stored vertices and a label.
 */
const createCase = (random: () => number) => {
	const source = createOwner(random, "source", 0, 0);
	const target = createTarget(random, source);
	const isSourceFree = target !== source && random() < 0.1;
	const vertices =
		random() < 0.25
			? Array.from({ length: 1 + Math.floor(random() * 3) }, () => ({
					x: randomBetween(random, -900, 900),
					y: randomBetween(random, -900, 900),
				}))
			: [];
	const label =
		random() < 0.4
			? {
					text: random() < 0.2 ? "" : "label\nsecond line",
					position: random(),
					offset: random() < 0.3 ? undefined : randomBetween(random, -80, 80),
					fontSize: randomBetween(random, 6, 48),
				}
			: undefined;
	const connector = {
		id: "connector",
		type: "connector",
		routing: random() < 0.6 ? "orthogonal" : "straight",
		points: vertices,
		source: createEndpoint(random, isSourceFree ? null : source, {
			x: randomBetween(random, -900, 900),
			y: randomBetween(random, -900, 900),
		}),
		target: createEndpoint(random, target, {
			x: randomBetween(random, -900, 900),
			y: randomBetween(random, -900, 900),
		}),
		...(label ? { label } : {}),
	} as unknown as ConnectorState;
	const objects: Record<string, ObjectState> = { source };
	if (target) {
		objects[target.id] = target;
	}
	return { connector, objects };
};

const contains = (outer: BoundingBox, inner: BoundingBox): boolean =>
	outer.left <= inner.left &&
	outer.top <= inner.top &&
	outer.right >= inner.right &&
	outer.bottom >= inner.bottom;

describe("calcConnectorExtentBound", () => {
	it("contains the routed connector's box over generated layouts", () => {
		const random = createRandom(20261023);
		for (let caseIndex = 0; caseIndex < 4000; caseIndex++) {
			const { connector, objects } = createCase(random);
			const exact = calcConnectorBoundingBox(connector, objects, registries);
			const bound = calcConnectorExtentBound(
				connector,
				resolveEndpointOwner(objects, connector.source),
				resolveEndpointOwner(objects, connector.target),
				registries,
			);
			if (exact === null) {
				expect(bound, `case ${caseIndex}`).toBeNull();
				continue;
			}
			expect(bound, `case ${caseIndex}`).not.toBeNull();
			expect(
				contains(bound as BoundingBox, exact),
				`case ${caseIndex}: ${JSON.stringify({ connector, objects, exact, bound })}`,
			).toBe(true);
		}
	});

	it("is null where the path does not resolve, so the caller routes instead", () => {
		const connector = {
			id: "dangling",
			type: "connector",
			routing: "orthogonal",
			points: [],
			source: { owner: { id: "missing" }, anchor: { kind: "center" } },
			target: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		} as unknown as ConnectorState;
		expect(
			calcConnectorExtentBound(connector, null, null, registries),
		).toBeNull();
	});
});
