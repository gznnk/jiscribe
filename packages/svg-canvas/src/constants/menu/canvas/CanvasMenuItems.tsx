import type React from "react";

import type { DiagramType } from "../../../types/core/DiagramType";

/**
 * Variant overrides for diagram properties
 * This allows customizing default properties for menu item variants
 */
export type CanvasMenuItemVariant = {
	// Frame properties
	width?: number;
	height?: number;
	x?: number;
	y?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;

	// Style properties
	fill?: string;
	stroke?: string;
	strokeWidth?: string;
	cornerRadius?: number;

	// Text properties
	text?: string;
	fontSize?: number;
	fontColor?: string;
	fontWeight?: string;
	textAlign?: "left" | "center" | "right";
	verticalAlign?: "top" | "center" | "bottom";

	// Any other custom properties
	[key: string]: unknown;
};

/**
 * Canvas menu item configuration
 */
export type CanvasMenuItem = {
	id: string;
	diagramType: DiagramType;
	label: string;
	icon: React.ReactNode;
	/** Optional variant overrides for default properties */
	variant?: CanvasMenuItemVariant;
};

/**
 * Canvas menu category configuration
 */
export type CanvasMenuCategory = {
	id: string;
	label: string;
	icon: React.ReactNode;
	items: CanvasMenuItem[];
};

/**
 * Canvas menu categories and items configuration
 */
export const CANVAS_MENU_CATEGORIES: CanvasMenuCategory[] = [
	{
		id: "basic-shapes",
		label: "基本図形",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
				<rect
					x="4"
					y="4"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
			</svg>
		),
		items: [
			{
				id: "rectangle",
				diagramType: "Rectangle",
				label: "四角形",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add Rectangle</title>
						<rect
							x="2"
							y="2"
							width="20"
							height="20"
							fill="none"
							stroke="#D0D4E0"
						/>
					</svg>
				),
			},
			{
				id: "rectangle-blue",
				diagramType: "Rectangle",
				label: "青い四角形",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add Blue Rectangle</title>
						<rect
							x="2"
							y="2"
							width="20"
							height="20"
							fill="#4A90E2"
							stroke="#2E5C8A"
						/>
					</svg>
				),
				variant: {
					fill: "#4A90E2",
					stroke: "#2E5C8A",
				},
			},
			{
				id: "rectangle-large",
				diagramType: "Rectangle",
				label: "大きい四角形",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add Large Rectangle</title>
						<rect
							x="1"
							y="4"
							width="22"
							height="16"
							fill="none"
							stroke="#D0D4E0"
							strokeWidth="2"
						/>
					</svg>
				),
				variant: {
					width: 200,
					height: 150,
				},
			},
			{
				id: "ellipse",
				diagramType: "Ellipse",
				label: "円",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add Circle</title>
						<ellipse
							cx="12"
							cy="12"
							rx="10"
							ry="10"
							fill="none"
							stroke="#D0D4E0"
						/>
					</svg>
				),
			},
			{
				id: "path",
				diagramType: "Path",
				label: "線",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add Line</title>
						<path
							d="M22 22 L2 2 Z"
							fill="none"
							stroke="#D0D4E0"
							strokeWidth={1}
						/>
					</svg>
				),
			},
		],
	},
	{
		id: "ui-elements",
		label: "UI要素",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
				<rect
					x="4"
					y="7"
					width="16"
					height="10"
					rx="2"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<text
					x="12"
					y="14"
					fontSize="8"
					textAnchor="middle"
					fill="currentColor"
				>
					UI
				</text>
			</svg>
		),
		items: [
			{
				id: "button",
				diagramType: "Button",
				label: "ボタン",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add Button</title>
						<rect
							x="2"
							y="8"
							width="20"
							height="8"
							rx="4"
							ry="4"
							fill="none"
							stroke="#D0D4E0"
						/>
						<text x="12" y="13" fontSize="6" textAnchor="middle" fill="#D0D4E0">
							BTN
						</text>
					</svg>
				),
			},
			{
				id: "input",
				diagramType: "Input",
				label: "入力欄",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add Input</title>
						<rect
							x="2"
							y="9"
							width="20"
							height="6"
							rx="1"
							ry="1"
							fill="none"
							stroke="#D0D4E0"
						/>
						<line
							x1="4"
							y1="12"
							x2="4"
							y2="12"
							stroke="#D0D4E0"
							strokeWidth="1"
						/>
					</svg>
				),
			},
		],
	},
	{
		id: "diagrams",
		label: "図形要素",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
				<rect
					x="3"
					y="3"
					width="8"
					height="8"
					rx="1"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<rect
					x="13"
					y="3"
					width="8"
					height="8"
					rx="1"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<rect
					x="3"
					y="13"
					width="8"
					height="8"
					rx="1"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<rect
					x="13"
					y="13"
					width="8"
					height="8"
					rx="1"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
			</svg>
		),
		items: [
			{
				id: "ai",
				diagramType: "Ai",
				label: "AI チャット",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add AI Chat</title>
						<circle
							cx="12"
							cy="7"
							r="3.5"
							fill="#4A90E2"
							stroke="#333"
							strokeWidth="0.5"
						/>
						<text
							x="12"
							y="8"
							fontSize="4"
							textAnchor="middle"
							dominantBaseline="central"
						>
							🤖
						</text>
						<rect
							x="5"
							y="12"
							width="14"
							height="8"
							rx="2"
							ry="2"
							fill="#F0F0F0"
							stroke="#999"
							strokeWidth="0.5"
						/>
						<polygon
							points="12,12 10,10 14,10"
							fill="#F0F0F0"
							stroke="#999"
							strokeWidth="0.5"
						/>
					</svg>
				),
			},
			{
				id: "sticky",
				diagramType: "Sticky",
				label: "付箋",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add Sticky Note</title>
						<rect
							x="3"
							y="3"
							width="16"
							height="16"
							rx="2"
							ry="2"
							fill="#fef08a"
							stroke="#fef08a"
							strokeWidth="1"
						/>
						<line
							x1="6"
							y1="8"
							x2="18"
							y2="8"
							stroke="#000000"
							strokeWidth="0.5"
						/>
						<line
							x1="6"
							y1="11"
							x2="15"
							y2="11"
							stroke="#000000"
							strokeWidth="0.5"
						/>
						<line
							x1="6"
							y1="14"
							x2="13"
							y2="14"
							stroke="#000000"
							strokeWidth="0.5"
						/>
					</svg>
				),
			},
			{
				id: "canvas-frame",
				diagramType: "CanvasFrame",
				label: "キャンバスフレーム",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add Canvas Frame</title>
						<rect
							x="2"
							y="2"
							width="20"
							height="20"
							rx="2"
							ry="2"
							fill="none"
							stroke="#D0D4E0"
							strokeWidth="2"
						/>
						<rect
							x="5"
							y="5"
							width="14"
							height="14"
							rx="1"
							ry="1"
							fill="none"
							stroke="#D0D4E0"
							strokeWidth="1"
							strokeDasharray="2,2"
						/>
					</svg>
				),
			},
			{
				id: "html-preview",
				diagramType: "HtmlPreview",
				label: "HTML プレビュー",
				icon: (
					<svg width="20" height="20" viewBox="0 0 24 24">
						<title>Add HTML Preview</title>
						<rect
							x="2"
							y="2"
							width="20"
							height="20"
							rx="2"
							ry="2"
							fill="#f0f0f0"
							stroke="#4A90E2"
							strokeWidth="1.5"
						/>
						<text
							x="12"
							y="14"
							fontSize="8"
							fontWeight="bold"
							textAnchor="middle"
							fill="#4A90E2"
						>
							HTML
						</text>
					</svg>
				),
			},
		],
	},
	{
		id: "workflow-nodes",
		label: "ワークフローノード",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
				<circle
					cx="12"
					cy="6"
					r="3"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<circle
					cx="6"
					cy="18"
					r="3"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<circle
					cx="18"
					cy="18"
					r="3"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<line
					x1="10.5"
					y1="8"
					x2="7.5"
					y2="16"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<line
					x1="13.5"
					y1="8"
					x2="16.5"
					y2="16"
					stroke="currentColor"
					strokeWidth="2"
				/>
			</svg>
		),
		items: [
			{
				id: "textarea-node",
				diagramType: "TextAreaNode",
				label: "テキスト",
				icon: "T",
			},
			{
				id: "llm-node",
				diagramType: "LLMNode",
				label: "LLM",
				icon: "AI",
			},
			{
				id: "agent-node",
				diagramType: "AgentNode",
				label: "エージェント",
				icon: "AG",
			},
			{
				id: "html-gen-node",
				diagramType: "HtmlGenNode",
				label: "HTML生成",
				icon: "HTML",
			},
			{
				id: "svg-to-diagram-node",
				diagramType: "SvgToDiagramNode",
				label: "SVG変換",
				icon: "SVG",
			},
			{
				id: "hub-node",
				diagramType: "HubNode",
				label: "ハブ",
				icon: "※",
			},
			{
				id: "image-gen-node",
				diagramType: "ImageGenNode",
				label: "画像生成",
				icon: "IMG",
			},
			{
				id: "page-design-node",
				diagramType: "PageDesignNode",
				label: "ページデザイン",
				icon: "PD",
			},
			{
				id: "web-search-node",
				diagramType: "WebSearchNode",
				label: "Web検索",
				icon: "WB",
			},
			{
				id: "vector-store-node",
				diagramType: "VectorStoreNode",
				label: "ベクトルストア",
				icon: "VS",
			},
		],
	},
];
