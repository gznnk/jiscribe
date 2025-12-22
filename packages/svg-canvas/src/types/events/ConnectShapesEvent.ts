import type { ArrowHeadType } from "../core/ArrowHeadType";
import type { PathType } from "../core/PathType";
import type { StrokeDashType } from "../core/StrokeDashType";

/**
 * Anchor position for connection point on a shape.
 * Valid connection point names for rectangular shapes:
 * - Corner points: topLeftPoint, topRightPoint, bottomLeftPoint, bottomRightPoint
 * - Edge center points: topCenterPoint, leftCenterPoint, rightCenterPoint, bottomCenterPoint
 */
export type AnchorPosition = string;

/**
 * Event fired when connecting two shapes in a diagram.
 * This is a more generic version of ConnectNodesEvent that supports
 * connecting any shapes (not just nodes) with customizable line styles,
 * arrow heads, and anchor positions.
 */
export type ConnectShapesEvent = {
	eventId: string;
	/** ID of the source shape to connect from */
	sourceShapeId: string;
	/** ID of the target shape to connect to */
	targetShapeId: string;
	/** Arrow head style at the start of the connection (optional) */
	startArrowHead?: ArrowHeadType;
	/** Arrow head style at the end of the connection (optional, defaults to "FilledTriangle") */
	endArrowHead?: ArrowHeadType;
	/** Line style for the connection (optional, defaults to "solid") */
	lineStyle?: StrokeDashType;
	/** Path rendering type (optional, defaults to "Polyline") */
	pathType?: PathType;
	/** Anchor position on the source shape (optional, auto-determined if not specified) */
	sourceAnchor?: AnchorPosition;
	/** Anchor position on the target shape (optional, auto-determined if not specified) */
	targetAnchor?: AnchorPosition;
};
