import type React from "react";
import { memo } from "react";

import type { ConnectLineProps } from "../../../types/props/shapes/ConnectLineProps";
import { Path } from "../Path";

/**
 * ConnectLine component.
 */
const ConnectLineComponent: React.FC<ConnectLineProps> = ({
	id,
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
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
			x={x}
			y={y}
			width={width}
			height={height}
			rotation={rotation}
			scaleX={scaleX}
			scaleY={scaleY}
			keepProportion={false}
			rotateEnabled={false}
			inversionEnabled={false}
			isTransforming={false}
			stroke={stroke}
			strokeWidth={strokeWidth}
			strokeDashType={strokeDashType}
			isSelected={isSelected}
			isAncestorSelected={isAncestorSelected}
			isRootSelected={isRootSelected}
			showOutline={false}
			outlineDisabled={true}
			dragEnabled={false}
			pathType={pathType}
			preserveEndpoints={true}
			startArrowHead={startArrowHead}
			endArrowHead={endArrowHead}
			items={items}
			onClick={onClick}
			onSelect={onSelect}
			onDiagramChange={onDiagramChange}
		/>
	);
};

export const ConnectLine = memo(ConnectLineComponent);
