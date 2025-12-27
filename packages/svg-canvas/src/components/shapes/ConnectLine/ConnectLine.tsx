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
	items = [],
	pathType,
	startArrowHead,
	endArrowHead,
	onClick,
	onSelect,
	onDiagramChange,
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
			items={items}
			pathType={pathType}
			preserveEndpoints={true}
			startArrowHead={startArrowHead}
			endArrowHead={endArrowHead}
			onClick={onClick}
			onSelect={onSelect}
			onDiagramChange={onDiagramChange}
		/>
	);
};

export const ConnectLine = memo(ConnectLineComponent);
