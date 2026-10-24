import React, { memo } from "react";

import { ghostifyPreviewState } from "./ghostifyPreviewState";
import type { DragRect } from "../../../CanvasTypes";
import type { CanvasRegistries } from "../../../registries/CanvasRegistries";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { Stencil } from "../../objects/Stencil";

type DrawingPreviewOverlayProps = {
	/** The preset the drawing tool is armed with; null when it is not armed */
	preset: Stencil | null;
	/** The bounds being drawn; null until a draw drag starts */
	rect: DragRect | null;
};

/**
 * Builds the preview element by reusing the shape's own component: the drag
 * bounds become a doc via the same factory used at placement, are mapped to a
 * state, and ghost-recolored (see ghostifyPreviewState). The preview therefore
 * cannot drift from the placed result. Uses React.createElement to avoid
 * creating a component variable during render.
 *
 * Returns null when the shape cannot be drag-drawn (no createDocFromBounds) or
 * when the bounds are below the minimum size (createDocFromBounds → null),
 * which is exactly when placement would create nothing.
 */
const createPreviewElement = (
	preset: Stencil,
	rect: DragRect,
	registries: CanvasRegistries,
): React.ReactNode => {
	const { objectType, defaultOverrides } = preset;
	const factory = registries.objectFactory.get(objectType);
	const component = registries.objectComponent.get(objectType);
	if (!factory?.createDocFromBounds || !component) {
		return null;
	}

	const { startX, startY, endX, endY } = rect;
	const doc = factory.createDocFromBounds(
		startX,
		startY,
		endX,
		endY,
		defaultOverrides,
	);
	if (!doc) {
		return null;
	}

	return React.createElement(
		component,
		ghostifyPreviewState(registries.objectMapper.toState(doc)),
	);
};

/**
 * Renders the shape-in-progress during drag-drawing. Renders nothing when no
 * drag-drawing is in progress.
 */
const DrawingPreviewOverlayComponent: React.FC<DrawingPreviewOverlayProps> = ({
	preset,
	rect,
}) => {
	const registries = useCanvasRegistries();

	if (preset === null || rect === null) {
		return null;
	}

	// data-testid: the ghost reuses the shape's own component, so it carries
	// data-kind=object like a real object. e2e excludes this subtree to avoid
	// counting the transient preview as a committed object.
	return (
		<g pointerEvents="none" data-testid="drawing-preview">
			{createPreviewElement(preset, rect, registries)}
		</g>
	);
};

export const DrawingPreviewOverlay = memo(DrawingPreviewOverlayComponent);
