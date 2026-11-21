import type { Point, Rect, TransformedFrame } from "@jiscribe/geometry";

import type { ExtraConnectPoint } from "./ExtraConnectPoint";
import type { ObjectFeatures } from "../types/ObjectFeatures";

/**
 * The shape a connector end is attached to, as far as resolving the end reads
 * it: its frame, whose fields are checked at run time (`isTransformedFrame` /
 * `isCenterPoint`) since an owner may be something other than a frame, and its
 * features descriptor, of which only `geometry` is read — to pick the outline
 * its box implies when no outline polygon is given. A canvas state and a frame
 * built from a doc both satisfy it.
 */
export type EndpointOwner = Partial<TransformedFrame> & {
	/** The owner type's declaration; only `geometry` is read, and absent reads as a rectangle. */
	features?: Pick<ObjectFeatures, "geometry">;
};

/**
 * One connector end's owner together with what its type declares about where
 * an end lands on it, every part a value already read off the type.
 */
export type EndpointOwnerShape = {
	/** The owner; null or undefined for a free end or a missing owner. */
	owner: EndpointOwner | null | undefined;
	/**
	 * The owner's outline polygon in local, centered, untransformed coordinates
	 * (the type's `outline`); omitted = the outline its geometry implies.
	 */
	outline?: readonly Point[] | null;
	/**
	 * The band the owner's edge anchors are centered on, in the same local space
	 * (the type's `anchorRegion`); omitted = the full bounding box.
	 */
	anchorRegion?: Rect | null;
	/**
	 * The connect points the owner's type declares beyond the built-in four, in
	 * local coordinates; omitted = an end naming one of them falls back to the
	 * owner's center.
	 */
	extraConnectPoints?: readonly ExtraConnectPoint[] | null;
};
