import { calcRadians } from "@workspace/geometry";
import type React from "react";

import type { ArrowHeadType } from "../../../types/core/ArrowHeadType";
import type { PathType } from "../../../types/core/PathType";
import type { Diagram } from "../../../types/state/core/Diagram";
import { ArrowHead } from "../../core/ArrowHead";

/**
 * Minimal path data needed for arrow head rendering
 */
type PathArrowData = {
	items: Diagram[];
	stroke: string;
	strokeWidth?: number;
	pathType?: PathType;
	startArrowHead?: ArrowHeadType;
	endArrowHead?: ArrowHeadType;
};

/**
 * Creates an arrow head at the start point of a path.
 *
 * @param pathData - The path data containing points and arrow styling
 * @returns JSX element for the arrow head or undefined
 */
export const createStartPointArrowHead = (
	pathData: PathArrowData,
): React.ReactNode => {
	if (1 < pathData.items.length) {
		if (pathData.startArrowHead && pathData.startArrowHead !== "None") {
			const startPoint = pathData.items[0];
			// For Straight paths, use the last point; otherwise use the second point
			const referencePoint =
				pathData.pathType === "Straight"
					? pathData.items[pathData.items.length - 1]
					: pathData.items[1];
			const startArrowHeadRadians = calcRadians(
				referencePoint.x,
				referencePoint.y,
				startPoint.x,
				startPoint.y,
			);
			return (
				<ArrowHead
					type={pathData.startArrowHead}
					color={pathData.stroke}
					x={startPoint.x}
					y={startPoint.y}
					radians={startArrowHeadRadians}
					scale={pathData.strokeWidth || 1}
				/>
			);
		}
	}
	return undefined;
};

/**
 * Creates an arrow head at the end point of a path.
 *
 * @param pathData - The path data containing points and arrow styling
 * @returns JSX element for the arrow head or undefined
 */
export const createEndPointArrowHead = (
	pathData: PathArrowData,
): React.ReactNode => {
	if (1 < pathData.items.length) {
		if (pathData.endArrowHead && pathData.endArrowHead !== "None") {
			const endPoint = pathData.items[pathData.items.length - 1];
			// For Straight paths, use the first point; otherwise use the second-to-last point
			const referencePoint =
				pathData.pathType === "Straight"
					? pathData.items[0]
					: pathData.items[pathData.items.length - 2];
			const endArrowHeadRadians = calcRadians(
				referencePoint.x,
				referencePoint.y,
				endPoint.x,
				endPoint.y,
			);
			return (
				<ArrowHead
					type={pathData.endArrowHead}
					color={pathData.stroke}
					x={endPoint.x}
					y={endPoint.y}
					radians={endArrowHeadRadians}
					scale={pathData.strokeWidth || 1}
				/>
			);
		}
	}
	return undefined;
};
