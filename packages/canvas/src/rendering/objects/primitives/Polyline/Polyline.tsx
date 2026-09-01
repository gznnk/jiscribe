import { DEFAULT_STROKE_WIDTH } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import { calcVectorAngleRad } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { PolylineElement, PolylineHitArea } from "./PolylineStyled";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import { Arrow, getArrowLineInset } from "../../arrows";
import { getStrokeDasharray } from "../../utils/getStrokeDasharray";
import { insetPolylineEnds } from "../../utils/insetPolylineEnds";
import { resolveAutoColor } from "../../utils/resolveAutoColor";

type PolylineProps = PolylineState;

const PolylineComponent: React.FC<PolylineProps> = ({
	id,
	points,
	stroke,
	strokeWidth = DEFAULT_STROKE_WIDTH,
	strokeDashType,
	startArrow,
	endArrow,
}) => {
	const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");
	// Resolve auto (theme-following) — and an unspecified stroke, like every
	// other renderer — to the theme foreground (ink) (issue #38).
	const strokeColor = resolveAutoColor(stroke, "ink");

	// For hollow arrows, terminate the line at the arrow's base so it does not
	// pass through the hollow area. The arrow itself is drawn at the original
	// endpoint (tip), so the visible endpoint position is unchanged.
	const linePoints = insetPolylineEnds(
		points,
		getArrowLineInset(startArrow) * strokeWidth,
		getArrowLineInset(endArrow) * strokeWidth,
	);
	const linePointsAttr = linePoints.map((p) => `${p.x},${p.y}`).join(" ");

	// Calculate angle at the start of the polyline (pointing from second point to first)
	let startAngleRadians = 0;
	if (points.length >= 2 && startArrow && startArrow !== "None") {
		startAngleRadians = calcVectorAngleRad(
			points[0].x,
			points[0].y,
			points[1].x,
			points[1].y,
		);
	}

	// Calculate angle at the end of the polyline (pointing from second-to-last to last)
	let endAngleRadians = 0;
	if (points.length >= 2 && endArrow && endArrow !== "None") {
		const lastIdx = points.length - 1;
		endAngleRadians = calcVectorAngleRad(
			points[lastIdx].x,
			points[lastIdx].y,
			points[lastIdx - 1].x,
			points[lastIdx - 1].y,
		);
	}

	return (
		<>
			<PolylineHitArea data-kind="object" data-id={id} points={pointsAttr} />
			<PolylineElement
				points={linePointsAttr}
				strokeColor={strokeColor}
				strokeWidth={strokeWidth}
				strokeDasharray={getStrokeDasharray(strokeDashType, strokeWidth)}
			/>
			{startArrow && startArrow !== "None" && points.length >= 1 && (
				<Arrow
					type={startArrow}
					x={points[0].x}
					y={points[0].y}
					color={strokeColor}
					radians={startAngleRadians}
					scale={strokeWidth}
					dataKind="object"
					dataId={id}
				/>
			)}
			{endArrow && endArrow !== "None" && points.length >= 1 && (
				<Arrow
					type={endArrow}
					x={points[points.length - 1].x}
					y={points[points.length - 1].y}
					color={strokeColor}
					radians={endAngleRadians}
					scale={strokeWidth}
					dataKind="object"
					dataId={id}
				/>
			)}
		</>
	);
};

export const Polyline = memo(PolylineComponent);
