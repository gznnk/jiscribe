import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";

type DebugInfoProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	viewportWidth: number;
	viewportMinX: number;
	viewportMinY: number;
	zoom: number;
};

/**
 * Renders debug information in the top-right corner of the viewport.
 * Shows the cx, cy of the selected object.
 */
const DebugInfoComponent: React.FC<DebugInfoProps> = ({
	selectedIds,
	objects,
	viewportWidth,
	viewportMinX,
	viewportMinY,
	zoom,
}) => {
	if (selectedIds.length !== 1) {
		return null;
	}

	const selectedId = selectedIds[0];
	const selectedObject = objects[selectedId];

	if (!selectedObject || !isTransformedFrame(selectedObject)) {
		return null;
	}

	const { cx, cy, width, height, rotation } = selectedObject;

	// Calculate position in viewport coordinates (top-right corner)
	const padding = 10;
	const textX = viewportMinX / zoom + viewportWidth / zoom - padding;
	const textY = viewportMinY / zoom + padding;

	return (
		<g data-layer="debug-info">
			<text
				x={textX}
				y={textY}
				fill="black"
				fontSize="12"
				fontFamily="monospace"
				textAnchor="end"
				dominantBaseline="hanging"
			>
				<tspan x={textX} dy="0">
					cx: {cx.toFixed(2)}
				</tspan>
				<tspan x={textX} dy="15">
					cy: {cy.toFixed(2)}
				</tspan>
				<tspan x={textX} dy="15">
					width: {width.toFixed(2)}
				</tspan>
				<tspan x={textX} dy="15">
					height: {height.toFixed(2)}
				</tspan>
				<tspan x={textX} dy="15">
					rotation: {rotation.toFixed(2)}°
				</tspan>
			</text>
		</g>
	);
};

export const DebugInfo = memo(DebugInfoComponent);
