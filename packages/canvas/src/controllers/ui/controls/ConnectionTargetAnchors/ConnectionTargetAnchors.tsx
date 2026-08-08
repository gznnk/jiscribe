import type { Point, Rect, TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { theme } from "../../../../constants/theme";
import type { ExtraConnectPoint } from "../../../../presentations/objects/registry/ObjectExtraConnectPointsRegistry";
import {
	calcConnectPoint,
	calcExtraConnectPoint,
} from "../../../../presentations/objects/utils/calcConnectPoint";
import type { ConnectPointId } from "../../../../schemas/objects/types/EndpointRef";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";

type ConnectionTargetAnchorsProps = {
	/**
	 * The frame (bounding box) of the target object.
	 */
	frame: TransformedFrame;
	/**
	 * The shape's local outline polygon (from ObjectOutlineRegistry). When present,
	 * the edge anchors sit on the true edge instead of the bounding box.
	 */
	outline?: readonly Point[] | null;
	/**
	 * The shape's local anchor region (from ObjectAnchorRegionRegistry). When present,
	 * the edge anchors are centered on that band instead of the bounding box.
	 */
	anchorRegion?: Rect | null;
	/**
	 * The extra connection points the shape's type declares (from
	 * ObjectExtraConnectPointsRegistry), in local coordinates. Each gets a dot of
	 * its own beside the center and the four edge ones.
	 */
	extraConnectPoints?: readonly ExtraConnectPoint[] | null;
	/**
	 * The anchor that is currently nearest to the cursor — an AnchorHandleId or the
	 * id of a declared extra point. null means no specific anchor is highlighted.
	 */
	activeAnchorId: string | null;
	/**
	 * Where the connection would land when it is not snapped to a named anchor but
	 * to a free position along an edge, already resolved to world coordinates.
	 * null while a named anchor is active (`activeAnchorId` then carries it).
	 */
	freeConnectPoint?: Point | null;
	/**
	 * Zoom level for adjusting handle sizes.
	 * @default 1
	 */
	zoom?: number;
};

/**
 * ConnectionTargetAnchors component.
 *
 * When a connection drag is in progress and the cursor hovers over a valid
 * target object, this component renders the connectable points on that object:
 * center + the four edge anchors, plus whatever extra ones its type declares
 * (see calcConnectPoint / calcExtraConnectPoint).
 *
 * The point nearest to the cursor (already computed by
 * ConnectionAnchorEventHandler) is visually highlighted; when the cursor is on a
 * free position along an edge instead, that landing point gets a dot of its own.
 * This is purely visual — no pointer events.
 */
const ConnectionTargetAnchorsComponent: React.FC<
	ConnectionTargetAnchorsProps
> = ({
	frame,
	outline,
	anchorRegion,
	extraConnectPoints,
	activeAnchorId,
	freeConnectPoint,
	zoom = 1,
}) => {
	const { cx, cy } = frame;
	const { handleDimensions } = useCanvasTheme();

	const adjustedRadius = handleDimensions.anchorRadius / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;

	// Edge anchors sit where a connector would attach (outline + anchor region aware).
	const edgePoint = (connectPointId: ConnectPointId): Point =>
		calcConnectPoint(frame, connectPointId, outline, anchorRegion);

	const top = edgePoint("topCenter");
	const right = edgePoint("rightCenter");
	const bottom = edgePoint("bottomCenter");
	const left = edgePoint("leftCenter");

	const anchors: Array<{ id: string; x: number; y: number }> = [
		{ id: "center", x: cx, y: cy },
		{ id: "topCenter", x: top.x, y: top.y },
		{ id: "rightCenter", x: right.x, y: right.y },
		{ id: "bottomCenter", x: bottom.x, y: bottom.y },
		{ id: "leftCenter", x: left.x, y: left.y },
		...(extraConnectPoints ?? []).map((extraConnectPoint) => {
			const point = calcExtraConnectPoint(frame, extraConnectPoint);
			return { id: extraConnectPoint.id, x: point.x, y: point.y };
		}),
	];

	return (
		<g data-layer="connection-target-anchors" style={{ pointerEvents: "none" }}>
			{anchors.map(({ id, x, y }) => {
				const isActive = id === activeAnchorId;
				return (
					<circle
						key={id}
						cx={x}
						cy={y}
						r={isActive ? adjustedRadius * 1.2 : adjustedRadius}
						strokeWidth={adjustedStrokeWidth}
						// Colors may hold var(--jiscribe-*), so they are applied via style
						// rather than SVG presentation attributes.
						style={{
							fill: isActive ? theme.connectionAccent : theme.handleFill,
							stroke: theme.connectionAccent,
						}}
					/>
				);
			})}
			{freeConnectPoint && (
				// Styled exactly like an active named anchor: both mean "release here
				// and the connector attaches", so they should read as the same state.
				<circle
					data-anchor-kind="edge"
					cx={freeConnectPoint.x}
					cy={freeConnectPoint.y}
					r={adjustedRadius * 1.2}
					strokeWidth={adjustedStrokeWidth}
					style={{
						fill: theme.connectionAccent,
						stroke: theme.connectionAccent,
					}}
				/>
			)}
		</g>
	);
};

export const ConnectionTargetAnchors = memo(ConnectionTargetAnchorsComponent);
