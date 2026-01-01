import type React from "react";
import { memo } from "react";

import type { ConnectLineProps } from "../../../types/props/shapes/ConnectLineProps";
import { Path } from "../Path";

/**
 * ConnectLine component.
 */
const ConnectLineComponent: React.FC<ConnectLineProps> = ({
	id,
	stroke = "black",
	strokeWidth = 1,
	strokeDashType = "solid",
	isSelected = false,
	isAncestorSelected = false,
	isRootSelected = false,
	points = [],
	pathType,
	startArrowHead,
	endArrowHead,
	onClick,
	onSelect,
}) => {
	return (
		<Path
			id={id}
			stroke={stroke}
			strokeWidth={strokeWidth}
			strokeDashType={strokeDashType}
			isSelected={isSelected}
			isAncestorSelected={isAncestorSelected}
			isRootSelected={isRootSelected}
			showOutline={false}
			outlineDisabled={true}
			dragEnabled={false}
			points={points}
			pathType={pathType}
			preserveEndpoints={true}
			startArrowHead={startArrowHead}
			endArrowHead={endArrowHead}
			onClick={onClick}
			onSelect={onSelect}
		/>
	);
};

export const ConnectLine = memo(ConnectLineComponent);
