import { calcVectorAngleRad, type Point } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { ConnectorElement, ConnectorHitArea } from "./ConnectorStyled";
import { dedupePoints } from "./utils/dedupePoints";
import { toPointsAttr } from "./utils/toPointsAttr";
import type { ArrowType } from "../../../../schemas/objects/types/ArrowType";
import type { StrokeDashType } from "../../../../schemas/objects/types/StrokeDashType";
import { Arrow, getArrowLineInset } from "../../arrows";
import { getStrokeDasharray } from "../../utils/getStrokeDasharray";
import { insetPolylineEnds } from "../../utils/insetPolylineEnds";
import { resolveAutoColor } from "../../utils/resolveAutoColor";

type ConnectorProps = {
	id: string;
	/** Resolved coordinate sequence in source -> ...waypoints -> target order. At least 2 points. */
	points: readonly Point[];
	stroke?: string;
	strokeWidth?: number;
	strokeDashType?: StrokeDashType;
	startArrow?: ArrowType;
	endArrow?: ArrowType;
	disablePointerEvents?: boolean;
};

const ConnectorComponent: React.FC<ConnectorProps> = ({
	id,
	points,
	stroke = "auto",
	strokeWidth = 1,
	strokeDashType,
	startArrow,
	endArrow,
	disablePointerEvents = false,
}) => {
	// Resolve auto (theme-following) to the theme foreground (ink) (issue #38).
	const strokeColor = resolveAutoColor(stroke, "ink");

	// Polyline. Collapse redundant waypoints coinciding with endpoints before drawing.
	const polyPoints = dedupePoints(points);
	if (polyPoints.length < 2) {
		return null;
	}
	const lastIdx = polyPoints.length - 1;
	const start = polyPoints[0];
	const end = polyPoints[lastIdx];

	// The hit area keeps its full length up to the endpoints for easier clicking.
	const hitAreaPointsAttr = toPointsAttr(polyPoints);

	// For hollow arrows, terminate the line at the arrow base so it does not pass through the hollow part.
	const insetPoints = insetPolylineEnds(
		polyPoints,
		getArrowLineInset(startArrow) * strokeWidth,
		getArrowLineInset(endArrow) * strokeWidth,
	);
	const linePointsAttr = toPointsAttr(insetPoints);

	// Orient arrows toward the point adjacent to the endpoint (following the end segment even for polylines).
	const startAngleRadians = calcVectorAngleRad(
		start.x,
		start.y,
		polyPoints[1].x,
		polyPoints[1].y,
	);
	const endAngleRadians = calcVectorAngleRad(
		end.x,
		end.y,
		polyPoints[lastIdx - 1].x,
		polyPoints[lastIdx - 1].y,
	);

	return (
		<>
			{/* Wide transparent hit area for easier clicking (same as Polyline pattern) */}
			<ConnectorHitArea
				data-kind="connector"
				data-id={id}
				points={hitAreaPointsAttr}
				disablePointerEvents={disablePointerEvents}
			/>
			<ConnectorElement
				points={linePointsAttr}
				strokeColor={strokeColor}
				strokeWidth={strokeWidth}
				strokeDasharray={getStrokeDasharray(strokeDashType, strokeWidth)}
			/>
			{startArrow && startArrow !== "None" && (
				<Arrow
					type={startArrow}
					x={start.x}
					y={start.y}
					color={strokeColor}
					radians={startAngleRadians}
					scale={strokeWidth}
					dataKind="connector"
					dataId={id}
				/>
			)}
			{endArrow && endArrow !== "None" && (
				<Arrow
					type={endArrow}
					x={end.x}
					y={end.y}
					color={strokeColor}
					radians={endAngleRadians}
					scale={strokeWidth}
					dataKind="connector"
					dataId={id}
				/>
			)}
		</>
	);
};

/** Renders a connector as a polyline with optional start/end arrows. */
export const Connector = memo(ConnectorComponent);
