import {
	calcArrowHeadRadians,
	resolveArrowHeadPath,
} from "@jiscribe/doc/model/objects/utils/arrowHeadAim";
import { calcArrowLineInset } from "@jiscribe/doc/model/objects/utils/arrowLineInsets";
import {
	calcArrowLineEndWedge,
	calcArrowOutlineWidth,
} from "@jiscribe/doc/model/objects/utils/arrowOutlineThinning";
import type React from "react";
import { memo } from "react";

import { PolylineElement, PolylineHitArea } from "./PolylineStyled";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import { Arrow } from "../../arrows";
import { useObjectShapeStyleDefaultsRegistry } from "../../registry/ObjectShapeStyleDefaultsRegistryContext";
import { formatPolygonPoints } from "../../utils/formatPolygonPoints";
import { getStrokeDasharray } from "../../utils/getStrokeDasharray";
import { insetPolylineEnds } from "../../utils/insetPolylineEnds";
import { resolveAutoColor } from "../../utils/resolveAutoColor";

type PolylineProps = PolylineState;

const PolylineComponent: React.FC<PolylineProps> = ({
	id,
	type,
	points,
	stroke,
	strokeWidth,
	strokeDashType,
	strokeOpacity,
	startArrow,
	endArrow,
	arrowScale,
}) => {
	const pointsAttr = formatPolygonPoints(points);
	const shapeStyle = useObjectShapeStyleDefaultsRegistry().resolveShapeStyle(
		type,
		{ stroke, strokeWidth, strokeDashType, strokeOpacity, arrowScale },
	);
	const resolvedStrokeWidth = shapeStyle.strokeWidth;
	const arrowHeadScale = resolvedStrokeWidth * shapeStyle.arrowScale;
	const arrowOutlineWidth = calcArrowOutlineWidth(shapeStyle.arrowScale);
	// Resolve auto (theme-following) — and an unspecified stroke, like every
	// other renderer — to the theme foreground (ink) (issue #38).
	const strokeColor = resolveAutoColor(shapeStyle.stroke, "ink");
	// The hit area keeps the stored points; the line and its heads follow the
	// collapsed path; where it is null (too short to aim a head on) the line
	// keeps the stored points and no head is drawn.
	const arrowPath = resolveArrowHeadPath(points);
	// Stop the line where the head needs it (calcArrowLineInset) so it does not
	// show through a hollow head or past a thinned one. The arrow itself is drawn
	// at the path's endpoint (tip), so the visible endpoint position is unchanged.
	const linePoints = insetPolylineEnds(
		arrowPath ?? points,
		calcArrowLineInset(startArrow, resolvedStrokeWidth, shapeStyle.arrowScale),
		calcArrowLineInset(endArrow, resolvedStrokeWidth, shapeStyle.arrowScale),
	);
	const linePointsAttr = formatPolygonPoints(linePoints);
	const arrowHeads =
		arrowPath === null
			? null
			: {
					start: arrowPath[0],
					end: arrowPath[arrowPath.length - 1],
					...calcArrowHeadRadians(arrowPath),
				};

	return (
		<>
			<PolylineHitArea data-kind="object" data-id={id} points={pointsAttr} />
			<PolylineElement
				points={linePointsAttr}
				strokeColor={strokeColor}
				strokeAlpha={shapeStyle.strokeOpacity}
				strokeWidth={resolvedStrokeWidth}
				strokeDasharray={getStrokeDasharray(
					shapeStyle.strokeDashType,
					resolvedStrokeWidth,
				)}
			/>
			{startArrow && startArrow !== "None" && arrowHeads && (
				<Arrow
					type={startArrow}
					x={arrowHeads.start.x}
					y={arrowHeads.start.y}
					color={strokeColor}
					opacity={shapeStyle.strokeOpacity}
					radians={arrowHeads.startRadians}
					scale={arrowHeadScale}
					outlineWidth={arrowOutlineWidth}
					lineEndWedge={calcArrowLineEndWedge(
						startArrow,
						shapeStyle.arrowScale,
					)}
					dataKind="object"
					dataId={id}
				/>
			)}
			{endArrow && endArrow !== "None" && arrowHeads && (
				<Arrow
					type={endArrow}
					x={arrowHeads.end.x}
					y={arrowHeads.end.y}
					color={strokeColor}
					opacity={shapeStyle.strokeOpacity}
					radians={arrowHeads.endRadians}
					scale={arrowHeadScale}
					outlineWidth={arrowOutlineWidth}
					lineEndWedge={calcArrowLineEndWedge(endArrow, shapeStyle.arrowScale)}
					dataKind="object"
					dataId={id}
				/>
			)}
		</>
	);
};

export const Polyline = memo(PolylineComponent);
