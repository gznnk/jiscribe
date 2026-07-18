import { memo } from "react";

import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";
import { AUTO_COLOR } from "../../../../schemas/objects/utils/autoColor";
import type { ShapeFactoryRegistry } from "../../../../schemas/registry/ShapeFactoryRegistry";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { useCanvasRegistries } from "../../../contexts/CanvasRegistriesContext";
import type { ShapePreset } from "../../objects/ShapePreset";

type DrawingPreviewOverlayProps = {
	shapeDrawing: CanvasControllerState["shapeDrawing"];
};

const STROKE_WIDTH = 1.5;

/**
 * Match the preview outline color to the stroke color that will actually be
 * applied after placement. Generate a doc with the same factory used at
 * placement time and adopt its stroke. auto (theme-following) and unspecified
 * values resolve to currentColor, so the preview shows the same theme
 * foreground color as after placement.
 */
const resolvePreviewStroke = (
	preset: ShapePreset,
	shapeFactory: ShapeFactoryRegistry,
): string => {
	const doc = shapeFactory
		.get(preset.objectType)
		?.createDoc({ x: 0, y: 0 }, preset.defaultOverrides) as
		| { stroke?: string }
		| undefined;
	return resolveAutoColor(doc?.stroke ?? AUTO_COLOR, "ink");
};

const DrawingPreviewOverlayComponent: React.FC<DrawingPreviewOverlayProps> = ({
	shapeDrawing,
}) => {
	const { shapePreview, shapeFactory } = useCanvasRegistries();

	if (!shapeDrawing?.preview) {
		return null;
	}

	const renderer = shapePreview.get(shapeDrawing.preset.objectType);
	if (!renderer) {
		return null;
	}

	const { startX, startY, endX, endY } = shapeDrawing.preview;
	const stroke = resolvePreviewStroke(shapeDrawing.preset, shapeFactory);
	const fill = `color-mix(in srgb, ${stroke} 18%, transparent)`;

	return renderer({
		startX,
		startY,
		endX,
		endY,
		stroke,
		fill,
		strokeWidth: STROKE_WIDTH,
	});
};

export const DrawingPreviewOverlay = memo(DrawingPreviewOverlayComponent);
