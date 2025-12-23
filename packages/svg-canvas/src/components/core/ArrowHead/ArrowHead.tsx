import type React from "react";
import { memo } from "react";

import { CircleArrowHead } from "./Circle";
import { ConcaveTriangleArrowHead } from "./ConcaveTriangle";
import { FilledDiamondArrowHead } from "./FilledDiamond";
import { FilledTriangleArrowHead } from "./FilledTriangle";
import { HollowDiamondArrowHead } from "./HollowDiamond";
import { HollowTriangleArrowHead } from "./HollowTriangle";
import { OpenArrowArrowHead } from "./OpenArrow";
import type { ArrowHeadType } from "../../../types/core/ArrowHeadType";

/**
 * Props for ArrowHead component.
 */
type ArrowHeadProps = {
	type: ArrowHeadType;
	x: number;
	y: number;
	color: string;
	radians: number;
	scale: number;
};

/**
 * ArrowHead component.
 * Renders arrow heads directly as SVG elements without using markers.
 * Delegates to specific arrow head components based on type.
 */
const ArrowHeadComponent: React.FC<ArrowHeadProps> = ({
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
		return <FilledTriangleArrowHead {...props} />;
	}

	if (type === "ConcaveTriangle") {
		return <ConcaveTriangleArrowHead {...props} />;
	}

	if (type === "OpenArrow") {
		return <OpenArrowArrowHead {...props} />;
	}

	if (type === "HollowTriangle") {
		return <HollowTriangleArrowHead {...props} />;
	}

	if (type === "FilledDiamond") {
		return <FilledDiamondArrowHead {...props} />;
	}

	if (type === "HollowDiamond") {
		return <HollowDiamondArrowHead {...props} />;
	}

	if (type === "Circle") {
		return <CircleArrowHead {...props} />;
	}

	return null;
};

export const ArrowHead = memo(ArrowHeadComponent);
