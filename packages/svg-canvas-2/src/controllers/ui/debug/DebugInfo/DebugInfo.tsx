import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { DebugInfoContainer } from "./DebugInfoStyled";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

type DebugInfoProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
};

/**
 * Renders debug information in the top-right corner of the viewport.
 * Shows the cx, cy, width, height, and rotation of the selected object.
 */
const DebugInfoComponent: React.FC<DebugInfoProps> = ({
	selectedIds,
	objects,
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

	return (
		<DebugInfoContainer>
			<div>cx: {cx.toFixed(2)}</div>
			<div>cy: {cy.toFixed(2)}</div>
			<div>width: {width.toFixed(2)}</div>
			<div>height: {height.toFixed(2)}</div>
			<div>rotation: {rotation.toFixed(2)}°</div>
		</DebugInfoContainer>
	);
};

export const DebugInfo = memo(DebugInfoComponent);
