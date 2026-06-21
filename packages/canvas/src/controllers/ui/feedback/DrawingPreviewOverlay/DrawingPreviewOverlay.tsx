import { memo } from "react";

import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";
import { ELLIPSE_DOC_DEFAULTS } from "../../../../schemas/objects/primitives/ellipse/EllipseDoc";
import { RECT_DOC_DEFAULTS } from "../../../../schemas/objects/primitives/rect/RectDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ShapePreset } from "../../menu/ShapeLibrary/ShapePresets";

type DrawingPreviewOverlayProps = {
	shapeDrawing: CanvasControllerState["shapeDrawing"];
};

const STROKE_WIDTH = 1.5;

/**
 * プレビュー枠線の色を「配置後に実際に付く stroke 色」と一致させる。
 * 配置時と同じく preset の defaultOverrides.stroke を優先し、無ければ
 * 図形種別ごとの既定 stroke にフォールバックする。
 * auto（テーマ追従）・未指定は currentColor へ解決し、配置後と同じテーマ前景色で表示する。
 */
const resolvePreviewStroke = (preset: ShapePreset): string => {
	const override = preset.defaultOverrides?.stroke;
	if (typeof override === "string") {
		return resolveAutoColor(override, "ink");
	}
	const typeDefault =
		preset.objectType === "ellipse"
			? ELLIPSE_DOC_DEFAULTS.stroke
			: RECT_DOC_DEFAULTS.stroke;
	return resolveAutoColor(typeDefault, "ink");
};

const DrawingPreviewOverlayComponent: React.FC<DrawingPreviewOverlayProps> = ({
	shapeDrawing,
}) => {
	if (!shapeDrawing?.preview) {
		return null;
	}

	const { startX, startY, endX, endY } = shapeDrawing.preview;
	const x = Math.min(startX, endX);
	const y = Math.min(startY, endY);
	const width = Math.abs(endX - startX);
	const height = Math.abs(endY - startY);

	const stroke = resolvePreviewStroke(shapeDrawing.preset);
	const fill = `color-mix(in srgb, ${stroke} 18%, transparent)`;

	// 色は var(--vscode-*)（auto の解決結果）を含みうるため SVG 属性ではなく style で当てる。
	const sharedProps = {
		style: { fill, stroke },
		strokeWidth: STROKE_WIDTH,
		pointerEvents: "none" as const,
	};

	if (shapeDrawing.preset.objectType === "polyline") {
		return (
			<line
				x1={startX}
				y1={startY}
				x2={endX}
				y2={endY}
				fill="none"
				style={{ stroke }}
				strokeWidth={STROKE_WIDTH}
				pointerEvents="none"
			/>
		);
	}

	if (shapeDrawing.preset.objectType === "ellipse") {
		return (
			<ellipse
				cx={x + width / 2}
				cy={y + height / 2}
				rx={width / 2}
				ry={height / 2}
				{...sharedProps}
			/>
		);
	}

	return <rect x={x} y={y} width={width} height={height} {...sharedProps} />;
};

export const DrawingPreviewOverlay = memo(DrawingPreviewOverlayComponent);
