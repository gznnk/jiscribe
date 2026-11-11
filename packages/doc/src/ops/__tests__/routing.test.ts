import type { Point, Rect } from "@jiscribe/geometry";
import { EDGE_ROUTE_MARGIN } from "@jiscribe/layout";
import { describe, expect, it } from "vitest";

import {
	emptyDoc,
	expectValid,
	readObject,
	rootIds,
} from "./support/docFixtures";
import {
	captionedDefinition,
	columnCardDefinition,
	regionDefinition,
} from "./support/pluginFixtures";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ConnectorDoc } from "../../model/objects/connector/ConnectorDoc";
import type { EdgeAnchorSide } from "../../model/objects/types/EndpointRef";
import { createFrameObjectFactory } from "../../model/objects/utils/createFrameObjectFactory";
import type { ObjectDocConnectPointEdgeAnchor } from "../../plugin/ObjectDocConnectPointEdgeAnchor";
import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";
import { calcLabelTextRegion } from "../../text/label/calcLabelTextRegion";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";
import { measureLabelBox } from "../utils/connectorLabelBox";

const routingDocOps = createDocOps({
	plugins: [
		{
			id: "routing-plugin",
			objects: {
				captioned: captionedDefinition,
				region: regionDefinition,
				"column-card": columnCardDefinition,
			},
		},
	],
});

const addRect = (
	doc: CanvasDoc,
	x: number,
	y: number,
	width = 60,
	height = 40,
): string => routingDocOps.addObject(doc, "rect", { x, y, width, height });

const connect = (doc: CanvasDoc, sourceId: string, targetId: string): string =>
	routingDocOps.connect(doc, { sourceId, targetId });

type StoredConnector = {
	source: { owner?: { id: string }; anchor: { side?: string; t?: number } };
	target: { owner?: { id: string }; anchor: { side?: string; t?: number } };
	points: Point[];
};

const readConnector = (doc: CanvasDoc, id: string): StoredConnector =>
	readObject(doc, id) as unknown as StoredConnector;

const boxOf = (doc: CanvasDoc, id: string): Rect => {
	const { x, y, width, height } = readObject(doc, id) as Rect;
	return { x, y, width, height };
};

/** The whole stored route: the source end on its box, the corners, the target end. */
const pathOf = (doc: CanvasDoc, connectorId: string): Point[] => {
	const connector = readConnector(doc, connectorId);
	const endPoint = (end: StoredConnector["source"]): Point => {
		const { x, y, width, height } = boxOf(doc, end.owner?.id as string);
		const t = end.anchor.t as number;
		switch (end.anchor.side) {
			case "top":
				return { x: x + width * t, y };
			case "bottom":
				return { x: x + width * t, y: y + height };
			case "left":
				return { x, y: y + height * t };
			default:
				return { x: x + width, y: y + height * t };
		}
	};
	return [
		endPoint(connector.source),
		...connector.points,
		endPoint(connector.target),
	];
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

describe("routeConnectors", () => {
	it("re-anchors every connector onto the facing sides and drops its stored route", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0);
		addRect(doc, 300, 0);
		routingDocOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "rect-2",
			sourceAnchor: "topCenter",
			targetAnchor: "bottomCenter",
			points: [{ x: 1, y: 1 }],
			routing: "straight",
			label: "go",
		});
		const before = readObject(doc, "rect-1");
		const storedLabel = readObject(doc, "connector-1").label as {
			position?: number;
			offset?: number;
		};
		storedLabel.position = 0.2;
		storedLabel.offset = 12;
		const labelBefore = structuredClone(storedLabel);

		const result = routingDocOps.routeConnectors(doc, undefined);

		expect(result).toEqual({
			connectorIds: ["connector-1"],
			keptConnectorIdsByReason: {},
			restackedConnectorIds: [],
		});
		expect(readObject(doc, "connector-1")).toMatchObject({
			source: { anchor: { kind: "edge", side: "right", t: 0.5 } },
			target: { anchor: { kind: "edge", side: "left", t: 0.5 } },
			points: [],
		});
		expect(readObject(doc, "connector-1").routing).toBeUndefined();
		// Nothing else on the line, so the label moves to its middle.
		expect(readObject(doc, "connector-1").label).toEqual({
			...labelBefore,
			position: 0.5,
			offset: 0,
		});
		expect(readObject(doc, "rect-1")).toEqual(before);
		expectValid(doc);
	});

	it("sets a label too long for its line beside it, by the box it is drawn in", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0);
		addRect(doc, 100, 0);
		routingDocOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "rect-2",
			label: "a label far longer than the line",
		});

		routingDocOps.routeConnectors(doc, undefined);

		const connector = readObject(doc, "connector-1") as unknown as ConnectorDoc;
		const box = measureLabelBox(connector) as { height: number };
		// The line runs right along y 20: the spot above it is the one taken.
		expect(connector.label).toMatchObject({
			position: 0.5,
			offset: -(box.height / 2 + 6),
		});
	});

	it("leaves the label of a connector it keeps, and gives one without a label none", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0);
		addRect(doc, 300, 0);
		connect(doc, "rect-1", "rect-2");
		routingDocOps.connect(doc, {
			sourceId: "rect-2",
			targetId: "rect-2",
			label: "loop",
		});
		const loopBefore = structuredClone(readObject(doc, "connector-2"));

		routingDocOps.routeConnectors(doc, undefined);

		expect(readObject(doc, "connector-1").label).toBeUndefined();
		expect(readObject(doc, "connector-2")).toEqual(loopBefore);
	});

	it("routes around the other shapes, their captions and the container title bands", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 100);
		addRect(doc, 500, 100);
		addRect(doc, 120, 80, 60, 80);
		routingDocOps.addObject(doc, "captioned", {
			x: 250,
			y: 40,
			text: "a caption wide enough to cross the line",
		});
		routingDocOps.addObject(doc, "region", {
			x: 380,
			y: 100,
			width: 80,
			height: 200,
			extraProps: { headerHeight: 40 },
		});
		connect(doc, "rect-1", "rect-2");

		routingDocOps.routeConnectors(doc, ["connector-1"]);

		const path = pathOf(doc, "connector-1");
		const captioned = boxOf(doc, "captioned-1");
		const caption = calcLabelTextRegion(
			captioned,
			{ text: "a caption wide enough to cross the line" },
			undefined,
		);
		expect(entersRect(path, boxOf(doc, "rect-3"))).toBe(false);
		expect(entersRect(path, captioned)).toBe(false);
		expect(
			entersRect(path, {
				...caption,
				x: captioned.x + captioned.width / 2 + caption.x,
				y: captioned.y + captioned.height / 2 + caption.y,
			}),
		).toBe(false);
		expect(entersRect(path, { x: 380, y: 100, width: 80, height: 40 })).toBe(
			false,
		);
	});

	it("goes around a rotated shape by the box it fills once turned", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 100);
		addRect(doc, 500, 100);
		// 200 by 20 lying above the line, standing across it once turned a quarter.
		addRect(doc, 180, 30, 200, 20);
		routingDocOps.setRotation(doc, ["rect-3"], 90);
		connect(doc, "rect-1", "rect-2");

		routingDocOps.routeConnectors(doc, undefined);

		const path = pathOf(doc, "connector-1");
		expect(readConnector(doc, "connector-1").points).not.toEqual([]);
		expect(entersRect(path, { x: 270, y: -60, width: 20, height: 200 })).toBe(
			false,
		);
	});

	it("goes around a rotated shape's caption where it hangs once turned", () => {
		const doc = emptyDoc();
		addRect(doc, -200, -80);
		addRect(doc, 400, -80);
		const text = "a caption wide enough to reach across";
		routingDocOps.addObject(doc, "captioned", { x: 100, y: 0, text });
		routingDocOps.setRotation(doc, ["captioned-1"], 90);
		connect(doc, "rect-1", "rect-2");

		routingDocOps.routeConnectors(doc, undefined);

		// A quarter turn clockwise takes the caption from below the box to its left,
		// standing on end: across the line, where unturned it would hang clear of it.
		const box = boxOf(doc, "captioned-1");
		const caption = calcLabelTextRegion(box, { text }, undefined);
		const turned = {
			x: box.x + box.width / 2 - (caption.y + caption.height),
			y: box.y + box.height / 2 + caption.x,
			width: caption.height,
			height: caption.width,
		};
		expect(readConnector(doc, "connector-1").points).not.toEqual([]);
		expect(entersRect(pathOf(doc, "connector-1"), turned)).toBe(false);
	});

	it("takes no caption that draws nothing for an obstacle", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 100);
		addRect(doc, 500, 100);
		// An empty caption would hang across the line, its top 68px below the shape's top, at y 108.
		routingDocOps.addObject(doc, "captioned", { x: 250, y: 40, text: "" });
		connect(doc, "rect-1", "rect-2");

		routingDocOps.routeConnectors(doc, undefined);

		expect(readConnector(doc, "connector-1")).toMatchObject({
			source: { anchor: { side: "right" } },
			target: { anchor: { side: "left" } },
			points: [],
		});
	});

	it("keeps off a container's frame rather than run alongside it", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 100);
		addRect(doc, 500, 100);
		// No title band: only the frame's top side, 10px below the straight line.
		routingDocOps.addObject(doc, "region", {
			x: 150,
			y: 130,
			width: 200,
			height: 270,
			extraProps: { headerHeight: 0 },
		});
		connect(doc, "rect-1", "rect-2");

		routingDocOps.routeConnectors(doc, undefined);

		expect(readConnector(doc, "connector-1").points).not.toEqual([]);
	});

	it("lists the connectors kept for one reason in tree order", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0);
		addRect(doc, 300, 0);
		routingDocOps.connect(doc, { sourceId: "rect-2", targetId: "rect-2" });
		routingDocOps.connect(doc, {
			sourceId: "rect-1",
			targetPoint: { x: -100, y: 0 },
		});
		routingDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-1" });
		routingDocOps.connect(doc, {
			sourceId: "rect-2",
			targetPoint: { x: 500, y: 0 },
		});

		expect(
			routingDocOps.routeConnectors(doc, undefined).keptConnectorIdsByReason,
		).toEqual({
			selfLoop: ["connector-1", "connector-3"],
			freeEnd: ["connector-2", "connector-4"],
		});
	});

	it("writes corners on whole pixels but for the coordinate each end's neighbour shares with it", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0, 61, 41);
		addRect(doc, 300.3, 300.3, 61, 41);
		connect(doc, "rect-1", "rect-2");

		routingDocOps.routeConnectors(doc, undefined);

		const { source, target, points } = readConnector(doc, "connector-1");
		expect(points).toHaveLength(1);
		const [corner] = points;
		// One corner meets both ends: it takes x from a top or bottom end, y from a side end.
		const sourceVertical =
			source.anchor.side === "top" || source.anchor.side === "bottom";
		const path = pathOf(doc, "connector-1");
		expect(sourceVertical ? corner.x : corner.y).toBe(
			sourceVertical ? path[0].x : path[0].y,
		);
		expect(sourceVertical ? corner.y : corner.x).toBe(
			sourceVertical ? path[2].y : path[2].x,
		);
		expect(target.anchor.side).toBe(sourceVertical ? "left" : "top");
		expect(path[0].x === 30.5 || path[0].y === 20.5).toBe(true);
	});

	it("rounds the coordinate a corner shares with no end", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0);
		addRect(doc, 0.4, 300.4);
		// Its margin band ends at x 119.7, where the route turns down.
		addRect(doc, -30.3, 150.3, 120, 40);
		connect(doc, "rect-1", "rect-2");

		routingDocOps.routeConnectors(doc, undefined);

		expect(readConnector(doc, "connector-1")).toMatchObject({
			source: { anchor: { side: "right", t: 0.5 } },
			target: { anchor: { side: "right", t: 0.5 } },
			points: [
				{ x: 120, y: 20 },
				{ x: 120, y: 320.4 },
			],
		});
	});

	it("redraws only the connectors joining the shapes named", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0);
		addRect(doc, 300, 0);
		addRect(doc, 600, 0);
		connect(doc, "rect-1", "rect-2");
		connect(doc, "rect-2", "rect-3");

		expect(
			routingDocOps.routeConnectors(doc, ["rect-1", "rect-2"]).connectorIds,
		).toEqual(["connector-1"]);
		expect(
			routingDocOps.routeConnectors(doc, ["connector-2"]).connectorIds,
		).toEqual(["connector-2"]);
	});

	it("counts a group's contents, and the shapes inside a container shape, as named", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0);
		addRect(doc, 300, 0);
		routingDocOps.addObject(doc, "region", {
			x: -50,
			y: 200,
			width: 600,
			height: 300,
		});
		addRect(doc, 0, 300);
		addRect(doc, 300, 300);
		addRect(doc, 0, 600);
		connect(doc, "rect-1", "rect-2");
		connect(doc, "rect-3", "rect-4");
		connect(doc, "rect-4", "rect-5");
		const groupId = routingDocOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(routingDocOps.routeConnectors(doc, [groupId]).connectorIds).toEqual([
			"connector-1",
		]);
		expect(
			routingDocOps.routeConnectors(doc, ["region-1"]).connectorIds,
		).toEqual(["connector-2"]);
	});

	it("refuses an id the document does not hold, writing nothing", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0);
		addRect(doc, 300, 0);
		connect(doc, "rect-1", "rect-2");
		const before = structuredClone(doc);

		expect(() => routingDocOps.routeConnectors(doc, ["missing"])).toThrow(
			DocOperationError,
		);
		expect(doc).toEqual(before);
	});

	it("leaves each connector it cannot route as it was, with the reason", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0); // rect-1
		addRect(doc, 300, 0); // rect-2
		addRect(doc, 330, 20); // rect-3, overlapping rect-2
		addRect(doc, 0, 300); // rect-4, rotated below
		routingDocOps.setRotation(doc, ["rect-4"], 30);
		routingDocOps.addObject(doc, "region", { x: 600, y: 300 });
		routingDocOps.addObject(doc, "column-card", { x: 900, y: 0 });
		// rect-5 walled in by four rects overlapping at the corners, none touching it.
		addRect(doc, 1300, 0);
		addRect(doc, 1200, -100, 260, 40);
		addRect(doc, 1200, 100, 260, 40);
		addRect(doc, 1200, -80, 40, 200);
		addRect(doc, 1420, -80, 40, 200);
		addRect(doc, 700, 450); // rect-10, inside region-1
		routingDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-1" });
		routingDocOps.connect(doc, {
			sourceId: "rect-1",
			targetPoint: { x: -100, y: -100 },
		});
		connect(doc, "rect-2", "rect-3");
		connect(doc, "rect-1", "rect-4");
		connect(doc, "rect-10", "region-1");
		routingDocOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "column-card-1",
			targetAnchor: "col:0:left",
		});
		connect(doc, "rect-1", "rect-5");
		const keptBefore = [1, 2, 3, 4, 5, 6, 7].map((index) =>
			structuredClone(readObject(doc, `connector-${index}`)),
		);

		const result = routingDocOps.routeConnectors(doc, undefined);

		expect(result.connectorIds).toEqual([]);
		expect(result.keptConnectorIdsByReason).toEqual({
			selfLoop: ["connector-1"],
			freeEnd: ["connector-2"],
			overlappingEnds: ["connector-3"],
			transformedEnd: ["connector-4"],
			containerEnd: ["connector-5"],
			declaredConnectPoint: ["connector-6"],
			unroutable: ["connector-7"],
		});
		expect(
			[1, 2, 3, 4, 5, 6, 7].map((index) =>
				readObject(doc, `connector-${index}`),
			),
		).toEqual(keptBefore);
	});

	it("gives of the reasons a connector is kept for the one asked first", () => {
		const doc = emptyDoc();
		routingDocOps.addObject(doc, "region", { x: 0, y: 0 });
		addRect(doc, 100, 100);
		routingDocOps.addObject(doc, "column-card", { x: 250, y: 100 });
		// Both inside region-1, so each line to it is also a container end.
		connect(doc, "rect-1", "region-1");
		routingDocOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "region-1",
			sourceAnchor: "col:0:left",
		});
		Object.assign(readObject(doc, "region-1"), { rotation: 90 });

		expect(
			routingDocOps.routeConnectors(doc, undefined).keptConnectorIdsByReason,
		).toEqual({
			transformedEnd: ["connector-1"],
			declaredConnectPoint: ["connector-2"],
		});
	});

	it("leaves a connector ending on a group as having no box of its own", () => {
		const doc = emptyDoc();
		addRect(doc, 0, 0);
		addRect(doc, 300, 0);
		addRect(doc, 600, 0);
		const groupId = routingDocOps.groupObjects(doc, ["rect-2", "rect-3"]);
		connect(doc, "rect-1", "rect-2");
		const connector = readObject(doc, "connector-1") as {
			target: { owner: { id: string } };
		};
		connector.target.owner.id = groupId;

		expect(
			routingDocOps.routeConnectors(doc, undefined).keptConnectorIdsByReason,
		).toEqual({ unmeasurableEnd: ["connector-1"] });
	});

	it("routes through a shape both ends sit on, such as a background", () => {
		const doc = emptyDoc();
		addRect(doc, -100, -100, 600, 300);
		addRect(doc, 0, 0);
		addRect(doc, 300, 0);
		connect(doc, "rect-2", "rect-3");

		routingDocOps.routeConnectors(doc, undefined);

		expect(readObject(doc, "connector-1")).toMatchObject({
			source: { anchor: { side: "right" } },
			target: { anchor: { side: "left" } },
			points: [],
		});
	});

	it("moves a connector leaving through its source's caption to just beneath that shape, and changes nothing the second time", () => {
		const doc = emptyDoc();
		routingDocOps.addObject(doc, "captioned", {
			x: 0,
			y: 0,
			text: "Load balancer",
		});
		routingDocOps.addObject(doc, "captioned", { x: 0, y: 400, text: "Server" });
		connect(doc, "captioned-1", "captioned-2");

		const result = routingDocOps.routeConnectors(doc, undefined);

		expect(readConnector(doc, "connector-1").source.anchor.side).toBe("bottom");
		expect(result.restackedConnectorIds).toEqual(["connector-1"]);
		expect(rootIds(doc)).toEqual(["connector-1", "captioned-1", "captioned-2"]);
		const routed = structuredClone(doc);
		const again = routingDocOps.routeConnectors(doc, undefined);
		expect(again.restackedConnectorIds).toEqual([]);
		expect(doc).toEqual(routed);
	});

	it("routes in the order of the ends, so a second run changes nothing after a restack", () => {
		const doc = emptyDoc();
		routingDocOps.addObject(doc, "captioned", { x: 0, y: 0, text: "Hub" });
		routingDocOps.addObject(doc, "captioned", { x: -200, y: 300, text: "One" });
		routingDocOps.addObject(doc, "captioned", { x: 200, y: 300, text: "Two" });
		connect(doc, "captioned-3", "captioned-1");
		connect(doc, "captioned-1", "captioned-2");
		connect(doc, "captioned-1", "captioned-3");

		routingDocOps.routeConnectors(doc, undefined);
		const routed = structuredClone(doc);
		routingDocOps.routeConnectors(doc, undefined);

		expect(doc).toEqual(routed);
	});
});

/**
 * {@link regionDefinition} answering a title region: the one its doc carries under
 * `titleRegion` (local, centre origin), or undefined when the doc carries none.
 */
const titledRegionDefinition: ObjectDocDefinition = {
	...regionDefinition,
	features: { ...regionDefinition.features, type: "titled-region" },
	extraKeys: ["headerHeight", "titleRegion"],
	factory: createFrameObjectFactory({
		type: "titled-region",
		width: 400,
		height: 300,
	}),
	layoutContainerTitleRegion: (doc) =>
		(doc as { titleRegion?: Rect }).titleRegion,
};

const titledRegionDocOps = createDocOps({
	plugins: [
		{
			id: "titled-region-plugin",
			objects: {
				region: regionDefinition,
				"titled-region": titledRegionDefinition,
			},
		},
	],
});

/** A 400 by 300 region at the origin with a 40px title band, the title region given. */
const addTitledRegion = (
	doc: CanvasDoc,
	titleRegion: Rect | undefined,
): string =>
	titledRegionDocOps.addObject(doc, "titled-region", {
		x: 0,
		y: 0,
		width: 400,
		height: 300,
		extraProps: {
			headerHeight: 40,
			...(titleRegion !== undefined ? { titleRegion } : {}),
		},
	});

/** The title band of {@link addTitledRegion}'s region, in world coordinates. */
const REGION_TITLE_BAND: Rect = { x: 0, y: 0, width: 400, height: 40 };

/**
 * `rect-1` above the region and `rect-2` inside it, both 60 by 40 and centred on x 330,
 * joined by `connector-1`: a straight line runs down through the band at x 330.
 */
const connectAcrossTitleBand = (doc: CanvasDoc): void => {
	titledRegionDocOps.addObject(doc, "rect", {
		x: 300,
		y: -200,
		width: 60,
		height: 40,
	});
	titledRegionDocOps.addObject(doc, "rect", {
		x: 300,
		y: 150,
		width: 60,
		height: 40,
	});
	titledRegionDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
};

describe("routeConnectors across a container's title band", () => {
	it("goes around the whole band of a container type that answers no title region", () => {
		const doc = emptyDoc();
		titledRegionDocOps.addObject(doc, "region", {
			x: 0,
			y: 0,
			width: 400,
			height: 300,
			extraProps: { headerHeight: 40 },
		});
		connectAcrossTitleBand(doc);

		titledRegionDocOps.routeConnectors(doc, undefined);

		expect(readConnector(doc, "connector-1").points).not.toEqual([]);
		expect(entersRect(pathOf(doc, "connector-1"), REGION_TITLE_BAND)).toBe(
			false,
		);
	});

	it("crosses the band straight over beside the title", () => {
		const doc = emptyDoc();
		// The title covers the band's left quarter, x 0..100.
		addTitledRegion(doc, { x: -200, y: -150, width: 100, height: 40 });
		connectAcrossTitleBand(doc);

		const result = titledRegionDocOps.routeConnectors(doc, undefined);

		expect(result.connectorIds).toEqual(["connector-1"]);
		expect(readConnector(doc, "connector-1")).toMatchObject({
			source: { anchor: { side: "bottom", t: 0.5 } },
			target: { anchor: { side: "top", t: 0.5 } },
			points: [],
		});
	});

	it("goes around the title standing in the straight line's way, through the rest of the band", () => {
		const doc = emptyDoc();
		// The title covers x 280..380, across the straight line at x 330.
		addTitledRegion(doc, { x: 80, y: -150, width: 100, height: 40 });
		connectAcrossTitleBand(doc);

		titledRegionDocOps.routeConnectors(doc, undefined);

		const path = pathOf(doc, "connector-1");
		expect(readConnector(doc, "connector-1").points).not.toEqual([]);
		expect(entersRect(path, { x: 280, y: 0, width: 100, height: 40 })).toBe(
			false,
		);
		expect(entersRect(path, REGION_TITLE_BAND)).toBe(true);
	});

	it("crosses anywhere along a band whose title region is 0 wide", () => {
		const doc = emptyDoc();
		// At x 330, where a region of any width would stand in the straight line's way.
		addTitledRegion(doc, { x: 130, y: -150, width: 0, height: 40 });
		connectAcrossTitleBand(doc);

		titledRegionDocOps.routeConnectors(doc, undefined);

		expect(readConnector(doc, "connector-1").points).toEqual([]);
	});

	it("goes around the whole band when the type answers no region for the doc", () => {
		const doc = emptyDoc();
		addTitledRegion(doc, undefined);
		connectAcrossTitleBand(doc);

		titledRegionDocOps.routeConnectors(doc, undefined);

		expect(readConnector(doc, "connector-1").points).not.toEqual([]);
		expect(entersRect(pathOf(doc, "connector-1"), REGION_TITLE_BAND)).toBe(
			false,
		);
	});

	it.each([{ flipX: true }, { flipY: true }, { rotation: 180 }])(
		"goes around the whole band of a turned container (%o), whose title lies elsewhere",
		(transform) => {
			const doc = emptyDoc();
			const regionId = addTitledRegion(doc, {
				x: -200,
				y: -150,
				width: 100,
				height: 40,
			});
			// Turned by half or mirrored, the box fills the same place.
			Object.assign(readObject(doc, regionId), transform);
			connectAcrossTitleBand(doc);

			titledRegionDocOps.routeConnectors(doc, undefined);

			expect(readConnector(doc, "connector-1").points).not.toEqual([]);
			expect(entersRect(pathOf(doc, "connector-1"), REGION_TITLE_BAND)).toBe(
				false,
			);
		},
	);

	it("goes around the whole band when a shape stands in it, still routing that shape's own connector", () => {
		const doc = emptyDoc();
		addTitledRegion(doc, { x: -200, y: -150, width: 30, height: 40 });
		connectAcrossTitleBand(doc);
		// rect-3 straddles the band's bottom edge, clear of the straight line at x 330.
		titledRegionDocOps.addObject(doc, "rect", {
			x: 100,
			y: 20,
			width: 60,
			height: 40,
		});
		titledRegionDocOps.addObject(doc, "rect", {
			x: 100,
			y: -200,
			width: 60,
			height: 40,
		});
		titledRegionDocOps.connect(doc, { sourceId: "rect-3", targetId: "rect-4" });

		const result = titledRegionDocOps.routeConnectors(doc, undefined);

		expect(result.keptConnectorIdsByReason).toEqual({});
		expect([...result.connectorIds].sort()).toEqual([
			"connector-1",
			"connector-2",
		]);
		expect(readConnector(doc, "connector-1").points).not.toEqual([]);
		expect(entersRect(pathOf(doc, "connector-1"), REGION_TITLE_BAND)).toBe(
			false,
		);
	});

	it("goes around the whole band when a container shape stands in it", () => {
		const doc = emptyDoc();
		addTitledRegion(doc, { x: -200, y: -150, width: 100, height: 40 });
		connectAcrossTitleBand(doc);
		// Straddling the band's bottom edge, clear of the straight line at x 330.
		titledRegionDocOps.addObject(doc, "region", {
			x: 100,
			y: 20,
			width: 60,
			height: 100,
			extraProps: { headerHeight: 0 },
		});

		titledRegionDocOps.routeConnectors(doc, undefined);

		expect(readConnector(doc, "connector-1").points).not.toEqual([]);
		expect(entersRect(pathOf(doc, "connector-1"), REGION_TITLE_BAND)).toBe(
			false,
		);
	});

	it("still crosses the band beside the title inside a container shape around the whole band", () => {
		const doc = emptyDoc();
		addTitledRegion(doc, { x: -200, y: -150, width: 100, height: 40 });
		connectAcrossTitleBand(doc);
		titledRegionDocOps.addObject(doc, "region", {
			x: -50,
			y: -50,
			width: 500,
			height: 400,
			extraProps: { headerHeight: 0 },
		});

		titledRegionDocOps.routeConnectors(doc, undefined);

		expect(readConnector(doc, "connector-1")).toMatchObject({
			source: { anchor: { side: "bottom", t: 0.5 } },
			target: { anchor: { side: "top", t: 0.5 } },
			points: [],
		});
	});
});

describe("routeConnectors with an end on a container shape", () => {
	it("routes a connector from a shape outside it onto a side of its box, from outside, entering no shape inside it", () => {
		const doc = emptyDoc();
		routingDocOps.addObject(doc, "region", { x: 0, y: 0 });
		addRect(doc, 170, 130); // rect-1, inside region-1
		addRect(doc, 600, 130); // rect-2
		// Against the region's top and bottom and across its right side's middle,
		// leaving its left side.
		addRect(doc, -50, -20, 500, 20);
		addRect(doc, -50, 300, 500, 20);
		addRect(doc, 400, 110, 20, 80);
		connect(doc, "rect-2", "region-1");

		const result = routingDocOps.routeConnectors(doc, undefined);

		expect(result).toEqual({
			connectorIds: ["connector-1"],
			keptConnectorIdsByReason: {},
			restackedConnectorIds: [],
		});
		expect(readObject(doc, "connector-1").target).toEqual({
			owner: { id: "region-1" },
			anchor: { kind: "edge", side: "left", t: 0.5 },
		});
		const path = pathOf(doc, "connector-1");
		expect(entersRect(path, boxOf(doc, "region-1"))).toBe(false);
		expect(entersRect(path, boxOf(doc, "rect-1"))).toBe(false);
		expectValid(doc);
	});

	it("routes a connector between two container shapes side by side", () => {
		const doc = emptyDoc();
		routingDocOps.addObject(doc, "region", { x: 0, y: 0 });
		routingDocOps.addObject(doc, "region", { x: 600, y: 0 });
		connect(doc, "region-1", "region-2");

		const result = routingDocOps.routeConnectors(doc, undefined);

		expect(result.connectorIds).toEqual(["connector-1"]);
		expect(readObject(doc, "connector-1")).toMatchObject({
			source: {
				owner: { id: "region-1" },
				anchor: { kind: "edge", side: "right", t: 0.5 },
			},
			target: {
				owner: { id: "region-2" },
				anchor: { kind: "edge", side: "left", t: 0.5 },
			},
			points: [],
		});
	});

	it("keeps a connector between it and a shape or container shape inside it as a container end", () => {
		const doc = emptyDoc();
		routingDocOps.addObject(doc, "region", { x: 0, y: 0 });
		routingDocOps.addObject(doc, "region", {
			x: 50,
			y: 50,
			width: 200,
			height: 200,
		});
		addRect(doc, 300, 100);
		connect(doc, "rect-1", "region-1");
		connect(doc, "region-1", "region-2");
		const keptBefore = [1, 2].map((index) =>
			structuredClone(readObject(doc, `connector-${index}`)),
		);

		const result = routingDocOps.routeConnectors(doc, undefined);

		expect(result.connectorIds).toEqual([]);
		expect(result.keptConnectorIdsByReason).toEqual({
			containerEnd: ["connector-1", "connector-2"],
		});
		expect(
			[1, 2].map((index) => readObject(doc, `connector-${index}`)),
		).toEqual(keptBefore);
	});

	it.each([{ rotation: 90 }, { flipX: true }])(
		"keeps a connector to a turned container shape (%o) as a transformed end",
		(transform) => {
			const doc = emptyDoc();
			routingDocOps.addObject(doc, "region", { x: 0, y: 0 });
			addRect(doc, 600, 130);
			connect(doc, "rect-1", "region-1");
			Object.assign(readObject(doc, "region-1"), transform);

			expect(
				routingDocOps.routeConnectors(doc, undefined).keptConnectorIdsByReason,
			).toEqual({ transformedEnd: ["connector-1"] });
		},
	);

	it("ends two connectors on a titled container's top side on different spots", () => {
		const doc = emptyDoc();
		routingDocOps.addObject(doc, "region", {
			x: 0,
			y: 0,
			extraProps: { headerHeight: 40 },
		});
		// Against the region's other three sides, so both lines come in at its top,
		// from far off either way.
		addRect(doc, -40, 0, 40, 340);
		addRect(doc, 400, 0, 40, 340);
		addRect(doc, -40, 300, 480, 40);
		addRect(doc, -300, -300); // rect-4
		addRect(doc, 640, -300); // rect-5
		connect(doc, "rect-4", "region-1");
		connect(doc, "rect-5", "region-1");

		routingDocOps.routeConnectors(doc, undefined);

		// 10px either side of the top side's centre, x 200.
		expect(
			["connector-1", "connector-2"].map(
				(id) => readConnector(doc, id).target.anchor,
			),
		).toEqual([
			{ kind: "edge", side: "top", t: 0.475 },
			{ kind: "edge", side: "top", t: 0.525 },
		]);
	});
});

/** The 100 by 100 column card's four columns, each at a fifth of its height further down. */
const columnRowT = (columnIndex: number): number => 0.2 + 0.2 * columnIndex;

/**
 * Edge anchors for every point {@link columnCardDefinition} declares, left and right
 * of each column's row, grouped by column unless `groupOf` says otherwise.
 *
 * @param groupOf - The group a point is given; returning undefined leaves it out of every group
 */
const listColumnCardEdgeAnchors = (
	doc: { columns?: unknown },
	groupOf: (
		columnIndex: number,
		side: "left" | "right",
	) => string | undefined = (columnIndex) => `col:${columnIndex}`,
): ObjectDocConnectPointEdgeAnchor[] =>
	Array.from({ length: doc.columns as number }, (_, columnIndex) =>
		(["left", "right"] as const).map((side) => {
			const alternateGroup = groupOf(columnIndex, side);
			return {
				id: `col:${columnIndex}:${side}`,
				side,
				t: columnRowT(columnIndex),
				...(alternateGroup !== undefined ? { alternateGroup } : {}),
			};
		}),
	).flat();

/** Doc ops whose `column-card` answers `edgeAnchors` for its declared connect points. */
const createColumnCardDocOps = (
	edgeAnchors: ObjectDocDefinition["extraConnectPointEdgeAnchors"],
) =>
	createDocOps({
		plugins: [
			{
				id: "column-card-plugin",
				objects: {
					"column-card": {
						...columnCardDefinition,
						extraConnectPointEdgeAnchors: edgeAnchors,
					},
				},
			},
		],
	});

const anchoredCardDocOps = createColumnCardDocOps((doc) =>
	listColumnCardEdgeAnchors(doc as { columns?: unknown }),
);

/** Where an edge position on a shape's box lies in world coordinates. */
const pointOnBox = (box: Rect, side: EdgeAnchorSide, t: number): Point => {
	switch (side) {
		case "top":
			return { x: box.x + box.width * t, y: box.y };
		case "bottom":
			return { x: box.x + box.width * t, y: box.y + box.height };
		case "left":
			return { x: box.x, y: box.y + box.height * t };
		default:
			return { x: box.x + box.width, y: box.y + box.height * t };
	}
};

type ConnectPointEnd = { owner: { id: string }; anchor: { id: string } };

/**
 * A 100 by 100 column card at the origin (`column-card-1`) and a 60 by 40 rect
 * (`rect-1`) at the place given, joined from the card's `sourcePointId` to the rect.
 */
const connectCardToRect = (
	docOps: ReturnType<typeof createDocOps>,
	sourcePointId: string,
	rectAt: Point,
): CanvasDoc => {
	const doc = emptyDoc();
	docOps.addObject(doc, "column-card", { x: 0, y: 0 });
	docOps.addObject(doc, "rect", { ...rectAt, width: 60, height: 40 });
	docOps.connect(doc, {
		sourceId: "column-card-1",
		targetId: "rect-1",
		sourceAnchor: sourcePointId,
	});
	return doc;
};

const CARD_BOX: Rect = { x: 0, y: 0, width: 100, height: 100 };

describe("routeConnectors from a declared connect point", () => {
	it("routes an end on a point the type places on a side from that point, writing it back by id", () => {
		const doc = connectCardToRect(anchoredCardDocOps, "col:1:right", {
			x: 300,
			y: 200,
		});

		const result = anchoredCardDocOps.routeConnectors(doc, undefined);

		expect(result.connectorIds).toEqual(["connector-1"]);
		expect(result.keptConnectorIdsByReason).toEqual({});
		const connector = readObject(doc, "connector-1") as {
			source: ConnectPointEnd;
			points: Point[];
		};
		expect(connector.source).toEqual({
			owner: { id: "column-card-1" },
			anchor: { kind: "connectPoint", id: "col:1:right" },
		});
		// Leaving the right side at the row's height, the route first runs level with it.
		const start = pointOnBox(CARD_BOX, "right", columnRowT(1));
		expect(connector.points[0].y).toBe(start.y);
		expect(connector.points[0].x).toBeGreaterThan(start.x);
		expectValid(doc);
	});

	it("moves an end to the other point of its group when the other shape lies on the far side", () => {
		const doc = connectCardToRect(anchoredCardDocOps, "col:1:left", {
			x: 300,
			y: 200,
		});

		anchoredCardDocOps.routeConnectors(doc, undefined);

		expect(
			(readObject(doc, "connector-1").source as ConnectPointEnd).anchor,
		).toEqual({ kind: "connectPoint", id: "col:1:right" });
	});

	it.each([
		["no group", () => undefined],
		[
			"a group of its own",
			(columnIndex: number, side: "left" | "right") =>
				`col:${columnIndex}:${side}`,
		],
	] as const)("never moves an end to a point that shares %s", (_, groupOf) => {
		const docOps = createColumnCardDocOps((doc) =>
			listColumnCardEdgeAnchors(doc as { columns?: unknown }, groupOf),
		);
		const doc = connectCardToRect(docOps, "col:1:left", { x: 300, y: 200 });

		const result = docOps.routeConnectors(doc, undefined);

		expect(result.connectorIds).toEqual(["connector-1"]);
		const connector = readObject(doc, "connector-1") as {
			source: ConnectPointEnd;
			points: Point[];
		};
		expect(connector.source.anchor).toEqual({
			kind: "connectPoint",
			id: "col:1:left",
		});
		const path = [
			pointOnBox(CARD_BOX, "left", columnRowT(1)),
			...connector.points,
		];
		expect(entersRect(path, CARD_BOX)).toBe(false);
	});

	it.each([
		["the type declares no edge anchors", routingDocOps],
		[
			"the type's answer leaves that point out",
			createColumnCardDocOps((doc) =>
				listColumnCardEdgeAnchors(doc as { columns?: unknown }).filter(
					({ id }) => !id.startsWith("col:1:"),
				),
			),
		],
	] as const)(
		"keeps an end on a declared connect point as it was when %s",
		(_, docOps) => {
			const doc = connectCardToRect(docOps, "col:1:right", { x: 300, y: 200 });
			const before = structuredClone(readObject(doc, "connector-1"));

			const result = docOps.routeConnectors(doc, undefined);

			expect(result.connectorIds).toEqual([]);
			expect(result.keptConnectorIdsByReason).toEqual({
				declaredConnectPoint: ["connector-1"],
			});
			expect(readObject(doc, "connector-1")).toEqual(before);
		},
	);

	it.each([{ flipX: true }, { rotation: 90 }])(
		"keeps an end on a turned owner's connect point as a transformed end (%o)",
		(transform) => {
			const doc = connectCardToRect(anchoredCardDocOps, "col:1:right", {
				x: 300,
				y: 200,
			});
			Object.assign(readObject(doc, "column-card-1"), transform);
			const before = structuredClone(readObject(doc, "connector-1"));

			const result = anchoredCardDocOps.routeConnectors(doc, undefined);

			expect(result.keptConnectorIdsByReason).toEqual({
				transformedEnd: ["connector-1"],
			});
			expect(readObject(doc, "connector-1")).toEqual(before);
		},
	);

	it("changes nothing when run a second time", () => {
		const doc = connectCardToRect(anchoredCardDocOps, "col:1:left", {
			x: 300,
			y: 200,
		});
		anchoredCardDocOps.routeConnectors(doc, undefined);
		const routed = structuredClone(doc);

		const again = anchoredCardDocOps.routeConnectors(doc, undefined);

		expect(again.connectorIds).toEqual(["connector-1"]);
		expect(doc).toEqual(routed);
	});

	it("runs two connectors to one point from shapes on the same side along one last stretch", () => {
		const doc = emptyDoc();
		anchoredCardDocOps.addObject(doc, "column-card", { x: 400, y: 0 });
		anchoredCardDocOps.addObject(doc, "rect", {
			x: 0,
			y: -200,
			width: 60,
			height: 40,
		});
		anchoredCardDocOps.addObject(doc, "rect", {
			x: 0,
			y: 260,
			width: 60,
			height: 40,
		});
		for (const sourceId of ["rect-1", "rect-2"]) {
			anchoredCardDocOps.connect(doc, {
				sourceId,
				targetId: "column-card-1",
				targetAnchor: "col:1:left",
			});
		}

		anchoredCardDocOps.routeConnectors(doc, undefined);

		const end = pointOnBox(
			{ x: 400, y: 0, width: 100, height: 100 },
			"left",
			columnRowT(1),
		);
		const lastCorners = ["connector-1", "connector-2"].map((id) => {
			const connector = readObject(doc, id) as {
				target: ConnectPointEnd;
				points: Point[];
			};
			expect(connector.target.anchor.id).toBe("col:1:left");
			return connector.points[connector.points.length - 1];
		});
		// Both come in level with the point, joining one run before the stub begins.
		for (const corner of lastCorners) {
			expect(corner.y).toBe(end.y);
		}
		const sharedRun = end.x - Math.max(...lastCorners.map(({ x }) => x));
		expect(sharedRun).toBeGreaterThan(EDGE_ROUTE_MARGIN);
	});
});
