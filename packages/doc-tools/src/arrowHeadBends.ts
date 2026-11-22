import type {
	ArrowType,
	ConnectorRouting,
	EndpointRef,
	ObjectDoc,
} from "@jiscribe/doc";
import { extractShapeStyleDefaults } from "@jiscribe/doc";
import {
	calcArrowHeadLength,
	resolveArrowHeadPath,
	resolveConnectorDocPath,
	resolveShapeStyle,
} from "@jiscribe/doc/unstable";
import { calcEuclideanDistance, type Point } from "@jiscribe/geometry";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";

import { offerNodeTextMeasurement } from "./measureWrappedText";

/**
 * Largest sine of the angle between two segments that still reads as one
 * heading: only float noise, so a point the author set a hair off the line
 * still counts as a bend.
 */
const SAME_HEADING_SINE_TOLERANCE = 1e-9;

/** The fields of a line carrying arrowheads that this check reads. */
type ArrowLineDoc = ObjectDoc & {
	points?: Point[];
	startArrow?: ArrowType;
	endArrow?: ArrowType;
	strokeWidth?: number;
	arrowScale?: number;
	source?: EndpointRef;
	target?: EndpointRef;
	routing?: ConnectorRouting;
};

/** Which end of a line an arrowhead sits on, named after the field that sets it. */
export type ArrowHeadEnd = "startArrow" | "endArrow";

/** One arrowhead drawn over the line's bend, as {@link findArrowHeadsOverBends} reports it. */
export type ArrowHeadOverBend = {
	/** The end the head sits on. */
	end: ArrowHeadEnd;
	/** The head's mark. */
	arrow: ArrowType;
	/** Distance from the end to the first point where the line changes heading, in world px, measured on the collapsed path (resolveArrowHeadPath). */
	bendDistance: number;
	/** How far back along the line the head is drawn from the end, in world px (calcArrowHeadLength). */
	headLength: number;
};

/**
 * Whether two segments run the same way: parallel within float noise and
 * pointing alike.
 */
const isSameHeading = (heading: Point, segment: Point): boolean => {
	const segmentLength = Math.hypot(segment.x, segment.y);
	const headingLength = Math.hypot(heading.x, heading.y);
	const cross = heading.x * segment.y - heading.y * segment.x;
	const dot = heading.x * segment.x + heading.y * segment.y;
	return (
		dot > 0 &&
		Math.abs(cross) <=
			SAME_HEADING_SINE_TOLERANCE * headingLength * segmentLength
	);
};

/**
 * Distance from the first point of `points` to the first point after which the
 * line heads another way, or null when it runs straight to its last point.
 *
 * @param points - The collapsed path (resolveArrowHeadPath) starting at the end being looked at, at least two points
 */
const calcBendDistance = (points: readonly Point[]): number | null => {
	const tip = points[0];
	const heading = { x: points[1].x - tip.x, y: points[1].y - tip.y };
	for (let index = 1; index < points.length - 1; index++) {
		const segment = {
			x: points[index + 1].x - points[index].x,
			y: points[index + 1].y - points[index].y,
		};
		if (!isSameHeading(heading, segment)) {
			return calcEuclideanDistance(
				tip.x,
				tip.y,
				points[index].x,
				points[index].y,
			);
		}
	}
	return null;
};

/**
 * The path the arrowheads of a line are aimed along, or null where it cannot be
 * known here.
 *
 * A connector's starts from its drawn path (resolveConnectorDocPath), a
 * polyline's from its stored points; either is then collapsed as the renderer
 * collapses it before aiming a head (resolveArrowHeadPath).
 */
const resolveArrowPath = (
	line: ArrowLineDoc,
	objectsById: ReadonlyMap<string, ObjectDoc>,
): readonly Point[] | null => {
	if (line.type === "polyline") {
		return line.points === undefined ? null : resolveArrowHeadPath(line.points);
	}
	if (
		line.source === undefined ||
		line.target === undefined ||
		line.points === undefined
	) {
		return null;
	}
	const ownerOf = (endpoint: EndpointRef) => {
		const ownerId = endpoint.owner?.id;
		return ownerId === undefined ? undefined : objectsById.get(ownerId);
	};
	const path = resolveConnectorDocPath(
		{
			source: line.source,
			target: line.target,
			routing: line.routing,
			points: line.points,
		},
		ownerOf(line.source),
		ownerOf(line.target),
		standardObjectDocDefinitions,
	);
	return path === null ? null : resolveArrowHeadPath(path);
};

/**
 * The arrowheads of a connector or a polyline that reach past the line's first
 * bend from their end: the head is drawn straight back along the end's segment,
 * so where that segment is shorter than the head, the head covers the corner and
 * points off the line that carries it.
 *
 * Looked at are a connector with stored `points` and a polyline, at each end
 * whose own `startArrow` / `endArrow` names a mark other than `"None"` — a type
 * declares no default arrowhead, the same reading the renderer makes. The head's
 * size is the line's `strokeWidth` and `arrowScale`, over its type's defaults,
 * over the canvas-wide last resort. Passed over: a connector with no stored
 * points (its route is chosen on the canvas), and one whose path cannot be
 * resolved from the document alone — an end on a connect point its owner's type
 * declares, an owner missing or outside the shipped set.
 *
 * @param object - Any doc object; anything but a connector or a polyline answers none
 * @param objectsById - Every object of the document, group children included, to find a connector's owners in
 * @returns One entry per head over its bend, the start end first; empty when every head fits
 */
export const findArrowHeadsOverBends = (
	object: ObjectDoc,
	objectsById: ReadonlyMap<string, ObjectDoc>,
): ArrowHeadOverBend[] => {
	if (object.type !== "connector" && object.type !== "polyline") {
		return [];
	}
	const line = object as ArrowLineDoc;
	const headedEnds = (["startArrow", "endArrow"] as const).flatMap((end) => {
		const arrow = line[end];
		return arrow === undefined || arrow === "None" ? [] : [{ end, arrow }];
	});
	const definition = standardObjectDocDefinitions.get(object.type);
	if (headedEnds.length === 0 || definition === undefined) {
		return [];
	}
	// An owner storing no height is framed at the height its text needs.
	offerNodeTextMeasurement();
	const path = resolveArrowPath(line, objectsById);
	if (path === null) {
		return [];
	}
	const { strokeWidth, arrowScale } = resolveShapeStyle(
		{ strokeWidth: line.strokeWidth, arrowScale: line.arrowScale },
		extractShapeStyleDefaults(definition.features, definition.defaults),
	);
	return headedEnds.flatMap(({ end, arrow }) => {
		const bendDistance = calcBendDistance(
			end === "startArrow" ? path : [...path].reverse(),
		);
		const headLength = calcArrowHeadLength(arrow, strokeWidth, arrowScale);
		return bendDistance !== null && bendDistance < headLength
			? [{ end, arrow, bendDistance, headLength }]
			: [];
	});
};
