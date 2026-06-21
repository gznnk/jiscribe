import { calcVectorAngle } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { ConnectorElement, ConnectorHitArea } from "./ConnectorStyled";
import type { ArrowType } from "../../../../schemas/objects/types/ArrowType";
import type { StrokeDashType } from "../../../../schemas/objects/types/StrokeDashType";
import { Arrow, getArrowLineInset } from "../../arrows";
import { getStrokeDasharray } from "../../utils/getStrokeDasharray";
import { insetPolylineEnds } from "../../utils/insetPolylineEnds";
import { resolveAutoColor } from "../../utils/resolveAutoColor";

type ConnectorProps = {
	id: string;
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	stroke?: string;
	strokeWidth?: number;
	strokeDashType?: StrokeDashType;
	startArrow?: ArrowType;
	endArrow?: ArrowType;
	disablePointerEvents?: boolean;
};

const ConnectorComponent: React.FC<ConnectorProps> = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	stroke = "auto",
	strokeWidth = 1,
	strokeDashType,
	startArrow,
	endArrow,
	disablePointerEvents = false,
}) => {
	// auto（テーマ追従）をテーマ前景（ink）へ解決する（issue #38）。
	const strokeColor = resolveAutoColor(stroke, "ink");

	// Simple straight line between source and target points.
	// ヒット領域はクリックしやすいよう端点まで全長を保つ。
	const hitAreaPointsAttr = `${sourceX},${sourceY} ${targetX},${targetY}`;

	// 中空矢印では線が中空部を貫通しないよう、矢印の根元で線を終端させる。
	const [lineStart, lineEnd] = insetPolylineEnds(
		[
			{ x: sourceX, y: sourceY },
			{ x: targetX, y: targetY },
		],
		getArrowLineInset(startArrow) * strokeWidth,
		getArrowLineInset(endArrow) * strokeWidth,
	);
	const linePointsAttr = `${lineStart.x},${lineStart.y} ${lineEnd.x},${lineEnd.y}`;

	// Calculate angles for arrows
	const startAngleRadians = calcVectorAngle(targetX, targetY, sourceX, sourceY);
	const endAngleRadians = calcVectorAngle(sourceX, sourceY, targetX, targetY);

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
					x={sourceX}
					y={sourceY}
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
					x={targetX}
					y={targetY}
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
