import type React from "react";
import { memo } from "react";

import type { ConnectLineProps } from "../../../types/props/shapes/ConnectLineProps";
import { PathMinimap } from "../Path";

/**
 * ConnectLine minimap component - lightweight version without outlines, controls, and labels.
 */
const ConnectLineMinimapComponent: React.FC<ConnectLineProps> = ({
	id,
	stroke = "black",
	strokeWidth = 1,
	strokeDashType = "solid",
	isAncestorSelected = false,
	isRootSelected = false,
	items = [],
	pathType,
	startArrowHead,
	endArrowHead,
}) => {
	return (
		<PathMinimap
			id={id}
			x={0}
			y={0}
			width={0}
			height={0}
			rotation={0}
			scaleX={1}
			scaleY={1}
			keepProportion={false}
			rotateEnabled={false}
			inversionEnabled={false}
			isTransforming={false}
			pathType={pathType}
			items={items}
			stroke={stroke}
			strokeWidth={strokeWidth}
			strokeDashType={strokeDashType}
			startArrowHead={startArrowHead}
			endArrowHead={endArrowHead}
			isSelected={false}
			isAncestorSelected={isAncestorSelected}
			isRootSelected={isRootSelected}
			showOutline={false}
			outlineDisabled={true}
		/>
	);
};

export const ConnectLineMinimap = memo(ConnectLineMinimapComponent);
