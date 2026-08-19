import type React from "react";
import { memo } from "react";

import type { ArrowShapeProps } from "./ArrowTypes";
import { CircleArrow } from "./shapes/Circle";
import { ConcaveTriangleArrow } from "./shapes/ConcaveTriangle";
import { CrossArrow } from "./shapes/Cross";
import { CrowFootManyArrow } from "./shapes/CrowFootMany";
import { CrowFootOneArrow } from "./shapes/CrowFootOne";
import { CrowFootOneManyArrow } from "./shapes/CrowFootOneMany";
import { CrowFootZeroManyArrow } from "./shapes/CrowFootZeroMany";
import { CrowFootZeroOneArrow } from "./shapes/CrowFootZeroOne";
import { FilledDiamondArrow } from "./shapes/FilledDiamond";
import { FilledTriangleArrow } from "./shapes/FilledTriangle";
import { HollowCircleArrow } from "./shapes/HollowCircle";
import { HollowDiamondArrow } from "./shapes/HollowDiamond";
import { HollowTriangleArrow } from "./shapes/HollowTriangle";
import { OpenArrowArrow } from "./shapes/OpenArrow";
import type { ArrowType } from "../../../schemas/objects/types/ArrowType";

/**
 * Props for Arrow component.
 */
type ArrowProps = {
	type: ArrowType;
	x: number;
	y: number;
	color: string;
	radians: number;
	scale: number;
	dataKind?: string;
	dataId?: string;
};

/**
 * Shape component for each arrow type; `None` draws nothing.
 *
 * `Record<ArrowType, ...>` covers every type, so a missing shape when an arrow
 * type is added is caught as a compile error (the same guarantee
 * `getArrowLineInset` gives for insets).
 */
const ARROW_SHAPES: Record<
	ArrowType,
	React.ComponentType<ArrowShapeProps> | null
> = {
	FilledTriangle: FilledTriangleArrow,
	ConcaveTriangle: ConcaveTriangleArrow,
	OpenArrow: OpenArrowArrow,
	HollowTriangle: HollowTriangleArrow,
	FilledDiamond: FilledDiamondArrow,
	HollowDiamond: HollowDiamondArrow,
	Circle: CircleArrow,
	HollowCircle: HollowCircleArrow,
	Cross: CrossArrow,
	CrowFootMany: CrowFootManyArrow,
	CrowFootOneMany: CrowFootOneManyArrow,
	CrowFootZeroMany: CrowFootZeroManyArrow,
	CrowFootOne: CrowFootOneArrow,
	CrowFootZeroOne: CrowFootZeroOneArrow,
	None: null,
};

/**
 * Arrow component.
 * Renders arrows directly as SVG elements without using markers.
 * Delegates to specific arrow shape components based on type.
 */
const ArrowComponent: React.FC<ArrowProps> = ({
	type,
	x,
	y,
	color,
	radians,
	scale,
	dataKind,
	dataId,
}) => {
	const Shape = ARROW_SHAPES[type];
	if (!Shape) {
		return null;
	}

	return (
		<Shape
			x={x}
			y={y}
			color={color}
			radians={radians}
			scale={scale}
			dataKind={dataKind}
			dataId={dataId}
		/>
	);
};

export const Arrow = memo(ArrowComponent);
