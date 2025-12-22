import React, { memo } from "react";

import type { PathPointProps } from "../../../types/props/shapes/PathPointProps";
import { DragPoint } from "../../core/DragPoint";

/**
 * Polyline vertex component
 */
const PathPointComponent: React.FC<PathPointProps> = ({
	id,
	x,
	y,
	hidden,
	isTransparent,
	zoom,
	onDrag,
}) => {
	return (
		<DragPoint
			id={id}
			x={x}
			y={y}
			hidden={hidden}
			isTransparent={isTransparent}
			zoom={zoom}
			onDrag={onDrag}
		/>
	);
};

export const PathPoint = memo(PathPointComponent);
