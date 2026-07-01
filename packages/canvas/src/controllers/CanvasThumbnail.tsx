import { memo, useMemo, useRef } from "react";

import { calcFitViewport } from "./utils/calcFitViewport";
import { CanvasView } from "../presentations/CanvasView";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import { canvasToState } from "../states/canvas/CanvasMapper";

type CanvasThumbnailProps = {
	/**
	 * 表示する CanvasDoc。`Canvas` と同じく `parseCanvasText`（二段検証）を通した
	 * 正当な doc を渡すこと（内部で再検証しない → docs/01 原則4）。
	 */
	canvasDoc: CanvasDoc;
	/** SVG の幅（viewBox 基準の論理 px）。CSS で伸縮させる前提の基準値。 */
	width?: number;
	/** SVG の高さ（論理 px）。width との比がサムネのアスペクト比になる。 */
	height?: number;
	/** コンテンツ周囲に残す余白（px）。 */
	padding?: number;
};

/**
 * doc を「全体が収まるよう」に静的描画する読み取り専用キャンバス。
 *
 * リデューサもジェスチャーも持たず、純表示の {@link CanvasView} に doc を流すだけ。
 * ギャラリーのサムネイル等、対話不要で軽量・高精細な表示に使う。
 */
const CanvasThumbnailComponent: React.FC<CanvasThumbnailProps> = ({
	canvasDoc,
	width = 480,
	height = 270,
	padding = 24,
}) => {
	const svgRef = useRef<SVGSVGElement>(null);

	const { objects, rootIds } = useMemo(
		() => canvasToState(canvasDoc),
		[canvasDoc],
	);

	const viewport = useMemo(
		() =>
			calcFitViewport(objects, { width, height, padding }) ?? {
				minX: 0,
				minY: 0,
				width,
				height,
				zoom: 1,
			},
		[objects, width, height, padding],
	);

	return (
		<CanvasView
			objects={objects}
			rootIds={rootIds}
			viewport={viewport}
			svgRef={svgRef}
		/>
	);
};

export const CanvasThumbnail = memo(CanvasThumbnailComponent);
