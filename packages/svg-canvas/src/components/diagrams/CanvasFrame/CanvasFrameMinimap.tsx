import React, { memo } from "react";

import { DiagramRegistry } from "../../../registry";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { CanvasFrameProps } from "../../../types/props/diagrams/CanvasFrameProps";

/**
 * CanvasFrame minimap component (simplified version for minimap)
 */
const CanvasFrameMinimapComponent: React.FC<CanvasFrameProps> = ({
	items,
}) => {
	// Create simplified shapes within the canvas frame for minimap
	const children = items.map((item: DiagramData) => {
		// Ensure that item.type is of DiagramType
		if (!item.type) {
			console.error("Item has no type", item);
			return null;
		}
		const minimapComponent = DiagramRegistry.getMinimapComponent(item.type);
		if (!minimapComponent) {
			console.warn(`Minimap component not found for type: ${item.type}`);
			return null;
		}
		const props = {
			...item,
			key: item.id,
		};

		return React.createElement(minimapComponent, props);
	});

	return <>{children}</>;
};

export const CanvasFrameMinimap = memo(CanvasFrameMinimapComponent);