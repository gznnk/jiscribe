import type React from "react";
import { memo } from "react";

import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";

/**
 * Props for IconContainer component.
 */
type IconContainerProps = {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	pointerEvents?: string;
	children: React.ReactNode;
};

/**
 * IconContainer component.
 */
const IconContainerComponent: React.FC<IconContainerProps> = ({
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	pointerEvents = "auto",
	children,
}) => {
	const rad = degreesToRadians(rotation);
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	const a = cos * scaleX;
	const b = sin * scaleX;
	const c = -sin * scaleY;
	const d = cos * scaleY;

	const e = x + a * (-width / 2) + c * (-height / 2);
	const f = y + b * (-width / 2) + d * (-height / 2);

	return (
		<g
			transform={`matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`}
			pointerEvents={pointerEvents}
		>
			{children}
		</g>
	);
};

export const IconContainer = memo(IconContainerComponent);
