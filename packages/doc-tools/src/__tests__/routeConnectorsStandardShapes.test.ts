import type {
	CanvasDoc,
	CanvasDocPlugin,
	ObjectDoc,
	ObjectDocDefinition,
} from "@jiscribe/doc";
import { createDocOps } from "@jiscribe/doc";
import type { Point, Rect } from "@jiscribe/geometry";
import {
	standardDocPlugins,
	standardObjectDocDefinitions,
} from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

import { standardDocOps } from "../canvasTools";
import { validateDoc } from "../validateDoc";

// routeConnectors on the shipped shapes, which no plugin's e2e suite runs: the title
// regions the container and AWS group types answer and the lines ending on them, the
// ER entity's column anchors, and the group markers' tip.

/** The shipped plugins with no type answering a title region: every title band whole. */
const titleRegionlessDocOps = createDocOps({
	plugins: standardDocPlugins.map((plugin): CanvasDocPlugin => ({
		...plugin,
		objects: Object.fromEntries(
			Object.entries(plugin.objects ?? {}).map(([type, definition]) => {
				const withoutTitleRegion: ObjectDocDefinition = {
					...(definition as ObjectDocDefinition),
				};
				delete withoutTitleRegion.layoutContainerTitleRegion;
				return [type, withoutTitleRegion];
			}),
		),
	})),
});

/** Parse a document written out here, failing the test when it does not parse. */
const parseDoc = (source: object): CanvasDoc => {
	const result = validateDoc(JSON.stringify(source));
	if (result.doc === undefined) {
		throw new Error(
			result.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
		);
	}
	return result.doc;
};

const findObject = (doc: CanvasDoc, id: string): Record<string, unknown> =>
	doc.root.find((object) => object.id === id) as Record<string, unknown>;

type RoutedConnector = {
	source: { owner: { id: string }; anchor: Record<string, unknown> };
	target: { owner: { id: string }; anchor: Record<string, unknown> };
	points: Point[];
};

/**
 * A frame at the origin, 600 by 300, of the given type, title and fields; then
 * `rect-1` above it and a shape of `innerType` inside, 60 by 60, both spanning x
 * 400..460, joined by `connector-1`. The straight line down at x 430 crosses the
 * frame's title band, right of a short title at its left end.
 */
const buildFrameDoc = (
	frame: { type: string; title: string; fields: Record<string, unknown> },
	innerType: string,
): CanvasDoc => {
	const doc: CanvasDoc = { version: 1, root: [] };
	standardDocOps.addObject(doc, frame.type, {
		x: 0,
		y: 0,
		width: 600,
		height: 300,
		text: frame.title,
		extraProps: frame.fields,
	});
	standardDocOps.addObject(doc, "rect", {
		x: 400,
		y: -200,
		width: 60,
		height: 60,
	});
	const innerId = standardDocOps.addObject(doc, innerType, {
		x: 400,
		y: 150,
		width: 60,
		height: 60,
	});
	standardDocOps.connect(doc, { sourceId: "rect-1", targetId: innerId });
	return parseDoc(doc);
};

describe("routeConnectors on the shipped container shapes", () => {
	it.each([
		["a container", { type: "container", title: "Orders", fields: {} }, "rect"],
		[
			"an AWS group",
			{ type: "awsGroup", title: "VPC", fields: { kind: "vpc" } },
			"awsIcon",
		],
	])(
		"runs a line straight through the title band of %s beside its title",
		(_, frame, innerType) => {
			const doc = buildFrameDoc(frame, innerType);
			const connectorId = doc.root[3].id;
			const before = structuredClone(doc);

			const result = standardDocOps.routeConnectors(doc, undefined);

			expect(result.connectorIds).toEqual([connectorId]);
			expect(findObject(doc, connectorId)).toMatchObject({
				source: { anchor: { side: "bottom", t: 0.5 } },
				target: { anchor: { side: "top", t: 0.5 } },
				points: [],
			});
			// With the band all title, the line has to go around it.
			titleRegionlessDocOps.routeConnectors(before, undefined);
			expect(
				(findObject(before, connectorId) as RoutedConnector).points,
			).not.toEqual([]);
		},
	);

	it.each([
		["a container", { type: "container", title: "Orders", fields: {} }],
		[
			"an AWS group",
			{ type: "awsGroup", title: "VPC", fields: { kind: "vpc" } },
		],
	])(
		"routes a line from %s to a shape outside it, the frame's end on its side",
		(_, frame) => {
			const doc: CanvasDoc = { version: 1, root: [] };
			const frameId = standardDocOps.addObject(doc, frame.type, {
				x: 0,
				y: 0,
				width: 600,
				height: 300,
				text: frame.title,
				extraProps: frame.fields,
			});
			standardDocOps.addObject(doc, "rect", {
				x: 800,
				y: 130,
				width: 60,
				height: 40,
			});
			const connectorId = standardDocOps.connect(doc, {
				sourceId: frameId,
				targetId: "rect-1",
			});
			const parsed = parseDoc(doc);

			const result = standardDocOps.routeConnectors(parsed, undefined);

			expect(result.connectorIds).toEqual([connectorId]);
			expect(result.keptConnectorIdsByReason).toEqual({});
			expect(findObject(parsed, connectorId)).toMatchObject({
				source: {
					owner: { id: frameId },
					anchor: { kind: "edge", side: "right", t: 0.5 },
				},
				target: { anchor: { kind: "edge", side: "left", t: 0.5 } },
				points: [],
			});
		},
	);
});

describe("routeConnectors on the shipped group markers", () => {
	it("routes a line to a brace's tip, keeping its end on the tip", () => {
		// A left brace 24 by 160: its tip is the middle of its left side, y 80.
		const doc = parseDoc({
			version: 1,
			root: [
				{
					id: "brace",
					type: "brace",
					x: 0,
					y: 0,
					width: 24,
					height: 160,
					direction: "left",
				},
				{ id: "box", type: "rect", x: -300, y: -200, width: 60, height: 40 },
				{
					id: "box-brace",
					type: "connector",
					source: {
						owner: { id: "box" },
						anchor: { kind: "edge", side: "bottom", t: 0.5 },
					},
					target: {
						owner: { id: "brace" },
						anchor: { kind: "connectPoint", id: "tip" },
					},
					points: [],
				},
			],
		});

		const result = standardDocOps.routeConnectors(doc, undefined);

		expect(result.connectorIds).toEqual(["box-brace"]);
		expect(result.keptConnectorIdsByReason).toEqual({});
		const connector = findObject(doc, "box-brace") as RoutedConnector;
		expect(connector.target.anchor).toEqual({
			kind: "connectPoint",
			id: "tip",
		});
		// It comes in level with the tip, from the left.
		const lastCorner = connector.points[connector.points.length - 1];
		expect(lastCorner.y).toBe(80);
		expect(lastCorner.x).toBeLessThan(0);
	});
});

/** The entity's box on the canvas, as its type measures it. */
const boxOfEntity = (doc: CanvasDoc, id: string): Rect =>
	standardObjectDocDefinitions
		.get("erEntity")
		?.bounds?.(findObject(doc, id) as ObjectDoc) as Rect;

/** Where an end on one of an entity's column connect points lies: the box side at its row. */
const pointOfColumnEnd = (
	doc: CanvasDoc,
	end: RoutedConnector["source"],
): Point => {
	const entity = findObject(doc, end.owner.id) as ObjectDoc;
	const box = boxOfEntity(doc, end.owner.id);
	const anchor = standardObjectDocDefinitions
		.get("erEntity")
		?.extraConnectPointEdgeAnchors?.(entity)
		.find(({ id }) => id === end.anchor.id);
	expect(anchor).toBeDefined();
	const { side, t } = anchor as { side: string; t: number };
	return {
		x: side === "left" ? box.x : box.x + box.width,
		y: box.y + box.height * t,
	};
};

const entersRect = (path: readonly Point[], rect: Rect): boolean =>
	path.slice(1).some((point, index) => {
		const previous = path[index];
		return (
			Math.min(previous.x, point.x) < rect.x + rect.width &&
			Math.max(previous.x, point.x) > rect.x &&
			Math.min(previous.y, point.y) < rect.y + rect.height &&
			Math.max(previous.y, point.y) > rect.y
		);
	});

const COLUMNS = [
	{ key: "PK", name: "id", type: "bigint" },
	{ key: "FK", name: "org_id", type: "bigint" },
	{ name: "email", type: "text" },
];

/**
 * `orders` at the origin and `users` at the given x, joined from the second column of
 * `orders` (its right end) to the first of `users` (its left end).
 */
const buildEntityDoc = (usersX: number): CanvasDoc =>
	parseDoc({
		version: 1,
		root: [
			{
				id: "orders",
				type: "erEntity",
				x: 0,
				y: 0,
				name: "orders",
				columns: COLUMNS,
			},
			{
				id: "users",
				type: "erEntity",
				x: usersX,
				y: 120,
				name: "users",
				columns: COLUMNS,
			},
			{
				id: "orders-users",
				type: "connector",
				source: {
					owner: { id: "orders" },
					anchor: { kind: "connectPoint", id: "col:1:right" },
				},
				target: {
					owner: { id: "users" },
					anchor: { kind: "connectPoint", id: "col:0:left" },
				},
				points: [],
			},
		],
	});

describe("routeConnectors on the shipped ER entities", () => {
	it("routes a relationship from column to column, through neither entity", () => {
		const doc = buildEntityDoc(500);

		const result = standardDocOps.routeConnectors(doc, undefined);

		expect(result.connectorIds).toEqual(["orders-users"]);
		expect(result.keptConnectorIdsByReason).toEqual({});
		const connector = findObject(doc, "orders-users") as RoutedConnector;
		expect(connector.source.anchor).toEqual({
			kind: "connectPoint",
			id: "col:1:right",
		});
		expect(connector.target.anchor).toEqual({
			kind: "connectPoint",
			id: "col:0:left",
		});
		const path = [
			pointOfColumnEnd(doc, connector.source),
			...connector.points,
			pointOfColumnEnd(doc, connector.target),
		];
		expect(entersRect(path, boxOfEntity(doc, "orders"))).toBe(false);
		expect(entersRect(path, boxOfEntity(doc, "users"))).toBe(false);
		expect(validateDoc(JSON.stringify(doc)).doc).toBeDefined();
	});

	it("moves both ends to the other end of their rows when the target stands to the left", () => {
		const doc = buildEntityDoc(-500);

		standardDocOps.routeConnectors(doc, undefined);

		const connector = findObject(doc, "orders-users") as RoutedConnector;
		expect(connector.source.anchor).toEqual({
			kind: "connectPoint",
			id: "col:1:left",
		});
		expect(connector.target.anchor).toEqual({
			kind: "connectPoint",
			id: "col:0:right",
		});
		const path = [
			pointOfColumnEnd(doc, connector.source),
			...connector.points,
			pointOfColumnEnd(doc, connector.target),
		];
		expect(entersRect(path, boxOfEntity(doc, "orders"))).toBe(false);
		expect(entersRect(path, boxOfEntity(doc, "users"))).toBe(false);
	});
});
