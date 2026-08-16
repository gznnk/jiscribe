import { calcNonZeroSign, degreesToRadians } from "@jiscribe/geometry";
import type { Point, Rect, TransformedFrame } from "@jiscribe/geometry";
import { memo } from "react";

import { theme } from "../../../../constants/theme";
import type { ExtraConnectPoint } from "../../../../presentations/objects/registry/ObjectExtraConnectPointsRegistry";
import {
	calcConnectPoint,
	calcExtraConnectPoint,
	calcOutwardVector,
} from "../../../../presentations/objects/utils/calcConnectPoint";
import type { ConnectPointId } from "../../../../schemas/objects/types/EndpointRef";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";

// Anchor colors may hold var(--jiscribe-*), so they are applied via style
// (fill/stroke) rather than SVG presentation attributes.
const connectionAnchorStyle = {
	fill: theme.connectionAccent,
	stroke: theme.connectionAccent,
	cursor: "crosshair",
} as const;

type ConnectionAnchorsProps = {
	/**
	 * The object ID that owns these anchors.
	 */
	objectId: string;
	/**
	 * The frame (bounding box) to show connection anchors for.
	 */
	frame: TransformedFrame;
	/**
	 * The shape's local outline polygon (from ObjectOutlineRegistry). When present,
	 * the anchor dots sit on the true edge instead of the bounding box.
	 */
	outline?: readonly Point[] | null;
	/**
	 * The shape's local anchor region (from ObjectAnchorRegionRegistry). When present,
	 * the anchor dots are centered on that band instead of the bounding box.
	 */
	anchorRegion?: Rect | null;
	/**
	 * The extra connection points the shape's type declares (from
	 * ObjectExtraConnectPointsRegistry), in local coordinates. Each gets a dot of
	 * its own beside the four edge ones.
	 */
	extraConnectPoints?: readonly ExtraConnectPoint[] | null;
	/**
	 * Zoom level for adjusting handle sizes.
	 * @default 1
	 */
	zoom?: number;
};

/**
 * ConnectionAnchors component for canvas.
 *
 * Displays the four edge connection anchors of a frame, plus whatever extra ones
 * its type declares, at the same points a connector would attach to (see
 * calcConnectPoint / calcExtraConnectPoint).
 * These anchors can be dragged to create new connectors.
 *
 * Each anchor has:
 * - data-kind="control" for GestureHandler to identify
 * - data-id=<objectId> + data-part="anchor:<anchorPosition>" for identifying which anchor was interacted with
 */
const ConnectionAnchorsComponent: React.FC<ConnectionAnchorsProps> = ({
	objectId,
	frame,
	outline,
	anchorRegion,
	extraConnectPoints,
	zoom = 1,
}) => {
	const { rotation, scaleX, scaleY } = frame;
	const { handleDimensions } = useCanvasTheme();

	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedAnchorRadius = handleDimensions.anchorRadius / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;
	const adjustedOffset = handleDimensions.connectionAnchorOffset / zoom;

	// Anchors sit where a connector would attach (outline + anchor region aware);
	// the outward-normal offset below is applied on top.
	const edgePoint = (connectPointId: ConnectPointId): Point =>
		calcConnectPoint(frame, connectPointId, outline, anchorRegion);

	const topEdge = edgePoint("topCenter");
	const rightEdge = edgePoint("rightCenter");
	const bottomEdge = edgePoint("bottomCenter");
	const leftEdge = edgePoint("leftCenter");

	const radians = degreesToRadians(rotation);

	// Calculate anchor positions with offset in the outward normal direction.
	// Math.sign(scaleX/scaleY) corrects the direction when the frame is flipped:
	// - Top/Bottom normals flip with scaleY (scaleY=-1 makes topCenter appear at bottom)
	// - Left/Right normals flip with scaleX (scaleX=-1 makes rightCenter appear at left)
	const signX = calcNonZeroSign(scaleX);
	const signY = calcNonZeroSign(scaleY);

	const topCenterAnchor = {
		x: topEdge.x + signY * Math.sin(radians) * adjustedOffset,
		y: topEdge.y - signY * Math.cos(radians) * adjustedOffset,
	};

	const rightCenterAnchor = {
		x: rightEdge.x + signX * Math.cos(radians) * adjustedOffset,
		y: rightEdge.y + signX * Math.sin(radians) * adjustedOffset,
	};

	const bottomCenterAnchor = {
		x: bottomEdge.x - signY * Math.sin(radians) * adjustedOffset,
		y: bottomEdge.y + signY * Math.cos(radians) * adjustedOffset,
	};

	const leftCenterAnchor = {
		x: leftEdge.x - signX * Math.cos(radians) * adjustedOffset,
		y: leftEdge.y - signX * Math.sin(radians) * adjustedOffset,
	};

	// A declared point is pushed off along its own declared outward direction, so
	// the dot clears the shape the same way the edge ones do.
	const extraAnchors = (extraConnectPoints ?? []).map((extraConnectPoint) => {
		const edge = calcExtraConnectPoint(frame, extraConnectPoint);
		const outward = calcOutwardVector(frame, extraConnectPoint.direction);
		return {
			position: extraConnectPoint.id,
			point: {
				x: edge.x + outward.x * adjustedOffset,
				y: edge.y + outward.y * adjustedOffset,
			},
		};
	});

	const anchors: Array<{
		position: string;
		point: { x: number; y: number };
	}> = [
		// { position: "center", point: { x: cx, y: cy } },
		{ position: "topCenter", point: topCenterAnchor },
		{ position: "rightCenter", point: rightCenterAnchor },
		{ position: "bottomCenter", point: bottomCenterAnchor },
		{ position: "leftCenter", point: leftCenterAnchor },
		...extraAnchors,
	];

	return (
		<g data-layer="connection-anchors">
			{anchors.map(({ position, point }) => (
				<circle
					key={position}
					cx={point.x}
					cy={point.y}
					r={adjustedAnchorRadius}
					strokeWidth={adjustedStrokeWidth}
					data-kind="control"
					data-id={objectId}
					data-part={`anchor:${position}`}
					style={connectionAnchorStyle}
				/>
			))}
		</g>
	);
};

export const ConnectionAnchors = memo(ConnectionAnchorsComponent);
