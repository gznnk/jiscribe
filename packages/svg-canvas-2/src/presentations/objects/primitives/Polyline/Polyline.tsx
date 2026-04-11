import { calcVectorAngle } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { PolylineElement, PolylineHitArea } from "./PolylineStyled";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import { Arrow } from "../../arrows";

type PolylineProps = PolylineState;

const PolylineComponent: React.FC<PolylineProps> = ({
	id,
	points,
	stroke = "black",
	strokeWidth = 1,
	startArrow,
	endArrow,
}) => {
	const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");

	// Calculate angle at the start of the polyline (pointing from second point to first)
	let startAngleRadians = 0;
	if (points.length >= 2 && startArrow && startArrow !== "None") {
		startAngleRadians = calcVectorAngle(
			points[1].x,
			points[1].y,
			points[0].x,
			points[0].y,
		);
	}

	// Calculate angle at the end of the polyline (pointing from second-to-last to last)
	let endAngleRadians = 0;
	if (points.length >= 2 && endArrow && endArrow !== "None") {
		const lastIdx = points.length - 1;
		endAngleRadians = calcVectorAngle(
			points[lastIdx - 1].x,
			points[lastIdx - 1].y,
			points[lastIdx].x,
			points[lastIdx].y,
		);
	}

	return (
		<>
			<PolylineHitArea data-kind="object" data-id={id} points={pointsAttr} />
			<PolylineElement
				points={pointsAttr}
				stroke={stroke}
				strokeWidth={strokeWidth}
			/>
			{startArrow && startArrow !== "None" && points.length >= 1 && (
				<Arrow
					type={startArrow}
					x={points[0].x}
					y={points[0].y}
					color={stroke}
					radians={startAngleRadians}
					scale={strokeWidth}
				/>
			)}
			{endArrow && endArrow !== "None" && points.length >= 1 && (
				<Arrow
					type={endArrow}
					x={points[points.length - 1].x}
					y={points[points.length - 1].y}
					color={stroke}
					radians={endAngleRadians}
					scale={strokeWidth}
				/>
			)}
		</>
	);
};

export const Polyline = memo(PolylineComponent);
