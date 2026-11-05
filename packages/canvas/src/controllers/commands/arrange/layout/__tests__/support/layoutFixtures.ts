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

export const layoutRegistries = createCanvasRegistries({
	plugins: [regionPlugin],
});

export const layoutDocOps = createDocOps({ plugins: [regionPlugin] });

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
