import React from "react";

import { Canvas } from "./controllers/Canvas";
import type { CanvasDoc } from "./schemas/canvas/CanvasDoc";
import type { ConnectorDoc } from "./schemas/objects/connections/ConnectorDoc";
import type { EllipseDoc } from "./schemas/objects/primitives/EllipseDoc";
import type { GroupDoc } from "./schemas/objects/primitives/GroupDoc";
import type { PolylineDoc } from "./schemas/objects/primitives/PolylineDoc";
import type { RectDoc } from "./schemas/objects/primitives/RectDoc";

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
			rotation: 45,
			lockAspectRatio: true,
			fill: "transparent",
			// fill: "#4CAF50",
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
		{
			id: "polyline-1",
			type: "polyline",
			points: [
				{ x: 50, y: 300 },
				{ x: 150, y: 320 },
				{ x: 200, y: 280 },
				{ x: 250, y: 340 },
				{ x: 350, y: 310 },
			],
			stroke: "#E91E63",
			strokeWidth: 3,
		} as unknown as PolylineDoc,
		{
			id: "polyline-2",
			type: "polyline",
			points: [
				{ x: 400, y: 350 },
				{ x: 450, y: 380 },
				{ x: 500, y: 360 },
				{ x: 550, y: 400 },
			],
			stroke: "#00BCD4",
			strokeWidth: 2,
		} as unknown as PolylineDoc,
	],
	connectors: [
		{
			id: "connector-1",
			type: "connector",
			points: [
				{ x: 150, y: 100 },
				{ x: 400, y: 200 },
			],
			source: {
				owner: { type: "rect", id: "rect-1" },
				anchor: { kind: "center" },
			},
			target: {
				owner: { type: "ellipse", id: "ellipse-1" },
				anchor: { kind: "center" },
			},
			stroke: "#795548",
			strokeWidth: 2,
		} as unknown as ConnectorDoc,
		{
			id: "connector-2",
			type: "connector",
			points: [
				{ x: 375, y: 175 },
				{ x: 150, y: 400 },
			],
			source: {
				owner: { type: "rect", id: "rect-2" },
				anchor: { kind: "center" },
			},
			target: {
				owner: { type: "ellipse", id: "ellipse-2" },
				anchor: { kind: "center" },
			},
			stroke: "#607D8B",
			strokeWidth: 2,
		} as unknown as ConnectorDoc,
		{
			id: "connector-3",
			type: "connector",
			points: [
				{ x: 150, y: 275 },
				{ x: 540, y: 90 },
			],
			source: {
				owner: { type: "rect", id: "rect-3" },
				anchor: { kind: "center" },
			},
			target: {
				owner: { type: "rect", id: "rect-in-group-1" },
				anchor: { kind: "center" },
			},
			stroke: "#9E9E9E",
			strokeWidth: 2,
		} as unknown as ConnectorDoc,
	],
};

/**
 * SvgCanvas2 - 新しいバージョンのSVGキャンバスコンポーネント
 * CanvasDoc形式のテストデータを描画
 */
export const SvgCanvas2: React.FC = () => {
	return <Canvas canvasDoc={testCanvasDoc} />;
};
