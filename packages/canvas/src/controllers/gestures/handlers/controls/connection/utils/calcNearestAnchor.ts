import {
	calcEuclideanDistance,
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	isTransformedFrame,
	roundToDecimal,
	type Point,
	type Rect,
	type TransformedFrame,
} from "@jiscribe/geometry";

import { PRECISION } from "../../../../../../constants/precision";
import {
	calcConnectPoint,
	calcEdgeAnchorFromPoint,
	calcEdgeAnchorPoint,
	calcExtraConnectPoint,
} from "../../../../../../domain/state/connector/endpoints/calcConnectPoint";
import type { ExtraConnectPoint } from "../../../../../../domain/state/registry/ObjectExtraConnectPointsRegistry";
import {
	ConnectPointIds,
	type CenterAnchorSpec,
	type ConnectPointAnchorSpec,
	type EdgeAnchorSpec,
} from "../../../../../../schemas/objects/types/EndpointRef";

/**
 * How near the cursor has to be to a named anchor — the center, an edge midpoint
 * or a point the shape's type declares — for the drop to snap onto it, in screen
 * px. Comfortably wider than the dots drawn for them
 * (`handleDimensions.anchorRadius` = 4) so the whole dot is grabbable, and well
 * inside the distance the source handles sit off the shape
 * (`connectionAnchorOffset` = 20) so the named anchors do not swallow the free
 * positions next to them.
 */
export const NAMED_ANCHOR_SNAP_PX = 12;

/**
 * How far inside the shape the cursor has to land, in screen px, for the drop to
 * read as "somewhere in the middle of this shape" and resolve to the center
 * rather than to a position on an edge. This is what keeps the long-standing
 * "grab the middle of a shape and connect" gesture working now that the rest of
 * the interior would otherwise project onto an edge.
 */
export const CENTER_ANCHOR_DEPTH_PX = 32;

/**
 * How much nearer, in screen px, a built-in anchor has to be than a declared one
 * before it takes the pick from it.
 */
const DECLARED_ANCHOR_TIE_TOLERANCE_PX = 1;

/**
 * The gap, as a ratio of the edge, a self-loop's free end keeps from the edge
 * anchor its fixed end already occupies.
 */
const SELF_LOOP_EDGE_MIN_GAP_RATIO = 0.05;

/**
 * Specifies anchors to exclude from the candidate set. Used to avoid a
 * self-loop connecting to "the same anchor as the fixed side" or degenerating
 * into a center-to-center pair.
 */
export type AnchorExclusion = {
	/** Exclude center from the candidates. */
	center?: boolean;
	/** Exclude this connectPoint from the candidates; an extra point's id counts too. */
	connectPointId?: string;
	/**
	 * Keep the result off this edge position. A continuum has no candidate to
	 * drop, so the ratio is pushed clear of it instead (see
	 * SELF_LOOP_EDGE_MIN_GAP_RATIO).
	 */
	edge?: EdgeAnchorSpec;
};

/**
 * The hovered shape's geometry, and the zoom the px-denominated snap distances
 * are measured against. Every field is optional so a caller with no registries
 * still gets the bounding-box behavior.
 */
export type AnchorSnapContext = {
	/** The shape's local outline polygon (from ObjectOutlineRegistry). */
	outline?: readonly Point[] | null;
	/** The shape's local anchor region (from ObjectAnchorRegionRegistry). */
	anchorRegion?: Rect | null;
	/** The anchors the shape's type declares (from ObjectExtraConnectPointsRegistry). */
	extraConnectPoints?: readonly ExtraConnectPoint[] | null;
	/** Viewport zoom; omitted or non-positive reads as 1. */
	zoom?: number;
};

/** A named anchor the cursor could snap onto, with what it takes to beat it. */
type NamedAnchorCandidate = {
	spec: CenterAnchorSpec | ConnectPointAnchorSpec;
	/**
	 * Lower wins a near-tie. A point the shape's type declares (0) outranks a
	 * built-in center or edge midpoint (1).
	 */
	priority: number;
	distance: number;
};

/**
 * Whether `candidate` should take the pick from `best`.
 *
 * Within one priority class the nearer wins outright. Across classes a declared
 * point keeps — or takes — the pick unless a built-in is nearer by more than
 * `tolerance`: a shape may declare a point that lands exactly on top of an edge
 * midpoint (the brace's `tip` at tipPosition 0.5), and there the specific anchor
 * is the one the author meant, not the generic one every shape has.
 */
const isBetterNamedAnchor = (
	candidate: NamedAnchorCandidate,
	best: NamedAnchorCandidate,
	tolerance: number,
): boolean => {
	if (candidate.priority === best.priority) {
		return candidate.distance < best.distance;
	}
	return candidate.priority < best.priority
		? candidate.distance <= best.distance + tolerance
		: candidate.distance < best.distance - tolerance;
};

/**
 * The named anchor nearest the cursor, resolved through the same functions that
 * draw the dots so the judged point and the drawn point cannot drift apart.
 * Returns null when the exclusion empties the candidates.
 */
const calcNearestNamedAnchor = (
	frame: TransformedFrame,
	cursorX: number,
	cursorY: number,
	exclude: AnchorExclusion | undefined,
	context: AnchorSnapContext,
	tolerance: number,
): NamedAnchorCandidate | null => {
	const candidates: NamedAnchorCandidate[] = [];

	if (!exclude?.center) {
		candidates.push({
			spec: { kind: "center" },
			priority: 1,
			distance: calcEuclideanDistance(cursorX, cursorY, frame.cx, frame.cy),
		});
	}

	for (const connectPointId of ConnectPointIds) {
		if (connectPointId === exclude?.connectPointId) {
			continue;
		}
		const point = calcConnectPoint(
			frame,
			connectPointId,
			context.outline,
			context.anchorRegion,
		);
		candidates.push({
			spec: { kind: "connectPoint", id: connectPointId },
			priority: 1,
			distance: calcEuclideanDistance(cursorX, cursorY, point.x, point.y),
		});
	}

	for (const extraConnectPoint of context.extraConnectPoints ?? []) {
		if (extraConnectPoint.id === exclude?.connectPointId) {
			continue;
		}
		const point = calcExtraConnectPoint(frame, extraConnectPoint);
		candidates.push({
			spec: { kind: "connectPoint", id: extraConnectPoint.id },
			priority: 0,
			distance: calcEuclideanDistance(cursorX, cursorY, point.x, point.y),
		});
	}

	if (candidates.length === 0) {
		return null;
	}

	let best = candidates[0];
	for (const candidate of candidates) {
		if (isBetterNamedAnchor(candidate, best, tolerance)) {
			best = candidate;
		}
	}
	return best;
};

/**
 * Pushes an edge anchor clear of the one the self-loop's fixed end sits on, so
 * the two ends never collapse onto the same point. The ratio moves to whichever
 * end of the forbidden band it was already heading for; a push that would run
 * past the edge turns around.
 */
const applyEdgeExclusion = (
	anchor: EdgeAnchorSpec,
	excluded: EdgeAnchorSpec | undefined,
): EdgeAnchorSpec => {
	if (!excluded || excluded.side !== anchor.side) {
		return anchor;
	}
	const offset = anchor.t - excluded.t;
	if (Math.abs(offset) >= SELF_LOOP_EDGE_MIN_GAP_RATIO) {
		return anchor;
	}
	const forward = offset >= 0 ? 1 : -1;
	const pushed = excluded.t + forward * SELF_LOOP_EDGE_MIN_GAP_RATIO;
	const t =
		pushed >= 0 && pushed <= 1
			? pushed
			: excluded.t - forward * SELF_LOOP_EDGE_MIN_GAP_RATIO;
	return {
		...anchor,
		t: roundToDecimal(Math.min(1, Math.max(0, t)), PRECISION.COORDINATE),
	};
};

/** Whether the cursor lies within the shape's own bounding box. */
const isCursorInsideFrame = (
	frame: TransformedFrame,
	cursor: Point,
): boolean => {
	const local = calcInverseAffineTransformedPoint(
		cursor.x,
		cursor.y,
		frame.scaleX,
		frame.scaleY,
		degreesToRadians(frame.rotation),
		frame.cx,
		frame.cy,
	);
	return (
		Math.abs(local.x) <= frame.width / 2 &&
		Math.abs(local.y) <= frame.height / 2
	);
};

/**
 * Returns the anchor a connection dropped at the cursor should attach to.
 *
 * Three rules, applied in order:
 * 1. **A named anchor**, when the cursor is within NAMED_ANCHOR_SNAP_PX of one —
 *    the center, one of the four edge midpoints, or a point the shape's type
 *    declares. Every candidate is resolved through calcConnectPoint /
 *    calcExtraConnectPoint, so a shape whose outline or anchor region moves its
 *    dots is judged where those dots actually are.
 * 2. **The center**, when the cursor is deeper than CENTER_ANCHOR_DEPTH_PX
 *    inside the shape — grabbing the middle still means "connect to this shape"
 *    rather than to a spot on its edge.
 * 3. **A free position on an edge** otherwise: the cursor rounded to the nearest
 *    side of the anchor region and its ratio along it ({@link EdgeAnchorSpec}).
 *
 * Objects without a frame have no anchors to choose between and return center.
 *
 * @param obj - The shape being connected to; anything but a frame yields center
 * @param cursorX - Cursor position in world coordinates
 * @param cursorY - Cursor position in world coordinates
 * @param exclude - Anchors to keep the result off, used on a self-loop so the two
 *   ends cannot coincide; omitted = every anchor is offered
 * @param context - The shape's outline / anchor region / declared points, plus the
 *   zoom the px thresholds above are divided by; omitted = bounding-box geometry
 *   at zoom 1
 * @returns The winning anchor spec, ready to store on an endpoint
 */
export function calcNearestAnchor(
	obj: { cx?: number; cy?: number; [key: string]: unknown },
	cursorX: number,
	cursorY: number,
	exclude?: AnchorExclusion,
	context?: AnchorSnapContext,
): CenterAnchorSpec | ConnectPointAnchorSpec | EdgeAnchorSpec {
	if (!isTransformedFrame(obj)) {
		return { kind: "center" };
	}

	const snapContext = context ?? {};
	const zoom =
		snapContext.zoom !== undefined && snapContext.zoom > 0
			? snapContext.zoom
			: 1;

	const nearestNamed = calcNearestNamedAnchor(
		obj,
		cursorX,
		cursorY,
		exclude,
		snapContext,
		DECLARED_ANCHOR_TIE_TOLERANCE_PX / zoom,
	);
	if (nearestNamed && nearestNamed.distance <= NAMED_ANCHOR_SNAP_PX / zoom) {
		return nearestNamed.spec;
	}

	const cursor = { x: cursorX, y: cursorY };
	const edgeAnchor = calcEdgeAnchorFromPoint(
		obj,
		cursor,
		snapContext.anchorRegion,
	);

	// The depth is measured against where this very anchor would land, so a shape
	// with an outline is judged by its drawn edge and not by its bounding box.
	// Skipped when center is excluded (a self-loop), which is exactly the case
	// where the interior has to resolve to an edge position instead.
	if (!exclude?.center && isCursorInsideFrame(obj, cursor)) {
		const landing = calcEdgeAnchorPoint(
			obj,
			edgeAnchor,
			snapContext.outline,
			snapContext.anchorRegion,
		);
		const depth = calcEuclideanDistance(cursorX, cursorY, landing.x, landing.y);
		if (depth > CENTER_ANCHOR_DEPTH_PX / zoom) {
			return { kind: "center" };
		}
	}

	return applyEdgeExclusion(edgeAnchor, exclude?.edge);
}
