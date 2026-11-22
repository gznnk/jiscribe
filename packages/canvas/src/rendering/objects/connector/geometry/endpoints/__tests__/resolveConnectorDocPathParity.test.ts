import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { ConnectorDoc } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { EndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";
import { createFrameObjectFactory } from "@jiscribe/doc/model/objects/utils/createFrameObjectFactory";
import { resolveDocDefinitions } from "@jiscribe/doc/plugin/resolveDocDefinitions";
import { resolveConnectorDocPath } from "@jiscribe/doc/unstable";
import type { Dimensions, Point, Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { createCanvasRegistries } from "../../../../../../controllers/registries/createCanvasRegistries";
import type { CanvasPlugin } from "../../../../../../plugin/CanvasPlugin";
import { defineObject } from "../../../../../../plugin/ObjectTypeDefinition";
import { canvasToState } from "../../../../../../states/canvas/CanvasMapper";
import { createFrameMapper } from "../../../../../../states/objects/base/FrameMapper";
import type { ConnectorState } from "../../../../../../states/objects/connector/ConnectorState";
import {
	listConnectorPathPoints,
	resolveConnectorPoints,
} from "../resolveConnectorPoints";

/**
 * The doc layer's path (resolveConnectorDocPath) against the one the canvas
 * draws, both computed from the same document: the canvas side maps it through
 * its own mappers (canvasToState), so a disagreement in how a doc becomes a frame
 * shows up here as well as one in the resolution.
 */

/** A home plate: the box with its bottom corners cut to a tip, so the outline is not the box. */
const taperedOutline = ({ width, height }: Dimensions): Point[] => [
	{ x: -width / 2, y: -height / 2 },
	{ x: width / 2, y: -height / 2 },
	{ x: width / 2, y: height / 4 },
	{ x: 0, y: height / 2 },
	{ x: -width / 2, y: height / 4 },
];

/** The body above the tip, where the edge anchors are centered. */
const taperedAnchorRegion = ({ width, height }: Dimensions): Rect => ({
	x: -width / 2,
	y: -height / 2,
	width,
	height: (height * 3) / 4,
});

const taperedFeatures = {
	type: "tapered",
	geometry: "rect",
	connectable: true,
	transform: true,
} as const;

const taperedPlugin: CanvasPlugin = {
	id: "tapered-plugin",
	objects: {
		tapered: defineObject({
			features: taperedFeatures,
			validateDoc: () => [],
			factory: createFrameObjectFactory({
				type: "tapered",
				x: 0,
				y: 0,
				width: 100,
				height: 100,
			}),
			mapper: createFrameMapper(taperedFeatures),
			stateValidator: () => true,
			component: () => null,
			outline: taperedOutline,
			anchorRegion: taperedAnchorRegion,
			behavior: {
				moveByDelta: (state) => state,
				transformByGroup: (state) => state,
				rotateByGroup: (state) => state,
			},
			menu: [],
		}),
	},
};

const registries = createCanvasRegistries({ plugins: [taperedPlugin] });
const definitions = resolveDocDefinitions({ plugins: [taperedPlugin] });

const owned = (id: string, anchor: EndpointRef["anchor"]): EndpointRef =>
	({ owner: { id }, anchor }) as EndpointRef;

const free = (x: number, y: number): EndpointRef => ({
	anchor: { kind: "free", point: { x, y } },
});

const rect = (id: string, fields: Record<string, unknown> = {}): ObjectDoc =>
	({
		id,
		type: "rect",
		x: 0,
		y: 0,
		width: 100,
		height: 60,
		...fields,
	}) as ObjectDoc;

const farRect = rect("far", { x: 400, y: 300, width: 80, height: 80 });

type ParityCase = {
	name: string;
	connector: Pick<ConnectorDoc, "source" | "target" | "routing" | "points">;
	source?: ObjectDoc;
	target?: ObjectDoc;
	/** Wraps the source owner in a group of this transform, so it is drawn as a group's child. */
	sourceGroup?: Record<string, unknown>;
};

const cases: ParityCase[] = [
	{
		name: "edge connect points, straight",
		connector: {
			source: owned("a", { kind: "connectPoint", id: "rightCenter" }),
			target: owned("far", { kind: "connectPoint", id: "topCenter" }),
			routing: "straight",
			points: [{ x: 440, y: 30 }],
		},
		source: rect("a"),
		target: farRect,
	},
	{
		name: "edge connect points, orthogonal",
		connector: {
			source: owned("a", { kind: "connectPoint", id: "bottomCenter" }),
			target: owned("far", { kind: "connectPoint", id: "leftCenter" }),
			routing: "orthogonal",
			points: [
				{ x: 50, y: 200 },
				{ x: 300, y: 200 },
				{ x: 300, y: 340 },
			],
		},
		source: rect("a"),
		target: farRect,
	},
	{
		name: "edge anchors",
		connector: {
			source: owned("a", { kind: "edge", side: "right", t: 0.25 }),
			target: owned("far", { kind: "edge", side: "top", t: 0.75 }),
			routing: "orthogonal",
			points: [
				{ x: 200, y: 15 },
				{ x: 200, y: 150 },
				{ x: 460, y: 150 },
			],
		},
		source: rect("a"),
		target: farRect,
	},
	{
		name: "center anchors snapped onto the outline, one vertex aiming both, straight",
		connector: {
			source: owned("a", { kind: "center" }),
			target: owned("far", { kind: "center" }),
			routing: "straight",
			points: [{ x: 300, y: 80 }],
		},
		source: rect("a"),
		target: farRect,
	},
	{
		name: "one vertex between two connect points, orthogonal",
		connector: {
			source: owned("a", { kind: "connectPoint", id: "rightCenter" }),
			target: owned("far", { kind: "connectPoint", id: "topCenter" }),
			routing: "orthogonal",
			points: [{ x: 430, y: 40 }],
		},
		source: rect("a"),
		target: farRect,
	},
	{
		name: "a rotated owner",
		connector: {
			source: owned("a", { kind: "connectPoint", id: "rightCenter" }),
			target: owned("far", { kind: "center" }),
			points: [{ x: 250, y: 100 }],
		},
		source: rect("a", { rotation: 30 }),
		target: farRect,
	},
	{
		name: "a flipped owner",
		connector: {
			source: owned("a", { kind: "edge", side: "left", t: 0.2 }),
			target: owned("far", { kind: "connectPoint", id: "topCenter" }),
			routing: "orthogonal",
			points: [
				{ x: 250, y: 12 },
				{ x: 440, y: 12 },
			],
		},
		source: rect("a", { flipX: true, flipY: true }),
		target: farRect,
	},
	{
		name: "an ellipse owner",
		connector: {
			source: owned("e", { kind: "center" }),
			target: owned("e2", { kind: "connectPoint", id: "leftCenter" }),
			points: [{ x: 250, y: 120 }],
		},
		source: {
			id: "e",
			type: "ellipse",
			cx: 80,
			cy: 60,
			rx: 50,
			ry: 30,
		} as ObjectDoc,
		target: {
			id: "e2",
			type: "ellipse",
			cx: 400,
			cy: 200,
			rx: 40,
			ry: 60,
			rotation: 45,
		} as ObjectDoc,
	},
	{
		name: "an owner declaring an outline and an anchor region",
		connector: {
			source: owned("t", { kind: "connectPoint", id: "leftCenter" }),
			target: owned("t2", { kind: "center" }),
			points: [
				{ x: -100, y: 40 },
				{ x: -100, y: 400 },
			],
		},
		source: {
			id: "t",
			type: "tapered",
			x: 0,
			y: 0,
			width: 120,
			height: 160,
		} as ObjectDoc,
		target: {
			id: "t2",
			type: "tapered",
			x: 200,
			y: 300,
			width: 100,
			height: 100,
			rotation: 90,
		} as ObjectDoc,
	},
	{
		// The group's own turn is not composed into its child's frame on either side.
		name: "an owner inside a group",
		connector: {
			source: owned("child", { kind: "connectPoint", id: "bottomCenter" }),
			target: owned("far", { kind: "center" }),
			points: [{ x: 120, y: 250 }],
		},
		source: rect("child", { x: 50, y: 50, rotation: 15 }),
		sourceGroup: { rotation: 40, flipX: true },
		target: farRect,
	},
	{
		name: "a free end",
		connector: {
			source: free(-50, -40),
			target: owned("far", { kind: "connectPoint", id: "topCenter" }),
			routing: "orthogonal",
			points: [{ x: 440, y: -40 }],
		},
		target: farRect,
	},
	{
		name: "a connect point id the owner does not offer",
		connector: {
			source: owned("a", { kind: "connectPoint", id: "nowhere" }),
			target: owned("far", { kind: "connectPoint", id: "topCenter" }),
			points: [{ x: 200, y: 100 }],
		},
		source: rect("a"),
		target: farRect,
	},
];

describe("resolveConnectorDocPath against resolveConnectorPoints", () => {
	it.each(cases)("$name", ({ connector, source, target, sourceGroup }) => {
		const connectorDoc = {
			id: "c",
			type: "connector",
			...connector,
		} as ObjectDoc;
		const sourceTopLevel =
			source && sourceGroup
				? ({
						id: "g",
						type: "group",
						...sourceGroup,
						children: [source],
					} as ObjectDoc)
				: source;
		const doc = {
			version: 1,
			root: [sourceTopLevel, target, connectorDoc].filter(
				(object) => object !== undefined,
			),
		} as CanvasDoc;
		const { objects } = canvasToState(
			doc,
			registries.objectMapper,
			registries.objectContentResizer,
		);

		const canvasResolved = resolveConnectorPoints(
			objects.c as ConnectorState,
			source && objects[source.id],
			target && objects[target.id],
			registries.objectOutline,
			registries.objectAnchorRegion,
			registries.objectExtraConnectPoints,
		);
		expect(canvasResolved).not.toBeNull();
		if (canvasResolved === null) {
			return;
		}

		expect(
			resolveConnectorDocPath(connector, source, target, definitions),
		).toEqual(listConnectorPathPoints(canvasResolved));
	});
});
