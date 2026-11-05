import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { createFrameObjectFactory } from "@jiscribe/doc/model/objects/utils/createFrameObjectFactory";
import { createDocOps } from "@jiscribe/doc/ops";
import type { TransformedFrame } from "@jiscribe/geometry";

import type { CanvasPlugin } from "../../../../../../plugin/CanvasPlugin";
import { defineObject } from "../../../../../../plugin/ObjectTypeDefinition";
import { createFrameMapper } from "../../../../../../states/objects/base/FrameMapper";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { createFrameBehavior } from "../../../../../behaviors/base/FrameController";
import { createCanvasRegistries } from "../../../../../registries/createCanvasRegistries";

type RegionState = ObjectState & TransformedFrame;

const regionFeatures = {
	type: "region",
	geometry: "rect",
	transform: true,
	connectable: true,
} as const;

/** Height of the title band every region keeps clear along its top edge. */
export const REGION_TITLE_HEIGHT = 24;

/**
 * A rect-based container type (a VPC, a subsystem boundary), registered on both the
 * canvas and the doc side so the two layouts can be compared on it.
 */
export const regionPlugin: CanvasPlugin = {
	id: "region-plugin",
	objects: {
		region: defineObject({
			features: regionFeatures,
			validateDoc: () => [],
			container: () => ({ titleHeight: REGION_TITLE_HEIGHT }),
			factory: createFrameObjectFactory({
				type: "region",
				width: 400,
				height: 300,
			}),
			mapper: createFrameMapper<ObjectDoc, RegionState>(regionFeatures),
			stateValidator: () => true,
			component: () => null,
			behavior: createFrameBehavior<RegionState>(),
		}),
	},
};

const portedFeatures = {
	type: "ported",
	geometry: "rect",
	transform: true,
	connectable: true,
} as const;

const ovalRegionFeatures = {
	type: "oval-region",
	geometry: "ellipse",
	transform: true,
	connectable: true,
} as const;

/**
 * Two more test types: `ported`, a rect declaring one connect point of its own
 * (`east`, the middle of its right edge, the way an ER entity declares its
 * columns), and `oval-region`, a container whose geometry is an ellipse's, which the
 * layout moves whole instead of resizing.
 */
export const portedPlugin: CanvasPlugin = {
	id: "ported-plugin",
	objects: {
		ported: defineObject({
			features: portedFeatures,
			validateDoc: () => [],
			extraConnectPointIds: () => ["east"],
			extraConnectPoints: ({ width }) => [
				{
					id: "east",
					point: { x: width / 2, y: 0 },
					direction: { x: 1, y: 0 },
				},
			],
			factory: createFrameObjectFactory({
				type: "ported",
				width: 100,
				height: 100,
			}),
			mapper: createFrameMapper<ObjectDoc, RegionState>(portedFeatures),
			stateValidator: () => true,
			component: () => null,
			behavior: createFrameBehavior<RegionState>(),
		}),
		"oval-region": defineObject({
			features: ovalRegionFeatures,
			validateDoc: () => [],
			container: () => ({ titleHeight: 0 }),
			mapper: createFrameMapper<ObjectDoc, RegionState>(ovalRegionFeatures),
			stateValidator: () => true,
			component: () => null,
			behavior: createFrameBehavior<RegionState>(),
		}),
	},
};

const slantedFeatures = {
	type: "slanted",
	geometry: "rect",
	transform: true,
	connectable: true,
} as const;

const cutTopFeatures = {
	type: "cut-top",
	geometry: "rect",
	transform: true,
	connectable: true,
} as const;

/**
 * Two types whose outline is not their box: `slanted`, a parallelogram whose top edge
 * is shifted right by 22% of the width (its top and bottom reach along 0.11 .. 0.89 of
 * the box's side on the center line), and `cut-top`, with its top corners cut off by a
 * fifth of the shorter side and its edge anchors centered on the body below the cut,
 * the way the flowchart plugin's parallelogram and loop limit are.
 */
export const outlinedPlugin: CanvasPlugin = {
	id: "outlined-plugin",
	objects: {
		slanted: defineObject({
			features: slantedFeatures,
			validateDoc: () => [],
			outline: ({ width, height }) => {
				const skew = width * 0.22;
				return [
					{ x: -width / 2 + skew, y: -height / 2 },
					{ x: width / 2, y: -height / 2 },
					{ x: width / 2 - skew, y: height / 2 },
					{ x: -width / 2, y: height / 2 },
				];
			},
			factory: createFrameObjectFactory({
				type: "slanted",
				width: 160,
				height: 80,
			}),
			mapper: createFrameMapper<ObjectDoc, RegionState>(slantedFeatures),
			stateValidator: () => true,
			component: () => null,
			behavior: createFrameBehavior<RegionState>(),
		}),
		"cut-top": defineObject({
			features: cutTopFeatures,
			validateDoc: () => [],
			outline: ({ width, height }) => {
				const cut = Math.min(width, height) * 0.2;
				return [
					{ x: -width / 2 + cut, y: -height / 2 },
					{ x: width / 2 - cut, y: -height / 2 },
					{ x: width / 2, y: -height / 2 + cut },
					{ x: width / 2, y: height / 2 },
					{ x: -width / 2, y: height / 2 },
					{ x: -width / 2, y: -height / 2 + cut },
				];
			},
			anchorRegion: ({ width, height }) => {
				const cut = Math.min(width, height) * 0.2;
				return {
					x: -width / 2,
					y: -height / 2 + cut,
					width,
					height: height - cut,
				};
			},
			factory: createFrameObjectFactory({
				type: "cut-top",
				width: 160,
				height: 100,
			}),
			mapper: createFrameMapper<ObjectDoc, RegionState>(cutTopFeatures),
			stateValidator: () => true,
			component: () => null,
			behavior: createFrameBehavior<RegionState>(),
		}),
	},
};

export const layoutRegistries = createCanvasRegistries({
	plugins: [regionPlugin, portedPlugin, outlinedPlugin],
});

export const layoutDocOps = createDocOps({
	plugins: [regionPlugin, portedPlugin, outlinedPlugin],
});

const emptyDoc = (): CanvasDoc => ({ version: 1, root: [] });

/**
 * Three rects scattered out of order and joined rect-1 → rect-2 → rect-3, the
 * second connector carrying a label, plus rect-4 and rect-5 with no line between
 * them (a part without an edge).
 */
export const buildChainDoc = (): CanvasDoc => {
	const doc = emptyDoc();
	layoutDocOps.addObject(doc, "rect", {
		x: 500,
		y: 300,
		width: 160,
		height: 80,
	});
	layoutDocOps.addObject(doc, "rect", { x: 40, y: 20, width: 160, height: 80 });
	layoutDocOps.addObject(doc, "rect", {
		x: 300,
		y: 500,
		width: 160,
		height: 80,
	});
	layoutDocOps.addObject(doc, "rect", {
		x: 900,
		y: 40,
		width: 100,
		height: 60,
	});
	layoutDocOps.addObject(doc, "rect", {
		x: 1100,
		y: 400,
		width: 100,
		height: 60,
	});
	layoutDocOps.connect(doc, {
		sourceId: "rect-1",
		targetId: "rect-2",
		sourceAnchor: "leftCenter",
		targetAnchor: "rightCenter",
		points: [{ x: 1, y: 1 }],
	});
	layoutDocOps.connect(doc, {
		sourceId: "rect-2",
		targetId: "rect-3",
		label: "yes",
	});
	return doc;
};

/**
 * A rect fanning out to two ellipses and a rect, one ellipse of odd size (its
 * drawn ends land on half pixels, which the reducer's vertex pass then writes into
 * the corners), plus a 3-corner polygon with no line (a polygon is not
 * connectable), so nodes of every geometry are moved.
 */
export const buildMixedDoc = (): CanvasDoc => {
	const doc = emptyDoc();
	layoutDocOps.addObject(doc, "rect", { x: 0, y: 0, width: 160, height: 80 });
	layoutDocOps.addObject(doc, "ellipse", {
		x: 400,
		y: 300,
		width: 91,
		height: 57,
	});
	layoutDocOps.addObject(doc, "ellipse", {
		x: 100,
		y: 500,
		width: 90,
		height: 50,
	});
	layoutDocOps.addObject(doc, "rect", {
		x: 700,
		y: 300,
		width: 90,
		height: 50,
	});
	// x / y are ignored once the vertices are given.
	layoutDocOps.addObject(doc, "polygon", {
		x: 0,
		y: 0,
		points: [
			{ x: 900, y: 20 },
			{ x: 980, y: 20 },
			{ x: 940, y: 95 },
		],
	});
	layoutDocOps.connect(doc, { sourceId: "rect-1", targetId: "ellipse-1" });
	layoutDocOps.connect(doc, { sourceId: "rect-1", targetId: "ellipse-2" });
	layoutDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
	layoutDocOps.connect(doc, { sourceId: "ellipse-1", targetId: "rect-2" });
	return doc;
};

/**
 * A region holding rect-1 and rect-2 (joined), with rect-3 outside it joined to the
 * region itself: the line to the region is no edge, and is redrawn afterwards. The
 * contents are of odd height, so the region is resized to an odd height.
 */
export const buildRegionDoc = (): CanvasDoc => {
	const doc = emptyDoc();
	layoutDocOps.addObject(doc, "region", {
		x: 0,
		y: 0,
		width: 600,
		height: 500,
	});
	layoutDocOps.addObject(doc, "rect", {
		x: 380,
		y: 300,
		width: 120,
		height: 60,
	});
	layoutDocOps.addObject(doc, "rect", { x: 40, y: 60, width: 120, height: 61 });
	layoutDocOps.addObject(doc, "rect", {
		x: 800,
		y: 100,
		width: 120,
		height: 60,
	});
	layoutDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
	layoutDocOps.connect(doc, { sourceId: "region-1", targetId: "rect-3" });
	return doc;
};

/**
 * A `ported` shape whose `east` point leads to rect-1 and is reached from rect-2 (the
 * ends on `east` stay put), rect-1 joined to rect-2, and a self loop on rect-2
 * (connector-3) carrying corners and a routing of its own.
 */
export const buildKeptEndsDoc = (): CanvasDoc => {
	const doc = emptyDoc();
	layoutDocOps.addObject(doc, "ported", { x: 400, y: 400 });
	layoutDocOps.addObject(doc, "rect", { x: 0, y: 300, width: 120, height: 60 });
	layoutDocOps.addObject(doc, "rect", { x: 600, y: 0, width: 120, height: 60 });
	layoutDocOps.connect(doc, {
		sourceId: "ported-1",
		targetId: "rect-1",
		sourceAnchor: "east",
		points: [{ x: 700, y: 700 }],
	});
	layoutDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
	layoutDocOps.connect(doc, {
		sourceId: "rect-2",
		targetId: "rect-2",
		sourceAnchor: "topCenter",
		targetAnchor: "rightCenter",
		routing: "orthogonal",
		points: [
			{ x: 660, y: -40 },
			{ x: 760, y: -40 },
			{ x: 760, y: 30 },
		],
	});
	layoutDocOps.connect(doc, {
		sourceId: "rect-2",
		targetId: "ported-1",
		targetAnchor: "east",
	});
	return doc;
};

/**
 * An `oval-region` (an ellipse 600 by 500 from the origin) holding rect-1 and rect-2,
 * joined, and rect-3 up and left of it, so arranged together the region moves off
 * the top-left the drawing keeps. Written by hand, as the test type has no factory.
 */
export const buildOvalRegionDoc = (): CanvasDoc => {
	const doc = emptyDoc();
	doc.root.push({
		id: "oval-1",
		type: "oval-region",
		cx: 300,
		cy: 250,
		rx: 300,
		ry: 250,
	} as ObjectDoc);
	layoutDocOps.addObject(doc, "rect", {
		x: 150,
		y: 150,
		width: 80,
		height: 40,
	});
	layoutDocOps.addObject(doc, "rect", {
		x: 330,
		y: 100,
		width: 80,
		height: 40,
	});
	layoutDocOps.addObject(doc, "rect", {
		x: -400,
		y: -400,
		width: 60,
		height: 40,
	});
	layoutDocOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
	return doc;
};

/**
 * A parallelogram feeding a narrow and a wide rect, whose columns fall past where its
 * slanted sides cross the bottom; and, for left to right, a region holding rect-3,
 * which feeds the cut-top shape, with a line from the region itself to it as well, so
 * the redrawn line lands beside an end stored as a ratio of the anchor region.
 */
export const buildOutlinedDoc = (): CanvasDoc => {
	const doc = emptyDoc();
	layoutDocOps.addObject(doc, "slanted", { x: 0, y: 0 });
	layoutDocOps.addObject(doc, "rect", { x: 0, y: 200, width: 60, height: 40 });
	layoutDocOps.addObject(doc, "rect", {
		x: 100,
		y: 200,
		width: 160,
		height: 80,
	});
	layoutDocOps.connect(doc, { sourceId: "slanted-1", targetId: "rect-1" });
	layoutDocOps.connect(doc, { sourceId: "slanted-1", targetId: "rect-2" });
	layoutDocOps.addObject(doc, "region", {
		x: 0,
		y: 600,
		width: 400,
		height: 300,
	});
	layoutDocOps.addObject(doc, "rect", {
		x: 20,
		y: 660,
		width: 100,
		height: 50,
	});
	layoutDocOps.addObject(doc, "cut-top", { x: 600, y: 600 });
	layoutDocOps.connect(doc, { sourceId: "rect-3", targetId: "cut-top-1" });
	layoutDocOps.connect(doc, { sourceId: "region-1", targetId: "cut-top-1" });
	return doc;
};

/**
 * A rect feeding the cut-top shape turned upside down: the layout places it by its
 * box, but still stores its end as a ratio of the anchor region.
 */
export const buildRotatedCutTopDoc = (): CanvasDoc => {
	const doc = emptyDoc();
	layoutDocOps.addObject(doc, "rect", { x: 0, y: 0, width: 160, height: 100 });
	layoutDocOps.addObject(doc, "cut-top", { x: 400, y: 300 });
	layoutDocOps.connect(doc, { sourceId: "rect-1", targetId: "cut-top-1" });
	layoutDocOps.setRotation(doc, ["cut-top-1"], 180);
	return doc;
};

/** {@link buildOutlinedDoc} with the parallelogram turned upside down, which the layout places by its box. */
export const buildRotatedOutlinedDoc = (): CanvasDoc => {
	const doc = buildOutlinedDoc();
	layoutDocOps.setRotation(doc, ["slanted-1"], 180);
	return doc;
};
