import React, { memo } from "react";

import { DiagramRegistry } from "../../../registry";
import type { GroupProps } from "../../../types/props/shapes/GroupProps";

/**
 * Group component.
 */
const GroupComponent: React.FC<GroupProps> = ({
	x: _x,
	y: _y,
	width: _width,
	height: _height,
	rotation: _rotation,
	scaleX: _scaleX,
	scaleY: _scaleY,
	isSelected: _isSelected,
	items,
	onDrag,
	onClick,
	onSelect,
	onDragOver,
	onDragLeave,
	onHoverChange,
	onDiagramChange,
	onConnect,
	onPreviewConnectLine,
	onTextChange,
	onExecute,
}) => {
	// Create shapes within the group
	const children = items.map((item) => {
		// Ensure that item.type is of DiagramType
		if (!item.type) {
			console.error("Item has no type", item);
			return null;
		}
		const component = DiagramRegistry.getComponent(item.type);
		if (!component) {
			console.warn(`Component not found for type: ${item.type}`);
			return null;
		}
		const props = {
			...item,
			key: item.id,
			onClick,
			onSelect,
			onDrag,
			onDragOver,
			onDragLeave,
			onHoverChange,
			onDiagramChange,
			onConnect,
			onPreviewConnectLine,
			onTextChange,
			onExecute,
		};

		return React.createElement(component, props);
	});

	return <>{children}</>;
};

export const Group = memo(GroupComponent);
