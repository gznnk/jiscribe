import type { Point } from "@workspace/geometry";
import React, { memo } from "react";

import type { DocCreationDefaults } from "../../../../schemas/objects/types/DocCreationDefaults";
import { createObjectDoc } from "../../../../schemas/objects/utils/createObjectDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CanvasRegistries } from "../../../registries/CanvasRegistries";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { Stencil } from "../../objects/Stencil";

type DragGhostProps = {
	stencilLibraryDrag: CanvasControllerState["stencilLibraryDrag"];
	docDefaults: DocCreationDefaults;
};

const GHOST_ID = "drag-ghost";

/**
 * Creates the ghost element.
 * Uses React.createElement to avoid creating a component variable during render.
 */
const createGhostElement = (
	preset: Stencil,
	position: Point,
	registries: CanvasRegistries,
	docDefaults: DocCreationDefaults,
): React.ReactNode => {
	const component = registries.objectComponent.get(preset.objectType);
	if (!component) {
		return null;
	}

	const doc = createObjectDoc(
		preset.objectType,
		position,
		registries.objectFactory,
		preset.defaultOverrides,
		docDefaults,
	);
	const ghostState = registries.objectMapper.toState(doc);
	ghostState.id = GHOST_ID;

	return React.createElement(component, ghostState);
};

/**
 * Renders a semi-transparent ghost of the shape being dragged from the stencil library.
 * Renders nothing when no drag is in progress.
 */
const DragGhostComponent: React.FC<DragGhostProps> = ({
	stencilLibraryDrag,
	docDefaults,
}) => {
	const registries = useCanvasRegistries();

	if (!stencilLibraryDrag) {
		return null;
	}

	return (
		<g opacity={0.5} pointerEvents="none">
			{createGhostElement(
				stencilLibraryDrag.preset,
				stencilLibraryDrag.ghostPosition,
				registries,
				docDefaults,
			)}
		</g>
	);
};

export const DragGhost = memo(DragGhostComponent);
