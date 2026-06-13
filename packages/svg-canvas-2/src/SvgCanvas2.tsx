import React from "react";

import { Canvas } from "./controllers/Canvas";
import type { CanvasDoc } from "./schemas/canvas/CanvasDoc";

// 暫定的なテストデータ
const testCanvasDoc: CanvasDoc = {
	version: 1,
	root: [],
	connectors: [],
};

/**
 * SvgCanvas2 - 新しいバージョンのSVGキャンバスコンポーネント
 * CanvasDoc形式のテストデータを描画
 */
export const SvgCanvas2: React.FC = () => {
	return <Canvas canvasDoc={testCanvasDoc} />;
};
