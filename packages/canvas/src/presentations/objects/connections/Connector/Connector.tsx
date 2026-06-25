import { calcVectorAngle, type Point } from "@workspace/geometry";
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
	/** source → ...waypoints → target 順の解決済み座標列。最低 2 点。 */
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
	// auto（テーマ追従）をテーマ前景（ink）へ解決する（issue #38）。
	const strokeColor = resolveAutoColor(stroke, "ink");

	// 折れ線。端点と一致する陳腐な経由点を畳んでから描画する。
	const polyPoints = dedupePoints(points);
	if (polyPoints.length < 2) {
		return null;
	}
	const lastIdx = polyPoints.length - 1;
	const start = polyPoints[0];
	const end = polyPoints[lastIdx];

	// ヒット領域はクリックしやすいよう端点まで全長を保つ。
	const hitAreaPointsAttr = toPointsAttr(polyPoints);

	// 中空矢印では線が中空部を貫通しないよう、矢印の根元で線を終端させる。
	const insetPoints = insetPolylineEnds(
		polyPoints,
		getArrowLineInset(startArrow) * strokeWidth,
		getArrowLineInset(endArrow) * strokeWidth,
	);
	const linePointsAttr = toPointsAttr(insetPoints);

	// 矢印は端の隣接点に向けて角度を取る（折れ線でも端セグメントに沿う）。
	const startAngleRadians = calcVectorAngle(
		polyPoints[1].x,
		polyPoints[1].y,
		start.x,
		start.y,
	);
	const endAngleRadians = calcVectorAngle(
		polyPoints[lastIdx - 1].x,
		polyPoints[lastIdx - 1].y,
		end.x,
		end.y,
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

export const Connector = memo(ConnectorComponent);
