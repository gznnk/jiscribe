import type { Rect } from "@jiscribe/geometry";
import type { LayoutGraphNode } from "@jiscribe/layout";

import type { ObjectRecord } from "./objectAccess";
import type { DocDefinitions } from "./objectGeometry";
import { isTransformed } from "./transformFields";
import {
	type EdgeAnchorOutlineShape,
	calcEdgeAnchorOutlineRanges,
} from "../../model/objects/connector/calcEdgeAnchorOutlineRange";
import { calcAnchorRegionBodyRanges } from "../../model/objects/connector/convertEdgeAnchorRatio";

/**
 * The object's outline and anchor region as its type declares them, called on the box
 * the layout measures it by: the doc may leave `height` out, which the box fills in
 * from the text (see readObjectHeight).
 *
 * @param bounds - The object's box as requireObjectBounds answers it
 */
export const resolveLayoutAnchorShape = (
	object: ObjectRecord,
	bounds: Rect,
	definitions: DocDefinitions,
): EdgeAnchorOutlineShape => {
	const definition = definitions.get(object.type);
	const box = { ...object, width: bounds.width, height: bounds.height };
	return {
		width: bounds.width,
		height: bounds.height,
		geometry: definition?.features.geometry,
		outline: definition?.outline?.(box),
		anchorRegion: definition?.anchorRegion?.(box),
	};
};

/**
 * The stretch of each side the layout may end an edge on, or undefined for an object
 * whose outline and anchor region take nothing off its box, or which the doc rotates or
 * flips (isTransformed): the layout places that by its untransformed box, so where its
 * outline falls along a side is no concern of it.
 */
export const readLayoutAnchorRanges = (
	object: ObjectRecord,
	shape: EdgeAnchorOutlineShape,
): LayoutGraphNode["anchorRanges"] =>
	isTransformed(object) ||
	(shape.outline === undefined && shape.anchorRegion === undefined)
		? undefined
		: calcEdgeAnchorOutlineRanges(shape);

/**
 * The stretch of each side the object's anchor region covers, which the layout centres
 * and fans ends out on, or undefined for an object whose type declares no anchor
 * region: exactly the objects whose ends are stored as ratios of the region (see
 * toAnchorRegionSidePosition), rotated or flipped ones included.
 */
export const readLayoutAnchorBodyRanges = (
	shape: EdgeAnchorOutlineShape,
): LayoutGraphNode["anchorBodyRanges"] =>
	shape.anchorRegion === undefined
		? undefined
		: calcAnchorRegionBodyRanges(shape);
