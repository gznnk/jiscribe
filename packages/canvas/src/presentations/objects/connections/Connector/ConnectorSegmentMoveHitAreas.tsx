import { calcEuclideanDistance, type Point } from "@workspace/geometry";
import { memo } from "react";

import { CONNECTOR_HIT_STROKE_WIDTH } from "../../../../constants/connectorHitArea";
import { isConnectorSegmentFreelyMovable } from "../../../../states/objects/connections/connector/isConnectorSegmentFreelyMovable";

// Bands of two segments overlap around the vertex they share, so a segment shorter than the band
// width sits entirely inside that overlap and cannot be aimed at. Below this length a segment gets
// no band; the vertex handles are what is actually under the pointer there.
const MIN_SEGMENT_LENGTH = CONNECTOR_HIT_STROKE_WIDTH;

type ConnectorSegmentMoveHitAreasProps = {
	/** The connector's object ID, used to address the gesture at this connector. */
	id: string;
	/** The drawn path, endpoints included (`[source, ...points, target]`). */
	points: readonly Point[];
	/** Whether the source endpoint has no owner shape, so it moves with the segment. */
	sourceIsFree: boolean;
	/** Whether the target endpoint has no owner shape, so it moves with the segment. */
	targetIsFree: boolean;
	/**
	 * Suppresses hit testing, matching the connector's own hit area (export / preview renders).
	 * @default false
	 */
	disablePointerEvents?: boolean;
};

/**
 * Invisible bands that make a straight connector's segments draggable anywhere on the canvas, from
 * anywhere along their length.
 *
 * Only the segments that can actually move get one (see isConnectorSegmentFreelyMovable) — a
 * segment with an end pinned to a shape carries no band, so the cursor over it stays the connector's
 * own and promises nothing. There is no marker to aim at: the affordance is the cursor.
 *
 * The band is a transparent stroke rather than the rectangle the orthogonal bands use, since a
 * straight segment runs at any angle. It is as wide as the connector's own hit area, so picking up a
 * segment feels the same as clicking the line.
 *
 * Drawn with the connector rather than in the selection controls, for the reasons in
 * ConnectorSegmentSlideHitAreas — and being drawn before the label leaves the label on top. The
 * midpoint insert handles do sit over these bands while the connector is selected, so the middle of
 * a segment adds a vertex (crosshair) and the rest of it moves the segment (move); the two are
 * distinguished by the cursor.
 *
 * Each band carries data-kind="connector", data-id=<id> and data-part="segment-move:<segmentIndex>",
 * indexing the drawn path.
 */
const ConnectorSegmentMoveHitAreasComponent: React.FC<
	ConnectorSegmentMoveHitAreasProps
> = ({
	id,
	points,
	sourceIsFree,
	targetIsFree,
	disablePointerEvents = false,
}) => {
	const bands: { segmentIndex: number; start: Point; end: Point }[] = [];
	for (let i = 0; i <= points.length - 2; i++) {
		if (
			!isConnectorSegmentFreelyMovable(
				i,
				points.length,
				sourceIsFree,
				targetIsFree,
			)
		) {
			continue;
		}
		const start = points[i];
		const end = points[i + 1];
		if (
			calcEuclideanDistance(start.x, start.y, end.x, end.y) < MIN_SEGMENT_LENGTH
		) {
			continue;
		}
		bands.push({ segmentIndex: i, start, end });
	}

	return (
		<>
			{bands.map(({ segmentIndex, start, end }) => (
				<line
					key={segmentIndex}
					x1={start.x}
					y1={start.y}
					x2={end.x}
					y2={end.y}
					data-kind="connector"
					data-id={id}
					data-part={`segment-move:${segmentIndex}`}
					style={{
						stroke: "transparent",
						strokeWidth: CONNECTOR_HIT_STROKE_WIDTH,
						pointerEvents: disablePointerEvents ? "none" : "stroke",
						// The segment goes wherever the cursor does, so the cursor says so.
						cursor: "move",
					}}
				/>
			))}
		</>
	);
};

export const ConnectorSegmentMoveHitAreas = memo(
	ConnectorSegmentMoveHitAreasComponent,
);
