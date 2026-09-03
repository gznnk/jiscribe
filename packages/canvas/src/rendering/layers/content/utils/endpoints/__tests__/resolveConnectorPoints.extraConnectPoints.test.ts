import type { EndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";
import { createFrameObjectFactory } from "@jiscribe/doc/model/objects/utils/createFrameObjectFactory";
import { describe, expect, it } from "vitest";

import { createCanvasRegistries } from "../../../../../../controllers/registries/createCanvasRegistries";
import type { CanvasPlugin } from "../../../../../../plugin/CanvasPlugin";
import { defineObject } from "../../../../../../plugin/ObjectTypeDefinition";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../states/objects/connector/ConnectorState";
import { ObjectExtraConnectPointsRegistry } from "../../../../../objects/registry/ObjectExtraConnectPointsRegistry";
import { resolveConnectorPoints } from "../resolveConnectorPoints";

/**
 * Coverage for the type-declared connection points: when an
 * ObjectExtraConnectPointsRegistry names a point for the owner shape, an endpoint
 * carrying that id resolves onto it (transform included) and the orthogonal
 * router leaves along its declared direction. The points come from a synthetic
 * registry, so this exercises resolveConnectorPoints in isolation from any
 * particular shape (the brace's own tip geometry is covered by
 * `@jiscribe/plugin-annotation-shapes`).
 */

const freeEndpoint = (x: number, y: number): EndpointRef =>
	({ anchor: { kind: "free", point: { x, y } } }) as EndpointRef;

const connectPointEndpoint = (id: string, anchorId: string): EndpointRef =>
	({
		owner: { id },
		anchor: { kind: "connectPoint", id: anchorId },
	}) as EndpointRef;

const connector = (
	source: EndpointRef,
	target: EndpointRef,
	routing: "straight" | "orthogonal" = "straight",
): ConnectorState =>
	({ source, target, points: [], routing }) as unknown as ConnectorState;

/** A 40x160 band centered at (100, 100), i.e. the shape of a brace. */
const band = (): ObjectState =>
	({
		id: "b1",
		type: "band",
		features: { type: "band", geometry: "rect" },
		cx: 100,
		cy: 100,
		width: 40,
		height: 160,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

// A tip on the left edge, a quarter of the way down: world (80, 60).
const bandTip = () => [
	{ id: "tip", point: { x: -20, y: -40 }, direction: { x: -1, y: 0 } },
];

const extraConnectPointsRegistry = new ObjectExtraConnectPointsRegistry();
extraConnectPointsRegistry.register("band", bandTip);

describe("resolveConnectorPoints — type-declared connect points", () => {
	it("resolves an endpoint onto the declared point", () => {
		const result = resolveConnectorPoints(
			connector(connectPointEndpoint("b1", "tip"), freeEndpoint(-200, 60)),
			band(),
			null,
			null,
			null,
			extraConnectPointsRegistry,
		);
		expect(result).not.toBeNull();
		expect(result!.source).toEqual({ x: 80, y: 60 });
	});

	it("leaves along the declared direction when routing orthogonally", () => {
		// The free target sits below-left, so a center-derived exit would guess
		// "down"; the declared "left" is what puts the first bend out to the side.
		const result = resolveConnectorPoints(
			connector(
				connectPointEndpoint("b1", "tip"),
				freeEndpoint(20, 400),
				"orthogonal",
			),
			band(),
			null,
			null,
			null,
			extraConnectPointsRegistry,
		);
		expect(result).not.toBeNull();
		expect(result!.waypoints[0].x).toBeLessThan(result!.source.x);
		expect(result!.waypoints[0].y).toBe(result!.source.y);
	});

	it("degrades to the shape's center without the registry", () => {
		const result = resolveConnectorPoints(
			connector(connectPointEndpoint("b1", "tip"), freeEndpoint(-200, 60)),
			band(),
			null,
		);
		expect(result).not.toBeNull();
		expect(result!.source).toEqual({ x: 100, y: 100 });
	});

	it("degrades to the shape's center for an id the type does not declare", () => {
		const result = resolveConnectorPoints(
			connector(connectPointEndpoint("b1", "stem"), freeEndpoint(-200, 60)),
			band(),
			null,
			null,
			null,
			extraConnectPointsRegistry,
		);
		expect(result).not.toBeNull();
		expect(result!.source).toEqual({ x: 100, y: 100 });
	});
});

/** A plugin type declaring one extra connection point, for the wiring check. */
const tippedPlugin: CanvasPlugin = {
	id: "tipped-plugin",
	objects: {
		tipped: defineObject({
			features: { type: "tipped", geometry: "rect", connectable: true },
			validateDoc: () => [],
			factory: createFrameObjectFactory({
				type: "tipped",
				x: 0,
				y: 0,
				width: 40,
				height: 160,
			}),
			mapper: {
				toDoc: (state) => ({ id: state.id, type: "tipped" }),
				toState: (doc) => ({ id: doc.id, type: "tipped" }),
			},
			stateValidator: () => true,
			component: () => null,
			extraConnectPoints: bandTip,
			behavior: {
				moveByDelta: (state) => state,
				transformByGroup: (state) => state,
				rotateByGroup: (state) => state,
			},
			menu: [],
		}),
	},
};

describe("createCanvasRegistries extra connect point registration", () => {
	it("registers what a definition declares, and nothing for a type that declares none", () => {
		const registry = createCanvasRegistries({
			plugins: [tippedPlugin],
		}).objectExtraConnectPoints;
		expect(registry.get("tipped")).toBeTypeOf("function");
		expect(registry.get("rect")).toBeUndefined();
	});
});
