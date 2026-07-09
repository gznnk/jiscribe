import type { Point } from "@workspace/geometry";
import React, { memo } from "react";

import type { ShapePreset } from "../../../../schemas/objects/types/ShapePreset";
import { createObjectDoc } from "../../../../schemas/objects/utils/createObjectDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { useCanvasRegistries } from "../../../contexts/CanvasRegistriesContext";
import type { CanvasRegistries } from "../../../setup/CanvasRegistries";

type DragGhostProps = {
	shapeLibraryDrag: CanvasControllerState["shapeLibraryDrag"];
};

const GHOST_ID = "drag-ghost";

/**
 * Creates the ghost element.
 * Uses React.createElement to avoid creating a component variable during render.
 */
const createGhostElement = (
	preset: ShapePreset,
	position: Point,
	registries: CanvasRegistries,
): React.ReactNode => {
	const component = registries.objectComponent.get(preset.objectType);
	if (!component) {
		return null;
	}

	const doc = createObjectDoc(
		preset.objectType,
		position,
		preset.defaultOverrides,
	);
	const ghostState = registries.objectMapper.toState(doc);
	ghostState.id = GHOST_ID;

	return React.createElement(component, ghostState);
};

/**
 * Renders a semi-transparent ghost of the shape being dragged from the shape library.
 * Renders nothing when no drag is in progress.
 */
const DragGhostComponent: React.FC<DragGhostProps> = ({ shapeLibraryDrag }) => {
	const registries = useCanvasRegistries();

	if (!shapeLibraryDrag) {
		return null;
	}

	return (
		<g opacity={0.5} pointerEvents="none">
			{createGhostElement(
				shapeLibraryDrag.preset,
				shapeLibraryDrag.ghostPosition,
				registries,
			)}
		</g>
	);
};

export const DragGhost = memo(DragGhostComponent);
