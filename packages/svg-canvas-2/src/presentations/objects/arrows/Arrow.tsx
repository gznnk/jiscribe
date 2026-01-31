import type React from "react";
import { memo } from "react";

import { CircleArrow } from "./shapes/Circle";
import { ConcaveTriangleArrow } from "./shapes/ConcaveTriangle";
import { FilledDiamondArrow } from "./shapes/FilledDiamond";
import { FilledTriangleArrow } from "./shapes/FilledTriangle";
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
}) => {
	if (type === "None") return null;

	const props = { x, y, color, radians, scale };

	if (type === "FilledTriangle") {
		return <FilledTriangleArrow {...props} />;
	}

	if (type === "ConcaveTriangle") {
		return <ConcaveTriangleArrow {...props} />;
	}

	if (type === "OpenArrow") {
		return <OpenArrowArrow {...props} />;
	}

	if (type === "HollowTriangle") {
		return <HollowTriangleArrow {...props} />;
	}

	if (type === "FilledDiamond") {
		return <FilledDiamondArrow {...props} />;
	}

	if (type === "HollowDiamond") {
		return <HollowDiamondArrow {...props} />;
	}

	if (type === "Circle") {
		return <CircleArrow {...props} />;
	}

	return null;
};

export const Arrow = memo(ArrowComponent);
