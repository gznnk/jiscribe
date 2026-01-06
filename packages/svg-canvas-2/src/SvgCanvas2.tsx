import React, { useMemo } from "react";

import { canvasToState } from "./operations/canvas/CanvasMapper";
import { Canvas } from "./presentations/canvas/Canvas";
import type { CanvasDoc } from "./schemas/canvas/CanvasDoc";
import type { EllipseDoc } from "./schemas/objects/primitives/EllipseDoc";
import type { GroupDoc } from "./schemas/objects/primitives/GroupDoc";
import type { RectDoc } from "./schemas/objects/primitives/RectDoc";

export interface SvgCanvas2Props {
	width?: number;
	height?: number;
	className?: string;
}

// 暫定的なテストデータ
const testCanvasDoc: CanvasDoc = {
	root: [
		{
			id: "rect-1",
			type: "rect",
			x: 50,
			y: 50,
			width: 200,
			height: 100,
			fill: "#4CAF50",
			stroke: "#2E7D32",
			strokeWidth: 2,
		} as unknown as RectDoc,
		{
			id: "group-1",
			type: "group",
			children: [
				{
					id: "rect-in-group-1",
					type: "rect",
					x: 500,
					y: 50,
					width: 80,
					height: 80,
					fill: "#FFEB3B",
					stroke: "#F57F17",
					strokeWidth: 2,
				} as unknown as RectDoc,
				{
					id: "ellipse-in-group-1",
					type: "ellipse",
					cx: 600,
					cy: 90,
					rx: 40,
					ry: 30,
					fill: "#00BCD4",
					stroke: "#006064",
					strokeWidth: 2,
				} as unknown as EllipseDoc,
			],
		} as unknown as GroupDoc,
		{
			id: "ellipse-1",
			type: "ellipse",
			cx: 400,
			cy: 200,
			rx: 80,
			ry: 50,
			fill: "#9C27B0",
			stroke: "#6A1B9A",
			strokeWidth: 2,
		} as unknown as EllipseDoc,
		{
			id: "rect-2",
			type: "rect",
			x: 300,
			y: 100,
			width: 150,
			height: 150,
			fill: "#2196F3",
			stroke: "#1565C0",
			strokeWidth: 3,
		} as unknown as RectDoc,
		{
			id: "ellipse-2",
			type: "ellipse",
			cx: 150,
			cy: 400,
			rx: 60,
			ry: 40,
			fill: "#FF5722",
			stroke: "#D84315",
			strokeWidth: 2,
		} as unknown as EllipseDoc,
		{
			id: "rect-3",
			type: "rect",
			x: 100,
			y: 250,
			width: 100,
			height: 50,
			fill: "#FF9800",
			stroke: "#E65100",
			strokeWidth: 1,
		} as unknown as RectDoc,
	],
	connectors: [],
};

/**
 * SvgCanvas2 - 新しいバージョンのSVGキャンバスコンポーネント
 * CanvasDoc形式のテストデータをCanvasMapperで変換してCanvasコンポーネントで描画
 */
export const SvgCanvas2: React.FC<SvgCanvas2Props> = () => {
	const canvasState = useMemo(() => {
		return canvasToState(testCanvasDoc);
	}, []);

	return <Canvas {...canvasState} />;
};
