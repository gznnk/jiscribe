import type React from "react";
import { memo } from "react";

import { EllipseElement } from "./EllipseStyled";
import type { EllipseState } from "../../../../states/objects/primitives/ellipse/EllipseState";
import { createSvgTransform } from "../../utils/createSvgTransform";

type EllipseProps = EllipseState;

const EllipseComponent: React.FC<EllipseProps> = ({
	id,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	fill,
	stroke,
	strokeWidth,
}) => {
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	const rx = width / 2;
	const ry = height / 2;

	return (
		<EllipseElement
			data-kind="object"
			data-id={id}
			cx={0}
			cy={0}
			rx={rx}
			ry={ry}
			transform={transformAttr}
			fill={fill ?? "transparent"}
			stroke={stroke}
			strokeWidth={strokeWidth}
		/>
	);
};

export const Ellipse = memo(EllipseComponent);
