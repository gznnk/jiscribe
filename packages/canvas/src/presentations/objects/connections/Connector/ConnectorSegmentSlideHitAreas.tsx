import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { CONNECTOR_HIT_STROKE_WIDTH } from "../../../../constants/connectorHitArea";

// Bands of two perpendicular segments overlap where they meet, so a segment shorter than the band
// width sits entirely inside its neighbours' overlap and cannot be aimed at — a drag there lands on
// whichever band is on top and moves the wrong axis. Below this length a segment gets no band; the
// shape stays adjustable from the neighbours, which are the ones actually under the pointer.
const MIN_SEGMENT_LENGTH = CONNECTOR_HIT_STROKE_WIDTH;

/** A grabbable segment, as a rectangle in world coordinates. */
type SegmentHitArea = {
	segmentIndex: number;
	x: number;
	y: number;
	width: number;
	height: number;
	horizontal: boolean;
};

type ConnectorSegmentSlideHitAreasProps = {
	/** The connector's object ID, used to address the gesture at this connector. */
	id: string;
	/** The drawn path, endpoints included (`[source, ...vertices, target]`). */
	points: readonly Point[];
	/**
	 * Suppresses hit testing, matching the connector's own hit area (export / preview renders).
	 * @default false
	 */
	disablePointerEvents?: boolean;
};

/**
 * Collects a hit rectangle for every axis-aligned segment of the path.
 *
 * The band is as wide as the connector's own hit area, so picking up a segment feels the same as
 * clicking the line. Segments touching an endpoint are included: the endpoint stays pinned to its
 * face and joins the moved segment by a perpendicular instead (see slideConnectorSegment).
 *
 * The floor is the band's own width, not the length of the legs edits leave behind (a perpendicular
 * join, the router's stub): a short leg is a real target, and holding it back left a stretch of
 * line that looked grabbable and answered to nothing.
 *
 * @param points - The drawn path, endpoints included
 * @param thickness - Width of the band across the segment (world units)
 * @param minLength - Shortest segment (world units) that can still be aimed at
 * @returns One entry per grabbable segment, in path order
 */
const collectSegmentHitAreas = (
	points: readonly Point[],
	thickness: number,
	minLength: number,
): SegmentHitArea[] => {
	const areas: SegmentHitArea[] = [];
	for (let i = 0; i <= points.length - 2; i++) {
		const start = points[i];
		const end = points[i + 1];
		// A zero-length segment is neither, and is left out by the same test.
		const horizontal = start.y === end.y && start.x !== end.x;
		const vertical = start.x === end.x && start.y !== end.y;
		if (!horizontal && !vertical) {
			continue;
		}
		const length = horizontal
			? Math.abs(end.x - start.x)
			: Math.abs(end.y - start.y);
		if (length < minLength) {
			continue;
		}
		const from = horizontal
			? Math.min(start.x, end.x)
			: Math.min(start.y, end.y);
		const across = horizontal ? start.y : start.x;
		areas.push({
			segmentIndex: i,
			x: horizontal ? from : across - thickness / 2,
			y: horizontal ? across - thickness / 2 : from,
			width: horizontal ? length : thickness,
			height: horizontal ? thickness : length,
			horizontal,
		});
	}
	return areas;
};

/**
 * Invisible bands that make each segment of a right-angle connector draggable across itself, from
 * anywhere along its length.
 *
 * There is no marker to aim at: the affordance is the cursor, which turns into the axis the segment
 * can move along as soon as the pointer is over it. A drag rewrites the connector's vertices
 * (see ConnectorSegmentSlideHandler), and the first one is what turns the engine's route into
 * vertices — so there is no separate "add a point here" gesture either.
 *
 * These live with the connector rather than in the selection controls for two reasons: hit geometry
 * already belongs here (`ConnectorHitArea` covers the whole path the same way), and being drawn
 * before the label leaves the label on top, so it keeps the clicks that move and edit it without any
 * cutting-out. Selecting the connector first is not required, matching how its label already drags.
 *
 * Each band carries data-kind="connector", data-id=<id> and
 * data-part="segment-slide:<segmentIndex>", indexing the drawn path — the same shape of address the
 * label uses. Straight routing names its segments differently, because dragging one there means
 * something else (see ConnectorSegmentMoveHitAreas).
 */
const ConnectorSegmentSlideHitAreasComponent: React.FC<
	ConnectorSegmentSlideHitAreasProps
> = ({ id, points, disablePointerEvents = false }) => {
	const areas = collectSegmentHitAreas(
		points,
		CONNECTOR_HIT_STROKE_WIDTH,
		MIN_SEGMENT_LENGTH,
	);

	return (
		<>
			{areas.map(({ segmentIndex, x, y, width, height, horizontal }) => (
				<rect
					key={segmentIndex}
					x={x}
					y={y}
					width={width}
					height={height}
					data-kind="connector"
					data-id={id}
					data-part={`segment-slide:${segmentIndex}`}
					style={{
						fill: "transparent",
						pointerEvents: disablePointerEvents ? "none" : "fill",
						// The segment only moves across itself, so the cursor names that axis.
						cursor: horizontal ? "ns-resize" : "ew-resize",
					}}
				/>
			))}
		</>
	);
};

export const ConnectorSegmentSlideHitAreas = memo(
	ConnectorSegmentSlideHitAreasComponent,
);
