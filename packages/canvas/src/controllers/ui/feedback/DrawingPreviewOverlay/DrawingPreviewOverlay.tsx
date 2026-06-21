import { memo } from "react";

import { shapePreviewRegistry } from "../../../../presentations/objects/registry/ShapePreviewRegistry";
import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";
import type { ShapePreset } from "../../../../schemas/objects/types/ShapePreset";
import { AUTO_COLOR } from "../../../../schemas/objects/utils/autoColor";
import { shapeFactoryRegistry } from "../../../../schemas/registry/ShapeFactoryRegistry";
import type { CanvasControllerState } from "../../../CanvasTypes";

type DrawingPreviewOverlayProps = {
	shapeDrawing: CanvasControllerState["shapeDrawing"];
};

const STROKE_WIDTH = 1.5;

/**
 * プレビュー枠線の色を「配置後に実際に付く stroke 色」と一致させる。
 * 配置時と同じファクトリで doc を生成し、その stroke を採用する。
 * auto（テーマ追従）・未指定は currentColor へ解決し、配置後と同じテーマ前景色で表示する。
 */
const resolvePreviewStroke = (preset: ShapePreset): string => {
	const doc = shapeFactoryRegistry
		.get(preset.objectType)
		?.createDoc({ x: 0, y: 0 }, preset.defaultOverrides) as
		| { stroke?: string }
		| undefined;
	return resolveAutoColor(doc?.stroke ?? AUTO_COLOR, "ink");
};

const DrawingPreviewOverlayComponent: React.FC<DrawingPreviewOverlayProps> = ({
	shapeDrawing,
}) => {
	if (!shapeDrawing?.preview) {
		return null;
	}

	const renderer = shapePreviewRegistry.get(shapeDrawing.preset.objectType);
	if (!renderer) {
		return null;
	}

	const { startX, startY, endX, endY } = shapeDrawing.preview;
	const stroke = resolvePreviewStroke(shapeDrawing.preset);
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
