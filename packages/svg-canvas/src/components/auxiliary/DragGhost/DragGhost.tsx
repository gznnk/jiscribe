import React, { memo } from "react";

import type { DragGhostProps } from "./DragGhostTypes";
import { DiagramRegistry } from "../../../registry";
import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Component for rendering dragged items as ghost image.
 *
 * This component renders selected diagrams with reduced opacity
 * when they are dragged outside their parent container.
 * It is positioned at the front of the render order in SvgCanvas
 * to ensure it appears on top of all other shapes.
 */
const DragGhostComponent: React.FC<DragGhostProps> = ({ diagrams }) => {
	if (diagrams.length === 0) {
		return null;
	}

	// Render each selected diagram as a ghost element
	const ghostElements = diagrams.map((diagram: Diagram) => {
		const component = DiagramRegistry.getComponent(diagram.type);
		if (!component) {
			return null;
		}

		const props = {
			...diagram,
			key: diagram.id,
		};

		return React.createElement(component, props);
	});

	return (
		<g opacity={0.5} pointerEvents="none">
			{ghostElements}
		</g>
	);
};

export const DragGhost = memo(DragGhostComponent);
