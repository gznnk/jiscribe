import { createObjectDoc } from "@jiscribe/doc/model/objects/utils/createObjectDoc";
import type { Point } from "@jiscribe/geometry";
import React, { memo } from "react";

import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CanvasRegistries } from "../../../registries/CanvasRegistries";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { Stencil } from "../../objects/Stencil";

type DragGhostProps = {
	stencilLibraryDrag: CanvasControllerState["stencilLibraryDrag"];
};

const GHOST_ID = "drag-ghost";

/**
 * Creates the ghost element.
 * Uses React.createElement to avoid creating a component variable during render.
 *
 * Keyed by position so every move mounts a fresh element. The ghost is first
 * drawn under the library panel, outside the SVG's clip, where Chromium culls it;
 * a shape whose transform sits on a `<g>` (the table) is then only re-transformed
 * on a move, never repainted, and stays invisible unless something else on the
 * canvas (a snap guide) happens to repaint it.
 */
const createGhostElement = (
	preset: Stencil,
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
		registries.objectFactory,
		preset.defaultOverrides,
	);
	const ghostState = registries.objectMapper.toState(doc);
	ghostState.id = GHOST_ID;

	return React.createElement(component, {
		...ghostState,
		key: `${position.x},${position.y}`,
	});
};

/**
 * Renders a semi-transparent ghost of the shape being dragged from the stencil library.
 * Renders nothing when no drag is in progress.
 */
const DragGhostComponent: React.FC<DragGhostProps> = ({
	stencilLibraryDrag,
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
			)}
		</g>
	);
};

export const DragGhost = memo(DragGhostComponent);
